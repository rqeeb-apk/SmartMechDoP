import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import zlib from 'zlib';
import { SEEDED_ACTIVATION_CODES } from './data/activationCodesSeed.ts';

dotenv.config();

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Lazy init Gemini SDK with explicit error reporting
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini Client Error] GEMINI_API_KEY is not defined in process.env');
    throw new Error(
      'مفتاح GEMINI_API_KEY غير مهيأ في متغيرات البيئة (Environment Variables) في Vercel. يرجى إضافته من Project Settings > Environment Variables.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * Approximate token estimator:
 * English: ~1 token / 4 chars
 * Arabic: ~1 token / 2 chars (due to unicode multi-byte encoding)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicChars = (text.match(arabicRegex) || []).length;
  const nonArabicChars = text.length - arabicChars;
  return Math.ceil(arabicChars / 2 + nonArabicChars / 4);
}

/**
 * Text Chunking & Slicing Helper:
 * Extracts relevant snippet matching query keywords to stay well within token budget
 */
function extractRelevantContentChunk(fullContent: string, query: string, maxTokensBudget: number = 1500): string {
  if (!fullContent) return '';
  const estimatedTotal = estimateTokens(fullContent);
  if (estimatedTotal <= maxTokensBudget) {
    return fullContent;
  }

  const paragraphs = fullContent.split(/\n\s*\n/);
  const keywords = (query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 2);

  let selectedText = '';
  let currentTokens = 0;

  for (const para of paragraphs) {
    const pLower = para.toLowerCase();
    const matchesKeyword = keywords.some((k) => pLower.includes(k));
    const pTokens = estimateTokens(para);

    if ((matchesKeyword || selectedText === '') && currentTokens + pTokens <= maxTokensBudget) {
      selectedText += (selectedText ? '\n\n' : '') + para;
      currentTokens += pTokens;
    }
  }

  if (!selectedText) {
    const maxChars = maxTokensBudget * 2;
    selectedText = fullContent.slice(0, maxChars) + '\n... [مقتطع للحفاظ على سرعة الشرح]';
  }

  return selectedText;
}

/**
 * Parse retry delay from Google API 429 response
 */
function parseRetryDelayMs(err: any): number {
  try {
    const msg = err?.message || JSON.stringify(err || {});
    const match = msg.match(/retry\s+in\s+([\d.]+)\s*s/i) || msg.match(/retryDelay["']?\s*:\s*["']?(\d+)s/i);
    if (match && match[1]) {
      const sec = parseFloat(match[1]);
      if (!isNaN(sec) && sec > 0) {
        return Math.ceil(sec * 1000);
      }
    }
  } catch (e) {
    // Ignore parse error
  }
  return 3000;
}

/**
 * Robust JSON parser handling markdown code blocks, preambles, and malformed markers
 */
function parseJsonSafely(raw: string): any {
  if (!raw) return {};
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      const sliced = cleaned.slice(startIdx, endIdx + 1);
      return JSON.parse(sliced);
    }
    throw _e;
  }
}

/**
 * Robust Gemini Content Generator with Exponential Backoff + Jitter & Model Fallback
 */
async function generateGeminiContentWithRetry(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  fallbackModel?: string;
  maxAttempts?: number;
}): Promise<string> {
  const ai = getGeminiClient();
  const modelCascade = [
    params.primaryModel || 'gemini-4-hydrogen',
    params.fallbackModel || 'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  const maxAttempts = params.maxAttempts || 3;

  let attempt = 0;

  while (attempt < maxAttempts) {
    const currentModel = modelCascade[Math.min(attempt, modelCascade.length - 1)];
    attempt++;
    try {
      console.log(`[AI Engine Fast] Attempt ${attempt}/${maxAttempts} using model: ${currentModel}`);

      const configPayload: any = { ...(params.config || {}) };
      if (configPayload.tools && configPayload.tools.length > 0) {
        delete configPayload.responseMimeType;
        delete configPayload.responseSchema;
      }
      if (currentModel === 'gemini-4-hydrogen') {
        delete configPayload.temperature;
        delete configPayload.topP;
        delete configPayload.topK;
        if (configPayload.thinkingConfig?.thinkingBudget !== undefined) {
          delete configPayload.thinkingConfig;
        }
      }

      const response = await ai.models.generateContent({
        model: currentModel,
        contents: params.contents,
        config: configPayload,
      });
      return response.text || '';
    } catch (err: any) {
      const errMsg = String(err?.message || JSON.stringify(err || {}));
      const isRetryable =
        err?.status === 429 ||
        err?.code === 429 ||
        err?.status === 503 ||
        err?.code === 503 ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Quota exceeded') ||
        errMsg.includes('limit exceeded') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('Temporarily Unavailable');

      console.warn(`[AI Engine] Error on attempt ${attempt} with model ${currentModel}:`, errMsg.slice(0, 180));

      if (!isRetryable && attempt < maxAttempts) {
        console.log(`[AI Engine] Switching to next model in cascade...`);
        continue;
      }

      if (attempt >= maxAttempts) {
        const retryDelayMs = parseRetryDelayMs(err);
        const retrySec = Math.ceil(retryDelayMs / 1000);
        throw new Error(
          `خادم الذكاء الاصطناعي مشغول حالياً أو تعذر الوصول للنموذج. يرجى المحاولة بعد ${retrySec} ثانية.`
        );
      }

      const backoffDelay = 900 * attempt + Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error('تعذر إكمال طلب الشرح بعد عدة محاولات. يرجى إعادة المحاولة لاحقاً.');
}

/**
 * Robust Gemini Streaming Content Generator with SSE support and zero-delay model cascade
 */
async function generateGeminiContentStreamWithRetry(params: {
  contents: any;
  config?: any;
  primaryModel?: string;
  fallbackModel?: string;
  maxAttempts?: number;
  onChunk: (text: string) => void;
  onStatus?: (message: string) => void;
}): Promise<string> {
  const ai = getGeminiClient();
  const modelCascade = [
    params.primaryModel || 'gemini-4-hydrogen',
    params.fallbackModel || 'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];
  const maxAttempts = params.maxAttempts || 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    const currentModel = modelCascade[Math.min(attempt, modelCascade.length - 1)];
    attempt++;
    try {
      console.log(`[AI Streaming Engine] Attempt ${attempt}/${maxAttempts} with model: ${currentModel}`);
      if (params.onStatus) {
        params.onStatus(`جاري بث الشرح مباشرة عبر النموذج الذكي (${currentModel})...`);
      }

      const configPayload: any = { ...(params.config || {}) };
      if (currentModel === 'gemini-4-hydrogen') {
        delete configPayload.temperature;
        delete configPayload.topP;
        delete configPayload.topK;
        if (configPayload.thinkingConfig?.thinkingBudget !== undefined) {
          delete configPayload.thinkingConfig;
        }
      }

      const streamResult = await ai.models.generateContentStream({
        model: currentModel,
        contents: params.contents,
        config: configPayload,
      });

      let fullText = '';
      for await (const chunk of streamResult) {
        const text = chunk.text || '';
        if (text) {
          fullText += text;
          params.onChunk(text);
        }
      }

      return fullText;
    } catch (err: any) {
      const errMsg = String(err?.message || JSON.stringify(err || {}));
      console.warn(`[AI Stream Error] Attempt ${attempt} failed with ${currentModel}:`, errMsg.slice(0, 150));

      if (attempt >= maxAttempts) {
        throw new Error(err?.message || 'تعذر استكمال بث الشرح بعد عدة محاولات.');
      }

      const backoffDelay = 900 * attempt + Math.floor(Math.random() * 400);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error('فشلت جميع محاولات بث الشرح من خادم الذكاء الاصطناعي.');
}

// ==========================================
// HIGH-CAPACITY CONCURRENCY ENGINE & RESPONSE CACHE
// Designed to sustain 1,000+ simultaneous users without stalling
// ==========================================

interface QueuedTask {
  id: string;
  fn: () => Promise<any>;
  resolve: (val: any) => void;
  reject: (err: any) => void;
  clientId: string;
  estimatedTokens: number;
}

class HighCapacityRequestQueue {
  private queue: QueuedTask[] = [];
  private activeCount = 0;
  // High concurrency for modern serverless scale (64 concurrent tasks per instance)
  private maxConcurrency = 64;

  public enqueue(clientId: string, estimatedTokens: number, fn: () => Promise<any>): Promise<any> {
    // If capacity is available, execute immediately without queuing delay
    if (this.activeCount < this.maxConcurrency) {
      this.activeCount++;
      return fn().finally(() => {
        this.activeCount--;
        this.processNext();
      });
    }

    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fn,
        resolve,
        reject,
        clientId,
        estimatedTokens,
      };
      this.queue.push(task);
      this.processNext();
    });
  }

  public getStats() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrency: this.maxConcurrency,
    };
  }

  private processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;

    task
      .fn()
      .then((res) => task.resolve(res))
      .catch((err) => task.reject(err))
      .finally(() => {
        this.activeCount--;
        this.processNext();
      });
  }
}

const geminiQueue = new HighCapacityRequestQueue();

// In-Memory Fast LRU Cache to instantly serve common questions & lecture summaries
interface CacheItem<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
}

class FastResponseLRUCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private maxItems: number;

  constructor(maxItems = 1200) {
    this.maxItems = maxItems;
  }

  public get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Promote key for LRU
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }

  public set(key: string, data: T, ttlMs: number = 2 * 3600 * 1000): void {
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const aiResponseCache = new FastResponseLRUCache<any>(1200);

export function computeCacheKey(prefix: string, content: string, extra = ''): string {
  let hash = 0;
  const str = `${prefix}_${extra}_${(content || '').slice(0, 1500)}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

interface UserQuotaRecord {
  tokensUsedWindow: number;
  requestCountWindow: number;
  windowStart: number;
}

const userQuotaTracker = new Map<string, UserQuotaRecord>();

/**
 * Multi-tenant aware rate limiter:
 * Differentiates between individual student IDs and shared campus/cellular gateway IPs
 * so that hundreds of students sharing the same university Wi-Fi or cellular network are never blocked!
 */
function trackAndCheckUserQuota(
  clientId: string,
  isSharedIp: boolean,
  estimatedTokens: number
): { allowed: boolean; remainingTokens: number; waitSec?: number } {
  const now = Date.now();
  const windowSizeMs = 60 * 1000;

  // For identified individual student: generous 100 req/min
  // For shared campus/cellular NAT gateway IP: massive 5,000 req/min
  const maxTokensPerMin = isSharedIp ? 20000000 : 800000;
  const maxRequestsPerMin = isSharedIp ? 5000 : 100;

  let record = userQuotaTracker.get(clientId);
  if (!record || now - record.windowStart > windowSizeMs) {
    record = { tokensUsedWindow: 0, requestCountWindow: 0, windowStart: now };
    userQuotaTracker.set(clientId, record);
  }

  if (record.tokensUsedWindow + estimatedTokens > maxTokensPerMin || record.requestCountWindow >= maxRequestsPerMin) {
    const remainingSec = Math.ceil((record.windowStart + windowSizeMs - now) / 1000);
    return {
      allowed: false,
      remainingTokens: Math.max(0, maxTokensPerMin - record.tokensUsedWindow),
      waitSec: Math.max(1, remainingSec),
    };
  }

  record.tokensUsedWindow += estimatedTokens;
  record.requestCountWindow += 1;
  return { allowed: true, remainingTokens: maxTokensPerMin - record.tokensUsedWindow };
}

function geminiQuotaAndQueueMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1').split(',')[0].trim();
  const studentHeader = (req.headers['x-student-id'] as string) || '';
  const bodyEmail = req.body?.studentEmail || req.body?.email || req.body?.studentId || '';

  const studentIdentifier = studentHeader || bodyEmail;
  const isStudentIdentified = Boolean(studentIdentifier && studentIdentifier !== 'guest');
  const clientId = isStudentIdentified ? `usr_${studentIdentifier.trim().toLowerCase()}` : `ip_${ip}`;

  const { lessonTitle, userPrompt, uploadedContent, content } = req.body || {};
  const textPayload = `${lessonTitle || ''} ${userPrompt || ''} ${uploadedContent || ''} ${typeof content === 'string' && !content.startsWith('data:') ? content : ''}`;
  const estimatedTokens = Math.min(estimateTokens(textPayload), 5000);

  (req as any).estimatedTokens = estimatedTokens;
  (req as any).clientId = clientId;
  (req as any).clientIp = ip;

  const quotaCheck = trackAndCheckUserQuota(clientId, !isStudentIdentified, estimatedTokens);
  if (!quotaCheck.allowed) {
    return res.status(429).json({
      success: false,
      error: `تجاوزت حد الاستهلاك المسموح به في الدقيقة. يرجى الانتظار ${quotaCheck.waitSec} ثانية للمتابعة.`,
      waitSec: quotaCheck.waitSec,
    });
  }

  next();
}

// Router for Gemini endpoints supporting both /api/gemini and /gemini
const geminiRouter = express.Router();
geminiRouter.use(geminiQuotaAndQueueMiddleware);

// ==========================================
// API: «اشرح لي الدرس» (Explain Lesson Service)
// ==========================================
geminiRouter.post('/explain-lesson', async (req: Request, res: Response) => {
  const ip = (req as any).clientIp || '127.0.0.1';
  const estimatedTokens = (req as any).estimatedTokens || 1000;

  try {
    const {
      sourceType,
      content,
      fileName,
      fileMimeType,
      studentLevel = 'intermediate',
      mode = 'full_explanation',
      followupQuestion,
      lessonContext,
    } = req.body || {};

    // Progressive streaming detection via Accept header or stream flag
    if (
      (mode === 'full_explanation' || !mode) &&
      (req.headers.accept?.includes('text/event-stream') || req.body?.stream === true || req.query?.stream === 'true')
    ) {
      return handleExplainLessonStreamResponse(req, res);
    }

    const levelMap: Record<string, string> = {
      beginner: 'مستوى مبتدئ: لغة عربية سهلة ومبسطة جداً، تفكيك المفاهيم المعقدة، تشبيهات عملية مبسطة، وتجنب الرموز الرياضية المعقدة دون تمهيد.',
      intermediate: 'مستوى متوسط: مناسب لطلاب البكالوريوس في هندسة الميكاترونكس، توازن بين الشرح النظري والقوانين الرياضية مع توضيح الوحدات والرموز.',
      advanced: 'مستوى متقدم: تفصيل رياضي وهندسي عميق، اشتقاقات القوانين، دوال التحويل، الاستجابة الترددية والزمنية، واستكشاف المشكلات.',
      specialized: 'مستوى هندسي متخصص: معايير التصميم الصناعي (ISO/IEEE)، اختيار المكونات الدقيقة، التوافق الكهرومغناطيسي، والتحكم المتقدم.',
    };

    const studentLevelInstruction = levelMap[studentLevel] || levelMap.intermediate;

    if (mode === 'followup_question') {
      const prompt = `أنت المدرس الذكي في خدمة «اشرح لي الدرس» لطلاب هندسة الميكاترونكس.
قاعدة الدقة الصارمة: أجب فقط بناءً على محتوى الدرس المرفوع وسياقه.
إذا كان سؤال الطالب خارج موضوع ومحتوى الدرس، ابدأ إجابتك بوضوح بعبارة:
"[تنبيه: هذا السؤال يقع خارج سياق الدرس المرفوع] " ثم قدم إجابة علمية دقيقة وموجزة.
تأكد من صحة الحسابات الرياضية، الوحدات الفيزيائية (SI Units)، والإشارات.

سياق الدرس الحالي:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

سؤال الطالب:
"${followupQuestion || 'اشرح هذه النقطة أكثر'}"`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      const isOut = text.includes('[تنبيه: هذا السؤال يقع خارج سياق الدرس المرفوع]');
      return res.json({ success: true, answer: text, isOutOfLessonContext: isOut });
    }

    if (mode === 'simplify') {
      const prompt = `أعد شرح الدرس التالي بأسلوب أبسط بكثير ("شرح أبسط") لطلاب هندسة الميكاترونكس، مع الحفاظ التام على الحقائق والمعادلات الموجودة في المصدر دون اختراع:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

قدم الشرح بأسلوب مبسط وممتع وباللغة العربية الفصيحة السهلة.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, answer: text });
    }

    if (mode === 'deepen') {
      const prompt = `قدم تعمقاً هندسياً وتحليلاً متقدماً ("شرح أعمق") للدرس التالي لطلاب هندسة الميكاترونكس:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

اشرح النظريات الفيزيائية الكامنة، اشتقاق العلاقات، التأثيرات الجانبية، والتفاصيل الهندسية الدقيقة.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, answer: text });
    }

    if (mode === 'solved_example') {
      const prompt = `استخرج أو صغ مسألة وتطبيقاً محلولاً خطوة بخطوة ("مثال محلول") مستوحى تماماً ومطابق للقوانين والمعادلات والأرقام الواردة في هذا الدرس:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

اعرض المسألة بوضوح، المعطيات بالوحدات، القانون المستخدم، خطوات التعويض الرياضي خطوة بخطوة، والنتيجة النهائية مع الوحدة الفيزيائية الصحيحة.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, answer: text });
    }

    // Default: 'full_explanation' - Complete 14-Step Grounded Engine
    const { contentsPayload } = buildExplainLessonPayload({
      sourceType,
      content,
      fileName,
      fileMimeType,
      studentLevel,
    });

    const rawResult = await generateGeminiContentWithRetry({
      contents: contentsPayload,
      config: { responseMimeType: 'application/json' },
    });

    const parsedData = parseJsonSafely(rawResult);

    return res.json({
      success: true,
      data: parsedData,
      meta: { sourceType, studentLevel, fileName },
    });
  } catch (error: any) {
    console.error('Explain Lesson API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحليل وشرح الدرس.',
    });
  }
});

/**
 * Helper to construct grounded prompt and payload for «اشرح لي الدرس»
 */
function buildExplainLessonPayload(params: {
  sourceType?: string;
  content?: string;
  fileName?: string;
  fileMimeType?: string;
  studentLevel?: string;
}) {
  const { sourceType, content, fileName, fileMimeType, studentLevel = 'intermediate' } = params;

  const levelMap: Record<string, string> = {
    beginner: 'مستوى مبتدئ: لغة عربية سهلة ومبسطة جداً، تفكيك المفاهيم المعقدة، تشبيهات عملية مبسطة، وتجنب الرموز الرياضية المعقدة دون تمهيد.',
    intermediate: 'مستوى متوسط: مناسب لطلاب البكالوريوس في هندسة الميكاترونكس، توازن بين الشرح النظري والقوانين الرياضية مع توضيح الوحدات والرموز.',
    advanced: 'مستوى متقدم: تفصيل رياضي وهندسي عميق، اشتقاقات القوانين، دوال التحويل، الاستجابة الترددية والزمنية، واستكشاف المشكلات.',
    specialized: 'مستوى هندسي متخصص: معايير التصميم الصناعي (ISO/IEEE)، اختيار المكونات الدقيقة، التوافق الكهرومغناطيسي، والتحكم المتقدم.',
  };

  const studentLevelInstruction = levelMap[studentLevel] || levelMap.intermediate;

  const systemPrompt = `أنت المدرس الأكاديمي المتخصص في منصة «دكتور الميكاترونكس الذكي» لخدمة «اشرح لي الدرس».
مستوى الشرح المطلوب: ${studentLevelInstruction}

قواعد الدقة والأمانة العلمية الصارمة:
1. قاعدة المصدر أولاً: اشرح ما هو موجود في المحتوى المرفوع أولاً، ولا تخترع معلومات أو معادلات أو أرقام أو نتائج غير موجودة في المصدر.
2. المعلومة الخارجية: إذا احتجت إلى مفهوم أساسي خارجي لفهم الدرس، وضّح للطالب بوضوح أن هذه "[معلومة توضيحية إضافية وليست من المحتوى المرفوع]".
3. الأخطاء العلمية بالمصدر: إذا كان هناك خطأ علمي واضح أو مطبعي في المحتوى المرفوع، اذكره في مصفوفة scientificErrorsFound، واعرض المعلومة كما هي في المصدر ثم وضّح التصحيح العلمي الصحيح.
4. المحتوى غير الواضح: إذا كانت الصورة أو الصفحة غير مقروءة، حدد sourceQuality كـ "unclear" أو "partially_clear" مع توضيح الجزء غير الواضح.
5. استخرج الجداول والمعادلات والرموز الفيزيائية ووحدات القياس (SI Units) بدقة متناهية.

يجب إرجاع الإجابة بتنسيق JSON حصراً يطابق الهيكل التالي:
{
  "lessonTitle": "عنوان الدرس المستخرج بدقة من المحتوى",
  "studentLevel": "${studentLevel}",
  "sourceType": "${sourceType || 'text'}",
  "objectives": ["الهدف التعليمي 1", "الهدف التعليمي 2"],
  "coreIdea": "الفكرة الأساسية للدرس في فقرة مركزة ومفهومة",
  "sourceAnalysis": {
    "detectedType": "نوع المحتوى المكتشف (ورقة كتاب / رسم دائرة / مسألة حسابية / جدول)",
    "sourceQuality": "clear",
    "unclearNotice": "",
    "scientificErrorsFound": [],
    "visualElements": [],
    "timelineParts": []
  },
  "concepts": [
    {
      "title": "المفهوم الأساسي",
      "explanation": "شرح تفصيلي تدريجي واضح",
      "engineeringNotes": "ملاحظة هندسية تطبيقية"
    }
  ],
  "terminology": [
    {
      "termArabic": "المصطلح بالعربية",
      "termEnglish": "English Term",
      "simpleDefinition": "تعريف مبسط وسهل"
    }
  ],
  "equations": [
    {
      "formula": "المعادلة أو القانون",
      "name": "اسم القانون",
      "description": "شرح ما تصفه هذه المعادلة وتفسير أجزائها",
      "symbols": [
        { "symbol": "V", "name": "الجهد", "unit": "V", "valueFromSource": "" }
      ],
      "stepByStepSolution": []
    }
  ],
  "solutionSteps": [],
  "practicalApplication": "تطبيق عملي واقعي على ما ورد في الدرس",
  "diagramsExplanation": "شرح الرسومات أو الجداول الموجودة في المصدر إن وُجدت",
  "mechatronicsConnection": "ربط المفاهيم بأنظمة الميكاترونكس والروبوتات والمتحكمات",
  "summary": ["نقطة ملخصة 1", "نقطة ملخصة 2"],
  "quizQuestions": [
    {
      "question": "سؤال قصير للتحقق من الفهم؟",
      "options": ["خيار أ", "خيار ب", "خيار ج", "خيار د"],
      "correctIndex": 0,
      "explanation": "تفسير الإجابة الصحيحة علمياً"
    }
  ],
  "quickOptions": ["شرح أبسط", "شرح أعمق", "مثال محلول", "اختبرني", "أعد الشرح من البداية"]
}`;

  let contentsPayload: any;

  const isBase64 =
    typeof content === 'string' &&
    (content.startsWith('data:') || (content.length > 500 && (sourceType === 'image' || sourceType === 'video' || sourceType === 'pdf')));

  if (isBase64) {
    let mime = fileMimeType || 'image/jpeg';
    let cleanData = content;

    if (content.startsWith('data:')) {
      const matches = content.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mime = matches[1] || mime;
        cleanData = matches[2];
      }
    }

    contentsPayload = {
      parts: [
        {
          inlineData: {
            mimeType: mime,
            data: cleanData,
          },
        },
        { text: systemPrompt },
      ],
    };
  } else {
    const textToAnalyze = typeof content === 'string' && content.trim()
      ? `المحتوى المرفوع من الطالب (${fileName || 'نص / مستند'}):\n${content}`
      : `المحتوى: ${fileName || 'درس ميكاترونكس'}`;

    contentsPayload = {
      parts: [
        { text: systemPrompt },
        { text: textToAnalyze },
      ],
    };
  }

  return { contentsPayload, systemPrompt };
}

