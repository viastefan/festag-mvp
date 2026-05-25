import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const PUBLIC_PATHS = ['/', '/login', '/register', '/auth', '/loading', '/redeem', '/invite', '/agb', '/terms', '/terms-of-use', '/privacy', '/datenschutz', '/impressum', '/widerruf', '/nutzungsbedingungen', '/dev-login', '/dev-access', '/_next', '/api', '/brand', '/fonts', '/bg-office.jpg', '/manifest.json', '/favicon']
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZGtvZXB3dXZwdXJvaWpqYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTMyNTksImV4cCI6MjA5MTg2OTI1OX0.XL6nisBsFNkxCKAGKdYfdqsXGytEOrWPfBzxqjsPcRk'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Dev routes: check dev session header (client-side only, handled in layout)
  if (pathname.startsWith('/dev')) {
    return NextResponse.next()
  }

  // Protected app routes: check Supabase session
  const response = NextResponse.next()
  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  // Onboarding gating: send users with incomplete onboarding to /onboarding
  // (except when they're already there, or on /logout)
  if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/logout')) {
    const { data: onboarding } = await supabase
      .from('onboarding_state')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!onboarding || !onboarding.completed_at) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand|fonts|bg-office.jpg|manifest.json|api).*)',
  ],
}
