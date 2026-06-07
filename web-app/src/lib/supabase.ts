import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.startsWith('TODO') || supabaseAnonKey.startsWith('TODO')) {
  throw new Error('Supabase URL or Anon Key is missing or invalid. Check your .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
