/**
 * Pull person profile fields from the identity provider (Google, Apple, GitHub, SSO).
 * Used on auth callback + onboarding so Client and Developer both inherit name/avatar
 * from the email / OAuth account instead of retyping.
 */

export type AuthUserForProfile = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  identities?: Array<{
    provider?: string
    identity_data?: Record<string, unknown> | null
  }> | null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function fromCustomClaims(meta: Record<string, unknown>): string {
  const claims = meta.custom_claims
  if (!claims || typeof claims !== 'object') return ''
  return str((claims as Record<string, unknown>).name)
}

/** Merge top-level user_metadata with identity_data from a specific provider. */
export function providerIdentityMeta(
  user: AuthUserForProfile,
  preferProvider?: string,
): Record<string, unknown> {
  const base = { ...(user.user_metadata ?? {}) } as Record<string, unknown>
  const identities = user.identities ?? []
  const preferred = preferProvider
    ? identities.find((i) => i.provider === preferProvider)
    : null
  const firstWithData =
    preferred ||
    identities.find((i) => i.provider === 'google') ||
    identities.find((i) => i.provider === 'apple') ||
    identities.find((i) => i.provider === 'github') ||
    identities[0]
  if (firstWithData?.identity_data) {
    return { ...base, ...firstWithData.identity_data }
  }
  return base
}

export type ProviderProfileFields = {
  fullName: string | null
  firstName: string | null
  avatarUrl: string | null
  email: string | null
}

/**
 * Best display name from Google / Apple / GitHub / SSO metadata.
 * Prefers full_name → name → given+family → user_name.
 */
export function displayNameFromProviderMeta(meta: Record<string, unknown>): string | null {
  const full =
    str(meta.full_name) ||
    str(meta.name) ||
    fromCustomClaims(meta) ||
    [str(meta.given_name), str(meta.family_name)].filter(Boolean).join(' ') ||
    str(meta.user_name) ||
    str(meta.preferred_username) ||
    str(meta.login) ||
    ''
  return full || null
}

export function firstNameFromProviderMeta(meta: Record<string, unknown>): string | null {
  const given = str(meta.given_name)
  if (given) return given
  const full = displayNameFromProviderMeta(meta)
  if (!full) return null
  return full.split(/\s+/)[0] || null
}

export function avatarFromProviderMeta(meta: Record<string, unknown>): string | null {
  return str(meta.avatar_url) || str(meta.picture) || null
}

export function providerProfileFields(
  user: AuthUserForProfile,
  preferProvider?: string,
): ProviderProfileFields {
  const meta = providerIdentityMeta(user, preferProvider)
  return {
    fullName: displayNameFromProviderMeta(meta),
    firstName: firstNameFromProviderMeta(meta),
    avatarUrl: avatarFromProviderMeta(meta),
    email: str(meta.email) || user.email || null,
  }
}

/**
 * Patch for profiles upsert — only fills name/avatar when the provider has them.
 * Does not overwrite existing DB values; pass `existing` to keep user edits.
 */
export function buildProviderProfilePatch(
  user: AuthUserForProfile,
  opts?: {
    preferProvider?: string
    existing?: { full_name?: string | null; avatar_url?: string | null; first_name?: string | null } | null
  },
): Record<string, unknown> {
  const fields = providerProfileFields(user, opts?.preferProvider)
  const existing = opts?.existing
  const patch: Record<string, unknown> = {
    id: user.id,
    email: fields.email ?? user.email ?? null,
    updated_at: new Date().toISOString(),
  }

  const keepName = str(existing?.full_name)
  if (!keepName && fields.fullName) patch.full_name = fields.fullName

  const keepFirst = str(existing?.first_name)
  if (!keepFirst && fields.firstName) patch.first_name = fields.firstName

  const keepAvatar = str(existing?.avatar_url)
  if (!keepAvatar && fields.avatarUrl) patch.avatar_url = fields.avatarUrl

  return patch
}
