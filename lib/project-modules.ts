/**
 * Festag Project Module Registry — Phase 1 of the Modular Project OS.
 *
 * Single source of truth for: "Given a project_type, what does the
 * Client Portal show, what does each Executor role need, what KPIs make
 * sense, what briefing sections does Tagro emit, which roles do we
 * suggest by default, which data sources are typical?"
 *
 * Every UI surface that renders a project should consume this — never
 * hard-code module lists per type in the components. New project types
 * land here first; the UI follows.
 */

export type ProjectType =
  | 'software'
  | 'website'
  | 'marketing'
  | 'seo'
  | 'branding'
  | 'automation'
  | 'consulting'
  | 'hybrid'

export type ProjectDeliveryModel =
  | 'festag_delivery'
  | 'team_internal'
  | 'agency_client'
  | 'white_label_client'
  | 'hybrid_delivery'

export type ProjectVisibilityLevel = 'full' | 'standard' | 'minimal'

/** Executor role enum aligned with workspace_member_role on the DB side. */
export type ExecutorRole =
  | 'developer'
  | 'designer'
  | 'marketing_manager'
  | 'ads_manager'
  | 'seo_specialist'
  | 'content_creator'
  | 'project_manager'
  | 'strategist'
  | 'automation_expert'
  | 'client_success'
  | 'reviewer'

export type ClientModule =
  // Software
  | 'feature_progress' | 'staging_link' | 'release_status' | 'bugs_testing' | 'eta'
  // Website
  | 'preview_link' | 'page_status' | 'content_status' | 'design_status' | 'seo_basics' | 'mobile_ready' | 'launch_readiness'
  // Marketing
  | 'campaign_status' | 'active_channels' | 'creative_status' | 'budget_status' | 'performance_snapshot' | 'next_optimization'
  // SEO
  | 'seo_progress' | 'pages_optimized' | 'technical_seo' | 'rankings_snapshot' | 'traffic_snapshot'
  // Branding
  | 'concepts' | 'moodboard' | 'feedback_rounds' | 'brand_kit_progress' | 'asset_library'
  // Automation
  | 'process_analysis' | 'active_workflows' | 'integrations_status' | 'test_status' | 'savings_potential'
  // Cross-cutting (always available)
  | 'briefing' | 'audio_briefing' | 'milestones' | 'open_decisions' | 'risks' | 'files' | 'approvals'

export type ExecutorModule =
  | 'my_tasks' | 'project_context' | 'deliverables' | 'status_to_tagro' | 'blockers' | 'client_feedback' | 'internal_notes' | 'priorities' | 'deadlines'
  // Developer-specific
  | 'technical_tasks' | 'acceptance_criteria' | 'pr_deployment' | 'bug_tracker' | 'testing_checklist' | 'environments'
  // Website-specific
  | 'website_stack' | 'provider_connection' | 'page_modules' | 'proof_pipeline' | 'client_status_reports'
  // Designer-specific
  | 'screens' | 'assets' | 'design_system' | 'variants' | 'feedback'
  // Marketing-specific
  | 'campaign_tasks' | 'creative_tasks' | 'ads_setup' | 'budget_notes' | 'performance_updates' | 'optimizations'
  // SEO-specific
  | 'keyword_tasks' | 'content_briefings' | 'technical_seo_checks' | 'meta_titles' | 'internal_linking' | 'search_console_issues'
  // Content-specific
  | 'editorial_pipeline' | 'publishing' | 'redaction_status'
  // PM-specific
  | 'all_tasks' | 'briefing_review' | 'team_status' | 'risk_overview'
  // Automation-specific
  | 'integration_setup' | 'api_keys' | 'workflow_tasks' | 'test_cases' | 'error_logs'

export type KpiKind =
  // Software
  | 'features_done' | 'features_open' | 'bugs_open' | 'release_pct'
  // Website
  | 'pages_ready' | 'content_pct' | 'design_freigaben' | 'launch_pct'
  // Marketing
  | 'campaigns_active' | 'spend' | 'leads' | 'ctr' | 'cpc' | 'cpa' | 'roas' | 'lp_conversion'
  // SEO
  | 'pages_optimized' | 'technical_errors' | 'keyword_progress' | 'traffic_trend'
  // Branding
  | 'concepts_count' | 'revisions' | 'final_assets'
  // Automation
  | 'workflows_active' | 'error_rate' | 'manual_steps_saved'
  // Cross-cutting
  | 'milestone_amount' | 'next_milestone_eta' | 'open_decisions' | 'open_blockers' | 'progress_pct'

