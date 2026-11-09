import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Request lock map to prevent duplicate simultaneous calls
const activeRequestLocks = new Set<string>();

// Lazy init Gemini SDK
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in process.env');
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

  // Split into paragraphs/sections
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
  const primaryModel = params.primaryModel || 'gemini-3.8-flash';
  const fallbackModel = params.fallbackModel || 'gemini-3.1-flash-lite';
  const maxAttempts = params.maxAttempts || 3;

  let currentModel = primaryModel;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      console.log(`[AI Engine] Attempt ${attempt}/${maxAttempts} using model: ${currentModel}`);
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: params.contents,
        config: params.config,
      });
      return response.text || '';
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.code === 429 ||
        String(err?.message || '').includes('RESOURCE_EXHAUSTED') ||
        String(err?.message || '').includes('Quota exceeded') ||
        String(err?.message || '').includes('limit exceeded');

      if (!isRateLimit) {
        throw err;
      }

      console.warn(`[AI Engine] Rate limit (429) on attempt ${attempt} with model ${currentModel}`);

      if (currentModel === primaryModel) {
        console.log(`[AI Engine] Switching to fallback model: ${fallbackModel}`);
        currentModel = fallbackModel;
      }

      if (attempt >= maxAttempts) {
        const retryDelayMs = parseRetryDelayMs(err);
        const retrySec = Math.ceil(retryDelayMs / 1000);
        throw new Error(
          `تم تجاوز حد الطلبات المجانية لنموذج الذكاء الاصطناعي (RESOURCE_EXHAUSTED). يرجى المحاولة بعد ${retrySec} ثانية، أو ربط مفتاح API مفعل به الفوترة عبر قائمة الإعدادات (Settings > Secrets).`
        );
      }

      const parsedDelay = parseRetryDelayMs(err);
      const baseDelay = Math.max(parsedDelay, 2000);
      const jitter = Math.floor(Math.random() * 800);
      const backoffDelay = baseDelay * Math.pow(1.5, attempt - 1) + jitter;

      console.log(`[AI Engine] Waiting ${Math.round(backoffDelay)}ms before attempt ${attempt + 1}...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error('تعذر إكمال طلب الشرح بعد عدة محاولات. يرجى إعادة المحاولة لاحقاً.');
}

// ==========================================
// GEMINI API QUEUE, PER-USER QUOTA & BACKOFF MIDDLEWARE
// ==========================================

interface QueuedTask {
  id: string;
  fn: () => Promise<any>;
  resolve: (val: any) => void;
  reject: (err: any) => void;
  ip: string;
  estimatedTokens: number;
}

class GeminiRequestQueue {
  private queue: QueuedTask[] = [];
  private activeCount = 0;
  private maxConcurrency = 1; // Strict FIFO serialization to prevent 429 Resource Exhausted
  private interRequestDelayMs = 1200; // Inter-request delay between calls

  public enqueue(ip: string, estimatedTokens: number, fn: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fn,
        resolve,
        reject,
        ip,
        estimatedTokens,
      };
      this.queue.push(task);
      console.log(`[Gemini Queue] Enqueued task ${task.id} from IP ${ip}. Queue length: ${this.queue.length}`);
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

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;
    console.log(`[Gemini Queue] Processing task ${task.id}... Active tasks: ${this.activeCount}`);

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeCount--;
      setTimeout(() => this.processNext(), this.interRequestDelayMs);
    }
  }
}

const geminiQueue = new GeminiRequestQueue();

// Per-User Usage Quota Tracker (Sliding 1-Minute Window)
interface UserQuotaRecord {
  tokensUsedWindow: number;
  requestCountWindow: number;
  windowStart: number;
}

const userQuotaTracker = new Map<string, UserQuotaRecord>();

function trackAndCheckUserQuota(ip: string, estimatedTokens: number): { allowed: boolean; remainingTokens: number; waitSec?: number } {
  const now = Date.now();
  const windowSizeMs = 60 * 1000;
  const maxTokensPerMin = 200000; // 200k tokens per min
  const maxRequestsPerMin = 12; // 12 calls per min per IP

  let record = userQuotaTracker.get(ip);
  if (!record || now - record.windowStart > windowSizeMs) {
    record = { tokensUsedWindow: 0, requestCountWindow: 0, windowStart: now };
    userQuotaTracker.set(ip, record);
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

/**
 * Express Middleware for Gemini Services: Token Management & Concurrency Queue
 */
function geminiQuotaAndQueueMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');
  const { lessonTitle, userPrompt, uploadedContent } = req.body || {};

  // Calculate estimated tokens
  const textPayload = `${lessonTitle || ''} ${userPrompt || ''} ${uploadedContent || ''}`;
  const estimatedTokens = estimateTokens(textPayload);
  (req as any).estimatedTokens = estimatedTokens;
  (req as any).clientIp = ip;

  // Check per-user quota
  const quotaCheck = trackAndCheckUserQuota(ip, estimatedTokens);
  if (!quotaCheck.allowed) {
    console.warn(`[Quota Limit] IP ${ip} exceeded per-minute quota. Required wait: ${quotaCheck.waitSec}s`);
    return res.status(429).json({
      success: false,
      error: `تجاوزت حد الاستهلاك المسموح به في الدقيقة (${quotaCheck.remainingTokens} توكن متبقية). يرجى الانتظار ${quotaCheck.waitSec} ثانية للمتابعة.`,
      waitSec: quotaCheck.waitSec,
    });
  }

  next();
}

// Attach Middleware to /api/gemini routes
app.use('/api/gemini/explain', geminiQuotaAndQueueMiddleware);
app.use('/api/gemini/explain-lesson', geminiQuotaAndQueueMiddleware);
app.use('/api/gemini/summarize', geminiQuotaAndQueueMiddleware);
app.use('/api/gemini/assistant', geminiQuotaAndQueueMiddleware);

// API: Dr. Smart Lecture Explanation Engine with Multimodal Vision & Whiteboard Focus
app.post('/api/gemini/explain', async (req: Request, res: Response) => {
  const ip = (req as any).clientIp || '127.0.0.1';
  const estimatedTokens = (req as any).estimatedTokens || 500;

  try {
    const { doctorName, subject, level, language, lessonTitle, userPrompt, uploadedContent } = req.body;

    const queryContext = `${lessonTitle || ''} ${userPrompt || ''}`;
    const safeContentChunk = extractRelevantContentChunk(uploadedContent || '', queryContext, 1500);

    // Multimodal Vision check if uploadedContent is a base64 image
    const isBase64Image = uploadedContent && (uploadedContent.startsWith('data:image/') || uploadedContent.length > 2000);

    const promptText = `أنت الدكتور الأكاديمي "${doctorName || 'الدكتور الذكي'}"، خبير هندسي في ${subject || 'الميكاترونكس'}.
المستوى: ${level || 'متوسط'}.
اللغة: ${language === 'en' ? 'English' : 'العربية الفصيحة مع المصطلحات الإنجليزية'}.

تعليمات صارمة للشرح:
1. الشرح يجب أن يكون مطاطقاً ومستخرجاً بنسبة 100% من المحتوى/الصورة/الملف المرفق. لا تقدم شرحاً عاماً إذا تم رفع صورة أو ملف.
2. الدكتور يكتب كافة المحتويات والقوانين والخطوات والرسومات داخل السبورة التفاعلية حصراً (داخل كائن diagramCommands و whiteboardNotes و whiteboardTextToReveal).

عنوان الدرس/السؤال: ${lessonTitle || userPrompt || 'مقدمة ميكاترونكس'}
${safeContentChunk && !isBase64Image ? `نص المستند المرفوق:\n${safeContentChunk}\n` : ''}

يرجى إرجاع الإجابة بتنسيق JSON حصراً كالتالي:
{
  "title": "عنوان المحاضرة المأخوذ من المرفق",
  "objectives": ["هدف 1 مأخوذ من الصورة/الملف", "هدف 2"],
  "sections": [
    {
      "heading": "عنوان القسم التعليمي",
      "content": "الشرح التوضيحي المطابق للمرفق...",
      "whiteboardNotes": "نص القوانين والمعادلات للكتابة على السبورة",
      "whiteboardDiagramType": "circuit | formula | mechanism | block_diagram",
      "diagramCommands": [
        "DRAW_RESISTOR: R1 10kOhm",
        "DRAW_FORMULA: V = I * R",
        "DRAW_LABEL: تحليل العناصر المقاسة"
      ]
    }
  ],
  "solvedExample": {
    "problem": "نص المسألة المستخرجة من الصورة/المرفق",
    "steps": ["خطوة الحل 1...", "خطوة الحل 2..."],
    "finalAnswer": "النتيجة النهائية بالوحدات الهندسية"
  },
  "summary": "ملخص ختامي يكتبه الدكتور على السبورة",
  "quiz": [
    {
      "question": "سؤال اختباري عن محتوى الصورة/الدرس؟",
      "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
      "correctIndex": 0,
      "explanation": "تفسير الإجابة الهندسية"
    }
  ]
}`;

    // Prepare contents array for Gemini
    let contentsPayload: any;

    if (isBase64Image) {
      const cleanBase64 = uploadedContent.replace(/^data:image\/\w+;base64,/, '');
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      };
    } else {
      contentsPayload = promptText;
    }

    // Execute via Queue
    const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
      return await generateGeminiContentWithRetry({
        contents: contentsPayload,
        config: { responseMimeType: 'application/json' },
      });
    });

    const jsonText = (text || '{}').trim();
    const parsed = JSON.parse(jsonText);

    res.json({
      success: true,
      data: parsed,
      meta: {
        estimatedTokens,
        queueStats: geminiQueue.getStats(),
      },
    });
  } catch (error: any) {
    console.error('Gemini Explain Error:', error);
    res.status(500).json({ success: false, error: error.message || 'فشل محرك تحليل الشرح' });
  }
});

// ==========================================
// API: «اشرح لي الدرس» (Explain the Lesson Service)
// Multimodal, strictly grounded, 14-step academic explanation engine
// ==========================================
app.post('/api/gemini/explain-lesson', async (req: Request, res: Response) => {
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
      historyContext,
      lessonContext,
    } = req.body;

    // Student Level Directive
    const levelMap: Record<string, string> = {
      beginner: 'مستوى مبتدئ: لغة عربية سهلة ومبسطة جداً، تفكيك المفاهيم المعقدة، تشبيهات عملية مبسطة، وتجنب الرموز الرياضية المعقدة دون تمهيد.',
      intermediate: 'مستوى متوسط: مناسب لطلاب البكالوريوس في هندسة الميكاترونكس، توازن بين الشرح النظري والقوانين الرياضية مع توضيح الوحدات والرموز.',
      advanced: 'مستوى متقدم: تفصيل رياضي وهندسي عميق، اشتقاقات القوانين، دوال التحويل، الاستجابة الترددية والزمنية، واستكشاف المشكلات.',
      specialized: 'مستوى هندسي متخصص: معايير التصميم الصناعي (ISO/IEEE)، اختيار المكونات الدقيقة، التوافق الكهرومغناطيسي، والتحكم المتقدم.',
    };

    const studentLevelInstruction = levelMap[studentLevel] || levelMap.intermediate;

    // Check if handling followup question or alternative mode
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

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({
          contents: prompt,
        });
      });

      const isOut = text.includes('[تنبيه: هذا السؤال يقع خارج سياق الدرس المرفوع]');
      return res.json({
        success: true,
        answer: text,
        isOutOfLessonContext: isOut,
      });
    }

    if (mode === 'simplify') {
      const prompt = `أعد شرح الدرس التالي بأسلوب أبسط بكثير ("شرح أبسط") لطلاب هندسة الميكاترونكس، مع الحفاظ التام على الحقائق والمعادلات الموجودة في المصدر دون اختراع:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

قدم الشرح بأسلوب مبسط وممتع وباللغة العربية الفصيحة السهلة.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, answer: text });
    }

    if (mode === 'deepen') {
      const prompt = `قدم تعمقاً هندسياً وتحليلاً متقدماً ("شرح أعمق") للدرس التالي لطلاب هندسة الميكاترونكس:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

اشرح النظريات الفيزيائية الكامنة، اشتقاق العلاقات، التأثيرات الجانبية، والتفاصيل الهندسية الدقيقة.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, answer: text });
    }

    if (mode === 'solved_example') {
      const prompt = `استخرج أو صغ مسألة وتطبيقاً محلولاً خطوة بخطوة ("مثال محلول") مستوحى تماماً ومطابق للقوانين والمعادلات والأرقام الواردة في هذا الدرس:
سياق الدرس:
${typeof lessonContext === 'string' ? lessonContext : JSON.stringify(lessonContext || '')}

اعرض المسألة بوضوح، المعطيات بالوحدات، القانون المستخدم، خطوات التعويض الرياضي خطوة بخطوة، والنتيجة النهائية مع الوحدة الفيزيائية الصحيحة.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, answer: text });
    }

    // Default: 'full_explanation' - Complete 14-Step Grounded Engine
    const systemPrompt = `أنت المدرس الأكاديمي المتخصص في منصة «دكتور الميكاترونكس الذكي» لخدمة «اشرح لي الدرس».
مستوى الشرح المطلوب: ${studentLevelInstruction}

قواعد الدقة والأمانة العلمية الصارمة:
1. قاعدة المصدر أولاً: اشرح ما هو موجود في المحتوى المرفوع أولاً، ولا تخترع معلومات أو معادلات أو أرقام أو نتائج غير موجودة في المصدر.
2. المعلومة الخارجية: إذا احتجت إلى مفهوم أساسي خارجي لفهم الدرس، وضّح للطالب بوضوح أن هذه "[معلومة توضيحية إضافية وليست من المحتوى المرفوع]".
3. الأخطاء العلمية بالمصدر: إذا كان هناك خطأ علمي واضح أو مطبعي في المحتوى المرفوع، لا تعدله بصمت! اذكره في مصفوفة scientificErrorsFound، واعرض المعلومة كما هي في المصدر ثم وضّح التصحيح العلمي الصحيح.
4. المحتوى غير الواضح: إذا كانت الصورة أو الصفحة أو المعادلة غير مقروءة أو ضبابية، لا تخمن إطلاقاً، وحدد sourceQuality كـ "unclear" أو "partially_clear" مع رسالة: "لم أتمكن من قراءة هذا الجزء بدقة. يرجى رفع صورة أو ملف أوضح حتى أتمكن من شرحه بشكل صحيح."
5. إذا كان المحتوى صورة: قم بتحليل جميع العناصر المرئية (دوائر كهربائية، مقاومات، Arduino، محركات، حساسات، تروس، معادلات).
6. إذا كان المحتوى فيديو: قسّم الشرح إلى أجزاء زمنية محددة (مثل: من 00:00 إلى 02:30 ...)، ولخص المحتوى المسموع والمرئي والمكونات الظاهرة.
7. الدقة الحسابية: تحقق بدقة متناهية من الوحدات (SI Units) والإشارات والمعادلات الرياضية.

يجب إرجاع الإجابة بتنسيق JSON حصراً يطابق الهيكل التالي:
{
  "lessonTitle": "عنوان الدرس المستخرج بدقة من المحتوى",
  "studentLevel": "${studentLevel}",
  "sourceType": "${sourceType || 'text'}",
  "objectives": [
    "الهدف التعليمي 1 المستخرج من المصدر",
    "الهدف التعليمي 2"
  ],
  "coreIdea": "الفكرة الأساسية للدرس في فقرة مركزة ومفهومة",
  "sourceAnalysis": {
    "detectedType": "نوع المحتوى المكتشف (ورقة كتاب / رسم دائرة / مسألة حسابية / مخطط تحكم / فيديو)",
    "sourceQuality": "clear",
    "unclearNotice": "",
    "scientificErrorsFound": [
      {
        "sourceText": "النص أو المعادلة الخاطئة كما ظهرت في المصدر",
        "correction": "التصحيح العلمي الدقيق",
        "explanation": "سبب التصحيح وتوضيح الخطأ العلمي"
      }
    ],
    "visualElements": [
      {
        "element": "اسم العنصر المرئي (مثل: مقاومة R1، محرك سيرفو، منفذ Arduino A0)",
        "description": "وصف وظيفته في المخطط",
        "connection": "طريقة توصيله ومسار الإشارة"
      }
    ],
    "timelineParts": [
      {
        "timeRange": "من 00:00 إلى 02:15",
        "title": "مقدمة وتوصيل الدائرة",
        "content": "شرح ما تم في هذا الجزء من الفيديو"
      }
    ]
  },
  "concepts": [
    {
      "title": "المفهوم الأول",
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
      "formula": "المعادلة الرياضية بصيغة نصية واضحة (مثال: V = I * R)",
      "name": "اسم القانون أو المعادلة",
      "description": "شرح ما تصفه هذه المعادلة وتفسير أجزائها",
      "symbols": [
        {
          "symbol": "V",
          "name": "الجهد الكهربائي",
          "unit": "فولت (V)",
          "valueFromSource": "12V إن وجدت في المصدر"
        }
      ],
      "stepByStepSolution": [
        "خطوة التعويض 1",
        "خطوة الحساب 2"
      ]
    }
  ],
  "solutionSteps": [
    {
      "stepNumber": 1,
      "title": "عنوان الخطوة",
      "description": "شرح ما نقوم به",
      "calculation": "العملية الحسابية إن وجدت"
    }
  ],
  "practicalApplication": "تطبيق عملي واقعي على ما ورد في الدرس",
  "diagramsExplanation": "شرح الرسومات والمخططات الهندسية الموجودة في المصدر إن وُجدت",
  "mechatronicsConnection": "ربط المفاهيم بأنظمة الميكاترونكس والروبوتات والمتحكمات",
  "summary": [
    "أهم نقطة ملخصة 1",
    "أهم نقطة ملخصة 2",
    "أهم نقطة ملخصة 3"
  ],
  "quizQuestions": [
    {
      "question": "سؤال قصير للتحقق من الفهم مبني على محتوى الدرس؟",
      "options": ["خيار أ", "خيار ب", "خيار ج", "خيار د"],
      "correctIndex": 0,
      "explanation": "تفسير الإجابة الصحيحة علمياً"
    }
  ],
  "quickOptions": [
    "شرح أبسط",
    "شرح أعمق",
    "مثال محلول",
    "اختبرني",
    "أعد الشرح من البداية"
  ]
}`;

    let contentsPayload: any;

    const isBase64 =
      typeof content === 'string' &&
      (content.startsWith('data:') || content.length > 500 && (sourceType === 'image' || sourceType === 'video' || sourceType === 'pdf'));

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

    const rawResult = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
      return await generateGeminiContentWithRetry({
        contents: contentsPayload,
        config: { responseMimeType: 'application/json' },
      });
    });

    const cleanJson = (rawResult || '{}')
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanJson);

    return res.json({
      success: true,
      data: parsedData,
      meta: {
        sourceType,
        studentLevel,
        fileName,
      },
    });
  } catch (error: any) {
    console.error('Explain Lesson API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحليل وشرح الدرس.',
    });
  }
});

