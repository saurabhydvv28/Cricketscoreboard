import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// The service role client bypasses RLS entirely.
// Only use this in server actions that have already verified admin auth.
// NEVER expose the service role key to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Add SUPABASE_SERVICE_ROLE_KEY to your environment variables ' +
        '(Vercel Project Settings → Environment Variables). ' +
        'Find it in Supabase Dashboard → Project Settings → API → service_role key.'
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