// ==========================================
// VERCEL AI SDK `streamText` & WHATWG ReadableStream Engine
// ==========================================

/**
 * Uses Vercel AI SDK's `streamText` function from the `ai` package
 * to stream output progressively in chunks via WHATWG ReadableStream<Uint8Array>
 */
function createVercelAiSdkStream(params: {
  systemPrompt: string;
  prompt: string;
  contentsPayload: any;
  isBase64?: boolean;
  metadata?: any;
  streamType: 'explain' | 'summarize';
}): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // 0. High-concurrency LRU Cache lookup: Instant (<5ms) responses for common questions/summaries
      const cacheKey = computeCacheKey(
        params.streamType,
        params.prompt,
        `${params.metadata?.studentLevel || ''}_${params.metadata?.summaryType || ''}`
      );

      if (!params.isBase64) {
        const cached = aiResponseCache.get(cacheKey);
        if (cached && (cached.text || cached.data)) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                stage: 'reading',
                message: 'تم استرجاع المحتوى فورياً من الذاكرة المؤقتة فائقة السرعة (Ultra-Fast Cache)...',
              })}\n\n`
            )
          );

          const fullText = cached.text || JSON.stringify(cached.data);
          const chunkSize = 300;
          for (let i = 0; i < fullText.length; i += chunkSize) {
            const chunk = fullText.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`));
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                data: cached.data,
                meta: { ...params.metadata, fromCache: true },
              })}\n\n`
            )
          );
          controller.close();
          return;
        }
      }

      // 1. Send immediate start event frame (<50ms) to defeat Vercel 504 timeouts
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'start',
            stage: 'reading',
            message: `تم فتح دفق Vercel AI SDK (streamText) وبدء معالجة وبث ${params.streamType === 'explain' ? 'الشرح' : 'التلخيص'} مباشرة...`,
          })}\n\n`
        )
      );

      let accumulatedText = '';
      let streamSucceeded = false;

      // Primary engine: Vercel AI SDK's streamText
      if (!params.isBase64 && apiKey) {
        try {
          const google = createGoogleGenerativeAI({ apiKey });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'status',
                stage: 'streaming',
                message: 'جاري البث الحي لمخرجات النموذج عبر Vercel AI SDK (streamText)...',
              })}\n\n`
            )
          );

          const result = streamText({
            model: google('gemini-2.0-flash'),
            system: params.systemPrompt,
            prompt: params.prompt,
          });

          for await (const textPart of result.textStream) {
            if (textPart) {
              accumulatedText += textPart;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: textPart })}\n\n`)
              );
            }
          }

          streamSucceeded = true;
        } catch (sdkErr: any) {
          console.warn('[Vercel AI SDK streamText Error, falling back to native stream]:', sdkErr?.message);
        }
      }

      // Secondary / Multimodal Cascade via @google/genai generateContentStream
      if (!streamSucceeded) {
        try {
          const ai = getGeminiClient();
          const cascadeModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

          for (const modelName of cascadeModels) {
            try {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'status',
                    stage: 'streaming',
                    message: `جاري توليد وبث النتائج تدريجياً عبر (${modelName})...`,
                  })}\n\n`
                )
              );

              const streamResult = await ai.models.generateContentStream({
                model: modelName,
                contents: params.contentsPayload,
                config: { responseMimeType: 'application/json' },
              });

              for await (const chunk of streamResult) {
                const text = chunk.text || '';
                if (text) {
                  accumulatedText += text;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`)
                  );
                }
              }

              streamSucceeded = true;
              break;
            } catch (innerErr: any) {
              console.warn(`[Stream Model Cascade] ${modelName} error:`, innerErr?.message);
            }
          }
        } catch (genaiErr: any) {
          console.error('[Fallback Stream Error]:', genaiErr);
        }
      }

      // Finalize JSON payload
      if (streamSucceeded && accumulatedText) {
        let parsedData: any;
        try {
          parsedData = parseJsonSafely(accumulatedText);
        } catch (_parseErr) {
          if (params.streamType === 'explain') {
            parsedData = {
              lessonTitle: params.metadata?.fileName || 'درس ميكاترونكس',
              studentLevel: params.metadata?.studentLevel || 'intermediate',
              sourceType: params.metadata?.sourceType || 'text',
              objectives: ['فهم موضوع الدرس واستيعاب المفاهيم الهندسية'],
              coreIdea: accumulatedText.slice(0, 300),
              sourceAnalysis: {
                detectedType: 'محتوى هندسي / درس ميكاترونكس',
                sourceQuality: 'clear',
                scientificErrorsFound: [],
                visualElements: [],
                timelineParts: [],
              },
              concepts: [
                {
                  title: 'شرح الدرس الأكاديمي',
                  explanation: accumulatedText,
                  engineeringNotes: 'تم بث المخرجات تدريجياً عبر Vercel AI SDK streamText.',
                },
              ],
              terminology: [],
              equations: [],
              solutionSteps: [],
              practicalApplication: 'تطبيقات عملية في أنظمة الميكاترونكس والروبوتات.',
              diagramsExplanation: '',
              mechatronicsConnection: 'ربط مباشر بمجالات التحكم والروبوتات والمتحكمات.',
              summary: ['تم استكمال الشرح التدريجي بنجاح.'],
              quizQuestions: [],
              quickOptions: ['شرح أبسط', 'شرح أعمق', 'مثال محلول', 'اختبرني'],
            };
          } else {
            parsedData = {
              title: params.metadata?.fileName || 'ملخص المحاضرة',
              summaryType: params.metadata?.summaryType || 'medium',
              generalIdea: accumulatedText.slice(0, 300),
              keyPoints: [accumulatedText.slice(0, 150)],
              conceptsAndDefinitions: [],
              equations: [],
              examples: [],
              importantNotes: ['تم تلخيص المحتوى تدريجياً عبر Vercel AI SDK streamText.'],
              conclusion: 'تم استكمال التلخيص المباشر بنجاح.',
              diagramsSummary: [],
              chaptersOrSections: [],
            };
          }
        }

        // Cache result for 2 hours to serve subsequent students with zero delay
        if (!params.isBase64 && parsedData) {
          aiResponseCache.set(cacheKey, { text: accumulatedText, data: parsedData }, 2 * 3600 * 1000);
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', data: parsedData, meta: params.metadata })}\n\n`
          )
        );
      } else {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'تعذر استكمال بث المحتوى من نموذج الذكاء الاصطناعي.' })}\n\n`
          )
        );
      }

      controller.close();
    },
  });
}

/**
 * Express handler piping Explain Lesson stream to the HTTP response
 */
async function handleExplainLessonStreamResponse(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const { sourceType, content, fileName, fileMimeType, studentLevel = 'intermediate' } = req.body || {};
  const metadata = { sourceType, studentLevel, fileName };

  const { contentsPayload, systemPrompt } = buildExplainLessonPayload({
    sourceType,
    content,
    fileName,
    fileMimeType,
    studentLevel,
  });

  const textToAnalyze = typeof content === 'string' && !content.startsWith('data:')
    ? content
    : `درس ميكاترونكس: ${fileName || ''}`;

  const isBase64 =
    typeof content === 'string' &&
    (content.startsWith('data:') || (content.length > 500 && (sourceType === 'image' || sourceType === 'video' || sourceType === 'pdf')));

  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (_err) {}
  }, 5000);

  try {
    const readable = createVercelAiSdkStream({
      systemPrompt,
      prompt: textToAnalyze,
      contentsPayload,
      isBase64,
      metadata,
      streamType: 'explain',
    });

    const reader = readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch (error: any) {
    console.error('[Explain Lesson Stream Fatal Error]:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error?.message || 'حدث خطأ أثناء تدفق البيانات.' })}\n\n`);
  } finally {
    clearInterval(keepAliveTimer);
    res.end();
  }
}

geminiRouter.post('/explain-lesson-stream', handleExplainLessonStreamResponse);

/**
 * Helper to construct prompt and contents payload for «لخّص لي»
 */
function buildSummarizePayload(params: {
  summaryType?: string;
  content?: string;
  fileName?: string;
  fileMimeType?: string;
  chapterSelection?: string;
}) {
  const {
    summaryType = 'medium',
    content,
    fileName = 'محاضرة ميكاترونكس',
    fileMimeType,
    chapterSelection = 'all',
  } = params;

  const typeGuide: Record<string, string> = {
    quick: 'ملخص سريع: قصير وموجز جداً للمراجعة السريعة في 3 دقائق، يركز فقط على أهم 5 خلاصات والقوانين الجوهرية دون تفاصيل ثانوية.',
    medium: 'ملخص متوسط: متوازن وواضح يحتوي على أهم الأفكار والقوانين والتعريفات والأمثلة التطبيقية دون حشو.',
    comprehensive: 'ملخص شامل: تفصيلي ومكتمل، يحافظ على كافة المعلومات الهندسية والأرقام والاشتقاقات المهمة مع التخلص من الكلام الإنشائي والتكرار.',
    study: 'ملخص للمذاكرة والاختبار: يركز تحديداً على النقاط المرشحة للاختبارات، القوانين وطريقة التعويض، والتعريفات التي يجب حفظها وفهمها.',
    cheatsheet: 'ورقة مراجعة (Cheat Sheet): جدول وقوائم مكثفة جداً وسريعة القراءة للمراجعة في ليلة الاختبار (القوانين، الرموز، الوحدات، أهم الملاحظات).',
  };

  const systemPrompt = `أنت الخبير الأكاديمي المتخصص في خدمة «لخّص لي» لطلاب هندسة الميكاترونكس.
نوع التلخيص المطلوب: ${typeGuide[summaryType] || typeGuide.medium}
اختيار الفصل أو الجزء: ${chapterSelection === 'all' ? 'كامل الملف' : chapterSelection}

قواعد الأمانة والدقة الهندسية:
1. قاعدة الحقيقة والمصدر: لا تخترع معلومات أو أرقام أو قوانين غير موجودة في الملف.
2. التبسيط الذكي: لغة عربية فصحى سهلة مع الحفاظ الكامل على المفاهيم الجوهرية.
3. المعادلات والقوانين: اعرض القانون وفسّر كل رمز ووحدته (SI).

يجب إرجاع النتيجة بتنسيق JSON حصراً كالتالي:
{
  "title": "عنوان المحاضرة",
  "summaryType": "${summaryType}",
  "generalIdea": "شرح مختصر ومكثف جداً عن موضوع المحاضرة وفكرتها العامة",
  "keyPoints": ["النقطة الجوهرية الأولى", "النقطة الجوهرية الثانية"],
  "conceptsAndDefinitions": [
    { "termArabic": "المصطلح", "termEnglish": "Term", "definition": "التعريف" }
  ],
  "equations": [
    {
      "formula": "V = I * R",
      "name": "قانون أوم",
      "symbolMeanings": [
        { "symbol": "V", "meaning": "الجهد", "unit": "V" }
      ],
      "usageContext": "لحساب الجهد أو التيار"
    }
  ],
  "examples": [],
  "importantNotes": ["ملاحظة هامة للمذاكرة"],
  "conclusion": "خلاصة مكثفة بأهم ما يجب أن يتذكره الطالب",
  "diagramsSummary": [],
  "chaptersOrSections": []
}`;

  let contentsPayload: any;
  let textToAnalyze = '';

  const isBase64 =
    typeof content === 'string' &&
    (content.startsWith('data:') || (content.length > 500 && (fileMimeType?.startsWith('image/') || fileMimeType?.startsWith('application/pdf'))));

  if (isBase64) {
    let mime = fileMimeType || 'application/pdf';
    let cleanData = content;

    if (content.startsWith('data:')) {
      const matches = content.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mime = matches[1] || mime;
        cleanData = matches[2];
      }
    }

    contentsPayload = {
      parts: [
        {
          inlineData: {
            mimeType: mime,
            data: cleanData,
          },
        },
        { text: systemPrompt },
      ],
    };
  } else {
    textToAnalyze = typeof content === 'string' && content.trim()
      ? `محتوى الملف / المحاضرة (${fileName}):\n${content}`
      : `المحتوى: ${fileName}`;

    contentsPayload = {
      parts: [
        { text: systemPrompt },
        { text: textToAnalyze },
      ],
    };
  }

  return { contentsPayload, systemPrompt, textToAnalyze, isBase64 };
}

