/**
 * resolvePostAuthTarget — single source of truth for "where should this
 * user land after login / OAuth callback / OTP verify?"
 *
 * Behaviour:
 *   • Onboarding / pending dev approval ALWAYS wins.
 *   • Otherwise the **intent of the form the user just submitted** wins,
 *     not the user's role.
 *     – /login (Client-Portal-Login) sets `next=/dashboard` →
 *       even an admin lands in /dashboard. They can switch to the dev
 *       portal explicitly via /dev/login.
 *     – /dev/login sets `next=/dev` → role must allow it, otherwise the
 *       user is bounced back to the client side.
 *   • No `preferredNext` at all → conservative default: /dashboard
 *     (the client portal is the universal home).
 *
 * Kept defensive: any DB hiccup falls back to /dashboard rather than
 * locking the user out.
 */

export type PostAuthTarget = '/onboarding' | '/dev' | '/dev/pending' | '/dashboard'

export async function resolvePostAuthTarget(
  supabase: any,
  userId: string,
  preferredNext?: string | null,
): Promise<PostAuthTarget> {
  try {
    const [{ data: onboarding }, { data: profile }] = await Promise.all([
      supabase.from('onboarding_state').select('completed_at').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('role,approval_status').eq('id', userId).maybeSingle(),
    ])

    const onboarded = !!(onboarding?.completed_at)
    const role = (profile?.role as string | null) ?? null
    const approval = (profile?.approval_status as string | null) ?? 'approved'

    // Pending developers must wait — they reach the pending screen
    // regardless of onboarding state.
    if (role === 'pending_developer' || approval === 'pending') return '/dev/pending'

    // Not onboarded yet → guided setup (any role except pending_developer).
    if (!onboarded) return '/onboarding'

    const isDevRole = role === 'dev' || role === 'admin' || role === 'project_owner'

    // Honor an explicit `preferredNext` signal coming from the form the
    // user just submitted (this carries the *intent*, not the role).
    if (preferredNext) {
      if (preferredNext === '/dashboard') return '/dashboard'
      if (preferredNext.startsWith('/dev')) {
        return isDevRole ? '/dev' : '/dashboard'
      }
    }

    // No preference → universal home is the client portal. Dev/admin
    // switch to /dev explicitly via /dev/login.
    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}