export type BriefingSection =
  | 'zusammenfassung'
  | 'was_wurde_erledigt' | 'was_ist_in_arbeit'
  | 'blocker_risiken'
  | 'naechste_schritte'
  | 'entscheidungen_vom_client'
  | 'verbesserungsvorschlaege'
  | 'moegliche_neue_tasks'
  | 'tagro_prioritaet'
  // Type-specific framing
  | 'release_status' | 'feature_summary'                    // software
  | 'launch_readiness' | 'content_freigaben'                // website
  | 'kampagnen_status' | 'creative_review' | 'budget_check' // marketing
  | 'seo_findings' | 'ranking_movement'                     // seo
  | 'design_konzepte' | 'asset_freigaben'                   // branding
  | 'automation_health'                                     // automation

export type DataSource =
  | 'live_url' | 'staging_url' | 'github' | 'vercel' | 'supabase' | 'sentry'
  | 'wix_studio' | 'webflow' | 'framer' | 'wordpress' | 'shopify' | 'custom_webhook'
  | 'google_analytics' | 'search_console' | 'meta_ads' | 'google_ads' | 'instagram' | 'tiktok'
  | 'figma' | 'asset_library'
  | 'zapier' | 'make' | 'webhooks'
  | 'manual_updates'

export type ProjectModulePreset = {
  label: string
  /** Short positioning sentence used in onboarding / project creation. */
  positioning: string
  clientModules: ClientModule[]
  /** Executor module set per role. Roles not present here fall back to a generic preset. */
  executorModules: Partial<Record<ExecutorRole, ExecutorModule[]>>
  kpis: KpiKind[]
  briefingSections: BriefingSection[]
  suggestedRoles: ExecutorRole[]
  suggestedDataSources: DataSource[]
  /** Default phase milestones (titles). The /milestones table can extend or override. */
  defaultMilestones: string[]
}

// Generic Executor fallback — every role gets this as a baseline.
const GENERIC_EXECUTOR_MODULES: ExecutorModule[] = [
  'my_tasks', 'project_context', 'status_to_tagro', 'blockers',
  'priorities', 'deadlines', 'internal_notes',
]

const ALWAYS_CLIENT: ClientModule[] = [
  'briefing', 'audio_briefing', 'milestones', 'open_decisions', 'risks', 'files',
]

const ALWAYS_BRIEFING_HEAD: BriefingSection[] = [
  'zusammenfassung',
]

const ALWAYS_BRIEFING_TAIL: BriefingSection[] = [
  'entscheidungen_vom_client',
  'verbesserungsvorschlaege',
  'moegliche_neue_tasks',
  'tagro_prioritaet',
]

