import { redirect } from 'next/navigation'

/**
 * Legacy Developer Login — removed.
 * One Festag auth only: /login → register → onboarding → preparing → dashboard.
 * Bookmarks and invite emails land on unified login; Execution Panel remains a
 * post-auth workspace perspective via /dev when role/permissions allow.
 */
export default function LegacyDevLoginRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const params = new URLSearchParams()
  const sp = searchParams || {}

  const returnTo = typeof sp.returnTo === 'string' ? sp.returnTo : null
  const next = typeof sp.next === 'string' ? sp.next : null
  const register = sp.register === '1' || sp.register === 'true'
  const prefill = typeof sp.prefill === 'string' ? sp.prefill : null
  const welcome = sp.welcome === '1' || sp.welcome === 'true'
  const message = typeof sp.message === 'string' ? sp.message : null

  // Prefer returning to Execution Panel after auth when that was the intent.
  const targetNext = returnTo?.startsWith('/dev')
    ? returnTo
    : next?.startsWith('/dev')
      ? next
      : returnTo || next || '/dashboard'

  if (targetNext && targetNext !== '/dashboard') {
    params.set('next', targetNext)
  }
  if (prefill) params.set('email', prefill)
  if (welcome) params.set('welcome', '1')
  if (message) params.set('message', message)

  const qs = params.toString()
  redirect(register ? `/register${qs ? `?${qs}` : ''}` : `/login${qs ? `?${qs}` : ''}`)
}