/**
 * Express handler piping Summarize stream to the HTTP response
 */
async function handleSummarizeStreamResponse(req: Request, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const {
    summaryType = 'medium',
    content,
    fileName = 'محاضرة ميكاترونكس',
    fileMimeType,
    chapterSelection = 'all',
  } = req.body || {};
  const metadata = { summaryType, fileName, chapterSelection };

  const { contentsPayload, systemPrompt, textToAnalyze, isBase64 } = buildSummarizePayload({
    summaryType,
    content,
    fileName,
    fileMimeType,
    chapterSelection,
  });

  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (_err) {}
  }, 5000);

  try {
    const readable = createVercelAiSdkStream({
      systemPrompt,
      prompt: textToAnalyze || `قم بتلخيص المحاضرة الهندسية: ${fileName}`,
      contentsPayload,
      isBase64,
      metadata,
      streamType: 'summarize',
    });

    const reader = readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch (error: any) {
    console.error('[Summarize Stream Error]:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error?.message || 'حدث خطأ أثناء بث التلخيص.' })}\n\n`);
  } finally {
    clearInterval(keepAliveTimer);
    res.end();
  }
}

geminiRouter.post('/summarize-stream', handleSummarizeStreamResponse);

// ==========================================
// API: «لخّص لي» (Summarize Service)
// ==========================================
geminiRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const {
      summaryType = 'medium',
      content,
      fileName = 'محاضرة ميكاترونكس',
      fileMimeType,
      mode = 'summarize',
      summaryContext,
      chapterSelection = 'all',
    } = req.body || {};

    // Progressive streaming detection via Accept header or stream flag
    if (
      (mode === 'summarize' || !mode) &&
      (req.headers.accept?.includes('text/event-stream') || req.body?.stream === true || req.query?.stream === 'true')
    ) {
      return handleSummarizeStreamResponse(req, res);
    }

    if (mode === 'to_questions') {
      const prompt = `بناءً على محتوى هذا الملخص والمحاضرة فقط دون اختراع معلومات خارجية:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

حوّل هذا الملخص إلى 8 أسئلة مراجعة وتدريب ذكية مع الإجابة النموذجية الكاملة والدقيقة لكل سؤال مستخرجة حصراً من المحاضرة.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, resultText: text });
    }

    if (mode === 'extract_formulas') {
      const prompt = `استخرج ورقة القوانين والمعادلات الرياضية والهندسية فقط ("بطاقة القوانين") من هذه المحاضرة:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

لكل قانون:
1. اعرض صيغته كما وردت في المصدر.
2. وضح معنى كل رمز ووحدته الفيزيائية (SI Units).
3. وضح متى وكيف يستخدم القانون، وأي شروط خاصة.
لا تخترع قوانين غير موجودة في المحتوى.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, resultText: text });
    }

    if (mode === 'extract_definitions') {
      const prompt = `استخرج معجم المفاهيم والتعريفات الهندسية من هذه المحاضرة:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

لكل مصطلح: المصطلح بالعربية مع الإنجليزي المقابل، والتعريف العلمي المبسط.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, resultText: text });
    }

    if (mode === 'explain_hard_points') {
      const prompt = `استخرج واشرح "النقاط الصعبة" أو المعقدة في هذه المحاضرة بأسلوب مبسط وتوضيحي:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

فكك الأفكار الصعبة، اشرح السبب الفيزيائي، واستخدم تشبيهات هندسية سهلة الفهم لطلاب الميكاترونكس.`;

      const text = await generateGeminiContentWithRetry({ contents: prompt });
      return res.json({ success: true, resultText: text });
    }

    const isBase64 = typeof content === 'string' && (content.startsWith('data:') || content.length > 500);
    const cacheKey = computeCacheKey('summarize_nonstream', typeof content === 'string' ? content : fileName, `${summaryType}_${chapterSelection}`);

    if (!isBase64) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          meta: { summaryType, fileName, fromCache: true },
        });
      }
    }

    const { contentsPayload } = buildSummarizePayload({
      summaryType,
      content,
      fileName,
      fileMimeType,
      chapterSelection,
    });

    const rawResult = await generateGeminiContentWithRetry({
      contents: contentsPayload,
      config: { responseMimeType: 'application/json' },
    });

    const parsedData = parseJsonSafely(rawResult);

    if (!isBase64 && parsedData) {
      aiResponseCache.set(cacheKey, parsedData, 2 * 3600 * 1000);
    }

    return res.json({
      success: true,
      data: parsedData,
      meta: { summaryType, fileName },
    });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تلخيص المحتوى.',
    });
  }
});

/**
 * Shared Multimodal Parts Builder supporting:
 * - Image data URLs / Camera captures
 * - Video keyframes array (extracted client-side) or direct small video base64
 * - PDF documents inlineData
 * - Plain text / code files
 * - Social media / video URLs with automatic Gemini urlContext + googleSearch grounding
 */
function buildMultimodalPayload(params: {
  promptText: string;
  uploadedContent?: string;
  uploadedMimeType?: string;
  videoFrames?: string[];
  socialUrl?: string;
}): { contentsPayload: any; useWebTools: boolean; plainTextAttach: string } {
  const { promptText, uploadedContent, uploadedMimeType, videoFrames, socialUrl } = params;
  const parts: any[] = [];
  let plainTextAttach = '';

  // 1. Add video frames if provided
  if (Array.isArray(videoFrames) && videoFrames.length > 0) {
    videoFrames.slice(0, 6).forEach((frameUrl) => {
      if (typeof frameUrl === 'string' && frameUrl.startsWith('data:')) {
        const matches = frameUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches[2]) {
          parts.push({
            inlineData: {
              mimeType: matches[1] || 'image/jpeg',
              data: matches[2],
            },
          });
        }
      }
    });
  } else if (typeof uploadedContent === 'string' && uploadedContent.trim()) {
    const rawUploaded = uploadedContent.trim();
    if (rawUploaded.startsWith('data:')) {
      const matches = rawUploaded.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const mime = matches[1] || uploadedMimeType || 'image/jpeg';
        if (mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('video/')) {
          parts.push({
            inlineData: {
              mimeType: mime,
              data: matches[2],
            },
          });
        } else {
          // Handle Office OOXML (.docx / .pptx) or plain base64 text cleanly
          try {
            const buf = Buffer.from(matches[2], 'base64');
            if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
              // Extract readable text from PKZIP XML entries (word/document.xml, ppt/slides/slide*.xml)
              const extractedChunks: string[] = [];
              let offset = 0;
              while (offset + 30 < buf.length && extractedChunks.length < 30) {
                if (buf.readUInt32LE(offset) !== 0x04034b50) break;
                const method = buf.readUInt16LE(offset + 8);
                const compSize = buf.readUInt32LE(offset + 18);
                const nameLen = buf.readUInt16LE(offset + 26);
                const extraLen = buf.readUInt16LE(offset + 28);
                const entryName = buf.toString('utf8', offset + 30, offset + 30 + nameLen);
                const dataStart = offset + 30 + nameLen + extraLen;
                const dataEnd = compSize > 0 ? Math.min(buf.length, dataStart + compSize) : dataStart;
                if (
                  dataEnd > dataStart &&
                  /(document\.xml|slides\/slide\d+\.xml)$/i.test(entryName)
                ) {
                  try {
                    const rawXml =
                      method === 8
                        ? zlib.inflateRawSync(buf.subarray(dataStart, dataEnd)).toString('utf8')
                        : buf.subarray(dataStart, dataEnd).toString('utf8');
                    const cleanXmlText = rawXml
                      .replace(/<[^>]+>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
                    if (cleanXmlText) extractedChunks.push(cleanXmlText);
                  } catch {}
                }
                if (compSize === 0) break;
                offset = dataEnd;
              }
              plainTextAttach = extractedChunks.join('\n').slice(0, 12000);
            } else {
              plainTextAttach = buf.toString('utf8').slice(0, 12000);
            }
          } catch {}
        }
      }
    } else if (!rawUploaded.startsWith('blob:')) {
      plainTextAttach = extractRelevantContentChunk(rawUploaded, promptText, 4000);
    }
  }

  const cleanUrl = typeof socialUrl === 'string' ? socialUrl.trim() : '';
  const useWebTools = Boolean(cleanUrl && /^https?:\/\//i.test(cleanUrl));

  const fullText = [
    promptText,
    plainTextAttach ? `\n--- محتوى الملف/المستند المرفق ---\n${plainTextAttach}\n` : '',
    cleanUrl ? `\n--- رابط الفيديو/المنشور المرفق للتحليل والاستخراج ---\n${cleanUrl}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');

  parts.push({ text: fullText });

  return {
    contentsPayload: parts.length === 1 ? parts[0].text : { parts },
    useWebTools,
    plainTextAttach,
  };
}

