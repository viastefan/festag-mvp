import type {
  TagroActionItem,
  StatusReportOutput,
  TaskProposalOutput,
} from '@/lib/tagro/rules'

export type {
  TagroActionItem,
  StatusReportOutput,
  TaskProposalOutput,
}

export type FestagTagroRunType =
  | 'task_proposal'
  | 'status_report'
  | 'action_item_extraction'
  | 'client_safe_transform'
  | 'decision_detection'
  | 'github_analysis'
  | 'context_preview'
  | 'issue_intelligence'

export type TagroOkmMode = 'required' | 'optional' | 'never'

export type TagroModelStatus = 'completed' | 'fallback'

export type TagroModelEnvelope<TOutput> = {
  ok: true
  runType: FestagTagroRunType
  output: TOutput
  model: string
  status: TagroModelStatus
  usedOperationalDna: boolean
  operationalDna: Array<{
    id: string
    domain: string
    claim: string
    confidenceLabel: string
  }>
}

export type TaskProposalInput = {
  title?: string
  description: string
}

export type TagroIntelligenceResponse = {
  summary: string
  contextUnderstanding: string
  organizationalImpact: string
  recommendation: string
  nextAction: string
  confidence: number
  usedOperationalDna: boolean
}
