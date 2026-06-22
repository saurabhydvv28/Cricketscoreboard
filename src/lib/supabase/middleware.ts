import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// Refreshes the Supabase auth session on every request and keeps
// server/client cookies in sync. Called from src/middleware.ts.
//
// NOTE: this deliberately does NOT use the throwing getSupabaseEnv()
// helper from env.ts. Middleware runs on every single request, so an
// uncaught throw here takes down the entire site with
// MIDDLEWARE_INVOCATION_FAILED on every route — including the homepage,
// before anyone can even see an error message. Instead we log clearly
// and let the request continue unauthenticated; server components and
// route handlers (which DO use getSupabaseEnv()) will then throw their
// own clear error only on the specific pages that need Supabase.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Set these in your deployment platform\'s Environment Variables ' +
        '(e.g. Vercel Project Settings → Environment Variables) and redeploy.'
    )
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard
  // to debug issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /admin routes — redirect unauthenticated users to /login
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
