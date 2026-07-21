import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

const PUBLIC_PATHS = [
  '/',
  '/enter',
  '/blog',
  '/docs',
  '/login',
  '/register',
  '/auth',
  '/loading',
  '/redeem',
  '/invite',
  '/agb',
  '/terms',
  '/terms-of-use',
  '/privacy',
  '/datenschutz',
  '/impressum',
  '/widerruf',
  '/nutzungsbedingungen',
  '/dev-login',
  '/dev-access',
  '/_next',
  '/api',
  '/brand',
  '/fonts',
  '/bg-office.jpg',
  '/manifest.json',
  '/favicon',
]

/** Authenticated setup surfaces (session required, but not full portal). */
const SETUP_PATHS = ['/create-workspace', '/onboarding']

/** Exact match for `/`; prefix match for everything else (`/login`, `/login/…`). */
function pathMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Legacy inbox routes → canonical Benachrichtigungen (even with stale client bundles).
  if (pathname === '/messages' || pathname === '/inbox' || pathname.startsWith('/messages/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/benachrichtigungen'
    return NextResponse.redirect(url, 308)
  }

  let supabaseUrl: string
  let supabaseAnonKey: string
  try {
    supabaseUrl = getSupabaseUrl()
    supabaseAnonKey = getSupabaseAnonKey()
  } catch {
    // Misconfigured env — allow public paths, block protected routes.
    if (PUBLIC_PATHS.some(p => pathMatches(pathname, p))) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // IMPORTANT: a single Supabase client + getUser() runs on EVERY request so
  // the auth cookie is refreshed continuously. Skipping the refresh on
  // public / dev paths (the old behaviour) let the access token silently
  // expire while the user was browsing those routes — which then surfaced
  // as "logged out / thrown to /login" on the next protected fetch, and as
  // "login not remembered". The standard @supabase/ssr pattern is: always
  // create the client, always getUser(), always return the response that
  // carries the refreshed Set-Cookie headers.
  const response = NextResponse.next()
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // Always refresh the session. Wrapped so a transient network hiccup on
  // an already-public path never turns into a hard failure.
  let user: { id: string } | null = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
  } catch {
    user = null
  }

  // Public paths: refreshed cookies are attached, no gating.
  if (PUBLIC_PATHS.some(p => pathMatches(pathname, p))) {
    return response
  }

  // Dev routes: role gating happens client-side in DevAppShell, but we
  // still return the refreshed-cookie response so the session stays alive
  // while the developer navigates inside /dev.
  if (pathname.startsWith('/dev')) {
    return response
  }

  // Protected app routes: require a session.
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  // Setup gating: personal workspace first, then hybrid profile + team
  // on /onboarding until onboarding_state.completed_at is set.
  const onSetupPath = SETUP_PATHS.some(p => pathMatches(pathname, p))
  if (!onSetupPath && !pathname.startsWith('/logout')) {
    try {
      const { data: onboarding } = await supabase
        .from('onboarding_state')
        .select('completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('primary_owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!ws) {
        return NextResponse.redirect(new URL('/create-workspace', request.url))
      }

      if (!onboarding || !onboarding.completed_at) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } catch {
      // If the lookup fails, don't bounce the user — let the app resolve client-side.
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand|fonts|bg-office.jpg|manifest.json).*)',
  ],
}
