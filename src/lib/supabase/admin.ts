import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS entirely. Only ever import this from a
 * Next.js Route Handler (server-only by construction — it never ships to
 * the browser) that has ALREADY verified the caller's own session + role
 * via getCurrentMember(), and that manually re-checks restaurant_id on
 * every row it touches (service role bypasses tenant isolation too, so the
 * route itself is the only thing enforcing it). Creating/disabling other
 * users' logins is the one operation the anon/authenticated API surface
 * cannot do — everything else in this app goes through RLS + SECURITY
 * DEFINER RPCs instead.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
