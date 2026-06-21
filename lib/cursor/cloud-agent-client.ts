/**
 * Cursor Cloud Agents REST client (v1).
 * Docs: https://cursor.com/docs/cloud-agent/api/endpoints
 */

const CURSOR_API_BASE = 'https://api.cursor.com'

export type CursorCreateAgentInput = {
  promptText: string
  repoUrl: string
  startingRef?: string
  autoCreatePR?: boolean
  modelId?: string
  name?: string
}

export type CursorAgentRecord = {
  id: string
  name?: string
  status?: string
  url?: string
  latestRunId?: string
}

export type CursorRunRecord = {
  id: string
  agentId?: string
  status?: string
  result?: string
  durationMs?: number
  git?: { branches?: Array<{ repoUrl?: string; branch?: string }> }
}

function apiKey(): string | null {
  const k = process.env.CURSOR_API_KEY?.trim()
  return k || null
}

function authHeader(key: string) {
  const token = Buffer.from(`${key}:`).toString('base64')
  return `Basic ${token}`
}

async function cursorFetch<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const key = apiKey()
  if (!key) return { ok: false, status: 503, data: null, error: 'CURSOR_API_KEY missing' }

  const res = await fetch(`${CURSOR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(key),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = (data as any)?.error?.message || (data as any)?.message || `cursor_http_${res.status}`
    return { ok: false, status: res.status, data: null, error: String(msg) }
  }
  return { ok: true, status: res.status, data: data as T }
}

export function cursorConfigured() {
  return Boolean(apiKey())
}

export async function createCloudAgent(input: CursorCreateAgentInput) {
  const body: Record<string, unknown> = {
    prompt: { text: input.promptText },
    repos: [{ url: input.repoUrl, startingRef: input.startingRef || 'main' }],
    autoCreatePR: input.autoCreatePR ?? true,
    skipReviewerRequest: true,
  }
  if (input.name) body.name = input.name.slice(0, 100)
  if (input.modelId) body.model = { id: input.modelId }

  return cursorFetch<{ agent: CursorAgentRecord; run: CursorRunRecord }>('/v1/agents', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getCloudRun(agentId: string, runId: string) {
  return cursorFetch<CursorRunRecord>(`/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`)
}
