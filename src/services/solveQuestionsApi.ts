import { SolveQuestionsResponse } from '../types';
import { getStoredUser } from './storage';
import { YemeniDialect } from './lectureHallApi';

export interface SolveQuestionsParams {
  questionsText: string;
  extraNotes?: string;
  uploadedContent?: string;
  uploadedMimeType?: string;
  videoFrames?: string[];
  fileName?: string;
  dialect?: YemeniDialect;
}

export async function requestSolveQuestions(
  params: SolveQuestionsParams
): Promise<SolveQuestionsResponse> {
  const user = getStoredUser();
  const studentId = user?.email || user?.id || 'student';

  for (let attempt = 0; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch('/api/gemini/solve-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': studentId,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const rawText = await res.text();
      let json: any;

      try {
        json = JSON.parse(rawText);
      } catch {
        if (res.status === 413) {
          throw new Error('حجم الملف المرفوع كبير جداً. يرجى رفع صورة أو ملف بحجم أصغر.');
        }
        if (res.status >= 502 && res.status <= 504 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
          continue;
        }
        throw new Error('تعذر تحليل رد الخادم أثناء حل الأسئلة.');
      }

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'تعذر استخراج وحل الأسئلة الآن.');
      }

      return json.data as SolveQuestionsResponse;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isNetworkOrAbort =
        err instanceof TypeError ||
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('failed to fetch');

      if (isNetworkOrAbort && attempt < 2) {
        await new Promise((r) => setTimeout(r, 850 * (attempt + 1)));
        continue;
      }
      if (isNetworkOrAbort) {
        throw new Error('تعذر الاتصال بالخادم (انقطاع مؤقت في الشبكة). يرجى الضغط على "حل" للمحاولة مرة أخرى.');
      }
      throw err;
    }
  }

  throw new Error('تعذر إكمال حل الأسئلة.');
}
