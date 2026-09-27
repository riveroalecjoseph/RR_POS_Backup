import { createClient } from "@supabase/supabase-js";

// Environment variables or fallback demo values
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://demo.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "demo-anon-key";

export const isLiveSupabaseConfigured =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  import.meta.env.VITE_SUPABASE_URL !== "https://demo.supabase.co" &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
