export type { Connector, ConnectorContext, ConnectorIssue, ConnectorSyncResult, ConnectorSource } from '@/lib/connectors/types'
export { CONNECTOR_SOURCES } from '@/lib/connectors/types'
export { GitHubConnector, githubConnector } from '@/lib/connectors/github'
export { LinearConnector, linearConnector, listLinearTeamsForToken } from '@/lib/connectors/linear'
export { JiraConnector, jiraConnector, listJiraProjectsForAuth } from '@/lib/connectors/jira'

import type { ConnectorSource } from '@/lib/connectors/types'
import { githubConnector } from '@/lib/connectors/github'
import { linearConnector } from '@/lib/connectors/linear'
import { jiraConnector } from '@/lib/connectors/jira'

const REGISTRY = {
  github: githubConnector,
  linear: linearConnector,
  jira: jiraConnector,
} as const

export type ImplementedConnectorSource = keyof typeof REGISTRY

export function getConnector(source: ConnectorSource) {
  const connector = REGISTRY[source as ImplementedConnectorSource]
  if (!connector) throw new Error(`connector_not_implemented:${source}`)
  return connector
}

export function isImplementedConnector(source: string): source is ImplementedConnectorSource {
  return source in REGISTRY
}

export const IMPLEMENTED_CONNECTORS: ImplementedConnectorSource[] = ['github', 'linear', 'jira']
