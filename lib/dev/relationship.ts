/**
 * Dev ↔ Client relationship — drives Execution Panel posture (nav modules),
 * not a second identity quiz.
 *
 * Source of truth (priority):
 * 1. Invite payload `developer_invites.relationship_kind` (rule A)
 * 2. `workspace_members.relationship_kind` after accept
 * 3. Cold-start `profiles.dev_relationship` from onboarding fallback (C)
 *
 * Onboarding verbinden (B): redeem invite OR later — never invent membership.
 */

export const DEV_RELATIONSHIP_KINDS = [
  'festag_internal',
  'agency_member',
  'freelancer',
  'client_company_dev',
] as const

export type DevRelationshipKind = (typeof DEV_RELATIONSHIP_KINDS)[number]

export const WORKSPACE_MODES = ['delivery', 'team', 'agency'] as const
export type WorkspaceModeSnapshot = (typeof WORKSPACE_MODES)[number]

/** Fallback picker — excludes festag_internal (that only comes from invite). */
export const DEV_POSTURE_FALLBACK = [
  'freelancer',
  'agency_member',
  'client_company_dev',
] as const satisfies readonly DevRelationshipKind[]

export type DevPostureFallback = (typeof DEV_POSTURE_FALLBACK)[number]

export function isDevRelationshipKind(v: unknown): v is DevRelationshipKind {
  return typeof v === 'string' && (DEV_RELATIONSHIP_KINDS as readonly string[]).includes(v)
}

export function isWorkspaceModeSnapshot(v: unknown): v is WorkspaceModeSnapshot {
  return typeof v === 'string' && (WORKSPACE_MODES as readonly string[]).includes(v)
}

/** Default relationship when inviter does not pick — from workspace mode. */
export function inferRelationshipFromWorkspaceMode(
  mode: string | null | undefined,
): DevRelationshipKind {
  if (mode === 'agency') return 'agency_member'
  if (mode === 'delivery') return 'client_company_dev'
  if (mode === 'team') return 'freelancer'
  return 'freelancer'
}

export const RELATIONSHIP_LABELS: Record<DevRelationshipKind, { title: string; hint: string }> = {
  festag_internal: {
    title: 'Festag',
    hint: 'Internes Festag-Team — volles Execution Panel.',
  },
  agency_member: {
    title: 'Agentur',
    hint: 'Arbeitest über eine Agentur an Client-Projekten.',
  },
  freelancer: {
    title: 'Freelancer',
    hint: 'Eigenständig mit einem oder mehreren Clients.',
  },
  client_company_dev: {
    title: 'Unternehmen',
    hint: 'Builder im Client-Unternehmen — ein Org-Fokus.',
  },
}

export const POSTURE_FALLBACK_COPY: Record<
  DevPostureFallback,
  { title: string; desc: string }
> = {
  freelancer: {
    title: 'Ich arbeite allein mit Clients',
    desc: 'Freelancer — lean Multi-Client Panel.',
  },
  agency_member: {
    title: 'Über eine Agentur',
    desc: 'Du wirst später eingeladen oder verbindest dich dann.',
  },
  client_company_dev: {
    title: 'Im Unternehmen des Clients',
    desc: 'Interner Builder — Fokus auf eine Organisation.',
  },
}

/** Extract raw invite token from a pasted /dev/join link or bare hex. */
export function extractDeveloperInviteToken(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase()
  try {
    const url = new URL(s)
    const m = url.pathname.match(/\/dev\/join\/([0-9a-f]{64})/i)
    if (m) return m[1].toLowerCase()
  } catch {
    /* not a URL */
  }
  const pathMatch = s.match(/\/dev\/join\/([0-9a-f]{64})/i)
  return pathMatch ? pathMatch[1].toLowerCase() : null
}

/**
 * Which Execution nav hrefs stay visible for a relationship.
 * `null` / unknown → full nav (safe default).
 */
export function executionNavHrefAllowed(
  href: string,
  relationship: DevRelationshipKind | null | undefined,
): boolean {
  if (!relationship || relationship === 'festag_internal' || relationship === 'agency_member') {
    return true
  }

  if (relationship === 'freelancer') {
    // No agency roster chrome — still keep inbox / captures.
    if (href === '/dev/team') return false
    return true
  }

  if (relationship === 'client_company_dev') {
    // Single-org builder: drop roster + time/plan chrome.
    if (href === '/dev/team') return false
    if (href === '/dev/plan') return false
    if (href === '/dev/time') return false
    return true
  }

  return true
}

export type NavGroupLike = {
  id: string
  rows: Array<{ href: string }>
}

export function filterExecutionNavByRelationship<T extends NavGroupLike>(
  groups: T[],
  relationship: DevRelationshipKind | null | undefined,
): T[] {
  return groups
    .map((g) => ({
      ...g,
      rows: g.rows.filter((r) => executionNavHrefAllowed(r.href, relationship)),
    }))
    .filter((g) => g.rows.length > 0) as T[]
}
