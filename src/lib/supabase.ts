import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) return null;
  client ??= createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return client;
}
