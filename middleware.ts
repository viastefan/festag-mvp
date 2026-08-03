import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

const PUBLIC_PATHS = [
  '/',
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
  '/dev/join',
  '/c',
  '/_next',
  '/api',
  '/brand',
  '/fonts',
  '/onboarding/avatars',
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
const SETUP_PATHS = ['/overview', '/create-workspace', '/onboarding', '/join', '/preparing']

/** Exact match for `/`; prefix match for everything else (`/login`, `/login/…`). */
function pathMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Legacy pre-workspace path — Overview is the locked Festag OS entry.
  if (pathname === '/home' || pathname.startsWith('/home/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/home' ? '/overview' : `/overview${pathname.slice('/home'.length)}`
    return NextResponse.redirect(url, 308)
  }

  // Legacy dual-product auth entry → one login
  if (pathname === '/dev/login' || pathname.startsWith('/dev/login/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const returnTo = request.nextUrl.searchParams.get('returnTo')
    if (returnTo?.startsWith('/dev')) {
      url.searchParams.set('next', returnTo)
    }
    return NextResponse.redirect(url, 308)
  }

  // Legacy Client | Developer chooser → unified auth
  if (pathname === '/enter' || pathname.startsWith('/enter/')) {
    return NextResponse.redirect(new URL('/login', request.url), 308)
  }

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
  const preview = request.nextUrl.searchParams.get('preview') || ''
  if (pathname === '/onboarding' && (preview === '1' || preview.startsWith('1'))) {
    return response
  }

  // Execution Panel — require session (role/approval still in DevAppShell).
  // Unauthenticated users use the same /login as everyone else.
  if (pathname.startsWith('/dev')) {
    const hasDevToken = request.cookies.has('festag_dev_token')
    if (!user && !hasDevToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
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

  // Setup gating: finish identity onboarding first; create workspace after.
  const onSetupPath = SETUP_PATHS.some(p => pathMatches(pathname, p))
  if (!onSetupPath && !pathname.startsWith('/logout')) {
    try {
      const { data: onboarding } = await supabase
        .from('onboarding_state')
        .select('completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      const [{ data: ownedWs }, { data: memberWs }, { data: projectMember }] = await Promise.all([
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
        supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
      ])

      const hasWorkspace = Boolean(ownedWs || memberWs || projectMember)

      if (!onboarding || !onboarding.completed_at) {
        // Invitees finish Join Project; builders finish /onboarding (no workspace required yet).
        if (!ownedWs && (projectMember || memberWs)) {
          return NextResponse.redirect(new URL('/join', request.url))
        }
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      if (!hasWorkspace) {
        return NextResponse.redirect(new URL('/overview', request.url))
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
