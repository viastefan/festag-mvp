/**
 * GitHub identity helpers — detect linked GitHub (primary or secondary)
 * and build profile / connection patches for OAuth + linkIdentity.
 */

export type AuthUserLike = {
  id: string
  email?: string | null
  app_metadata?: Record<string, unknown> | null
  user_metadata?: Record<string, unknown> | null
  identities?: Array<{
    provider?: string
    identity_data?: Record<string, unknown> | null
  }> | null
}

export function hasGithubIdentity(user: AuthUserLike | null | undefined): boolean {
  if (!user) return false
  const providers = user.app_metadata?.providers
  if (Array.isArray(providers) && providers.includes('github')) return true
  if (user.app_metadata?.provider === 'github') return true
  return (user.identities ?? []).some((i) => i.provider === 'github')
}

/** Merge user_metadata with GitHub identity_data (linkIdentity case). */
export function githubIdentityMeta(user: AuthUserLike): Record<string, any> {
  const base = { ...(user.user_metadata ?? {}) } as Record<string, any>
  const gh = (user.identities ?? []).find((i) => i.provider === 'github')
  if (gh?.identity_data) {
    return { ...base, ...gh.identity_data }
  }
  return base
}

export function buildGithubProfilePatch(
  user: AuthUserLike,
  opts?: { setPrimaryProvider?: boolean },
): Record<string, unknown> {
  const meta = githubIdentityMeta(user)
  const ghUserId = meta.provider_id || meta.sub || meta.id || null
  const username = meta.user_name || meta.preferred_username || meta.login || null
  const patch: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? meta.email ?? null,
    github_user_id: ghUserId != null && Number.isFinite(Number(ghUserId)) ? Number(ghUserId) : null,
    github_username: username,
    github_avatar_url: meta.avatar_url || null,
    github_profile_url:
      meta.html_url || (username ? `https://github.com/${username}` : null),
    github_email: meta.email || user.email || null,
    github_connected_at: new Date().toISOString(),
    dev_github_linked: true,
    updated_at: new Date().toISOString(),
  }
  if (opts?.setPrimaryProvider) patch.provider = 'github'
  return patch
}

/** Mid-flow destinations that must survive post-auth routing. */
export function isDevMidFlowNext(next: string): boolean {
  if (
    next.startsWith('/dev/onboarding') ||
    next.startsWith('/dev/github') ||
    next.startsWith('/dev/join/') ||
    next.startsWith('/dev/pending')
  ) {
    return true
  }
  /* Build Projects GitHub resume: /onboarding?step=integrations (and aliases). */
  if (next.startsWith('/onboarding')) {
    try {
      const u = new URL(next, 'http://local')
      return Boolean(u.searchParams.get('step'))
    } catch {
      return next.includes('step=')
    }
  }
  return false
}
