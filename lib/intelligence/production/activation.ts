/**
 * When Production Intelligence may activate as a workspace module.
 * Eligible workspaces only — never load for non-digital-production contexts.
 *
 * Doc: docs/festag-production-intelligence.md
 */

import type { WorkspaceUnderstanding } from '@/lib/platform/identity'
import { PRODUCTION_INTELLIGENCE_MODULE_ID } from './types'

/** Integration ids that signal digital production (catalog / connect). */
export const PRODUCTION_SIGNAL_INTEGRATIONS = [
  'github',
  'gitlab',
  'vercel',
  'supabase',
  'figma',
  'linear',
  'jira',
  'docker',
  'cloudflare',
] as const

export type ProductionActivationInput = {
  understanding?: WorkspaceUnderstanding | null
  context?: string | null
  /** Connected or strongly recommended integration ids. */
  integrationIds?: string[] | null
  /** Explicit workspace setting — future. Default: infer. */
  forceEnable?: boolean | null
  forceDisable?: boolean | null
}

const SOFTWARE_TYPE = /agency|startup|studio|internal_product|company|enterprise/
const SOFTWARE_ROLE = /developer|engineer|cto|tech|founder|builder/
const SOFTWARE_INDUSTRY = /software|saas|tech|product|dev|engineering/
const SOFTWARE_CONTEXT =
  /software|app|saas|github|deploy|code|entwickl|produkt|platform|api|mobile|webapp/

/**
 * Pure eligibility — does not mutate personalization.
 * Callers may append `production` to modules when true.
 */
export function isProductionIntelligenceEligible(
  input: ProductionActivationInput,
): boolean {
  if (input.forceDisable) return false
  if (input.forceEnable) return true

  const u = input.understanding
  const type = (u?.companyType || u?.recommendedDashboard || '').toLowerCase()
  const role = (u?.role || '').toLowerCase()
  const industry = (u?.industry || '').toLowerCase()
  const context = (input.context || '').toLowerCase()

  if (SOFTWARE_TYPE.test(type)) return true
  if (SOFTWARE_ROLE.test(role)) return true
  if (SOFTWARE_INDUSTRY.test(industry)) return true
  if (SOFTWARE_CONTEXT.test(context)) return true

  const integrations = (input.integrationIds || []).map(i => i.toLowerCase())
  if (
    integrations.some(id =>
      (PRODUCTION_SIGNAL_INTEGRATIONS as readonly string[]).includes(id),
    )
  ) {
    return true
  }

  return false
}

/**
 * Merge helper for personalization — adds module only when eligible.
 * Does not ship UI; only reserves the module id in metadata when appropriate.
 */
export function withProductionIntelligenceModule<T extends string>(
  modules: T[],
  input: ProductionActivationInput,
): T[] {
  if (!isProductionIntelligenceEligible(input)) {
    return modules.filter(m => m !== PRODUCTION_INTELLIGENCE_MODULE_ID) as T[]
  }
  if (modules.includes(PRODUCTION_INTELLIGENCE_MODULE_ID as T)) return modules
  return [...modules, PRODUCTION_INTELLIGENCE_MODULE_ID as T]
}
