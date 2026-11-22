import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface DoctorQuestion {
  id: string | number;
  question_number: string;
  student_id: string;
  student_name: string;
  university: string;
  level: string;
  major: string;
  subject: string;
  lecture: string;
  title: string;
  question_text: string;
  priority: 'عادي' | 'مهم' | 'عاجل';
  status: 'جديد' | 'قيد المراجعة' | 'تمت الإجابة' | 'مغلق';
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
  answered_at?: string | null;
}

export interface DoctorMessage {
  id: string | number;
  question_id: string | number;
  sender_id: string;
  sender_type: 'student' | 'doctor';
  message: string;
  attachment_url?: string | null;
  created_at: string;
  is_read: boolean;
}

export interface DoctorNotification {
  id: string | number;
  user_id: string;
  question_id: string | number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const LOCAL_STORAGE_QUESTIONS_KEY = 'dr_smart_doctor_questions_v1';
const LOCAL_STORAGE_MESSAGES_KEY = 'dr_smart_doctor_messages_v1';
const LOCAL_STORAGE_NOTIFS_KEY = 'dr_smart_doctor_notifs_v1';

// Helper for local storage fallback
function getLocalQuestions(): DoctorQuestion[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_QUESTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalQuestions(questions: DoctorQuestion[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
  } catch {}
}

function getLocalMessages(): DoctorMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalMessages(msgs: DoctorMessage[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MESSAGES_KEY, JSON.stringify(msgs));
  } catch {}
}

function getLocalNotifs(): DoctorNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalNotifs(notifs: DoctorNotification[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTIFS_KEY, JSON.stringify(notifs));
  } catch {}
}

// Generate unique question number like Q-2026-00001
export function generateQuestionNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `Q-${year}-${rand}`;
}

export async function fetchDoctorQuestions(): Promise<DoctorQuestion[]> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        saveLocalQuestions(data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchDoctorQuestions error, using local fallback:', e);
    }
  }
  return getLocalQuestions();
}

export async function createDoctorQuestion(payload: {
  student_id: string;
  student_name: string;
  university: string;
  level: string;
  major: string;
  subject: string;
  lecture: string;
  title: string;
  question_text: string;
  priority: 'عادي' | 'مهم' | 'عاجل';
  attachment_url?: string | null;
}): Promise<DoctorQuestion> {
  const nowIso = new Date().toISOString();
  const qNumber = generateQuestionNumber();
  const newQuestion: DoctorQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    question_number: qNumber,
    student_id: payload.student_id,
    student_name: payload.student_name,
    university: payload.university,
    level: payload.level,
    major: payload.major,
    subject: payload.subject,
    lecture: payload.lecture,
    title: payload.title,
    question_text: payload.question_text,
    priority: payload.priority || 'عادي',
    status: 'جديد',
    attachment_url: payload.attachment_url || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_questions')
        .insert(newQuestion)
        .select('*')
        .single();
      if (!error && data) {
        const list = getLocalQuestions();
        saveLocalQuestions([data, ...list]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase createDoctorQuestion error, using local fallback:', e);
    }
  }

  const list = getLocalQuestions();
  const updated = [newQuestion, ...list];
  saveLocalQuestions(updated);
  return newQuestion;
}

export async function updateQuestionStatus(
  questionId: string | number,
  status: 'جديد' | 'قيد المراجعة' | 'تمت الإجابة' | 'مغلق',
  answered?: boolean
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  if (supabase && isSupabaseConfigured) {
    try {
      const updatePayload: any = { status, updated_at: nowIso };
      if (answered) {
        updatePayload.answered_at = nowIso;
      }
      const { error } = await supabase
        .from('doctor_questions')
        .update(updatePayload)
        .eq('id', questionId);
      if (!error) {
        const list = getLocalQuestions().map((q) =>
          String(q.id) === String(questionId)
            ? { ...q, status, updated_at: nowIso, ...(answered ? { answered_at: nowIso } : {}) }
            : q
        );
        saveLocalQuestions(list);
        return true;
      }
    } catch (e) {
      console.warn('Supabase updateQuestionStatus error:', e);
    }
  }

  const list = getLocalQuestions().map((q) =>
    String(q.id) === String(questionId)
      ? { ...q, status, updated_at: nowIso, ...(answered ? { answered_at: nowIso } : {}) }
      : q
  );
  saveLocalQuestions(list);
  return true;
}

