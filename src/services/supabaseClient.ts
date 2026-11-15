import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl: string = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseKey: string = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured: boolean =
  /^https?:\/\/.+/i.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project-id.supabase.co') &&
  supabaseKey.length > 0 &&
  supabaseKey !== 'your_supabase_anon_key_here';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
