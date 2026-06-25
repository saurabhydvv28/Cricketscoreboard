import { NextResponse, type NextRequest } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin-auth'

// Middleware: protect /admin routes with PIN-based session cookie.
// /admin/login is excluded to avoid redirect loops.
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookieHeader = request.headers.get('cookie')
    const isAdmin = await getAdminSessionFromRequest(cookieHeader)

    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
