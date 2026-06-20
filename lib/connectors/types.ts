import type { SupabaseClient } from '@supabase/supabase-js'
import type { Issue, IssueCreateInput } from '@/lib/issues/types'

export const CONNECTOR_SOURCES = ['github', 'jira', 'linear', 'clickup', 'slack', 'notion'] as const
export type ConnectorSource = (typeof CONNECTOR_SOURCES)[number]

export type ConnectorStatus = 'not_connected' | 'pending' | 'connected' | 'error'

export type ConnectorProject = {
  externalId: string
  name: string
  url?: string | null
  metadata?: Record<string, unknown>
}

export type ConnectorIssue = Omit<IssueCreateInput, 'project_id'> & {
  externalId: string
  externalUrl?: string | null
  externalStatus?: string | null
  reporterExternalId?: string | null
  ownerExternalId?: string | null
  updatedAt?: string | null
  raw?: Record<string, unknown>
}

export type ConnectorSyncResult = {
  source: ConnectorSource
  projects: number
  issuesImported: number
  issuesUpdated: number
  tasksImported: number
  linked: number
  enriched: number
  errors: string[]
}

export type ConnectorContext = {
  sb: SupabaseClient<any>
  projectId: string
  workspaceId?: string | null
  userId?: string | null
  token?: string
  config?: Record<string, unknown>
}

/**
 * Standard connector surface — Festag sits above external tools.
 * Implementations are server-side only.
 */
export interface Connector {
  readonly source: ConnectorSource

  connect(ctx: ConnectorContext): Promise<{ ok: boolean; error?: string }>
  disconnect(ctx: ConnectorContext): Promise<{ ok: boolean }>

  fetchProjects(ctx: ConnectorContext): Promise<ConnectorProject[]>
  fetchIssues(ctx: ConnectorContext, opts?: { since?: string }): Promise<ConnectorIssue[]>
  fetchTasks(ctx: ConnectorContext, opts?: { since?: string }): Promise<ConnectorIssue[]>

  /** Pull external issues/tasks into Festag tables for one project. */
  sync(ctx: ConnectorContext, opts?: { since?: string; enrich?: boolean }): Promise<ConnectorSyncResult>
}

export type StoredIssueRow = Issue