// ==========================================
// API: «لخّص لي» (Summarize For Me Service)
// High-fidelity academic summarization, cheatsheet generator & exam review
// ==========================================
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  const ip = (req as any).clientIp || '127.0.0.1';
  const estimatedTokens = (req as any).estimatedTokens || 1000;

  try {
    const {
      summaryType = 'medium',
      content,
      fileName = 'محاضرة ميكاترونكس',
      fileMimeType,
      mode = 'summarize',
      summaryContext,
      chapterSelection = 'all',
    } = req.body;

    // Type descriptions
    const typeGuide: Record<string, string> = {
      quick: 'ملخص سريع: قصير وموجز جداً للمراجعة السريعة في 3 دقائق، يركز فقط على أهم 5 خلاصات والقوانين الجوهرية دون تفاصيل ثانوية.',
      medium: 'ملخص متوسط: متوازن وواضح يحتوي على أهم الأفكار والقوانين والتعريفات والأمثلة التطبيقية دون حشو.',
      comprehensive: 'ملخص شامل: تفصيلي ومكتمل، يحافظ على كافة المعلومات الهندسية والأرقام والاشتقاقات المهمة مع التخلص من الكلام الإنشائي والتكرار.',
      study: 'ملخص للمذاكرة والاختبار: يركز تحديداً على النقاط المرشحة للاختبارات، القوانين وطريقة التعويض، والتعريفات التي يجب حفظها وفهمها.',
      cheatsheet: 'ورقة مراجعة (Cheat Sheet): جدول وقوائم مكثفة جداً وسريعة القراءة للمراجعة في ليلة الاختبار (القوانين، الرموز، الوحدات، أهم الملاحظات).',
    };

    // Sub-services: transform to questions, formulas, definitions, quiz, hard points
    if (mode === 'to_questions') {
      const prompt = `بناءً على محتوى هذا الملخص والمحاضرة فقط دون اختراع معلومات خارجية:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

حوّل هذا الملخص إلى 8 أسئلة مراجعة وتدريب ذكية (أسئلة امتحانات مقالية وقصيرة ومسائل) مع الإجابة النموذجية الكاملة والدقيقة لكل سؤال مستخرجة حصراً من المحاضرة.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

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

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, resultText: text });
    }

    if (mode === 'extract_definitions') {
      const prompt = `استخرج معجم المفاهيم والتعريفات الهندسية من هذه المحاضرة:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

لكل مصطلح:
- المصطلح بالعربية مع المصطلح الإنجليزي المقابل: مثل المقاومة الكهربائية (Electrical Resistance).
- التعريف العلمي المبسط والدقيق بدون تعقيد.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, resultText: text });
    }

    if (mode === 'explain_hard_points') {
      const prompt = `استخرج واشرح "النقاط الصعبة" أو المعقدة في هذه المحاضرة بأسلوب مبسط وتوضيحي:
سياق الملخص:
${typeof summaryContext === 'string' ? summaryContext : JSON.stringify(summaryContext || '')}

فكك الأفكار الصعبة، اشرح السبب الفيزيائي، واستخدم تشبيهات هندسية سهلة الفهم لطلاب الميكاترونكس.`;

      const text = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
        return await generateGeminiContentWithRetry({ contents: prompt });
      });

      return res.json({ success: true, resultText: text });
    }

    // Default mode: Generate Full Structured Summary JSON
    const systemPrompt = `أنت الخبير الأكاديمي المتخصص في خدمة «لخّص لي» لطلاب هندسة الميكاترونكس.
مهمتك: تحويل المحاضرة أو الملف إلى ملخص هندسي واضح ومنظم للمراجعة.
نوع التلخيص المطلوب: ${typeGuide[summaryType] || typeGuide.medium}
اختيار الفصل أو الجزء: ${chapterSelection === 'all' ? 'كامل الملف' : chapterSelection}

قواعد الأمانة والدقة الهندسية:
1. قاعدة الحقيقة والمصدر: لا تخترع معلومات أو أرقام أو قوانين غير موجودة في الملف.
2. لا تغير الأرقام أو المعادلات أو نتائج المسائل الموجودة في المصدر.
3. التبسيط الذكي: لغة عربية فصحى سهلة، خالية من الحشو والإنشاء، مع الحفاظ الكامل على المفاهيم الجوهرية.
4. المصطلحات الإنجليزية: اعرض المصطلح الإنجليزي بين قوسين بجانب العربي مثل: الحث الكهرومغناطيسي (Electromagnetic Induction).
5. المعادلات والقوانين: اعرض القانون بصيغة واضحة، وفسّر كل رمز ووحدته (SI)، ومتى يستخدم.
6. الرسوم والمخططات: حلل الرسومات الهندسية والدوائر والتروس والجداول واختصرها بوضوح.
7. الملفات غير الواضحة: إذا كانت هناك صفحات أو أجزاء غير مقروءة، لا تخمنها بل اذكرها بوضوح في importantNotes.

يجب إرجاع النتيجة بتنسيق JSON حصراً كالتالي:
{
  "title": "عنوان المحاضرة أو الموضوع الرئيسي",
  "summaryType": "${summaryType}",
  "generalIdea": "شرح مختصر ومكثف جداً عن موضوع المحاضرة وفكرتها العامة",
  "keyPoints": [
    "النقطة الجوهرية الأولى",
    "النقطة الجوهرية الثانية",
    "النقطة الجوهرية الثالثة"
  ],
  "conceptsAndDefinitions": [
    {
      "termArabic": "المصطلح بالعربية",
      "termEnglish": "English Term",
      "definition": "تعريف مبسط ومباشر وسهل الحفظ"
    }
  ],
  "equations": [
    {
      "formula": "V = I * R",
      "name": "قانون أوم",
      "symbolMeanings": [
        { "symbol": "V", "meaning": "فرق الجهد الكهربائي", "unit": "فولت (V)" },
        { "symbol": "I", "meaning": "شدة التيار", "unit": "أمبير (A)" },
        { "symbol": "R", "meaning": "المقاومة الكهربائية", "unit": "أوم (Ω)" }
      ],
      "usageContext": "يستخدم لحساب الجهد أو التيار أو المقاومة في الدوائر الخطية"
    }
  ],
  "examples": [
    {
      "problem": "نص المسألة أو المثال المذكور في المحاضرة",
      "solutionOutline": "خطوات الحل المختصرة والواضحة مع الحفاظ على طريقة الحل",
      "result": "النتيجة النهائية بالوحدات إن وجدت"
    }
  ],
  "importantNotes": [
    "ملاحظة هامة يجب الانتباه لها في الاختبار",
    "تنبيه حول الشروط أو الوحدات"
  ],
  "conclusion": "خلاصة مكثفة بأهم ما يجب أن يتذكره الطالب دائماً",
  "diagramsSummary": [
    {
      "diagramName": "مخطط الدائرة / الرسم الميكانيكي",
      "description": "وصف ما يوضحه الرسم باختصار",
      "keyTakeaway": "الفائدة الهندسية الرئيسية من الرسم"
    }
  ],
  "chaptersOrSections": [
    {
      "sectionTitle": "القسم الأول",
      "summary": "ملخص هذا القسم"
    }
  ]
}`;

    let contentsPayload: any;

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
      const textToAnalyze = typeof content === 'string' && content.trim()
        ? `محتوى الملف / المحاضرة (${fileName}):\n${content}`
        : `المحتوى: ${fileName}`;

      contentsPayload = {
        parts: [
          { text: systemPrompt },
          { text: textToAnalyze },
        ],
      };
    }

    const rawResult = await geminiQueue.enqueue(ip, estimatedTokens, async () => {
      return await generateGeminiContentWithRetry({
        contents: contentsPayload,
        config: { responseMimeType: 'application/json' },
      });
    });

    const cleanJson = (rawResult || '{}')
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedData = JSON.parse(cleanJson);

    return res.json({
      success: true,
      data: parsedData,
      meta: {
        summaryType,
        fileName,
      },
    });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تلخيص المحتوى.',
    });
  }
});