export async function fetchDoctorMessages(questionId: string | number): Promise<DoctorMessage[]> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_messages')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchDoctorMessages error:', e);
    }
  }
  return getLocalMessages().filter((m) => String(m.question_id) === String(questionId));
}

export async function sendDoctorMessage(payload: {
  question_id: string | number;
  sender_id: string;
  sender_type: 'student' | 'doctor';
  message: string;
  attachment_url?: string | null;
  studentUserId?: string;
  questionTitle?: string;
}): Promise<DoctorMessage> {
  const nowIso = new Date().toISOString();
  const newMsg: DoctorMessage = {
    id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    question_id: payload.question_id,
    sender_id: payload.sender_id,
    sender_type: payload.sender_type,
    message: payload.message,
    attachment_url: payload.attachment_url || null,
    created_at: nowIso,
    is_read: false,
  };

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_messages')
        .insert(newMsg)
        .select('*')
        .single();
      if (!error && data) {
        const list = getLocalMessages();
        saveLocalMessages([...list, data]);
        
        // If doctor replied, update question status to answered and notify student
        if (payload.sender_type === 'doctor') {
          await updateQuestionStatus(payload.question_id, 'تمت الإجابة', true);
          if (payload.studentUserId) {
            await createNotification({
              user_id: payload.studentUserId,
              question_id: payload.question_id,
              title: 'قام الدكتور بالرد على سؤالك 🔔',
              message: `لديك رد جديد من الدكتور بخصوص سؤالك: "${payload.questionTitle || 'سؤال هندسي'}"`,
            });
          }
        } else {
          // If student sent follow-up, set status back to in_review or new
          await updateQuestionStatus(payload.question_id, 'قيد المراجعة');
        }

        return data;
      }
    } catch (e) {
      console.warn('Supabase sendDoctorMessage error:', e);
    }
  }

  const list = getLocalMessages();
  saveLocalMessages([...list, newMsg]);

  if (payload.sender_type === 'doctor') {
    await updateQuestionStatus(payload.question_id, 'تمت الإجابة', true);
    if (payload.studentUserId) {
      await createNotification({
        user_id: payload.studentUserId,
        question_id: payload.question_id,
        title: 'قام الدكتور بالرد على سؤالك 🔔',
        message: `لديك رد جديد من الدكتور بخصوص سؤالك: "${payload.questionTitle || 'سؤال هندسي'}"`,
      });
    }
  } else {
    await updateQuestionStatus(payload.question_id, 'قيد المراجعة');
  }

  return newMsg;
}

export async function fetchDoctorNotifications(userId: string): Promise<DoctorNotification[]> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchDoctorNotifications error:', e);
    }
  }
  return getLocalNotifs().filter((n) => String(n.user_id) === String(userId));
}

export async function createNotification(payload: {
  user_id: string;
  question_id: string | number;
  title: string;
  message: string;
}): Promise<DoctorNotification> {
  const notif: DoctorNotification = {
    id: `n_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: payload.user_id,
    question_id: payload.question_id,
    title: payload.title,
    message: payload.message,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  if (supabase && isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('doctor_notifications')
        .insert(notif)
        .select('*')
        .single();
      if (!error && data) {
        const list = getLocalNotifs();
        saveLocalNotifs([data, ...list]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase createNotification error:', e);
    }
  }

  const list = getLocalNotifs();
  const updated = [notif, ...list];
  saveLocalNotifs(updated);
  return notif;
}

export async function markNotificationAsRead(notifId: string | number): Promise<void> {
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase.from('doctor_notifications').update({ is_read: true }).eq('id', notifId);
    } catch {}
  }
  const list = getLocalNotifs().map((n) => (String(n.id) === String(notifId) ? { ...n, is_read: true } : n));
  saveLocalNotifs(list);
}
