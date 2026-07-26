import { createClient } from '@/lib/supabase/client'

export async function issuerAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return {
    ...extra,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export async function fetchIssuer() {
  const res = await fetch('/api/documents/issuer', {
    credentials: 'include',
    headers: await issuerAuthHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function patchIssuer(body: unknown) {
  const res = await fetch('/api/documents/issuer', {
    method: 'PATCH',
    credentials: 'include',
    headers: await issuerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}
