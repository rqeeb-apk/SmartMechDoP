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

export interface SummarizeStreamCallbacks {
  onStart?: () => void;
  onStatus?: (stage: string, message: string) => void;
  onChunk?: (accumulatedText: string, chunk: string) => void;
  onComplete?: (data: LectureSummaryData) => void;
  onError?: (error: Error) => void;
}

/**
 * Requests progressive SSE streaming summary from server-side Gemini API with Vercel AI SDK streamText.
 * Keeps connection active and yields chunks live to completely eliminate 504 timeouts on Vercel.
 */
export async function requestLectureSummaryStream(
  params: SummarizeParams,
  callbacks?: SummarizeStreamCallbacks
): Promise<LectureSummaryData> {
  callbacks?.onStart?.();
  callbacks?.onStatus?.('reading', 'جاري إرسال المحتوى وبدء البث عبر Vercel AI SDK streamText...');

  let response: Response;
  try {
    response = await fetch('/api/gemini/summarize-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        summaryType: params.summaryType,
        content: params.content,
        fileName: params.fileName,
        fileMimeType: params.fileMimeType,
        chapterSelection: params.chapterSelection || 'all',
        stream: true,
      }),
    });
  } catch (_netErr: any) {
    return await requestLectureSummary(params);
  }

  if (!response.ok) {
    return await parseSafeJsonResponse<any>(response, 'تعذر بدء بث التلخيص من الخادم.').then(
      (r) => r.data as LectureSummaryData
    );
  }

  if (!response.body) {
    return await requestLectureSummary(params);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let finalData: LectureSummaryData | null = null;
  let sseBuffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) {
          continue; // heartbeat
        }

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'start') {
              callbacks?.onStatus?.(event.stage || 'reading', event.message || 'بدأ بث التلخيص...');
            } else if (event.type === 'status') {
              callbacks?.onStatus?.(event.stage || 'analyzing', event.message || 'جاري إعداد الملخص...');
            } else if (event.type === 'chunk') {
              accumulatedText += event.text || '';
              callbacks?.onChunk?.(accumulatedText, event.text || '');
            } else if (event.type === 'done') {
              finalData = event.data as LectureSummaryData;
              callbacks?.onComplete?.(finalData);
            } else if (event.type === 'error') {
              throw new Error(event.error || 'حدث خطأ أثناء بث التلخيص.');
            }
          } catch (parseErr: any) {
            if (parseErr.message?.includes('حدث خطأ') || jsonStr.includes('"error"')) {
              throw parseErr;
            }
          }
        }
      }
    }
  } catch (err: any) {
    callbacks?.onError?.(err);
    throw err;
  }

  if (!finalData) {
    if (accumulatedText.length > 50) {
      try {
        const clean = accumulatedText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(clean) as LectureSummaryData;
      } catch (_e) {
        return await requestLectureSummary(params);
      }
    } else {
      return await requestLectureSummary(params);
    }
  }

  return finalData;
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
