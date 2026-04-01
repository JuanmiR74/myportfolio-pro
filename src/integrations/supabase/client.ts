import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Sustitución manual de valores para saltar el error de Vite
const SUPABASE_URL = "https://zcgcgvpgewktjowikphy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZ2NndnBnZXdrdGpvd2lrcGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjU5MDIsImV4cCI6MjA5MDU0MTkwMn0.3pNJHVlYhd3yqXjWKe3xt6uIzUbT_JDWEg--iji2c2c";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});
