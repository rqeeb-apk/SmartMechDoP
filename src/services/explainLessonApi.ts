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

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'فشل خادم تحليل وشرح الدرس. يرجى المحاولة مرة أخرى.');
  }

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

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'تعذر الإجابة على السؤال.');
  }

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

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'تعذر معالجة الطلب البديل.');
  }

  return json.answer;
}

/**
 * Client-side file reader helper with automatic MIME and base64 extraction
 */
export function readFileAsBase64OrText(file: File): Promise<{
  content: string;
  isBase64: boolean;
  mimeType: string;
}> {
  return new Promise((resolve, reject) => {
    const isBinary =
      file.type.startsWith('image/') ||
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
