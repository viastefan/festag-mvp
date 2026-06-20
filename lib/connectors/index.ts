export type { Connector, ConnectorContext, ConnectorIssue, ConnectorSyncResult, ConnectorSource } from '@/lib/connectors/types'
export { CONNECTOR_SOURCES } from '@/lib/connectors/types'
export { GitHubConnector, githubConnector } from '@/lib/connectors/github'

import type { ConnectorSource } from '@/lib/connectors/types'
import { githubConnector } from '@/lib/connectors/github'

const REGISTRY = {
  github: githubConnector,
} as const

export function getConnector(source: ConnectorSource) {
  const connector = REGISTRY[source as keyof typeof REGISTRY]
  if (!connector) throw new Error(`connector_not_implemented:${source}`)
  return connector
}
