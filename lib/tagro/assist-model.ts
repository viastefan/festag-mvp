/**
 * Shared Tagro assist model resolution for onboarding field polish.
 * `auto` picks length style from the input; explicit 2.1 / 2.2 stay fixed.
 */

export type AssistModelId = 'auto' | '2.1' | '2.2'
export type AssistModelResolved = '2.1' | '2.2'

/** Short texts stay knapper (2.1); longer freitext gets 2.2 depth. */
export function resolveAssistModel(
  raw: string | undefined,
  text = '',
): AssistModelResolved {
  if (raw === '2.2') return '2.2'
  if (raw === '2.1') return '2.1'
  // auto (default)
  return text.trim().length > 180 ? '2.2' : '2.1'
}

export function assistModelLabel(model: AssistModelResolved, requested?: string): string {
  if (requested === 'auto') return `tagro ${model} (auto)`
  return `tagro ${model}`
}
