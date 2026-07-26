import { createClient } from '@/lib/supabase/client'

export async function documentAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return {
    ...extra,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export async function fetchDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    credentials: 'include',
    headers: await documentAuthHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function patchDocument(id: string, body: unknown) {
  const res = await fetch(`/api/documents/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: await documentAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function listDocuments() {
  const res = await fetch('/api/documents', {
    credentials: 'include',
    headers: await documentAuthHeaders(),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export async function createDocument(body: unknown) {
  const res = await fetch('/api/documents', {
    method: 'POST',
    credentials: 'include',
    headers: await documentAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}
