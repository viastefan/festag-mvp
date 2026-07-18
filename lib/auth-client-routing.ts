/**
 * resolvePostAuthTarget — single source of truth for "where should this
 * user land after login / OAuth callback / OTP verify?"
 *
 * One path for every user (ChatGPT-style unified auth):
 *   1. Device memory only pre-fills UI (laptop).
 *   2. Auth creates or signs in the account (email / Google / SSO).
 *   3. Personal workspace decides setup vs portal.
 *      Missing workspace → /create-workspace (same chrome as /register).
 */

export type PostAuthTarget =
  | '/onboarding'
  | '/create-workspace'
  | '/dev'
  | '/dev/pending'
  | '/dashboard'

export async function resolvePostAuthTarget(
  supabase: any,
  userId: string,
  preferredNext?: string | null,
): Promise<PostAuthTarget> {
  try {
    const [{ data: onboarding }, { data: profile }] = await Promise.all([
      supabase.from('onboarding_state').select('completed_at,workspace_done').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('role,approval_status').eq('id', userId).maybeSingle(),
    ])

    let onboarded = !!(onboarding?.completed_at)
    const role = (profile?.role as string | null) ?? null
    const approval = (profile?.approval_status as string | null) ?? 'approved'

    if (role === 'pending_developer' || approval === 'pending') return '/dev/pending'

    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('primary_owner_id', userId)
      .limit(1)
      .maybeSingle()

    if (!ws) {
      // New client accounts must pick a unique workspace name first.
      if (preferredNext?.startsWith('/dev')) {
        return role === 'dev' || role === 'admin' || role === 'project_owner' ? '/dev' : '/create-workspace'
      }
      return '/create-workspace'
    }

    if (!onboarded) {
      // Self-heal: owning a workspace is enough to enter the portal. The
      // legacy multi-step /onboarding is optional and often skipped.
      await supabase
        .from('onboarding_state')
        .upsert(
          {
            user_id: userId,
            workspace_done: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
      onboarded = true
    }

    const isDevRole = role === 'dev' || role === 'admin' || role === 'project_owner'

    if (preferredNext) {
      if (
        preferredNext === '/dashboard' ||
        preferredNext === '/onboarding' ||
        preferredNext === '/create-workspace'
      ) {
        return '/dashboard'
      }
      if (preferredNext.startsWith('/dev')) {
        return isDevRole ? '/dev' : '/dashboard'
      }
    }

    return '/dashboard'
  } catch {
    return '/dashboard'
  }
}
