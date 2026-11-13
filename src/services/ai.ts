import { Doctor, LectureData } from '../types';
import { getStoredUser } from './storage';

export type LectureProgressStage = 
  | 'uploading'
  | 'analyzing'
  | 'preparing'
  | 'whiteboard'
  | 'started';

export const PROGRESS_STAGE_LABELS: Record<LectureProgressStage, string> = {
  uploading: 'جاري رفع الملف ورسومات الدائرة...',
  analyzing: 'جاري تحليل المحتوى والنصوص واستخراج البيانات...',
  preparing: 'جاري تجهيز المحاضرة من الدكتور الذكي...',
  whiteboard: 'جاري تحضير السبورة الذكية ورسم المخططات...',
  started: 'بدأ الدكتور الشرح بنجاح!',
};

export interface OptimizedImageResult {
  originalUrl: string;
  optimizedVisionBase64: string;
  base64: string;
}

function getStudentHeaders(): Record<string, string> {
  try {
    const user = getStoredUser();
    const studentId = user?.email || user?.id || 'student';
    return {
      'Content-Type': 'application/json',
      'x-student-id': studentId,
    };
  } catch {
    return {
      'Content-Type': 'application/json',
    };
  }
}

async function fetchJsonWithRetry<T = any>(
  url: string,
  payload: unknown,
  defaultErrorMsg: string,
  maxRetries = 2
): Promise<T> {
  let lastNetworkError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getStudentHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch (_parseErr) {
        if (response.status === 413) {
          throw new Error('حجم الملف المرفوع كبير جداً (413). يرجى اختيار ملف أصغر أو صورة مضغوطة.');
        }
        if (response.status === 504 || response.status === 408) {
          throw new Error('انتهت مهلة الاتصال بالخادم (504). يرجى المحاولة مرة أخرى.');
        }
        if (response.status >= 502 && response.status <= 503 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        throw new Error(rawText.slice(0, 150) || defaultErrorMsg);
      }

      if (!response.ok || !json.success) {
        throw new Error(json.error || defaultErrorMsg);
      }

      return json as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isNetworkOrAbort =
        err instanceof TypeError ||
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('failed to fetch') ||
        String(err?.message || '').toLowerCase().includes('network');

      if (isNetworkOrAbort) {
        lastNetworkError = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
          continue;
        }
        throw new Error(
          'تعذر الاتصال بالخادم حالياً (خطأ في الشبكة أو انقطاع الاتصال المؤقت). تم الاحتفاظ ببياناتك، يرجى الضغط على إعادة المحاولة.'
        );
      }

      throw err;
    }
  }

  throw lastNetworkError || new Error(defaultErrorMsg);
}

/**
 * Client-Side Image Upload Optimization Service
 * Resizes large image files down specifically for Gemini Vision API payload (max 800px, 0.78 JPEG quality),
 * saving bandwidth & token budget while maintaining high-res previewUrl for user viewing in UI.
 */
export async function compressImageFile(file: File): Promise<OptimizedImageResult> {
  const previewUrl = URL.createObjectURL(file);

  const readAsDataUrlFallback = (): Promise<string> =>
    new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (ev) => res((ev.target?.result as string) || '');
      reader.onerror = () => res('');
      reader.readAsDataURL(file);
    });

  return new Promise((resolve) => {
    // Non-image fallback
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const resStr = (e.target?.result as string) || '';
        resolve({
          originalUrl: previewUrl,
          optimizedVisionBase64: resStr,
          base64: resStr,
        });
      };
      reader.readAsText(file);
      return;
    }

    const img = new Image();
    img.src = previewUrl;
    img.onload = async () => {
      // Vision Thumbnail Dimensions: Max 800px width/height for fast multimodal analysis
      const visionMaxDim = 800;
      let width = img.width;
      let height = img.height;

      if (width > visionMaxDim || height > visionMaxDim) {
        if (width > height) {
          height = Math.round((height * visionMaxDim) / width);
          width = visionMaxDim;
        } else {
          width = Math.round((width * visionMaxDim) / height);
          height = visionMaxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // High quality bicubic scaling onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG format for Gemini
        const visionBase64 = canvas.toDataURL('image/jpeg', 0.78);

        resolve({
          originalUrl: previewUrl,
          optimizedVisionBase64: visionBase64,
          base64: visionBase64,
        });
        return;
      }

      const fallbackDataUrl = await readAsDataUrlFallback();
      resolve({
        originalUrl: previewUrl,
        optimizedVisionBase64: fallbackDataUrl,
        base64: fallbackDataUrl,
      });
    };

    img.onerror = async () => {
      const fallbackDataUrl = await readAsDataUrlFallback();
      resolve({
        originalUrl: previewUrl,
        optimizedVisionBase64: fallbackDataUrl,
        base64: fallbackDataUrl,
      });
    };
  });
}