export const PROJECT_MODULE_REGISTRY: Record<ProjectType, ProjectModulePreset> = {
  software: {
    label: 'Software · App · Plattform',
    positioning: 'Feature-Auslieferung, Releases und Stabilität als Executive-Sicht. Tasks bleiben im Executor-Portal.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'feature_progress', 'staging_link', 'release_status', 'bugs_testing', 'eta', 'approvals',
    ],
    executorModules: {
      developer: [
        ...GENERIC_EXECUTOR_MODULES,
        'technical_tasks', 'acceptance_criteria', 'pr_deployment', 'bug_tracker',
        'testing_checklist', 'environments',
      ],
      designer: [
        ...GENERIC_EXECUTOR_MODULES,
        'screens', 'assets', 'design_system', 'variants', 'feedback',
      ],
      project_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'all_tasks', 'briefing_review', 'team_status', 'risk_overview',
      ],
    },
    kpis: ['progress_pct', 'features_done', 'features_open', 'bugs_open', 'milestone_amount', 'next_milestone_eta', 'open_decisions', 'open_blockers'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'feature_summary', 'was_ist_in_arbeit', 'blocker_risiken', 'release_status', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['developer', 'designer', 'project_manager'],
    suggestedDataSources: ['staging_url', 'live_url', 'github', 'vercel', 'supabase', 'sentry'],
    defaultMilestones: ['Kickoff', 'Design', 'MVP', 'Testing', 'Delivery'],
  },

  website: {
    label: 'Website · Landingpage',
    positioning: 'Seiten, Inhalte, Freigaben, Launch-Bereitschaft. Keine Tasks-Wand, sondern was wirklich für Go-Live fehlt.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'preview_link', 'page_status', 'content_status', 'design_status', 'seo_basics', 'mobile_ready', 'launch_readiness', 'approvals',
    ],
    executorModules: {
      designer: [
        ...GENERIC_EXECUTOR_MODULES,
        'screens', 'assets', 'design_system', 'variants', 'feedback',
      ],
      content_creator: [
        ...GENERIC_EXECUTOR_MODULES,
        'editorial_pipeline', 'publishing', 'redaction_status', 'deliverables',
      ],
      developer: [
        ...GENERIC_EXECUTOR_MODULES,
        'website_stack', 'provider_connection', 'page_modules', 'proof_pipeline',
        'client_status_reports', 'technical_tasks', 'environments', 'pr_deployment',
      ],
      project_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'all_tasks', 'briefing_review', 'team_status',
      ],
    },
    kpis: ['progress_pct', 'pages_ready', 'content_pct', 'design_freigaben', 'launch_pct', 'milestone_amount', 'open_decisions'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'launch_readiness', 'content_freigaben', 'was_ist_in_arbeit', 'blocker_risiken', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['designer', 'content_creator', 'developer', 'project_manager'],
    suggestedDataSources: [
      'live_url', 'staging_url', 'wix_studio', 'webflow', 'framer',
      'wordpress', 'shopify', 'custom_webhook', 'google_analytics', 'search_console',
    ],
    defaultMilestones: ['Konzept', 'Design', 'Aufbau', 'Inhalte', 'Launch'],
  },

  marketing: {
    label: 'Marketing · Kampagnen',
    positioning: 'Kampagnenstatus, Creatives, Freigaben, Performance-Snapshot. Festag bleibt Delivery-Layer — ersetzt keinen Ads-Manager.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'campaign_status', 'active_channels', 'creative_status', 'budget_status',
      'performance_snapshot', 'next_optimization', 'approvals',
    ],
    executorModules: {
      marketing_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'campaign_tasks', 'creative_tasks', 'budget_notes', 'performance_updates', 'optimizations',
      ],
      ads_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'campaign_tasks', 'ads_setup', 'budget_notes', 'performance_updates', 'optimizations',
      ],
      designer: [
        ...GENERIC_EXECUTOR_MODULES,
        'creative_tasks', 'assets', 'variants', 'feedback',
      ],
      content_creator: [
        ...GENERIC_EXECUTOR_MODULES,
        'editorial_pipeline', 'publishing', 'redaction_status',
      ],
      project_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'all_tasks', 'briefing_review', 'team_status', 'risk_overview',
      ],
    },
    kpis: ['progress_pct', 'campaigns_active', 'spend', 'leads', 'ctr', 'cpc', 'cpa', 'roas', 'lp_conversion', 'open_decisions'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'kampagnen_status', 'creative_review', 'budget_check', 'was_ist_in_arbeit', 'blocker_risiken', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['marketing_manager', 'ads_manager', 'designer', 'content_creator', 'project_manager'],
    suggestedDataSources: ['meta_ads', 'google_ads', 'instagram', 'google_analytics', 'live_url'],
    defaultMilestones: ['Strategie', 'Creative Setup', 'Launch', 'Optimierung', 'Reporting'],
  },

  seo: {
    label: 'SEO · Content · Technical',
    positioning: 'SEO-Fortschritt, optimierte Seiten, technische Issues und Content-Lieferung. Rankings/Traffic nur bei verbundener Datenquelle.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'seo_progress', 'pages_optimized', 'technical_seo', 'content_status', 'rankings_snapshot', 'traffic_snapshot',
    ],
    executorModules: {
      seo_specialist: [
        ...GENERIC_EXECUTOR_MODULES,
        'keyword_tasks', 'content_briefings', 'technical_seo_checks', 'meta_titles', 'internal_linking', 'search_console_issues',
      ],
      content_creator: [
        ...GENERIC_EXECUTOR_MODULES,
        'editorial_pipeline', 'publishing', 'redaction_status',
      ],
      developer: [
        ...GENERIC_EXECUTOR_MODULES,
        'technical_tasks', 'pr_deployment',
      ],
    },
    kpis: ['progress_pct', 'pages_optimized', 'technical_errors', 'keyword_progress', 'traffic_trend'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'seo_findings', 'ranking_movement', 'was_ist_in_arbeit', 'blocker_risiken', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['seo_specialist', 'content_creator', 'developer'],
    suggestedDataSources: ['search_console', 'google_analytics', 'live_url'],
    defaultMilestones: ['Audit', 'Optimierung', 'Content-Sprint', 'Technische SEO', 'Reporting'],
  },

  branding: {
    label: 'Branding · Design',
    positioning: 'Konzepte, Feedback-Runden, Freigaben, Brand-Kit-Fortschritt. Visuell statt zahlenlastig.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'concepts', 'moodboard', 'feedback_rounds', 'brand_kit_progress', 'asset_library', 'approvals',
    ],
    executorModules: {
      designer: [
        ...GENERIC_EXECUTOR_MODULES,
        'screens', 'assets', 'design_system', 'variants', 'feedback',
      ],
      strategist: [
        ...GENERIC_EXECUTOR_MODULES,
        'briefing_review',
      ],
      project_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'all_tasks', 'team_status',
      ],
    },
    kpis: ['progress_pct', 'concepts_count', 'revisions', 'final_assets', 'open_decisions'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'design_konzepte', 'asset_freigaben', 'was_ist_in_arbeit', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['designer', 'strategist', 'project_manager'],
    suggestedDataSources: ['figma', 'asset_library'],
    defaultMilestones: ['Discovery', 'Konzepte', 'Feedback-Runde', 'Verfeinerung', 'Brand-Kit Übergabe'],
  },

  automation: {
    label: 'Automation · AI-Workflows',
    positioning: 'Prozesse, Workflows, Integrationen, Fehler-Resilienz. Manuelle Schritte werden sichtbar reduziert.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'process_analysis', 'active_workflows', 'integrations_status', 'test_status', 'savings_potential',
    ],
    executorModules: {
      automation_expert: [
        ...GENERIC_EXECUTOR_MODULES,
        'integration_setup', 'api_keys', 'workflow_tasks', 'test_cases', 'error_logs',
      ],
      developer: [
        ...GENERIC_EXECUTOR_MODULES,
        'technical_tasks', 'environments', 'pr_deployment',
      ],
    },
    kpis: ['progress_pct', 'workflows_active', 'error_rate', 'manual_steps_saved', 'open_decisions'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'automation_health', 'was_ist_in_arbeit', 'blocker_risiken', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['automation_expert', 'developer'],
    suggestedDataSources: ['zapier', 'make', 'webhooks'],
    defaultMilestones: ['Prozess-Analyse', 'Setup', 'Workflows aktiv', 'Tests', 'Übergabe'],
  },

  consulting: {
    label: 'Consulting · Digitalstrategie',
    positioning: 'Strategie, Empfehlungen, Roadmaps, Stakeholder-Alignment. Ergebnis statt Operations.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'approvals',
    ],
    executorModules: {
      strategist: [
        ...GENERIC_EXECUTOR_MODULES,
        'briefing_review', 'deliverables',
      ],
      project_manager: [
        ...GENERIC_EXECUTOR_MODULES,
        'all_tasks', 'team_status', 'risk_overview',
      ],
    },
    kpis: ['progress_pct', 'open_decisions', 'milestone_amount'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'was_wurde_erledigt', 'was_ist_in_arbeit', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['strategist', 'project_manager'],
    suggestedDataSources: ['manual_updates'],
    defaultMilestones: ['Discovery', 'Analyse', 'Empfehlung', 'Roadmap', 'Übergabe'],
  },

  hybrid: {
    label: 'Hybrid-Projekt',
    positioning: 'Mehrere Disziplinen in einem Projekt — Tagro mischt die Module aus den passenden Presets.',
    clientModules: [
      ...ALWAYS_CLIENT,
      'feature_progress', 'preview_link', 'campaign_status', 'approvals',
    ],
    executorModules: {
      developer:        [...GENERIC_EXECUTOR_MODULES, 'technical_tasks', 'pr_deployment'],
      designer:         [...GENERIC_EXECUTOR_MODULES, 'screens', 'assets', 'feedback'],
      marketing_manager:[...GENERIC_EXECUTOR_MODULES, 'campaign_tasks', 'creative_tasks', 'optimizations'],
      project_manager:  [...GENERIC_EXECUTOR_MODULES, 'all_tasks', 'briefing_review', 'team_status', 'risk_overview'],
    },
    kpis: ['progress_pct', 'milestone_amount', 'next_milestone_eta', 'open_decisions', 'open_blockers'],
    briefingSections: [
      ...ALWAYS_BRIEFING_HEAD,
      'was_wurde_erledigt', 'was_ist_in_arbeit', 'blocker_risiken', 'naechste_schritte',
      ...ALWAYS_BRIEFING_TAIL,
    ],
    suggestedRoles: ['developer', 'designer', 'marketing_manager', 'project_manager'],
    suggestedDataSources: ['live_url', 'staging_url', 'google_analytics'],
    defaultMilestones: ['Kickoff', 'Phase 1', 'Phase 2', 'Phase 3', 'Übergabe'],
  },
}

