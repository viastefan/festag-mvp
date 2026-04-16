import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    'https://xsdkoepwuvpuroijjain.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZGtvZXB3dXJvaWpqYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTMyNTksImV4cCI6MjA5MTg2OTI1OX0.XL6nisBsFNkxCKAGKdYfdqsXGytEOrWPfBzxqjsPcRk',
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const protectedPaths = ['/dashboard', '/project', '/tasks', '/team', '/messages', '/settings']
  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/project/:path*', '/tasks/:path*', '/team/:path*', '/messages/:path*', '/settings/:path*', '/login'],
}
