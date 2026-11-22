import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Announcement {
  id: string | number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'subscription' | 'update' | 'maintenance';
  start_date?: string;
  end_date?: string;
  target_audience: 'all' | 'free' | 'paid';
  is_active: boolean;
  show_automatically: boolean;
  created_at: string;
}

const STORAGE_KEY = 'dr_smart_announcements_v1';

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'welcome-announcement',
    title: 'تنويه مهم لطلاب المنصة',
    content: `نرحب بكم في منصة دكتور الميكاترونكس الذكي.

يرجى الانتباه إلى أن الاشتراك المجاني يختلف عن الاشتراك المدفوع من حيث الخدمات والمميزات المتاحة.

🆓 الاشتراك المجاني:
يتيح استخدام الخدمات المجانية المحددة داخل المنصة، وقد تكون بعض الأدوات والخدمات محدودة.

💎 الاشتراك المدفوع:
يتيح الوصول إلى مزايا وخدمات إضافية وفقًا لنوع الباقة ومدة الاشتراك.

يرجى مراجعة تفاصيل الباقات قبل الاشتراك.`,
    type: 'subscription',
    target_audience: 'all',
    is_active: true,
    show_automatically: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'update-announcement-2025',
    title: 'تحديثات النظام والمختبرات الذكية',
    content: 'تم إطلاق نظام تواصل الدكتور، ومختبرات Circuit Wizard ثلاثية الأبعاد. استمتع بتجربة دراسية ذكية وشاملة.',
    type: 'update',
    target_audience: 'all',
    is_active: true,
    show_automatically: false,
    created_at: new Date().toISOString(),
  },
];

export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    if (supabase && isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        return data as Announcement[];
      }
    }
  } catch (e) {
    console.warn('Supabase announcements fetch fallback to localStorage:', e);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Initialize localStorage with defaults
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  } catch {}

  return DEFAULT_ANNOUNCEMENTS;
}

export async function saveAnnouncement(ann: Omit<Announcement, 'id' | 'created_at'> & { id?: string | number }): Promise<Announcement> {
  const newAnn: Announcement = {
    ...ann,
    id: ann.id || Date.now().toString(),
    created_at: new Date().toISOString(),
  };

  try {
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('announcements').upsert([newAnn]);
      if (error) throw error;
    }
  } catch (e) {
    console.warn('Supabase announcements upsert fallback to localStorage:', e);
  }

  try {
    const existing = await fetchAnnouncements();
    const index = existing.findIndex((a) => String(a.id) === String(newAnn.id));
    let updated: Announcement[];
    if (index >= 0) {
      updated = existing.map((a) => (String(a.id) === String(newAnn.id) ? newAnn : a));
    } else {
      updated = [newAnn, ...existing];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return newAnn;
}

export async function deleteAnnouncement(id: string | number): Promise<void> {
  try {
    if (supabase && isSupabaseConfigured) {
      await supabase.from('announcements').delete().eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase announcements delete fallback to localStorage:', e);
  }

  try {
    const existing = await fetchAnnouncements();
    const updated = existing.filter((a) => String(a.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}