/** Human labels for ClientModule ids — used by the dynamic renderer. */
export const CLIENT_MODULE_LABEL: Record<ClientModule, string> = {
  feature_progress: 'Feature-Fortschritt',
  staging_link: 'Staging-Link',
  release_status: 'Release-Status',
  bugs_testing: 'Bugs & Testing',
  eta: 'ETA',
  preview_link: 'Preview-Link',
  page_status: 'Seitenstatus',
  content_status: 'Content-Status',
  design_status: 'Design-Status',
  seo_basics: 'SEO-Basics',
  mobile_ready: 'Mobile-Optimierung',
  launch_readiness: 'Launch-Bereitschaft',
  campaign_status: 'Kampagnen-Status',
  active_channels: 'Aktive Kanäle',
  creative_status: 'Creative-Status',
  budget_status: 'Budget-Status',
  performance_snapshot: 'Performance',
  next_optimization: 'Nächste Optimierung',
  seo_progress: 'SEO-Fortschritt',
  pages_optimized: 'Optimierte Seiten',
  technical_seo: 'Technische SEO',
  rankings_snapshot: 'Rankings',
  traffic_snapshot: 'Traffic',
  concepts: 'Konzepte',
  moodboard: 'Moodboard',
  feedback_rounds: 'Feedback-Runden',
  brand_kit_progress: 'Brand-Kit',
  asset_library: 'Asset-Library',
  process_analysis: 'Prozess-Analyse',
  active_workflows: 'Aktive Workflows',
  integrations_status: 'Integrationen',
  test_status: 'Tests',
  savings_potential: 'Einsparung',
  briefing: 'Projektbriefing',
  audio_briefing: 'Audio-Briefing',
  milestones: 'Meilensteine',
  open_decisions: 'Offene Entscheidungen',
  risks: 'Risiken',
  files: 'Dateien',
  approvals: 'Freigaben',
}