// ==========================================
// API: Dr. Smart Whiteboard Explain (قاعة الدكتور الذكي)
// ==========================================
geminiRouter.post('/explain', async (req: Request, res: Response) => {
  const ip = (req as any).clientIp || '127.0.0.1';
  const estimatedTokens = (req as any).estimatedTokens || 500;

  try {
    const {
      doctorName,
      subject,
      level,
      language,
      lessonTitle,
      userPrompt,
      uploadedContent,
      uploadedMimeType,
      socialUrl,
      videoFrames,
    } = req.body;

    const promptText = `أنت "${doctorName || 'دكتور الميكاترونكس الذكي'}"، أستاذ جامعي يمني خبير في ${subject || 'هندسة الميكاترونكس'}.
المستوى: ${level || 'متوسط'}.
اللغة والأسلوب: ${language === 'en' ? 'English engineering explanation' : 'العربية بلهجة أستاذ جامعي يمني ودودة وواضحة ومحببة للطالب مع المصطلحات الإنجليزية الدقيقة'}.

عنوان الدرس/السؤال: ${lessonTitle || userPrompt || 'استفسار هندسي'}
تفاصيل سؤال الطالب: ${userPrompt || 'اشرح المفهوم المرفق بوضوح على السبورة مع أمثلة واقعية ورسومات توضيحية'}

المطلوب بدقة:
1. حلّل ما أرسله الطالب (نص / صورة / صورة مصورة بالكاميرا / فيديو / ملف / رابط فيديو).
2. اشرحه شرحاً كاملاً مفهوماً يرسخ في ذهن الطالب مع أمثلة واقعية من الحياة والبيئة الصناعية اليمنية والعالمية.
3. ارسم مخططاً توضيحياً للسبورة الذكية (circuit أو gears أو plc أو arduino أو servo أو graph أو mindmap) مع العقد والمعادلات.

يرجى إرجاع الإجابة بتنسيق JSON صالح فقط بالهيكل التالي:
{
  "title": "عنوان المحاضرة/الإجابة",
  "objectives": ["هدف 1", "هدف 2", "هدف 3"],
  "sections": [
    {
      "heading": "عنوان القسم التعليمي",
      "content": "الشرح التفصيلي بأسلوب الدكتور الواضح والمبسط...",
      "whiteboardNotes": "القانون أو الملاحظة المركزة على السبورة",
      "whiteboardDiagramType": "circuit",
      "diagramCommands": ["DRAW_LABEL: المفهوم الهندسي"]
    }
  ],
  "realWorldExamples": [
    {
      "title": "عنوان المثال الواقعي",
      "yemeniAnalogy": "تشبيه عملي من الحياة اليومية اليمنية يقرّب الفكرة فوراً",
      "engineeringApplication": "تطبيق صناعي وميكاتروني حقيقي في المصانع والروبوتات"
    }
  ],
  "visualDiagram": {
    "diagramType": "circuit",
    "diagramTitle": "عنوان الرسم التوضيحي على السبورة",
    "equation": "المعادلة الرياضية أو المنطقية الرئيسية",
    "nodes": [
      { "label": "العنصر 1", "value": "القيمة/الدور", "role": "Input" },
      { "label": "العنصر 2", "value": "القيمة/الدور", "role": "Process" },
      { "label": "العنصر 3", "value": "القيمة/الدور", "role": "Output" }
    ]
  },
  "solvedExample": {
    "problem": "مسألة تطبيقية أو مثال محلول من واقع السؤال",
    "steps": ["خطوة 1", "خطوة 2", "خطوة 3"],
    "finalAnswer": "النتيجة النهائية بالوحدات"
  },
  "summary": "ملخص الدكتور الصوتي المركز بأسلوب أستاذ جامعي يمني ودود ومشجع",
  "quiz": []
}`;

    const { contentsPayload, useWebTools } = buildMultimodalPayload({
      promptText,
      uploadedContent,
      uploadedMimeType,
      videoFrames,
      socialUrl,
    });

    const config: any = useWebTools
      ? { tools: [{ urlContext: {} }, { googleSearch: {} }] }
      : { responseMimeType: 'application/json' };

    const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
      return await generateGeminiContentWithRetry({
        contents: contentsPayload,
        config,
      });
    });

    const parsed = parseJsonSafely(text || '{}');

    res.json({
      success: true,
      data: parsed,
      meta: { estimatedTokens, queueStats: geminiQueue.getStats() },
    });
  } catch (error: any) {
    console.error('Gemini Explain Error:', error);
    res.status(500).json({ success: false, error: error.message || 'فشل محرك تحليل الشرح' });
  }
});

// ==========================================
// API: Smart Assistant
// ==========================================
geminiRouter.post('/assistant', async (req: Request, res: Response) => {
  const { mode, userQuery, codeSnippet, imageBase64 } = req.body;

  try {
    const sysInstruction = `أنت مساعد الميكاترونكس الذكي المتخصص في الهندسة الكهربائية، الإلكترونيات، البرمجة (Arduino/C++)، التحكم والروبوتات.
قدم إجابات هندسية دقيقة، موثوقة، مدعومة بالمعادلات والوحدات.`;

    let contentPrompt = userQuery || 'اشرح طريقة اختيار المحرك المناسب للروبوت بناءً على العزم والسرعة.';

    if (mode === 'code_review') {
      const truncatedCode = (codeSnippet || '').slice(0, 3000);
      contentPrompt = `افحص كود الأردوينو/الميكاترونكس التالي، اكتشف أي أخطاء برمجية، قدم الكود المصحح:\n\n\`\`\`cpp\n${truncatedCode}\n\`\`\``;
    } else if (mode === 'circuit_troubleshoot') {
      contentPrompt = `تحليل واستكشاف أعطال الدائرة:\n${userQuery}`;
    }

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: contentPrompt });

    const text = await generateGeminiContentWithRetry({
      contents: parts.length === 1 ? parts[0].text : { parts },
      config: { systemInstruction: sysInstruction },
    });

    res.json({ success: true, answer: text });
  } catch (error: any) {
    console.error('Gemini Assistant Error:', error);
    res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء الاتصال بالمساعد الذكي' });
  }
});

