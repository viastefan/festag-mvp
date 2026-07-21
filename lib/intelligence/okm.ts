/**
 * Operational Knowledge Model (OKM) — Adaptive Intelligence foundations.
 *
 * Privacy-first: collaboration intelligence inside a workspace, never surveillance.
 * Personal profiles require explicit opt-in. Org DNA stays workspace-scoped.
 *
 * See docs/festag-adaptive-intelligence.md and § Adaptive Intelligence in /datenschutz.
 */

/** High-level OKM domains that may accumulate structured workspace knowledge. */
export const OKM_DOMAINS = [
  'people',
  'decision',
  'communication',
  'project',
  'workflow',
  'technical',
  'quality',
  'process',
] as const

export type OkmDomain = (typeof OKM_DOMAINS)[number]

/** Organization-level pattern families (Operational DNA). */
export const OPERATIONAL_DNA_KINDS = [
  'decision',
  'communication',
  'quality',
  'delivery',
] as const

export type OperationalDnaKind = (typeof OPERATIONAL_DNA_KINDS)[number]

/**
 * Workspace settings keys for Adaptive Intelligence.
 * Stored in workspaces.settings (JSON) via existing saveWsSetting.
 */
export type AdaptiveIntelligenceSettings = {
  /** Master switch — Tagro may use workspace Operational DNA / OKM context. Default true. */
  adaptive_intelligence_enabled: boolean
  /** Learn delivery/workflow patterns across projects in this workspace. Default true. */
  adaptive_cross_project_patterns: boolean
  /**
   * Build personal collaboration profiles (customer/dev preferences).
   * Default false — explicit opt-in. Not performance surveillance.
   */
  adaptive_personal_profiles: boolean
  /** Include Adaptive Intelligence signals in predictive / proactive Tagro hints. Default true when master on. */
  adaptive_predictions: boolean
}

export const ADAPTIVE_INTELLIGENCE_DEFAULTS: AdaptiveIntelligenceSettings = {
  adaptive_intelligence_enabled: true,
  adaptive_cross_project_patterns: true,
  adaptive_personal_profiles: false,
  adaptive_predictions: true,
}

export function readAdaptiveIntelligenceSettings(
  wsSettings: Record<string, unknown> | null | undefined,
): AdaptiveIntelligenceSettings {
  const s = wsSettings ?? {}
  const master =
    typeof s.adaptive_intelligence_enabled === 'boolean'
      ? s.adaptive_intelligence_enabled
      : ADAPTIVE_INTELLIGENCE_DEFAULTS.adaptive_intelligence_enabled

  return {
    adaptive_intelligence_enabled: master,
    adaptive_cross_project_patterns: master
      ? typeof s.adaptive_cross_project_patterns === 'boolean'
        ? s.adaptive_cross_project_patterns
        : ADAPTIVE_INTELLIGENCE_DEFAULTS.adaptive_cross_project_patterns
      : false,
    adaptive_personal_profiles: master
      ? typeof s.adaptive_personal_profiles === 'boolean'
        ? s.adaptive_personal_profiles
        : ADAPTIVE_INTELLIGENCE_DEFAULTS.adaptive_personal_profiles
      : false,
    adaptive_predictions: master
      ? typeof s.adaptive_predictions === 'boolean'
        ? s.adaptive_predictions
        : ADAPTIVE_INTELLIGENCE_DEFAULTS.adaptive_predictions
      : false,
  }
}

/** Hard product rules — enforce in APIs before writing OKM facts. */
export const OKM_PRIVACY_RULES = [
  'Workspace-scoped only — never share Operational DNA across unrelated customers.',
  'No public foundation-model training on workspace content outside documented processors.',
  'Personal profiles are opt-in collaboration intelligence, never punitive scoring.',
  'Prefer aggregated patterns over raw private messages.',
  'Respect export, deletion, and Adaptive Intelligence opt-out within product SLAs.',
  'Search existing company knowledge before generic AI answers when Adaptive Intelligence is on.',
] as const

export type OkmFactDraft = {
  domain: OkmDomain
  dnaKind?: OperationalDnaKind
  /** Short human-readable claim, e.g. "Prefers executive summaries for client updates." */
  claim: string
  /** Confidence 0–1 from observation count / consistency. */
  confidence: number
  /** Evidence refs (decision ids, project ids) — no raw PII dumps. */
  evidenceIds?: string[]
  source: 'observation' | 'user_stated' | 'imported'
}
