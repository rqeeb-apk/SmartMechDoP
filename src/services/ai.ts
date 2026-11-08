import { Doctor, LectureData } from '../types';

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

/**
 * Client-Side Image Upload Optimization Service
 * Resizes large image files down specifically for Gemini Vision API payload (max 800px, 0.78 JPEG quality),
 * saving bandwidth & token budget while maintaining high-res previewUrl for user viewing in UI.
 */
export async function compressImageFile(file: File): Promise<OptimizedImageResult> {
  const previewUrl = URL.createObjectURL(file);

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
    img.onload = () => {
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

      resolve({
        originalUrl: previewUrl,
        optimizedVisionBase64: previewUrl,
        base64: previewUrl,
      });
    };

    img.onerror = () =>
      resolve({
        originalUrl: previewUrl,
        optimizedVisionBase64: previewUrl,
        base64: previewUrl,
      });
  });
}


export async function requestLectureExplanation(
  doctor: Doctor,
  lessonTitle: string,
  userPrompt: string,
  uploadedContent?: string,
  onProgress?: (stage: LectureProgressStage) => void
): Promise<LectureData> {
  if (onProgress) onProgress('uploading');

  // Stage 1 -> Stage 2
  await new Promise((r) => setTimeout(r, 200));
  if (onProgress) onProgress('analyzing');

  // Stage 2 -> Stage 3
  await new Promise((r) => setTimeout(r, 300));
  if (onProgress) onProgress('preparing');

  const response = await fetch('/api/gemini/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorName: doctor.name,
      subject: doctor.subject,
      level: doctor.level,
      language: doctor.language,
      lessonTitle,
      userPrompt,
      uploadedContent,
      requestFingerprint: `req_${doctor.id}_${Date.now()}`,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || 'فشل محرك إلقاء المحاضرة من الدكتور الذكي');
  }

  // Stage 3 -> Stage 4
  if (onProgress) onProgress('whiteboard');
  await new Promise((r) => setTimeout(r, 250));

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
  const response = await fetch('/api/gemini/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userQuery,
      mode,
      codeSnippet,
      imageBase64,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.answer) {
    throw new Error(json.error || 'فشل الاتصال بمساعد الميكاترونكس الذكي');
  }

  return json.answer;
}

export async function generateArduinoProjectCode(
  projectDescription: string,
  components: string[]
): Promise<{ code: string; explanation: string; pinouts: any[] }> {
  const response = await fetch('/api/gemini/arduino-gen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectDescription,
      components,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || 'فشل توليد كود الأردوينو');
  }

  return json.data;
}

// Text to speech using Web Speech API with fallback
export class DoctorVoiceEngine {
  private synth: SpeechSynthesis | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public speak(text: string, lang: 'ar' | 'en' = 'ar', rate: number = 1.0, onEnd?: () => void) {
    if (!this.synth) return;

    this.stop();

    // Clean markdown symbols for natural speech
    const cleanText = text
      .replace(/[*#`_~]/g, '')
      .replace(/\\\(.*?\\\)/g, 'المعادلة')
      .replace(/\$(.*?)\$/g, 'المعادلة');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }
}

export const doctorVoice = new DoctorVoiceEngine();
