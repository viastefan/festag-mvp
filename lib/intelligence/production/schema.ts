/**
 * Reserved database relationships for Production Intelligence.
 * DESIGN ONLY — do not create migrations or apply tables until implementation.
 *
 * Doc: docs/festag-production-intelligence.md
 */

/**
 * Proposed tables (future migration sketch):
 *
 * production_sources
 *   id uuid pk
 *   workspace_id uuid → workspaces not null
 *   kind text
 *   provider text
 *   status text
 *   external_ref text null
 *   metadata jsonb
 *   connected_at timestamptz null
 *   created_at timestamptz
 *
 * production_events
 *   id uuid pk
 *   workspace_id uuid → workspaces not null
 *   project_id uuid → projects null
 *   source_id uuid → production_sources null
 *   family text
 *   provider text
 *   event_type text
 *   occurred_at timestamptz
 *   payload jsonb
 *   metrics jsonb
 *   created_at timestamptz
 *
 * production_snapshots
 *   id uuid pk
 *   workspace_id uuid → workspaces not null
 *   project_id uuid → projects null
 *   period_start timestamptz
 *   period_end timestamptz
 *   aggregates jsonb
 *   created_at timestamptz
 *
 * production_scores
 *   id uuid pk
 *   workspace_id uuid → workspaces not null
 *   project_id uuid → projects null
 *   score numeric null
 *   factors jsonb not null
 *   computed_at timestamptz
 *
 * production_score_deltas
 *   id uuid pk
 *   score_id uuid → production_scores
 *   previous numeric
 *   next numeric
 *   why text not null
 *   factors_touched text[]
 *   at timestamptz
 *
 * production_recommendations
 *   id uuid pk
 *   workspace_id uuid → workspaces not null
 *   project_id uuid → projects null
 *   kind text
 *   title text
 *   rationale text
 *   evidence_refs text[]
 *   status text
 *   decided_by uuid null
 *   decided_at timestamptz null
 *   created_at timestamptz
 *
 * RLS: workspace membership only. Honor adaptive_intelligence_enabled for reads into Tagro.
 */

export const PRODUCTION_SCHEMA_TABLES = [
  'production_sources',
  'production_events',
  'production_snapshots',
  'production_scores',
  'production_score_deltas',
  'production_recommendations',
] as const

export type ProductionSchemaTable = (typeof PRODUCTION_SCHEMA_TABLES)[number]

export type ProductionSchemaRelation = {
  from: ProductionSchemaTable | 'workspaces' | 'projects'
  to: ProductionSchemaTable | 'workspaces' | 'projects'
  cardinality: '1:*' | '*:1' | '1:1'
  via?: string
}

export const PRODUCTION_SCHEMA_RELATIONS: ProductionSchemaRelation[] = [
  { from: 'workspaces', to: 'production_sources', cardinality: '1:*' },
  { from: 'workspaces', to: 'production_events', cardinality: '1:*' },
  { from: 'projects', to: 'production_events', cardinality: '1:*', via: 'project_id' },
  { from: 'production_sources', to: 'production_events', cardinality: '1:*', via: 'source_id' },
  { from: 'workspaces', to: 'production_snapshots', cardinality: '1:*' },
  { from: 'projects', to: 'production_snapshots', cardinality: '1:*', via: 'project_id' },
  { from: 'workspaces', to: 'production_scores', cardinality: '1:*' },
  { from: 'projects', to: 'production_scores', cardinality: '1:*', via: 'project_id' },
  { from: 'production_scores', to: 'production_score_deltas', cardinality: '1:*' },
  { from: 'workspaces', to: 'production_recommendations', cardinality: '1:*' },
  { from: 'projects', to: 'production_recommendations', cardinality: '1:*', via: 'project_id' },
]

/** Guard for agents — schema is not live. */
export const PRODUCTION_SCHEMA_APPLIED = false