// ==========================================
// API: Arduino Code Generator
// ==========================================
geminiRouter.post('/arduino-gen', async (req: Request, res: Response) => {
  try {
    const { projectDescription, components } = req.body;

    const prompt = `اكتب كود Arduino C++ احترافي ومكتمل لـ:
الوصف: ${projectDescription}
المكونات المتوفرة: ${JSON.stringify(components)}

يرجى إرجاع JSON بالشكل:
{
  "code": "// Arduino C++ Code...",
  "explanation": "شرح العمل وتوصيل الدائرة",
  "pinouts": [
    {"component": "LED", "pin": "13", "description": "توصيل مع المقاومة 220 أوم"}
  ]
}`;

    const text = await generateGeminiContentWithRetry({
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    res.json({ success: true, data: parseJsonSafely(text || '{}') });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// API: «قاعة المحاضرات والسبورة الذكية» (Interactive Lecture Hall)
// Friendly Yemeni Professor Persona (San'ani / Adani / Ta'izzi)
// ==========================================
geminiRouter.post('/lecture-hall', async (req: Request, res: Response) => {
  try {
    const {
      serviceType = 'explain',
      dialect = 'sanani',
      courseSubject = 'electronics',
      topic = '',
      question = '',
      extraDetails = '',
      socialUrl = '',
      uploadedContent = '',
      uploadedMimeType = '',
      videoFrames = [],
      fileName = '',
      stepIndex = 1,
      confusionPoint = '',
    } = req.body || {};

    const dialectGuide: Record<string, string> = {
      sanani: `تحدث باللهجة الصنعانية الأصيلة والمحببة للطلاب:
- استخدم عبارات صنعانية طبيعية ومرحبة: "أهلاً وسهلاً بك يا مهندس"، "شوف يا ابني الموضوع بسيط جداً"، "خلّينا نمشي حبة حبة"، "تذكّر المهندس اليمني ما يعرف مستحيل".
- اضرب أمثلة وتشبيهات من الحياة والبيئة اليمنية في صنعاء (مثل: تشبيه سريان التيار الكهربائي وضغط الجهد بشبكة خزانات ومياه صنعاء، أو تعشيق التروس بتروس المطاحن في سوق الملح).
- حافظ على دقة المصطلحات الهندسية بالإنجليزية (Voltage, Current, PWM, PID, Ladder Logic, Op-Amp, Kinematics, Arduino).`,
      adani: `تحدث باللهجة العدنية الأصيلة المحببة للطلاب:
- استخدم عبارات عدنية ودودة: "يا بوي ركّز معي"، "الموضوع عسل وسهل"، "خلّنا نفكك الدائرة خطوة خطوة"، "والله إنك مهندس شاطر وبطل"، "ما فيش شي صعب على عيال اليمن".
- اضرب أمثلة عملية مع الحفاظ التام على الدقة العلمية والمصطلحات الإنجليزية.`,
      taizzi: `تحدث باللهجة التعزية الأصيلة المحببة للطلاب:
- استخدم عبارات تعزية مألوفة وذكية: "يا خي اسمعني زين"، "الهندسة عقل وفهم مو بس حفظ"، "بنحلها سوا حبة حبة"، "المهندس اليمني ذكي ومبدع بالفطرة".
- اضرب أمثلة عملية ذكية وواضحة مع دقة المصطلحات العلمية.`,
    };

    const courseMap: Record<string, string> = {
      control: 'التحكم الآلي والأتمتة الصناعية (Automatic Control & PLC)',
      electronics: 'الإلكترونيات والدوائر الكهربائية (Electronics & Circuits)',
      mechanics: 'الميكانيكا وعزم التروس (Mechanics & Dynamics)',
      programming: 'المتحكمات المضمنة والبرمجة (Embedded Systems & Arduino)',
      robotics: 'هندسة الروبوتات والذكاء الاصطناعي (Robotics & Kinematics)',
    };

    const currentDialectPrompt = dialectGuide[dialect] || dialectGuide.sanani;
    const currentCourseName = courseMap[courseSubject] || courseMap.electronics;

    const cacheKey = computeCacheKey(
      `lecture_hall_${serviceType}_${dialect}_${courseSubject}`,
      `${topic}_${question}_${extraDetails}_${socialUrl}_${confusionPoint}_${stepIndex}`
    );

    const hasMedia =
      (typeof uploadedContent === 'string' && uploadedContent.trim().length > 0) ||
      (Array.isArray(videoFrames) && videoFrames.length > 0) ||
      Boolean(socialUrl);

    if (!hasMedia) {
      const cached = aiResponseCache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }
    }

    let serviceInstruction = '';

    if (serviceType === 'explain') {
      serviceInstruction = `المهمة: قسم "اشرح لي" داخل قاعة المحاضرات الذكية:
- استخرج جميع الشرح والمفاهيم والمعادلات والخطوات من المحتوى المرفوع بالكامل (سواء نص، صورة، فيديو، ملف، أو رابط فيديو من مواقع التواصل الاجتماعي) مع الأخذ بكل ما طلبه الطالب في "التفاصيل الإضافية".
- اشرح المفهوم بأسلوب الأستاذ اليمني الودود مع تشبيه واقعي من اليمن وتطبيق هندسي صناعي.
- نظم الشرح ليعرض على السبورة الذكية بأنيميشن ذكي وخطوات متسلسلة ورسومات توضيحية تسهل على الطالب الفهم السريع.
- اختتم حديثك بالسؤال الودود: "فهمت ولا نعيدها بطريقة ثانية يا مهندس؟"`;
    } else if (serviceType === 'ask_doctor') {
      serviceInstruction = `المهمة: إجابة تفاعلية مباشرة مع الطالب كأستاذ يمني جالس معه في القاعة:
- ابدأ بترحيب ودود مثل: "سؤالك في الصميم يا مهندس"، "خلّينا نفكر مع بعض حبة حبة".
- أجب بدقة علمية مع التبسيط والرسومات على السبورة.`;
    } else if (serviceType === 'solve_homework') {
      serviceInstruction = `المهمة: تلخيص وتبسيط المحاضرة أو حل النقاط الصعبة خطوة بخطوة:
- قسّم العرض إلى 4 مراحل متتابعة واضحة على السبورة الذكية.`;
    } else if (serviceType === 'quiz_me') {
      serviceInstruction = `المهمة: صياغة سؤال اختبار ذكي على السبورة لقياس فهم الطالب:
- سؤال اختيار من متعدد (4 خيارات، خيار واحد صحيح) مع تفسير يمني مشجع.`;
    } else if (serviceType === 'did_not_understand') {
      serviceInstruction = `المهمة: زر الطوارئ التعليمية (لم أفهم):
- أعد الشرح بطريقة مختلفة تماماً وبمستوى أبسط بكثير وتشبيه فيزيائي بديل.
- ركّز على نقطة الغموض التي حددها الطالب: "${confusionPoint || 'الفكرة الأساسية'}".`;
    }

    const systemPrompt = `أنت "دكتور الميكاترونكس الذكي" - الأستاذ الأكاديمي المرموق والمحبوب لطلاب هندسة الميكاترونكس في الجامعات اليمنية.

🎙️ الهوية الصوتية والإلقائية الإلزامية:
- الصوت والشخصية: أستاذ وأب أكاديمي يمني (ذكر بالغ Adult Male)، عمرك الصوتي بين 40 و 50 سنة.
- ممنوع منعاً باتاً استخدام أي صيغة أو ضمائر أنثوية لنفسك.
- الإلقاء بوقفات تعليمية طبيعية متزنة وفواصل واضحة في حقل doctorSpeech.
${currentDialectPrompt}

المقرر: ${currentCourseName}
الموضوع: ${topic || 'هندسة الميكاترونكس'}
المحتوى/السؤال الأساسي: ${question || 'اشرح لي هذا الدرس بالتفصيل'}
${extraDetails ? `📌 تفاصيل إضافية طلبها الطالب: ${extraDetails}` : ''}
${fileName ? `📎 اسم الملف المرفق: ${fileName}` : ''}

${serviceInstruction}

أرجع النتيجة حصراً بصيغة JSON صالح فقط بالهيكل التالي (بدون نص خارج JSON):
{
  "doctorSpeech": "الشرح الصوتي الكامل والممتع بلهجة يمنية أصيلة وودودة يشمل الترحيب، كل الأفكار المستخرجة، والتشبيه اليمني، والخاتمة...",
  "boardTitle": "عنوان المفهوم المكتوب بخط عريض أعلى السبورة الذكية",
  "boardNotes": [
    "النقطة الرئيسية الأولى المستخرجة من المحتوى",
    "النقطة الرئيسية الثانية والقانون",
    "الخلاصة السريعة للتطبيق الهندسي"
  ],
  "boardEquation": "المعادلة الرياضية الرئيسية بصيغة واضحة",
  "diagramType": "circuit",
  "diagramTitle": "عنوان الرسم التوضيحي المتحرك على السبورة",
  "diagramData": {
    "keyMetrics": ["عنصر 1", "عنصر 2", "عنصر 3"],
    "summary": "وصف سريع لما يوضحه الرسم التوضيحي للطالب",
    "nodes": [
      { "id": "n1", "label": "المدخل Input", "sub": "تفصيل مختصر" },
      { "id": "n2", "label": "المعالجة Process", "sub": "تفصيل مختصر" },
      { "id": "n3", "label": "المخرج Output", "sub": "تفصيل مختصر" }
    ]
  },
  "steps": [
    { "phase": "الخطوة 1: الفكرة الأساسية", "details": "تفصيل واضح مستخرج من المصدر..." },
    { "phase": "الخطوة 2: تحليل القوانين والعلاقات", "details": "شرح المعادلة والرموز..." },
    { "phase": "الخطوة 3: المثال العملي والتطبيق", "details": "تطبيق بالأرقام أو الواقع..." },
    { "phase": "الخطوة 4: الخلاصة الهندسية السريعة", "details": "أهم ما يجب تذكره للامتحان والعمل..." }
  ],
  "realWorldExamples": [
    {
      "title": "مثال واقعي من الحياة والمصانع",
      "yemeniAnalogy": "تشبيه يمني بسيط من الواقع",
      "engineeringApplication": "تطبيق هندسي مباشر في الميكاترونكس"
    }
  ],
  "quiz": {
    "question": "سؤال سريع للتحقق من فهم الطالب...",
    "options": ["أ", "ب", "ج", "د"],
    "correctIndex": 0,
    "explanation": "تفسير الإجابة..."
  },
  "yemeniEncouragement": "تذكّر: المهندس اليمني ما يعرف مستحيل! 🇾🇪",
  "followupOptions": ["اشرح بمثال عملي إضافي", "أعطني مسألة اختبار", "لخّص أهم القوانين"],
  "whiteboardScript": "سكربت السبورة البيضاء المتحركة بنمط [TEXT]...[/TEXT] و [DRAW]...[/DRAW] بالتتابع الزمني. قواعد الرسم الإلزامية: مساحة الإحداثيات X من 60 إلى 840 (المنتصف 450) و Y من 40 إلى 390 (المنتصف 210). البطارية العمودية BATTERY(x,y,\"12V\") طرفاها عند (x, y-40) للأعلى و (x, y+40) للأسفل. المقاومة الأفقية RESISTOR(x,y,\"R=100Ω\") طرفاها عند (x-50, y) يساراً و (x+50, y) يميناً. الأوامر المسموحة حصراً داخل [DRAW]: CLEAR()، TEXT(\"النص أو المعادلة\", x, y, \"#0F172A\", 18)، BATTERY(x, y, \"V=12V\")، RESISTOR(x, y, \"R=100Ω\")، WIRE(x1, y1, x2, y2, \"#0F172A\")، BOX(x, y, w, h, \"عنوان\")، ARROW(x1, y1, x2, y2, \"نص\", \"#0EA5E9\"). صل الأسلاك بدقة مع أطراف العناصر.\nمثال:\n[TEXT]أهلاً بك يا مهندس، نرسم الآن مصدر الجهد (البطارية 12 فولت) ثم السلك العلوي.[/TEXT]\n[DRAW]\nTEXT(\"الدائرة الكهربائية الأساسية\", 450, 38, \"#0F172A\", 20)\nBATTERY(180, 220, \"12V\")\nWIRE(180, 180, 180, 120, \"#0F172A\")\nWIRE(180, 120, 400, 120, \"#0F172A\")\n[/DRAW]\n[TEXT]نضيف المقاومة 100 أوم ونغلق الدائرة نحو القطب السالب لحساب التيار I = V / R.[/TEXT]\n[DRAW]\nRESISTOR(450, 120, \"R = 100Ω\")\nWIRE(500, 120, 720, 120, \"#0F172A\")\nWIRE(720, 120, 720, 310, \"#0F172A\")\nWIRE(720, 310, 180, 310, \"#0F172A\")\nWIRE(180, 310, 180, 260, \"#0F172A\")\nTEXT(\"I = V / R = 12 / 100 = 0.12 A\", 450, 365, \"#0284C7\", 19)\n[/DRAW]"
}`;

    const { contentsPayload, useWebTools } = buildMultimodalPayload({
      promptText: systemPrompt,
      uploadedContent,
      uploadedMimeType,
      videoFrames,
      socialUrl,
    });

    const config: any = useWebTools
      ? { tools: [{ urlContext: {} }, { googleSearch: {} }], maxOutputTokens: 16384 }
      : { responseMimeType: 'application/json', maxOutputTokens: 16384 };

    const rawText = await generateGeminiContentWithRetry({
      contents: contentsPayload,
      config,
    });

    const parsedData = parseJsonSafely(rawText);
    if (parsedData) {
      const existingScript = String(parsedData.whiteboardScript || '');
      const hasDraw = /\[DRAW\]/i.test(existingScript);
      const steps: Array<{ phase?: string; details?: string }> = Array.isArray(parsedData.steps) ? parsedData.steps : [];
      const notes: string[] = Array.isArray(parsedData.boardNotes) ? parsedData.boardNotes : [];

      if (!hasDraw) {
        const title = String(parsedData.boardTitle || parsedData.diagramTitle || 'شرح الدرس التفاعلي').replace(/"/g, "'").slice(0, 52);
        const eq = String(parsedData.boardEquation || 'Understanding = Concept + Practice').replace(/"/g, "'").slice(0, 52);
        const nodes: Array<{ label?: string }> = Array.isArray(parsedData?.diagramData?.nodes) ? parsedData.diagramData.nodes : [];

        const drawParts: string[] = [];
        drawParts.push(`[TEXT]${parsedData.doctorSpeech || title}[/TEXT]`);
        drawParts.push(`[DRAW]\nTEXT("${title}", 450, 36, "#0F172A", 20)`);
        if (nodes.length >= 2) {
          drawParts.push(`BOX(90, 125, 190, 78, "${String(nodes[0]?.label || 'المدخلات').replace(/"/g, "'").slice(0, 22)}")`);
          drawParts.push(`ARROW(286, 164, 354, 164, "تحليل", "#0EA5E9")`);
          drawParts.push(`BOX(360, 125, 190, 78, "${String(nodes[1]?.label || 'المعالجة').replace(/"/g, "'").slice(0, 22)}")`);
          if (nodes[2]) {
            drawParts.push(`ARROW(556, 164, 624, 164, "نتيجة", "#0EA5E9")`);
            drawParts.push(`BOX(630, 125, 190, 78, "${String(nodes[2]?.label || 'المخرج').replace(/"/g, "'").slice(0, 22)}")`);
          }
        } else {
          drawParts.push(`BATTERY(180, 200, "12V")`);
          drawParts.push(`WIRE(180, 160, 180, 105, "#0F172A")`);
          drawParts.push(`WIRE(180, 105, 400, 105, "#0F172A")`);
          drawParts.push(`RESISTOR(450, 105, "R")`);
          drawParts.push(`WIRE(500, 105, 720, 105, "#0F172A")`);
          drawParts.push(`WIRE(720, 105, 720, 290, "#0F172A")`);
          drawParts.push(`WIRE(720, 290, 180, 290, "#0F172A")`);
          drawParts.push(`WIRE(180, 290, 180, 240, "#0F172A")`);
        }
        drawParts.push(`TEXT("${eq}", 450, 342, "#0284C7", 19)\n[/DRAW]`);
        if (notes.length > 0) {
          drawParts.push(`[TEXT]${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}[/TEXT]`);
        }
        for (const st of steps) {
          if (st?.phase || st?.details) {
            drawParts.push(`[TEXT]${st.phase ? st.phase + ': ' : ''}${st.details || ''}[/TEXT]`);
          }
        }
        parsedData.whiteboardScript = drawParts.join('\n');
      } else if (steps.length > 0 && !existingScript.includes(steps[0]?.phase || '')) {
        const extraSteps = steps
          .filter((st) => st?.phase || st?.details)
          .map((st) => `[TEXT]${st.phase ? st.phase + ': ' : ''}${st.details || ''}[/TEXT]`)
          .join('\n');
        parsedData.whiteboardScript = `${existingScript}\n${extraSteps}`;
      }
    }

    if (!hasMedia && parsedData) {
      aiResponseCache.set(cacheKey, parsedData, 2 * 3600 * 1000);
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('[Lecture Hall API Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'حدث خطأ أثناء معالجة المحاضرة في قاعة المحاضرات.',
    });
  }
});

// ==========================================
// API: «السبورة البيضاء المتحركة المباشرة» ([TEXT] & [DRAW] System Prompt)
// ==========================================
geminiRouter.post('/whiteboard', async (req: Request, res: Response) => {
  try {
    const { question = '', dialect = 'sanani' } = req.body || {};
    if (!String(question).trim()) {
      return res.status(400).json({ success: false, error: 'يرجى كتابة السؤال أولاً.' });
    }

    const dialectNote =
      dialect === 'adani' ? 'العدنية' : dialect === 'taizzi' ? 'التعزية' : 'الصنعانية';

    const whiteboardSystemPrompt = `أنت أستاذ جامعي يمني خبير في هندسة الميكاترونكس والدوائر الكهربائية (صوت وشخصية ذكر بالغ 40-50 سنة بلهجة ${dialectNote} دافئة وواثقة)، وتستخدم "سبورة بيضاء متحركة" للشرح في خدمتي "اشرح لي" و"حل أسئلتي".

يجب عليك الالتزام الصارم بتنسيق الرد التالي فقط دون أي مقدمات خارج الوسوم، حيث تفصل بين الشرح المكتوب وأوامر الرسم الهندسي بالتتابع الزمني:

1. ضع كل فقرة شرح أو خطوة حل باللهجة اليمنية الواضحة والدافئة داخل الوسم:
[TEXT] ... [/TEXT]

2. ضع أوامر الرسم المناسبة لكل خطوة مباشرة بعدها داخل الوسم:
[DRAW] ... [/DRAW]

3. مساحة الإحداثيات المتاحة على السبورة هي:
- العرض X: من 60 إلى 840 (المنتصف 450)
- الارتفاع Y: من 40 إلى 390 (المنتصف 210)
- البطارية العمودية تتصل طرفاها عند (x, y - 40) للأعلى و (x, y + 40) للأسفل.
- المقاومة الأفقية تتصل طرفاها عند (x - 50, y) لليسار و (x + 50, y) لليمين.

4. الأوامر المسموح بها حصراً داخل [DRAW]:
- CLEAR()
- TEXT("النص أو المعادلة", x, y, "#0F172A", 18)
- BATTERY(x, y, "V=12V")
- RESISTOR(x, y, "R=100Ω")
- WIRE(x1, y1, x2, y2, "#0F172A")
- BOX(x, y, w, h, "عنوان")
- ARROW(x1, y1, x2, y2, "نص", "#0EA5E9")

سؤال الطالب: ${question}`;

    const rawText = await generateGeminiContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: whiteboardSystemPrompt }] }],
      config: { maxOutputTokens: 4096 },
    });

    res.json({ success: true, responseText: rawText });
  } catch (error: any) {
    console.error('[Whiteboard API Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'حدث خطأ أثناء الاتصال بالسبورة البيضاء.',
    });
  }
});

