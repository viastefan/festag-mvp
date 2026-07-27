import {
  clampConfidence,
  clampPriority,
  TASK_TYPES,
  type TaskProposalOutput,
} from '@/lib/tagro/rules'

function cleanString(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .slice(0, 8)
}

function cleanBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeTaskProposalOutput(
  raw: unknown,
  fallback: TaskProposalOutput,
): TaskProposalOutput {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const taskType = typeof data.task_type === 'string' && (TASK_TYPES as readonly string[]).includes(data.task_type)
    ? data.task_type as TaskProposalOutput['task_type']
    : fallback.task_type
  return {
    client_summary: cleanString(data.client_summary, fallback.client_summary),
    suggested_title: cleanString(data.suggested_title, fallback.suggested_title),
    suggested_description: cleanString(data.suggested_description, fallback.suggested_description),
    task_type: taskType,
    priority: clampPriority(data.priority, fallback.priority),
    possible_dev_interpretation: cleanString(
      data.possible_dev_interpretation,
      fallback.possible_dev_interpretation,
    ),
    risks: cleanStringArray(data.risks).length ? cleanStringArray(data.risks) : fallback.risks,
    open_questions: cleanStringArray(data.open_questions).length
      ? cleanStringArray(data.open_questions)
      : fallback.open_questions,
    needs_decision: cleanBoolean(data.needs_decision, fallback.needs_decision),
    confidence_score: clampConfidence(data.confidence_score),
  }
}
