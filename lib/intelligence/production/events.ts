/**
 * Production events — which future integrations provide which signals.
 * Complements work_signals (delivery). This graph is toolchain / efficiency / cost.
 *
 * Architecture reserved — do not ingest live until implementation phase.
 * Doc: docs/festag-production-intelligence.md
 */

export const PRODUCTION_EVENT_FAMILIES = [
  'ai_usage',
  'scm',
  'deploy',
  'data',
  'design',
  'tracker',
  'comms',
  'billing',
  'knowledge',
  'observability',
] as const

export type ProductionEventFamily = (typeof PRODUCTION_EVENT_FAMILIES)[number]

export type ProductionEvent = {
  id: string
  workspace_id: string
  project_id?: string | null
  family: ProductionEventFamily
  provider: string
  event_type: string
  occurred_at: string
  /** Opaque provider payload — normalize later in adapters. */
  payload: Record<string, unknown>
  /** Optional cost / token / duration hints when available. */
  metrics?: {
    tokens_in?: number
    tokens_out?: number
    cost_eur?: number
    duration_ms?: number
  }
}

export type ProductionIntegrationContract = {
  provider: string
  family: ProductionEventFamily
  /** Events this integration is expected to emit when connected. */
  eventTypes: string[]
  status: 'planned' | 'partial' | 'ready'
  notes?: string
}

/**
 * Future integration → event map.
 * Status stays `planned` until an adapter ships.
 */
export const PRODUCTION_INTEGRATION_EVENTS: ProductionIntegrationContract[] = [
  {
    provider: 'openai',
    family: 'ai_usage',
    eventTypes: ['completion', 'embedding', 'moderation'],
    status: 'planned',
    notes: 'Model efficiency + conversation value — not vanity token charts.',
  },
  {
    provider: 'anthropic',
    family: 'ai_usage',
    eventTypes: ['completion', 'tool_use'],
    status: 'planned',
  },
  {
    provider: 'google_gemini',
    family: 'ai_usage',
    eventTypes: ['completion', 'multimodal'],
    status: 'planned',
  },
  {
    provider: 'cursor',
    family: 'ai_usage',
    eventTypes: ['agent_session', 'edit', 'prompt_pattern'],
    status: 'planned',
    notes: 'Festag optimizes production, not Cursor prompts.',
  },
  {
    provider: 'github',
    family: 'scm',
    eventTypes: ['push', 'pull_request', 'review', 'check_run', 'deploy'],
    status: 'partial',
    notes: 'Webhook ingest exists for commits/PRs — not yet production_events.',
  },
  {
    provider: 'gitlab',
    family: 'scm',
    eventTypes: ['push', 'merge_request', 'pipeline', 'review'],
    status: 'planned',
  },
  {
    provider: 'vercel',
    family: 'deploy',
    eventTypes: ['deployment', 'build', 'edge_config'],
    status: 'planned',
  },
  {
    provider: 'cloudflare',
    family: 'deploy',
    eventTypes: ['deploy', 'worker_invoke', 'cache'],
    status: 'planned',
  },
  {
    provider: 'docker',
    family: 'deploy',
    eventTypes: ['image_build', 'container_run'],
    status: 'planned',
  },
  {
    provider: 'supabase',
    family: 'data',
    eventTypes: ['query_load', 'auth_event', 'storage', 'edge_fn'],
    status: 'planned',
  },
  {
    provider: 'postgres',
    family: 'data',
    eventTypes: ['slow_query', 'migration', 'connection_pool'],
    status: 'planned',
  },
  {
    provider: 'figma',
    family: 'design',
    eventTypes: ['file_update', 'comment', 'library_publish'],
    status: 'planned',
  },
  {
    provider: 'linear',
    family: 'tracker',
    eventTypes: ['issue_update', 'cycle', 'project_update'],
    status: 'planned',
  },
  {
    provider: 'jira',
    family: 'tracker',
    eventTypes: ['issue_update', 'sprint', 'transition'],
    status: 'planned',
  },
  {
    provider: 'slack',
    family: 'comms',
    eventTypes: ['message', 'thread', 'reaction'],
    status: 'partial',
    notes: 'Connector exists — classify via work_signals; production graph later.',
  },
  {
    provider: 'discord',
    family: 'comms',
    eventTypes: ['message', 'thread'],
    status: 'planned',
  },
  {
    provider: 'stripe',
    family: 'billing',
    eventTypes: ['invoice', 'subscription', 'payout'],
    status: 'planned',
  },
  {
    provider: 'notion',
    family: 'knowledge',
    eventTypes: ['page_update', 'database_row'],
    status: 'planned',
  },
  {
    provider: 'google_workspace',
    family: 'knowledge',
    eventTypes: ['drive_change', 'calendar_event', 'doc_edit'],
    status: 'planned',
  },
  {
    provider: 'analytics',
    family: 'observability',
    eventTypes: ['traffic', 'conversion', 'error_rate'],
    status: 'planned',
  },
  {
    provider: 'monitoring',
    family: 'observability',
    eventTypes: ['alert', 'uptime', 'latency'],
    status: 'planned',
  },
]

export function productionContractsForProvider(
  provider: string,
): ProductionIntegrationContract[] {
  const key = provider.toLowerCase()
  return PRODUCTION_INTEGRATION_EVENTS.filter(c => c.provider === key)
}
