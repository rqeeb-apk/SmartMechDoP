import { LessonExplanationData, StudentLevel, LessonSourceType } from '../types';

export interface ExplainLessonParams {
  sourceType: LessonSourceType;
  content: string; // text or base64
  fileName: string;
  fileMimeType?: string;
  studentLevel: StudentLevel;
  lessonContext?: any;
}

export interface FollowupParams {
  lessonContext: LessonExplanationData;
  question: string;
}

export interface AlternativeParams {
  lessonContext: LessonExplanationData;
  mode: 'simplify' | 'deepen' | 'solved_example';
}

/**
 * Robust JSON response parser handling plain-text / HTML Vercel errors gracefully
 */
async function parseSafeJsonResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  const rawText = await response.text();
  let json: any;

  try {
    json = JSON.parse(rawText);
  } catch (_e) {
    console.error('[API Non-JSON Response]:', response.status, rawText.slice(0, 250));

    if (response.status === 413) {
      throw new Error(
        'حجم الملف المرفوع تجاوز الحد الأقصى المسموح به لخادم Vercel (413 Payload Too Large). تم تفعيل الضغط التلقائي للصور، يرجى إعادة المحاولة.'
      );
    }
    if (response.status === 504 || response.status === 408) {
      throw new Error(
        'استغرق تحليل الدرس وقتاً أطول من المعتاد (انتهت مهلة 504). يرجى إعادة المحاولة.'
      );
    }
    if (response.status === 500) {
      if (rawText.toLowerCase().includes('server error') || rawText.includes('FUNCTION_INVOCATION')) {
        throw new Error(
          'تعذر استدعاء دالة الخادم على Vercel (500). يرجى التأكد من إضافة مفتاح GEMINI_API_KEY داخل لوحة تحكم Vercel (Settings > Environment Variables).'
        );
      }
    }

    throw new Error(
      `استجاب الخادم بخطأ (${response.status}): ${rawText.slice(0, 150) || defaultErrorMsg}`
    );
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || defaultErrorMsg);
  }

  return json;
}

/**
 * Requests complete 14-step academic explanation from server-side Gemini API
 */
export async function requestLessonExplanation(
  params: ExplainLessonParams,
  onProgress?: (stage: string) => void
): Promise<LessonExplanationData> {
  onProgress?.('reading');

  const response = await fetch('/api/gemini/explain-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceType: params.sourceType,
      content: params.content,
      fileName: params.fileName,
      fileMimeType: params.fileMimeType,
      studentLevel: params.studentLevel,
      mode: 'full_explanation',
    }),
  });

  const json = await parseSafeJsonResponse<any>(
    response,
    'فشل خادم تحليل وشرح الدرس. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.'
  );

  return json.data as LessonExplanationData;
}

/**
 * Interactive Q&A strictly grounded in the session's lesson
 */
export async function askLessonFollowupQuestion(params: FollowupParams): Promise<{
  answer: string;
  isOutOfLessonContext: boolean;
}> {
  const response = await fetch('/api/gemini/explain-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'followup_question',
      lessonContext: params.lessonContext,
      followupQuestion: params.question,
    }),
  });

  const json = await parseSafeJsonResponse<any>(response, 'تعذر الإجابة على السؤال.');

  return {
    answer: json.answer,
    isOutOfLessonContext: !!json.isOutOfLessonContext,
  };
}

/**
 * Request Simpler Explanation, Deeper Engineering, or Solved Example
 */
export async function requestLessonAlternative(params: AlternativeParams): Promise<string> {
  const response = await fetch('/api/gemini/explain-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: params.mode,
      lessonContext: params.lessonContext,
    }),
  });

  const json = await parseSafeJsonResponse<any>(response, 'تعذر معالجة الطلب البديل.');
  return json.answer;
}

/**
 * Off-screen canvas image compressor to maintain crystal-clear OCR while keeping size < 500KB
 */
function compressImageForOCR(file: File, maxDim = 1600, quality = 0.85): Promise<{ content: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ content: compressedDataUrl, mimeType: 'image/jpeg' });
          return;
        }

        resolve({ content: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      };

      img.onerror = () => {
        resolve({ content: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ content: '', mimeType: file.type || 'image/jpeg' });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Client-side file reader helper with automatic image compression and base64 extraction
 */
export async function readFileAsBase64OrText(file: File): Promise<{
  content: string;
  isBase64: boolean;
  mimeType: string;
}> {
  // If image, compress via Canvas to guarantee ultra-crisp formulas while staying well under Vercel's 4.5MB limit
  if (file.type.startsWith('image/')) {
    const compressed = await compressImageForOCR(file, 1200, 0.80);
    return {
      content: compressed.content,
      isBase64: true,
      mimeType: compressed.mimeType,
    };
  }

  return new Promise((resolve, reject) => {
    const isBinary =
      file.type.startsWith('video/') ||
      file.type === 'application/pdf' ||
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.pptx');

    const reader = new FileReader();

    if (isBinary) {
      reader.onload = () => {
        resolve({
          content: reader.result as string,
          isBase64: true,
          mimeType: file.type || 'application/octet-stream',
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        resolve({
          content: reader.result as string,
          isBase64: false,
          mimeType: file.type || 'text/plain',
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    }
  });
}
