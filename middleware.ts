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
  '/dev/login',
  '/dev/join',
  '/c',
  '/_next',
  '/api',
  '/brand',
  '/fonts',
  '/bg-office.jpg',
  '/manifest.json',
  '/favicon',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  // Google / crawlers — must stay public (no login redirect)
  '/robots.txt',
  '/sitemap.xml',
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

  // Always refresh the session cookie on every request (incl. public paths).
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({
          request: { headers: request.headers },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

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

  // TEMP — UI-only onboarding preview (no auth). Remove after QA.
  if (pathname === '/onboarding' && request.nextUrl.searchParams.get('preview') === '1') {
    return response
  }

  // Execution Panel — require session or PIN token cookie (role/approval still in DevAppShell).
  // Public: /dev/login, /dev/join (listed in PUBLIC_PATHS).
  if (pathname.startsWith('/dev')) {
    const hasDevToken = request.cookies.has('festag_dev_token')
    if (!user && !hasDevToken) {
      const loginUrl = new URL('/dev/login', request.url)
      loginUrl.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(loginUrl)
    }
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

      const [{ data: ownedWs }, { data: memberWs }] = await Promise.all([
        supabase
          .from('workspaces')
          .select('id')
          .eq('primary_owner_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
      ])

      if (!ownedWs && !memberWs) {
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
    '/((?!_next/static|_next/image|favicon\\.ico|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|brand|fonts|bg-office\\.jpg|manifest\\.json|robots\\.txt|sitemap\\.xml).*)',
  ],
}
