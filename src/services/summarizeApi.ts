import { LectureSummaryData, SummaryType, SavedSummaryItem } from '../types';

export interface SummarizeParams {
  summaryType: SummaryType;
  content: string; // text or base64
  fileName: string;
  fileMimeType?: string;
  chapterSelection?: string;
}

const SUMMARIES_STORAGE_KEY = 'dr_smart_saved_summaries';

/**
 * Robust JSON response parser handling plain-text / HTML Vercel errors gracefully
 */
async function parseSafeJsonResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  const rawText = await response.text();
  let json: any;

  try {
    json = JSON.parse(rawText);
  } catch (_e) {
    console.error('[API Non-JSON Response in Summarize]:', response.status, rawText.slice(0, 250));

    if (response.status === 413) {
      throw new Error(
        'حجم الملف المرفوع تجاوز الحد الأقصى المسموح به لخادم Vercel (413 Payload Too Large). تم تفعيل الضغط التلقائي للصور، يرجى إعادة المحاولة.'
      );
    }
    if (response.status === 504 || response.status === 408) {
      throw new Error(
        'استغرق إعداد الملخص وقتاً أطول من المعتاد (انتهت مهلة 504). يرجى إعادة المحاولة.'
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
 * Call backend to generate structured lecture summary
 */
export async function requestLectureSummary(
  params: SummarizeParams,
  onProgress?: (stage: string) => void
): Promise<LectureSummaryData> {
  onProgress?.('reading');

  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summaryType: params.summaryType,
      content: params.content,
      fileName: params.fileName,
      fileMimeType: params.fileMimeType,
      chapterSelection: params.chapterSelection || 'all',
      mode: 'summarize',
    }),
  });

  const json = await parseSafeJsonResponse<any>(
    response,
    'تعذر إعداد الملخص. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.'
  );

  return json.data as LectureSummaryData;
}

/**
 * Transform summary to questions, formula cheatcards, definitions glossary, or hard points breakdown
 */
export async function requestSummaryTransformation(
  summaryContext: LectureSummaryData,
  mode: 'to_questions' | 'extract_formulas' | 'extract_definitions' | 'explain_hard_points'
): Promise<string> {
  const response = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      summaryContext,
    }),
  });

  const json = await parseSafeJsonResponse<any>(response, 'تعذر تنفيذ عملية التحويل.');
  return json.resultText;
}

/**
 * Retrieve saved summaries from localStorage
 */
export function getStoredSummaries(): SavedSummaryItem[] {
  try {
    const raw = localStorage.getItem(SUMMARIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save a summary to «ملخصاتي»
 */
export function saveSummaryToStorage(summary: SavedSummaryItem): SavedSummaryItem[] {
  try {
    const existing = getStoredSummaries();
    const filtered = existing.filter((s) => s.id !== summary.id);
    const updated = [summary, ...filtered];
    localStorage.setItem(SUMMARIES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Delete a saved summary
 */
export function deleteSavedSummary(id: string): SavedSummaryItem[] {
  try {
    const existing = getStoredSummaries();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(SUMMARIES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}
