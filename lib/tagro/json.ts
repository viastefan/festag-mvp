export type JsonObject = Record<string, unknown>

export function stripAiReasoning(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()
}

export function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

export function extractJsonObject(text: string): JsonObject {
  const clean = stripCodeFence(stripAiReasoning(text)).trim()
  const match = clean.match(/\{[\s\S]*\}/)
  return JSON.parse(match?.[0] ?? clean) as JsonObject
}
