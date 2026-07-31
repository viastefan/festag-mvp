/**
 * Festag authentication & onboarding — constitution law.
 *
 * Doc: docs/festag-authentication-onboarding-constitution.md
 * Rule: .cursor/rules/festag-authentication-onboarding-constitution.mdc
 *
 * One auth flow only. Never Client / Developer / Admin forks.
 * User creates an intelligent Workspace — account only grants access.
 */

export const ONBOARDING_PATHS = ['build_projects', 'join_project'] as const

export type OnboardingPath = (typeof ONBOARDING_PATHS)[number]

export const ONBOARDING_PATH_LABELS: Record<OnboardingPath, string> = {
  build_projects: 'Workspace aufbauen',
  join_project: 'Projekt beitreten',
}

/**
 * Full Launch → Dashboard order (including pre-auth + post-auth).
 * Keep this sequence stable — every screen leads into the next.
 */
export const AUTH_ONBOARDING_FLOW = [
  'workspace_name',
  'authentication',
  'email_verification', // only when required
  'context',
  'focus',
  'integrations',
  'tagro_analysis', // background / silent
  'workspace_type',
  'preparing',
  'dashboard',
] as const

export type AuthOnboardingFlowStep = (typeof AUTH_ONBOARDING_FLOW)[number]

/**
 * In-app Build steps after Workspace Name + Auth
 * (account display name may appear first if missing).
 */
export const BUILD_PROJECTS_STEPS = [
  'name', // account display name if needed
  'context', // Workspace Context
  'focus', // optional Focus Areas — never forced
  'integrations', // Connect your workspace
  'workspace_type', // Tagro suggestion → confirm (skip UI if high confidence)
] as const

export type BuildProjectsStep = (typeof BUILD_PROJECTS_STEPS)[number]

/**
 * Join Project — invitees only.
 * Name + avatar → preparing → invited project. No Build theater.
 */
export const JOIN_PROJECT_STEPS = ['name', 'avatar'] as const

export type JoinProjectStep = (typeof JOIN_PROJECT_STEPS)[number]

/** Returning users — skip Build onboarding. */
export const RETURNING_USER_FLOW = [
  'authentication',
  'preparing',
  'dashboard',
] as const

/** Routes (target). */
export const ONBOARDING_ROUTES = {
  /** Pre-auth workspace name + auth entry share dusk chrome. */
  entry: '/login',
  build: '/onboarding',
  join: '/join',
  preparing: '/preparing',
  dashboard: '/dashboard',
  /** @deprecated Dual-portal debt — redirects to /onboarding. */
  legacyDev: '/dev/onboarding',
} as const

/** Init sequence copy — real work only; ~800–1500ms. Short lines — never clip. */
export const WORKSPACE_INIT_LINES = [
  'Workspace vorbereiten…',
  'Kontext verstehen…',
  'Intelligence verbinden…',
  'Module einrichten…',
  'Abschluss…',
  'Bereit.',
] as const

export const WORKSPACE_INIT_DURATION_MS = { min: 800, max: 1500 } as const

export function isInviteOnboarding(path: OnboardingPath): boolean {
  return path === 'join_project'
}

export function shouldSkipIntegrations(path: OnboardingPath): boolean {
  return path === 'join_project'
}

export function shouldSkipBuildOnboarding(isReturning: boolean): boolean {
  return isReturning
}
