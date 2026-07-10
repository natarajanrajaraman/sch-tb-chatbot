import { createClient, SupabaseClient } from '@supabase/supabase-js';

// v1.9.0 — server-only Supabase client. Uses the SERVICE ROLE key
// (bypasses RLS) — never expose this client to the browser.
//
// Optional at build time (Supabase might not be configured yet) so
// callers must handle the `null` return.

let _client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    _client = null;
    return null;
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
