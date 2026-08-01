/**
 * Tagro Superintelligence — equal intelligence pillars.
 * None dominates. Together = Festag Operating Intelligence Layer.
 *
 * Doc: docs/festag-production-intelligence.md
 */

export const TAGRO_SUPERINTELLIGENCE_PILLARS = [
  'workspace',
  'project',
  'communication',
  'knowledge',
  'business',
  'production',
] as const

export type TagroSuperintelligencePillar =
  (typeof TAGRO_SUPERINTELLIGENCE_PILLARS)[number]

export const TAGRO_SUPERINTELLIGENCE_LABELS: Record<
  TagroSuperintelligencePillar,
  string
> = {
  workspace: 'Workspace Intelligence',
  project: 'Project Intelligence',
  communication: 'Communication Intelligence',
  knowledge: 'Knowledge Intelligence',
  business: 'Business Intelligence',
  production: 'Production Intelligence',
}
