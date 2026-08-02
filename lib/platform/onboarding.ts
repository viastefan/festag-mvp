/**
 * Festag authentication & onboarding — constitution law.
 *
 * Doc: docs/festag-authentication-onboarding-constitution.md
 *
 * One auth flow only. Never Client / Developer / Admin forks.
 * User creates an intelligent Workspace — account only grants access.
 */

import { MASTER_PREP_LINES } from '@/lib/platform/master-onboarding'

export const ONBOARDING_PATHS = ['build_projects', 'join_project'] as const

export type OnboardingPath = (typeof ONBOARDING_PATHS)[number]

export const ONBOARDING_PATH_LABELS: Record<OnboardingPath, string> = {
  build_projects: 'Workspace aufbauen',
  join_project: 'Projekt beitreten',
}

/**
 * Full Launch → Dashboard order (including pre-auth + post-auth).
 */
export const AUTH_ONBOARDING_FLOW = [
  'workspace_name',
  'authentication',
  'email_verification', // only when required
  'profile', // name required + optional context
  'workspace',
  'connect', // optional → then preparing
  'preparing',
  'dashboard',
] as const

export type AuthOnboardingFlowStep = (typeof AUTH_ONBOARDING_FLOW)[number]

/**
 * In-app Build steps after Workspace Name + Auth.
 * Profile → Workspace → Quellen → /preparing
 */
export const BUILD_PROJECTS_STEPS = ['profile', 'workspace', 'connect'] as const

export type BuildProjectsStep = (typeof BUILD_PROJECTS_STEPS)[number]

export const JOIN_PROJECT_STEPS = ['name', 'avatar'] as const

export type JoinProjectStep = (typeof JOIN_PROJECT_STEPS)[number]

export const RETURNING_USER_FLOW = [
  'authentication',
  'preparing',
  'dashboard',
] as const

export const ONBOARDING_ROUTES = {
  entry: '/login',
  build: '/onboarding',
  join: '/join',
  preparing: '/preparing',
  dashboard: '/dashboard',
  /** @deprecated Dual-portal debt — redirects to /onboarding. */
  legacyDev: '/dev/onboarding',
} as const

export const WORKSPACE_INIT_LINES = MASTER_PREP_LINES

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
