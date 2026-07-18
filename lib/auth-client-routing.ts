/**
 * resolvePostAuthTarget — single source of truth for "where should this
 * user land after login / OAuth callback / OTP verify?"
 *
 * One path for every user (ChatGPT-style unified auth):
 *   1. Device memory only pre-fills UI (laptop).
 *   2. Auth creates or signs in the account (email / Google / SSO).
 *   3. `onboarding_state.completed_at` (or existing workspace) decides setup.
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

    let onboarded = !!(onboarding?.completed_at)
    const role = (profile?.role as string | null) ?? null
    const approval = (profile?.approval_status as string | null) ?? 'approved'

    if (role === 'pending_developer' || approval === 'pending') return '/dev/pending'

    if (!onboarded) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('id')
        .eq('primary_owner_id', userId)
        .limit(1)
        .maybeSingle()

      if (ws) {
        await supabase
          .from('onboarding_state')
          .upsert(
            {
              user_id: userId,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          )
        onboarded = true
      }
    }

    if (!onboarded) return '/onboarding'

    const isDevRole = role === 'dev' || role === 'admin' || role === 'project_owner'

    if (preferredNext) {
      if (preferredNext === '/dashboard' || preferredNext === '/onboarding') return '/dashboard'
      if (preferredNext.startsWith('/dev')) {
        return isDevRole ? '/dev' : '/dashboard'
      }
    }

    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}