/** Human labels for KpiKind — used by the KPI strip. */
export const KPI_LABEL: Record<KpiKind, string> = {
  features_done: 'Features erledigt',
  features_open: 'Features offen',
  bugs_open: 'Offene Bugs',
  release_pct: 'Release-Fortschritt',
  pages_ready: 'Seiten fertig',
  content_pct: 'Content-Lieferung',
  design_freigaben: 'Design-Freigaben',
  launch_pct: 'Launch-Readiness',
  campaigns_active: 'Aktive Kampagnen',
  spend: 'Budget verbraucht',
  leads: 'Leads',
  ctr: 'CTR',
  cpc: 'CPC',
  cpa: 'CPA',
  roas: 'ROAS',
  lp_conversion: 'LP Conversion',
  pages_optimized: 'Optimierte Seiten',
  technical_errors: 'Technische Fehler',
  keyword_progress: 'Keyword-Fortschritt',
  traffic_trend: 'Traffic-Trend',
  concepts_count: 'Konzepte',
  revisions: 'Revisionen',
  final_assets: 'Finale Assets',
  workflows_active: 'Aktive Workflows',
  error_rate: 'Fehlerquote',
  manual_steps_saved: 'Eingesparte Schritte',
  milestone_amount: 'Nächster Meilenstein',
  next_milestone_eta: 'Nächste ETA',
  open_decisions: 'Offene Entscheidungen',
  open_blockers: 'Offene Blocker',
  progress_pct: 'Fortschritt',
}

