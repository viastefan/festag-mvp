/**
 * resolvePostAuthTarget — single source of truth for "where should this
 * user land after login / OAuth callback / OTP verify?"
 *
 * Priority order:
 *   1. Not onboarded yet      → /onboarding
 *   2. role = pending_developer → /dev/pending  (waiting for admin approval)
 *   3. role = dev | admin     → /dev            (DEV portal)
 *   4. role = project_owner   → /dev            (admin-side, shares portal for now)
 *   5. role = client (default)→ /dashboard      (client portal)
 *
 * Kept defensive: any DB hiccup falls back to /dashboard rather than
 * locking the user out.
 */

export type PostAuthTarget = '/onboarding' | '/dev' | '/dev/pending' | '/dashboard'

export async function resolvePostAuthTarget(
  supabase: any,
  userId: string,
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
    // regardless of onboarding state (no point onboarding twice).
    if (role === 'pending_developer' || approval === 'pending') {
      return '/dev/pending'
    }

    // Not onboarded yet → guided setup (any role except pending_developer).
    if (!onboarded) return '/onboarding'

    // Role-based dashboards
    if (role === 'dev' || role === 'admin' || role === 'project_owner') return '/dev'
    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}