// ==========================================
// API: «حل أسئلتي» (Solve Up To 30+ Questions across All Exam Formats)
// Supports: أتمتة (Automation), اختيارات (MCQ), صح وخطأ (True/False), مقالي (Essay), مباشر (Direct)
// ==========================================
geminiRouter.post('/solve-questions', async (req: Request, res: Response) => {
  const ip = (req as any).clientIp || '127.0.0.1';
  const estimatedTokens = (req as any).estimatedTokens || 1500;

  try {
    const {
      questionsText = '',
      extraNotes = '',
      uploadedContent = '',
      uploadedMimeType = '',
      videoFrames = [],
      fileName = '',
      dialect = 'sanani',
    } = req.body || {};

    if (!questionsText.trim() && !uploadedContent.trim() && (!videoFrames || videoFrames.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'يرجى كتابة الأسئلة أو رفع ورقة الأسئلة (صورة / ملف / فيديو) ثم الضغط على "حل".',
      });
    }

    const solvePrompt = `أنت "دكتور الميكاترونكس الذكي" المتخصص في حل جميع الأسئلة والاختبارات الهندسية والجامعية بدقة 100%.

المطلوب منك في خدمة "حل أسئلتي":
1. اقرأ واستخرج **جميع الأسئلة الموجودة** في النص أو الصورة أو ورقة الأسئلة أو الفيديو أو الملف المرفوع **دون تجاهل أي سؤال حتى لو وصلت إلى 30 سؤالاً أو أكثر في ورقة واحدة!**.
2. صنّف كل سؤال بدقة إلى أحد الأنواع الخمسة التالية:
   - "automation": أسئلة أتمتة / اختيار من متعدد سريع / بنوك أسئلة مؤتمتة
   - "mcq": أسئلة اختيارات متعددة (أ، ب، ج، د)
   - "true_false": أسئلة صح وخطأ (True / False)
   - "essay": أسئلة مقالية وشرح نظري
   - "direct": أسئلة مباشرة (مسائل حسابية، تعاريف، قوانين، إكمال فراغ)
3. لكل سؤال:
   - اكتب **finalAnswerSummary**: خلاصة الإجابة النهائية الدقيقة والمباشرة (مثلاً: "الإجابة الصحيحة: ب) 24 فولت" أو "صح" أو "I = 2.5 A").
   - اكتب **reasonAndExplanation**: **السبب للوصول لهذا الحل** بوضوح هندسي مبسط يجعل الطالب يفهم لماذا هذه هي الإجابة الصحيحة وليس غيرها!
   - اكتب **steps**: خطوات الحل المرتبة إذا كان السؤال حسابياً أو تحليلياً.
4. تحدث في **doctorOverviewSpeech** بلهجة أستاذ جامعي يمني (${dialect === 'adani' ? 'عدنية' : dialect === 'taizzi' ? 'تعزية' : 'صنعانية'}) يلخص فيها محاور الأسئلة وكيفية التعامل معها في الامتحان.
5. أرجع **boardSummaryNotes** و **diagramType** المناسب لعرض ملخص الورقة على السبورة الذكية.

نص الأسئلة المرسلة من الطالب:
${questionsText || '(انظر ورقة الأسئلة / الملف / الصورة / الفيديو المرفق)'}
${extraNotes ? `\nملاحظات إضافية من الطالب: ${extraNotes}` : ''}
${fileName ? `\nاسم الملف المرفق: ${fileName}` : ''}

أرجع الإجابة حصراً بصيغة JSON صالح فقط بالهيكل التالي:
{
  "examTitle": "عنوان ورقة الأسئلة أو المادة المستخرجة",
  "subjectArea": "التخصص/المادة (مثل: إلكترونيات القوى، تحكم آلي، دوائر كهربائية)",
  "totalQuestionsFound": 1,
  "doctorOverviewSpeech": "ملخص صوتي ودود بلهجة يمنية دافئة (صوت أستاذ جامعي) يشرح فكرة الأسئلة ويطمئن الطالب...",
  "boardSummaryNotes": [
    "أهم قاعدة أو قانون متكرر في هذه الأسئلة",
    "نصيحة ذهبية لتجنب الأخطاء الشائعة في هذا الامتحان",
    "ملخص توزيع الأسئلة"
  ],
  "boardKeyFormula": "أهم قانون رئيسي في الورقة",
  "diagramType": "circuit",
  "whiteboardScript": "سكربت السبورة البيضاء المتحركة لملخص حل الأسئلة يفصل بين [TEXT]...[/TEXT] وأوامر الرسم [DRAW]...[/DRAW] في مساحة X: 60..840, Y: 40..410 باستخدام الأوامر: CLEAR()، WIRE(x1,y1,x2,y2,\"#0F172A\")، BATTERY(x,y,\"12V\")، RESISTOR(x,y,\"R\")، BOX(x,y,w,h,\"نص\")، ARROW(x1,y1,x2,y2,\"نص\",\"#0EA5E9\")، TEXT(\"نص\",x,y,\"#0F172A\",18).",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "نص السؤال المستخرج كاملاً بوضوح",
      "questionType": "mcq",
      "options": ["أ) ...", "ب) ...", "ج) ...", "د) ..."],
      "finalAnswerSummary": "خلاصة الحل والإجابة النهائية الدقيقة",
      "reasonAndExplanation": "السبب العلمي والمنطقي للوصول لهذا الحل بأسلوب واضح ومقنع للطالب...",
      "steps": ["الخطوة 1...", "الخطوة 2..."],
      "keyFormula": "القانون المستخدم إن وجد"
    }
  ]
}`;

    const { contentsPayload, useWebTools } = buildMultimodalPayload({
      promptText: solvePrompt,
      uploadedContent,
      uploadedMimeType,
      videoFrames,
    });

    const config: any = useWebTools
      ? { tools: [{ urlContext: {} }, { googleSearch: {} }], maxOutputTokens: 32768 }
      : { responseMimeType: 'application/json', maxOutputTokens: 32768 };

    const rawText = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
      return await generateGeminiContentWithRetry({
        contents: contentsPayload,
        config,
      });
    });

    const parsedData = parseJsonSafely(rawText || '{}');
    if (Array.isArray(parsedData.questions)) {
      parsedData.totalQuestionsFound = parsedData.questions.length;
    }

    if (parsedData) {
      const existingScript = String(parsedData.whiteboardScript || '');
      const hasDraw = /\[DRAW\]/i.test(existingScript);
      const qList: Array<{
        questionNumber?: number;
        questionText?: string;
        finalAnswerSummary?: string;
        reasonAndExplanation?: string;
        steps?: string[];
        keyFormula?: string;
      }> = Array.isArray(parsedData.questions) ? parsedData.questions : [];

      const qBlocks = qList.slice(0, 12).map((q, idx) => {
        const num = q.questionNumber || idx + 1;
        const stepsTxt = Array.isArray(q.steps) && q.steps.length > 0 ? `\nالخطوات: ${q.steps.join(' ← ')}` : '';
        return `[TEXT]سؤال #${num}: ${q.questionText || ''}\n✅ الحل: ${q.finalAnswerSummary || ''}\n💡 السبب: ${q.reasonAndExplanation || ''}${stepsTxt}[/TEXT]`;
      });

      if (!hasDraw) {
        const title = String(parsedData.examTitle || 'ملخص حل الأسئلة').replace(/"/g, "'").slice(0, 50);
        const eq = String(parsedData.boardKeyFormula || qList[0]?.keyFormula || 'Solution = Logic + Formula').replace(/"/g, "'").slice(0, 52);
        parsedData.whiteboardScript = [
          `[TEXT]${parsedData.doctorOverviewSpeech || title}[/TEXT]`,
          `[DRAW]\nTEXT("${title}", 450, 36, "#0F172A", 20)`,
          `BOX(100, 125, 200, 78, "استخراج السؤال")\nARROW(308, 164, 368, 164, "تحليل", "#0EA5E9")`,
          `BOX(374, 125, 200, 78, "تطبيق القانون")\nARROW(582, 164, 642, 164, "الحل", "#0EA5E9")`,
          `BOX(648, 125, 175, 78, "النتيجة والسبب")`,
          `TEXT("${eq}", 450, 342, "#0284C7", 19)\n[/DRAW]`,
          ...qBlocks,
        ].join('\n');
      } else if (qBlocks.length > 0 && !existingScript.includes('سؤال #')) {
        parsedData.whiteboardScript = `${existingScript}\n${qBlocks.join('\n')}`;
      }
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('[Solve Questions API Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'حدث خطأ أثناء استخراج وحل الأسئلة.',
    });
  }
});

// Mount geminiRouter on /api/gemini, /gemini, and /api
app.use('/api/gemini', geminiRouter);
app.use('/gemini', geminiRouter);
app.use('/api', geminiRouter);

// ==========================================
// SUBSCRIPTIONS & OWNER STORE
// ==========================================

let activationCodesStore = [...SEEDED_ACTIVATION_CODES];

interface SecurityLogEntry {
  id: string;
  timestamp: string;
  event: string;
  category: 'auth' | 'redemption' | 'security' | 'system' | 'ai_quota';
  ip: string;
  details: string;
  severity: 'info' | 'warning' | 'danger';
}

const securityAuditLogs: SecurityLogEntry[] = [
  {
    id: 'log_init_1',
    timestamp: new Date().toISOString(),
    event: 'تهيئة 300 كود اشتراك سنوياً',
    category: 'system',
    ip: '127.0.0.1',
    details: 'تم استيراد وتهيئة 300 كود اشتراك بنجاح بمبلغ 4000 ريال يمني ومدى 365 يوماً.',
    severity: 'info',
  },
];

const activeOwnerSessions = new Set<string>();
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'admin@dr-smart.edu';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Admin#Smart2026!';
const OWNER_PIN = process.env.OWNER_PIN || '9876';

function addAuditLog(log: Omit<SecurityLogEntry, 'id' | 'timestamp'>) {
  const newLog: SecurityLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...log,
  };
  securityAuditLogs.unshift(newLog);
  if (securityAuditLogs.length > 200) {
    securityAuditLogs.pop();
  }
}

// Router for Subscriptions
const subscriptionsRouter = express.Router();

interface UserSubscriptionRecord {
  email: string;
  name: string;
  role: 'student' | 'engineer' | 'owner';
  status: 'active' | 'trial' | 'trial_expired' | 'expired';
  codeUsed?: string;
  trialStartedAt: string;
  trialExpiresAt: string;
  activatedAt?: string;
  expiresAt?: string;
  priceYER: number;
  durationDays: number;
}

const userSubscriptionsStore = new Map<string, UserSubscriptionRecord>();

