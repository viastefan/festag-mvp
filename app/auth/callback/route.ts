import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZGtvZXB3dXZwdXJvaWpqYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTMyNTksImV4cCI6MjA5MTg2OTI1OX0.XL6nisBsFNkxCKAGKdYfdqsXGytEOrWPfBzxqjsPcRk'

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/loading'
  return value
}

function pickPostAuthTarget(requested: string, onboardingCompleted: boolean) {
  if (!onboardingCompleted) return '/onboarding'
  if (requested === '/loading' || requested === '/onboarding') return '/dashboard'
  return requested
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as
    | 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change' | null
  const providerError = requestUrl.searchParams.get('error')
  const providerErrorDescription = requestUrl.searchParams.get('error_description')
  const next = safeRedirectPath(requestUrl.searchParams.get('next'))

  if (providerError) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', providerErrorDescription || providerError)
    return NextResponse.redirect(loginUrl)
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []
  const cookieStore = cookies()

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(nextCookies: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.push(...nextCookies)
      },
    },
  })
  let authenticatedUser: any = null

  // Path A: PKCE flow (?code=...)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Server-side PKCE failed (most common reason: the code_verifier
      // cookie is on a different device — user opened the email link
      // on phone after starting register on laptop). Fall back to the
      // client-side recovery page that can use its own localStorage.
      const fallback = new URL('/auth/recover', requestUrl.origin)
      fallback.searchParams.set('code', code)
      fallback.searchParams.set('next', next)
      return NextResponse.redirect(fallback)
    }
    authenticatedUser = data.session?.user ?? null
  }
  // Path B: OTP token_hash flow (?token_hash=...&type=email)
  else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'link_expired')
      return NextResponse.redirect(loginUrl)
    }
    authenticatedUser = data.user ?? null
  }
  // Path C: neither — invalid callback
  else {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'auth_failed')
    return NextResponse.redirect(loginUrl)
  }

  // Record device hint on success (best-effort, fail silently)
  let target = next
  try {
    const { data: { user } } = authenticatedUser
      ? { data: { user: authenticatedUser } }
      : await supabase.auth.getUser()
    if (user) {
      const { data: onboarding } = await supabase
        .from('onboarding_state')
        .select('completed_at')
        .eq('user_id', user.id)
        .maybeSingle()
      target = pickPostAuthTarget(next, Boolean(onboarding?.completed_at))

      const displayName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        user.email?.split('@')[0] ||
        null
      await supabase.from('last_login_hints').insert({
        user_id: user.id,
        email_hint: user.email,
        provider: code ? 'oauth_or_otp' : 'magiclink',
        display_name: displayName,
        avatar_url: (user.user_metadata as any)?.avatar_url || (user.user_metadata as any)?.picture || null,
      })
      // Also touch auth_preferences last_login_at
      await supabase.from('auth_preferences').upsert({
        user_id: user.id,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  } catch { /* best-effort */ }

  const response = NextResponse.redirect(new URL(target, requestUrl.origin))
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}