// API: Smart Mechatronics AI Assistant
app.post('/api/gemini/assistant', async (req: Request, res: Response) => {
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
// SEEDED DATA & MEMORY STORE FOR CODES & OWNER AUTH
// ==========================================
import { SEEDED_ACTIVATION_CODES } from './src/data/activationCodesSeed.js';

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
    details: 'تم استيراد وتهيئة 300 كود اشتراك بنجاح بمبلغ 4000 ريال يمني ومدي 365 يوماً.',
    severity: 'info',
  },
];

// Active Owner Sessions & Rate Limiting Map
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

// ------------------------------------------
// OWNER AUTHENTICATION ENDPOINTS (3-STAGE)
// ------------------------------------------
app.post('/api/owner/login', (req: Request, res: Response) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
  const ipKey = String(ip);

  // Check brute-force lockout
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

  // Validate 3-Stage Auth
  const isEmailValid = (email || '').trim().toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isPasswordValid = (password || '').trim() === OWNER_PASSWORD;
  const isPinValid = (pin || '').trim() === OWNER_PIN;

  if (!isEmailValid || !isPasswordValid || !isPinValid) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
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

    addAuditLog({
      event: 'محاولة دخول مالك فاشلة',
      category: 'auth',
      ip: ipKey,
      details: `محاولة دخول فاشلة برقم محاولة (${attempt.count}/5). البريد: ${email || 'غير مسمى'}`,
      severity: 'warning',
    });

    const remainingAttempts = 5 - attempt.count;
    return res.status(401).json({
      success: false,
      error: `بيانات الاعتماد 3-Stage غير صحيحة. متبقي لديك ${remainingAttempts} محاولات قبل حظر الحساب مؤقتاً.`,
      remainingAttempts,
    });
  }

  // Auth Passed
  failedLoginAttempts.delete(ipKey);
  const token = `SMART_OWNER_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  activeOwnerSessions.add(token);

  addAuditLog({
    event: 'تسجيل دخول ناجح للمالك',
    category: 'auth',
    ip: ipKey,
    details: 'تم اجتياز جميع المراحل الثلاث (البريد، كلمة المرور، الرمز السري 3-Stage) بنجاح.',
    severity: 'info',
  });

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

app.get('/api/owner/verify-session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !activeOwnerSessions.has(token)) {
    return res.status(401).json({ success: false, error: 'جلسة المالك غير صالحة أو منتهية.' });
  }

  return res.json({ success: true, valid: true });
});

app.post('/api/owner/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    activeOwnerSessions.delete(token);
  }
  return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
});

// ------------------------------------------
// CODES & SUBSCRIPTIONS MANAGEMENT ENDPOINTS
// ------------------------------------------

// GET /api/owner/codes - Query & List 300 Activation Codes
app.get('/api/owner/codes', (req: Request, res: Response) => {
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

// Active User Subscriptions Binding Store
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

// POST /api/subscriptions/check-access - Subscriptions Middleware for 2-Day Trial & Activation Verification
app.post('/api/subscriptions/check-access', (req: Request, res: Response) => {
  const { email, role, subscription } = req.body || {};
  const ip = String(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');

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
    const trialExp = subscription.trialExpiresAt || new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

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

  // Check if Active Code Subscription
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

  // Calculate 2-Day Trial Precision
  const nowMs = Date.now();
  const trialExpMs = userSub?.trialExpiresAt ? new Date(userSub.trialExpiresAt).getTime() : nowMs + 48 * 3600 * 1000;
  const diffMs = trialExpMs - nowMs;

  if (diffMs > 0) {
    const totalSec = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    return res.json({
      success: true,
      isAccessAllowed: true,
      statusType: 'trial',
      remainingSec: totalSec,
      subscription: userSub,
      formattedCountdown: `تجربة مجانية متبقية: ${hours} ساعة و ${mins} دقيقة`,
    });
  }

  // Trial Expired
  if (userSub) {
    userSub.status = 'trial_expired';
  }

  return res.json({
    success: true,
    isAccessAllowed: false,
    statusType: 'trial_expired',
    remainingSec: 0,
    subscription: userSub,
    formattedCountdown: 'انتهت التجربة المجانية (48 ساعة)',
  });
});

// POST /api/subscriptions/redeem - Atomic Student Activation Code Redemption & User Key Binding
app.post('/api/subscriptions/redeem', (req: Request, res: Response) => {
  const { code, studentName, studentEmail } = req.body;
  const ip = String(req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'يرجى أدخال كود التفعيل الخاص بك.' });
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

  // Atomic Code Redemption Update
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

  // Bind key to user subscription record in server DB
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


// POST /api/owner/codes/revoke - Revoke Activation Code
app.post('/api/owner/codes/revoke', (req: Request, res: Response) => {
  const { code } = req.body;
  const idx = activationCodesStore.findIndex((c) => c.code === code);
  if (idx === -1) return res.status(404).json({ success: false, error: 'الكود غير موجود' });

  activationCodesStore[idx].status = 'revoked';
  addAuditLog({
    event: 'إلغاء كود اشتراك',
    category: 'system',
    ip: String(req.ip),
    details: `تم إلغاء الكود ${code} بواسطة المالك.`,
    severity: 'warning',
  });
  return res.json({ success: true, message: `تم إلغاء الكود ${code} بنجاح.` });
});

// POST /api/owner/codes/reset - Reset Activation Code to Unused
app.post('/api/owner/codes/reset', (req: Request, res: Response) => {
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
  addAuditLog({
    event: 'إعادة ضبط كود اشتراك',
    category: 'system',
    ip: String(req.ip),
    details: `تمت إعادة ضبط الكود ${code} إلى غير مستخدم.`,
    severity: 'info',
  });
  return res.json({ success: true, message: `تمت إعادة ضبط الكود ${code} إلى وضع غير مستخدم.` });
});

// POST /api/owner/codes/import - Bulk Import Codes
app.post('/api/owner/codes/import', (req: Request, res: Response) => {
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

  addAuditLog({
    event: 'استيراد أكواد اشتراك إضافية',
    category: 'system',
    ip: String(req.ip),
    details: `تم إضافة ${addedCount} كود جديد لقاعدة البيانات. الإجمالي الحالي: ${activationCodesStore.length}.`,
    severity: 'info',
  });

  return res.json({
    success: true,
    addedCount,
    totalCount: activationCodesStore.length,
    message: `تم استيراد ${addedCount} كود بنجاح.`,
  });
});

// GET /api/owner/logs - Security Audit Logs
app.get('/api/owner/logs', (_req: Request, res: Response) => {
  return res.json({ success: true, logs: securityAuditLogs });
});

// API: Arduino Code Generator & Circuit Logic Check
app.post('/api/gemini/arduino-gen', async (req: Request, res: Response) => {

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

    res.json({ success: true, data: JSON.parse(text || '{}') });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(
          url,
          `<!doctype html>
<html lang="ar" dir="rtl" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>منصة دكتور الميكاترونكس الذكي | Dr. Smart Mechatronics Platform</title>
    <meta name="description" content="منصة تعليمية وهندسية تفاعلية متكاملة للميكاترونكس تتضمن قاعة الدكتور الذكي، المختبر الواقعي 3D، المكتبة الهندسية، حاسبات هندسية، ومجتمع المهندسين." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#0A192F] text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