export async function requestLectureExplanation(
  doctor: Doctor,
  lessonTitle: string,
  userPrompt: string,
  uploadedContent?: string,
  onProgress?: (stage: LectureProgressStage) => void,
  uploadedMimeType?: string,
  socialUrl?: string,
  videoFrames?: string[]
): Promise<LectureData> {
  if (onProgress) onProgress('uploading');

  // Stage 1 -> Stage 2
  await new Promise((r) => setTimeout(r, 150));
  if (onProgress) onProgress('analyzing');

  // Stage 2 -> Stage 3
  await new Promise((r) => setTimeout(r, 200));
  if (onProgress) onProgress('preparing');

  const json = await fetchJsonWithRetry<{ success: boolean; data: LectureData }>(
    '/api/gemini/explain',
    {
      doctorName: doctor.name,
      subject: doctor.subject,
      level: doctor.level,
      language: doctor.language,
      lessonTitle,
      userPrompt,
      uploadedContent,
      uploadedMimeType,
      socialUrl,
      videoFrames,
      requestFingerprint: `req_${doctor.id}_${Date.now()}`,
    },
    'فشل محرك إلقاء المحاضرة من الدكتور الذكي'
  );

  if (!json.data) {
    throw new Error('لم يتم استلام بيانات المحاضرة من الخادم.');
  }

  // Stage 3 -> Stage 4
  if (onProgress) onProgress('whiteboard');
  await new Promise((r) => setTimeout(r, 200));

  // Stage 4 -> Stage 5
  if (onProgress) onProgress('started');

  return json.data;
}

export async function askMechatronicsAssistant(
  userQuery: string,
  mode: 'general' | 'code_review' | 'circuit_troubleshoot' = 'general',
  codeSnippet?: string,
  imageBase64?: string
): Promise<string> {
  const json = await fetchJsonWithRetry<{ success: boolean; answer: string }>(
    '/api/gemini/assistant',
    {
      userQuery,
      mode,
      codeSnippet,
      imageBase64,
    },
    'فشل الاتصال بمساعد الميكاترونكس الذكي'
  );

  if (!json.answer) {
    throw new Error('لم يتم استلام رد من المساعد الذكي.');
  }

  return json.answer;
}

export async function generateArduinoProjectCode(
  projectDescription: string,
  components: string[]
): Promise<{ code: string; explanation: string; pinouts: any[] }> {
  const json = await fetchJsonWithRetry<{
    success: boolean;
    data: { code: string; explanation: string; pinouts: any[] };
  }>(
    '/api/gemini/arduino-gen',
    {
      projectDescription,
      components,
    },
    'فشل توليد كود الأردوينو'
  );

  if (!json.data) {
    throw new Error('تعذر توليد كود الأردوينو.');
  }

  return json.data;
}

import { professorVoiceEngine } from './professorVoiceEngine';

// Text to speech using centralized Strict Adult Male Professor Voice Engine
export class DoctorVoiceEngine {
  public speak(text: string, lang: 'ar' | 'en' = 'ar', _rate: number = 0.94, onEnd?: () => void) {
    void professorVoiceEngine.speak(text, {
      lang,
      onEnd,
      onError: onEnd,
    });
  }

  public pause() {
    professorVoiceEngine.pause();
  }

  public resume() {
    professorVoiceEngine.resume();
  }

  public stop() {
    professorVoiceEngine.stop();
  }

  public getSpeakingState(): boolean {
    return professorVoiceEngine.getSpeakingState();
  }
}

export const doctorVoice = new DoctorVoiceEngine();
