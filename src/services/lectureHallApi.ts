import { getStoredUser } from './storage';

export type YemeniDialect = 'sanani' | 'adani' | 'taizzi';

export type LectureServiceType =
  | 'explain'
  | 'ask_doctor'
  | 'solve_homework'
  | 'quiz_me'
  | 'did_not_understand';

export type CourseSubject =
  | 'control'
  | 'electronics'
  | 'mechanics'
  | 'programming'
  | 'robotics';

export interface LectureHallRequestParams {
  serviceType: LectureServiceType;
  dialect: YemeniDialect;
  courseSubject: CourseSubject;
  topic: string;
  question?: string;
  extraDetails?: string;
  socialUrl?: string;
  uploadedContent?: string;
  uploadedMimeType?: string;
  videoFrames?: string[];
  fileName?: string;
  stepIndex?: number;
  confusionPoint?: string;
}

export interface LectureHallResponseData {
  doctorSpeech: string;
  boardTitle: string;
  boardNotes: string[];
  boardEquation?: string;
  diagramType: 'circuit' | 'gears' | 'plc' | 'arduino' | 'servo' | 'graph' | 'mindmap';
  diagramTitle?: string;
  diagramData?: {
    keyMetrics?: string[];
    summary?: string;
    nodes?: { id: string; label: string; sub?: string }[];
  };
  steps?: { phase: string; details: string }[];
  realWorldExamples?: { title: string; yemeniAnalogy: string; engineeringApplication: string }[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  yemeniEncouragement?: string;
  followupOptions?: string[];
  fromCache?: boolean;
}

/**
 * Request lecture hall guidance from backend AI with automatic retry on transient network errors
 */
export async function requestLectureHall(params: LectureHallRequestParams): Promise<LectureHallResponseData> {
  const user = getStoredUser();
  const studentId = user?.email || user?.id || 'student';

  for (let attempt = 0; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch('/api/gemini/lecture-hall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': studentId,
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        if (res.status >= 502 && res.status <= 503 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        let msg = 'تعذر الاتصال بقاعة المحاضرات الذكية.';
        try {
          const json = JSON.parse(errText);
          msg = json.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'فشلت معالجة بيانات السبورة الذكية.');
      }

      return json.data as LectureHallResponseData;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isNetworkOrAbort =
        err instanceof TypeError ||
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('failed to fetch');

      if (isNetworkOrAbort) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
          continue;
        }
        throw new Error('تعذر الاتصال بقاعة المحاضرات حالياً (انقطاع مؤقت في الشبكة). يرجى إعادة المحاولة.');
      }
      throw err;
    }
  }

  throw new Error('تعذر الاتصال بقاعة المحاضرات الذكية.');
}

import { professorVoiceEngine } from './professorVoiceEngine';

export const yemeniDoctorVoice = professorVoiceEngine;