subscriptionsRouter.post('/check-access', (req: Request, res: Response) => {
  const { email, role, subscription } = req.body || {};

  if (role === 'owner') {
    return res.json({
      success: true,
      isAccessAllowed: true,
      statusType: 'owner',
      formattedCountdown: 'مالك المنصة الإدارية',
    });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  let userSub = userSubscriptionsStore.get(cleanEmail);

  if (!userSub && subscription) {
    const now = new Date();
    const nowIso = now.toISOString();
    const trialExp = subscription.trialExpiresAt || new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    userSub = {
      email: cleanEmail || 'student@mechatronics.dr-smart.edu',
      name: subscription.name || 'طالب ميكاترونكس',
      role: 'student',
      status: subscription.status || 'trial',
      codeUsed: subscription.codeUsed,
      trialStartedAt: subscription.trialStartedAt || nowIso,
      trialExpiresAt: trialExp,
      activatedAt: subscription.activatedAt,
      expiresAt: subscription.expiresAt,
      priceYER: 4000,
      durationDays: 365,
    };
    userSubscriptionsStore.set(cleanEmail, userSub);
  }

  if (userSub && userSub.status === 'active' && userSub.codeUsed) {
    const activeCode = activationCodesStore.find((c) => c.code === userSub?.codeUsed);
    if (activeCode && activeCode.status === 'active') {
      return res.json({
        success: true,
        isAccessAllowed: true,
        statusType: 'active',
        subscription: userSub,
        formattedCountdown: 'اشتراك سنوي نشط (365 يومًا)',
      });
    }
  }

  const nowMs = Date.now();
  if (userSub && userSub.status === 'trial') {
    const currentExp = userSub.trialExpiresAt ? new Date(userSub.trialExpiresAt).getTime() : 0;
    if (currentExp - nowMs < 12 * 3600 * 1000) {
      userSub.trialStartedAt = new Date().toISOString();
      userSub.trialExpiresAt = new Date(nowMs + 24 * 3600 * 1000).toISOString();
      userSubscriptionsStore.set(cleanEmail, userSub);
    }
  }

  const trialExpMs = userSub?.trialExpiresAt ? new Date(userSub.trialExpiresAt).getTime() : nowMs + 24 * 3600 * 1000;
  const diffMs = trialExpMs - nowMs;

  if (diffMs > 0) {
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);

    return res.json({
      success: true,
      isAccessAllowed: true,
      statusType: 'trial',
      remainingSec: totalSec,
      subscription: userSub,
      formattedCountdown: `تجربة مجانية متبقية: ${hours} ساعة و ${mins} دقيقة`,
    });
  }

  if (userSub) {
    userSub.status = 'trial_expired';
  }

  return res.json({
    success: true,
    isAccessAllowed: false,
    statusType: 'trial_expired',
    remainingSec: 0,
    subscription: userSub,
    formattedCountdown: 'انتهت التجربة المجانية (24 ساعة)',
  });
});

subscriptionsRouter.post('/redeem', (req: Request, res: Response) => {
  const { code, studentName, studentEmail } = req.body;
  const ip = String(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى إدخال كود التفعيل الخاص بك.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanEmail = String(studentEmail || 'student@mechatronics.dr-smart.edu').trim().toLowerCase();
  const codeIndex = activationCodesStore.findIndex((c) => c.code === cleanCode);

  if (codeIndex === -1) {
    addAuditLog({
      event: 'محاولة تفعيل كود غير موجود',
      category: 'redemption',
      ip,
      details: `الكود المدخل: ${cleanCode}`,
      severity: 'warning',
    });
    return res.status(404).json({ success: false, error: 'كود التفعيل غير صحيح، يرجى التأكد من الرموز والمحاولة مجدداً.' });
  }

  const targetCode = activationCodesStore[codeIndex];

  if (targetCode.status === 'active') {
    return res.status(400).json({
      success: false,
      error: `هذا الكود مستخدم بالفعل بتاريخ ${targetCode.redeemedAt ? new Date(targetCode.redeemedAt).toLocaleDateString('ar-EG') : 'سابق'}.`,
    });
  }

  if (targetCode.status === 'revoked') {
    return res.status(400).json({ success: false, error: 'كود التفعيل هذا تم إلغاؤه من قبل إدارة المنصة.' });
  }

  if (targetCode.status === 'expired') {
    return res.status(400).json({ success: false, error: 'عذراً، كود التفعيل هذا منتهي الصلاحية.' });
  }

  const redeemedAt = new Date().toISOString();
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + (targetCode.durationDays || 365));
  const expiresAt = expiresDate.toISOString();

  activationCodesStore[codeIndex] = {
    ...targetCode,
    status: 'active',
    redeemedAt,
    expiresAt,
    redeemedBy: {
      studentName: studentName || 'طالب ميكاترونكس',
      studentEmail: cleanEmail,
    },
  };

  const userSubRecord: UserSubscriptionRecord = {
    email: cleanEmail,
    name: studentName || 'طالب ميكاترونكس',
    role: 'student',
    status: 'active',
    codeUsed: cleanCode,
    trialStartedAt: redeemedAt,
    trialExpiresAt: redeemedAt,
    activatedAt: redeemedAt,
    expiresAt,
    priceYER: 4000,
    durationDays: 365,
  };

  userSubscriptionsStore.set(cleanEmail, userSubRecord);

  addAuditLog({
    event: 'تفعيل اشتراك سنوي ونقل من trial إلى active',
    category: 'redemption',
    ip,
    details: `تم ربط كود التفعيل (${cleanCode}) بحساب الطالب (${cleanEmail}) وتحديث حالته إلى active بنجاح (365 يوماً).`,
    severity: 'info',
  });

  return res.json({
    success: true,
    message: '🎉 تم تفعيل كود الاشتراك السنوي بنجاح وترقية حسابك إلى (365 يوماً)!',
    subscription: userSubRecord,
  });
});

app.use('/api/subscriptions', subscriptionsRouter);
app.use('/subscriptions', subscriptionsRouter);

// Router for Owner Console
const ownerRouter = express.Router();

ownerRouter.post('/login', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const ipKey = String(ip);

  const attempt = failedLoginAttempts.get(ipKey) || { count: 0, lockedUntil: null };
  if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
    const remainingSec = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
    const remainingMin = Math.ceil(remainingSec / 60);
    return res.status(429).json({
      success: false,
      error: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار الأخطاء. يرجى الانتظار لمدة ${remainingMin} دقيقة قبل المحاولة مجدداً.`,
      locked: true,
      remainingSec,
    });
  }

  const { email, password, pin } = req.body;

  const isEmailValid = (email || '').trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isPasswordValid = (password || '').trim() === OWNER_PASSWORD;
  const isPinValid = (pin || '').trim() === OWNER_PIN;

  if (!isEmailValid || !isPasswordValid || !isPinValid) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
      failedLoginAttempts.set(ipKey, attempt);

      addAuditLog({
        event: 'حظر محاولات دخول لوحة المالك',
        category: 'security',
        ip: ipKey,
        details: `تجاوز 5 محاولات خاطئة للبريد أو كلمة المرور أو الرمز السري. تم الحظر لمدة 15 دقيقة.`,
        severity: 'danger',
      });

      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد المسموح من المحاولات الخاطئة (5 محاولات). تم حظر الوصول لمدة 15 دقيقة لحماية المنصة.',
        locked: true,
        remainingSec: 900,
      });
    }

    failedLoginAttempts.set(ipKey, attempt);
    const remainingAttempts = 5 - attempt.count;
    return res.status(401).json({
      success: false,
      error: `بيانات الاعتماد غير صحيحة. متبقي لديك ${remainingAttempts} محاولات قبل حظر الحساب مؤقتاً.`,
      remainingAttempts,
    });
  }

  failedLoginAttempts.delete(ipKey);
  const token = `SMART_OWNER_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  activeOwnerSessions.add(token);

  return res.json({
    success: true,
    token,
    message: 'تم التحقق من هوية مالك المنصة بنجاح.',
    ownerInfo: {
      name: 'مالك المنصة الرئيسي',
      email: OWNER_EMAIL,
      role: 'owner',
    },
  });
});

ownerRouter.get('/verify-session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !activeOwnerSessions.has(token)) {
    return res.status(401).json({ success: false, error: 'جلسة المالك غير صالحة أو منتهية.' });
  }

  return res.json({ success: true, valid: true });
});

ownerRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    activeOwnerSessions.delete(token);
  }
  return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
});

ownerRouter.get('/codes', (req: Request, res: Response) => {
  const { status, search } = req.query;

  let filtered = [...activationCodesStore];

  if (status && status !== 'all') {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (search) {
    const q = String(search).trim().toUpperCase();
    filtered = filtered.filter(
      (c) => c.code.includes(q) || (c.redeemedBy?.studentName || '').toUpperCase().includes(q)
    );
  }

  const unusedCount = activationCodesStore.filter((c) => c.status === 'unused').length;
  const activeCount = activationCodesStore.filter((c) => c.status === 'active').length;
  const expiredCount = activationCodesStore.filter((c) => c.status === 'expired').length;
  const revokedCount = activationCodesStore.filter((c) => c.status === 'revoked').length;
  const totalRevenueYER = activeCount * 4000;

  return res.json({
    success: true,
    codes: filtered,
    stats: {
      totalCount: activationCodesStore.length,
      unusedCount,
      activeCount,
      expiredCount,
      revokedCount,
      pricePerYearYER: 4000,
      totalRevenueYER,
      totalPotentialRevenueYER: activationCodesStore.length * 4000,
    },
  });
});

ownerRouter.post('/codes/revoke', (req: Request, res: Response) => {
  const { code } = req.body;
  const idx = activationCodesStore.findIndex((c) => c.code === code);
  if (idx === -1) return res.status(404).json({ success: false, error: 'الكود غير موجود' });

  activationCodesStore[idx].status = 'revoked';
  return res.json({ success: true, message: `تم إلغاء الكود ${code} بنجاح.` });
});

ownerRouter.post('/codes/reset', (req: Request, res: Response) => {
  const { code } = req.body;
  const idx = activationCodesStore.findIndex((c) => c.code === code);
  if (idx === -1) return res.status(404).json({ success: false, error: 'الكود غير موجود' });

  activationCodesStore[idx] = {
    ...activationCodesStore[idx],
    status: 'unused',
    redeemedBy: undefined,
    redeemedAt: undefined,
    expiresAt: undefined,
  };
  return res.json({ success: true, message: `تمت إعادة ضبط الكود ${code} إلى وضع غير مستخدم.` });
});

ownerRouter.post('/codes/import', (req: Request, res: Response) => {
  const { rawCodes } = req.body;
  if (!Array.isArray(rawCodes)) {
    return res.status(400).json({ success: false, error: 'قائمة الأكواد يجب أن تكون مصفوفة' });
  }

  let addedCount = 0;
  rawCodes.forEach((cStr: string) => {
    const clean = String(cStr).trim().toUpperCase();
    if (clean && !activationCodesStore.some((c) => c.code === clean)) {
      activationCodesStore.push({
        code: clean,
        status: 'unused',
        priceYER: 4000,
        durationDays: 365,
        createdAt: new Date().toISOString(),
      });
      addedCount++;
    }
  });

  return res.json({
    success: true,
    addedCount,
    totalCount: activationCodesStore.length,
    message: `تم استيراد ${addedCount} كود بنجاح.`,
  });
});

ownerRouter.get('/logs', (_req: Request, res: Response) => {
  return res.json({ success: true, logs: securityAuditLogs });
});

app.use('/api/owner', ownerRouter);
app.use('/owner', ownerRouter);

// Global Error Handler guaranteeing JSON output
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Express Error]:', err);
  res.status(err?.status || 500).json({
    success: false,
    error: err?.message || 'حدث خطأ داخلي في الخادم.',
  });
});

export default app;
