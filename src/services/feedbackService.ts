import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface PlatformFeedback {
  id: string | number;
  student_id?: string;
  student_name: string;
  type: 'اقتراح' | 'مشكلة' | 'طلب ميزة جديدة';
  message: string;
  status: 'جديد' | 'قيد المراجعة' | 'تم الحل';
  created_at: string;
}

const STORAGE_KEY = 'dr_smart_platform_feedback_v1';

const DEFAULT_FEEDBACKS: PlatformFeedback[] = [
  {
    id: '1',
    student_name: 'أحمد المهندس',
    type: 'اقتراح',
    message: 'منصة ممتازة جداً، أتمنى إضافة قسم خاص لاختبارات الدوائر المنطقية.',
    status: 'جديد',
    created_at: new Date().toISOString(),
  },
];

export async function fetchFeedbacks(): Promise<PlatformFeedback[]> {
  try {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('platform_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        return data as PlatformFeedback[];
      }
    }
  } catch (e) {
    console.warn('Supabase feedback fetch fallback to localStorage:', e);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FEEDBACKS));
  } catch {}

  return DEFAULT_FEEDBACKS;
}

export async function submitFeedback(feedback: {
  student_id?: string;
  student_name: string;
  type: 'اقتراح' | 'مشكلة' | 'طلب ميزة جديدة';
  message: string;
}): Promise<PlatformFeedback> {
  const newFeedback: PlatformFeedback = {
    id: Date.now().toString(),
    student_id: feedback.student_id || 'guest',
    student_name: feedback.student_name || 'زائر كريم',
    type: feedback.type,
    message: feedback.message,
    status: 'جديد',
    created_at: new Date().toISOString(),
  };

  try {
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('platform_feedback').insert([newFeedback]);
      if (error) throw error;
    }
  } catch (e) {
    console.warn('Supabase feedback insert fallback to localStorage:', e);
  }

  try {
    const existing = await fetchFeedbacks();
    const updated = [newFeedback, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return newFeedback;
}

export async function updateFeedbackStatus(id: string | number, status: 'جديد' | 'قيد المراجعة' | 'تم الحل'): Promise<void> {
  try {
    if (supabase && isSupabaseConfigured) {
      await supabase.from('platform_feedback').update({ status }).eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase feedback status update fallback to localStorage:', e);
  }

  try {
    const existing = await fetchFeedbacks();
    const updated = existing.map((f) => (String(f.id) === String(id) ? { ...f, status } : f));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
