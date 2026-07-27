import type { SupabaseClient } from '@supabase/supabase-js'
import { buildTagroContext, type TagroContext } from '@/lib/tagro/context-builder'
import { runOpenAIJson } from '@/lib/tagro/openai'
import { saveTagroRun } from '@/lib/tagro/task-actions'
import { toDisplaySafeOkmFacts } from '@/lib/tagro/okm-context'
import type { JsonObject } from '@/lib/tagro/json'
import type { TagroModelEnvelope } from '@/lib/tagro/model/schemas'
import type { TagroRunDefinition } from '@/lib/tagro/model/runs'

type RunTagroModelInput<TInput, TOutput> = {
  sb: SupabaseClient<any>
  definition: TagroRunDefinition<TInput, TOutput>
  input: TInput
  projectId?: string | null
  actorId?: string | null
}

function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : {}
}

export async function runTagroModel<TInput, TOutput>({
  sb,
  definition,
  input,
  projectId,
}: RunTagroModelInput<TInput, TOutput>): Promise<TagroModelEnvelope<TOutput>> {
  let context: TagroContext | null = null

  if (definition.purpose && projectId) {
    context = await buildTagroContext({
      sb,
      projectId,
      purpose: definition.purpose,
    })
  }

  const fallback = () => asJsonObject(definition.fallback(input, context))
  const result = await runOpenAIJson({
    prompt: definition.buildPrompt(input, context),
    runType: definition.runType,
    fallback,
  })
  const output = definition.normalize(result.output, input, context)
  const usedOperationalDna =
    definition.okm !== 'never' &&
    Boolean(context?.okm?.promptBlock)
  const operationalDna = context?.okm?.facts
    ? toDisplaySafeOkmFacts(context.okm.facts)
    : []

  if (definition.audit !== false && projectId) {
    await saveTagroRun(sb, {
      projectId,
      runType: definition.runType,
      inputJson: asJsonObject(input),
      outputJson: asJsonObject(output),
      model: result.model,
      status: result.status,
      errorMessage: (result as { error?: string }).error ?? null,
    }).catch(() => null)
  }

  return {
    ok: true,
    runType: definition.runType,
    output,
    model: result.model,
    status: result.status === 'fallback' ? 'fallback' : 'completed',
    usedOperationalDna,
    operationalDna,
  }
}