/** Human labels for ExecutorModule ids — used by the executor strip. */
export const EXECUTOR_MODULE_LABEL: Record<ExecutorModule, string> = {
  // Generic
  my_tasks: 'Meine Tasks',
  project_context: 'Projekt-Kontext',
  deliverables: 'Deliverables',
  status_to_tagro: 'Status an Tagro',
  blockers: 'Blocker',
  client_feedback: 'Kunden-Feedback',
  internal_notes: 'Interne Notizen',
  priorities: 'Prioritäten',
  deadlines: 'Deadlines',
  // Developer
  technical_tasks: 'Technische Tasks',
  acceptance_criteria: 'Acceptance Criteria',
  pr_deployment: 'PR / Deployment',
  bug_tracker: 'Bug-Tracker',
  testing_checklist: 'Testing-Checkliste',
  environments: 'Environments',
  // Website
  website_stack: 'Website Stack',
  provider_connection: 'Provider verbinden',
  page_modules: 'Seitenmodule',
  proof_pipeline: 'Proof-Pipeline',
  client_status_reports: 'Client-Statusberichte',
  // Designer
  screens: 'Screens',
  assets: 'Assets',
  design_system: 'Design-System',
  variants: 'Varianten',
  feedback: 'Feedback',
  // Marketing
  campaign_tasks: 'Kampagnen-Tasks',
  creative_tasks: 'Creative-Tasks',
  ads_setup: 'Ads-Setup',
  budget_notes: 'Budget-Notizen',
  performance_updates: 'Performance-Updates',
  optimizations: 'Optimierungen',
  // SEO
  keyword_tasks: 'Keyword-Tasks',
  content_briefings: 'Content-Briefings',
  technical_seo_checks: 'Technische SEO-Checks',
  meta_titles: 'Meta-Titel',
  internal_linking: 'Interne Verlinkung',
  search_console_issues: 'Search-Console-Issues',
  // Content
  editorial_pipeline: 'Redaktionspipeline',
  publishing: 'Veröffentlichung',
  redaction_status: 'Redaktions-Status',
  // PM
  all_tasks: 'Alle Tasks',
  briefing_review: 'Briefing-Review',
  team_status: 'Team-Status',
  risk_overview: 'Risiko-Übersicht',
  // Automation
  integration_setup: 'Integration-Setup',
  api_keys: 'API-Keys',
  workflow_tasks: 'Workflow-Tasks',
  test_cases: 'Test-Cases',
  error_logs: 'Error-Logs',
}

/** Human labels for ExecutorRole — single source of truth for chips. */
export const EXECUTOR_ROLE_LABEL: Record<ExecutorRole, string> = {
  developer: 'Developer',
  designer: 'Designer',
  marketing_manager: 'Marketing Manager',
  ads_manager: 'Ads Manager',
  seo_specialist: 'SEO',
  content_creator: 'Content',
  project_manager: 'Project Manager',
  strategist: 'Strategist',
  automation_expert: 'Automation',
  client_success: 'Client Success',
  reviewer: 'Reviewer',
}

/** Convenience accessor with safe fallback for unknown types. */
export function getProjectPreset(type: ProjectType | null | undefined): ProjectModulePreset {
  if (!type) return PROJECT_MODULE_REGISTRY.software
  return PROJECT_MODULE_REGISTRY[type] ?? PROJECT_MODULE_REGISTRY.software
}

/** Executor modules for a role within a project type, with generic fallback. */
export function getExecutorModulesFor(type: ProjectType | null | undefined, role: ExecutorRole | null | undefined): ExecutorModule[] {
  const preset = getProjectPreset(type)
  if (!role) return GENERIC_EXECUTOR_MODULES
  return preset.executorModules[role] ?? GENERIC_EXECUTOR_MODULES
}
