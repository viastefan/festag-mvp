import type { TagroContext, TagroContextPurpose } from '@/lib/tagro/context-builder'
import { contextToPromptText } from '@/lib/tagro/context-builder'
import { taskProposalPrompt } from '@/lib/tagro/prompts'
import { classifyClientTask } from '@/lib/tagro/task-classifier'
import type {
  FestagTagroRunType,
  TagroOkmMode,
  TaskProposalInput,
  TaskProposalOutput,
} from './schemas'
import { normalizeTaskProposalOutput } from './normalize'

export type TagroRunDefinition<TInput, TOutput> = {
  runType: FestagTagroRunType
  purpose: TagroContextPurpose | null
  okm: TagroOkmMode
  audit?: boolean
  buildPrompt: (input: TInput, context: TagroContext | null) => string
  fallback: (input: TInput, context: TagroContext | null) => TOutput
  normalize: (raw: unknown, input: TInput, context: TagroContext | null) => TOutput
}

export function fallbackTaskProposal(
  input: TaskProposalInput,
  context: TagroContext | null,
): TaskProposalOutput {
  const text = String(input.description || '').trim()
  const title = input.title ? String(input.title).trim() : ''
  const classified = classifyClientTask(`${title ?? ''} ${text}`)
  const cleanTitle =
    title ||
    text.split(/\s+/).slice(0, 9).join(' ').replace(/[.,;:!?]+$/, '') ||
    'Neue Aufgabe'
  const projectTitle = context?.project?.title ? ` im Projekt „${context.project.title}“` : ''

  return {
    client_summary: text || cleanTitle,
    suggested_title: cleanTitle,
    suggested_description: text || cleanTitle,
    task_type: 'tagro_structured_client_task',
    priority: classified.priority,
    possible_dev_interpretation: `Client-Wunsch${projectTitle} strukturieren und als ${classified.taskType} im Projekt-Workflow prüfen.`,
    risks: [],
    open_questions: [],
    needs_decision: false,
    confidence_score: 0.64,
  }
}

export const TASK_PROPOSAL_RUN: TagroRunDefinition<TaskProposalInput, TaskProposalOutput> = {
  runType: 'task_proposal',
  purpose: 'task_proposal',
  okm: 'optional',
  audit: true,
  buildPrompt(input, context) {
    const contextText = context ? contextToPromptText(context) : 'Kein Projektkontext geladen.'
    const title = input.title ? `${String(input.title).trim()}\n` : ''
    const description = String(input.description || '').trim()
    return taskProposalPrompt(contextText, `${title}${description}`)
  },
  fallback: fallbackTaskProposal,
  normalize(raw, input, context) {
    return normalizeTaskProposalOutput(raw, fallbackTaskProposal(input, context))
  },
}

export const TAGRO_RUN_REGISTRY = {
  task_proposal: TASK_PROPOSAL_RUN,
} as const

export type RegisteredTagroRunType = keyof typeof TAGRO_RUN_REGISTRY

export function getTagroRunDefinition(runType: string) {
  return TAGRO_RUN_REGISTRY[runType as RegisteredTagroRunType] ?? null
}
