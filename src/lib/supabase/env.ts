// Centralizes Supabase env var validation so every client (browser,
// server, middleware) fails with the same clear message instead of an
// opaque runtime crash when NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY aren't configured on the deployment
// platform (e.g. forgotten in Vercel Project Settings → Environment
// Variables). A bare `process.env.X!` non-null assertion only silences
// TypeScript — it still throws at runtime with no useful message, and
// in middleware that shows up as a 500 MIDDLEWARE_INVOCATION_FAILED on
// every single request with no indication of the actual cause.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL ' +
        'and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment platform\'s ' +
        'Environment Variables (e.g. Vercel Project Settings → Environment ' +
        'Variables, or .env.local for local development) and redeploy.'
    )
  }

  return { url, anonKey }
}
