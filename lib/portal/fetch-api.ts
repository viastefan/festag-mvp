export type FetchJsonResult<T> = {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 20_000,
): Promise<FetchJsonResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      credentials: init?.credentials ?? 'include',
      signal: controller.signal,
    })
    const data = res.ok ? await res.json().catch(() => null) : null
    if (!res.ok) {
      const err = (data as { error?: string } | null)?.error
      return { ok: false, status: res.status, data: null, error: err || res.statusText }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (e: any) {
    const aborted = e?.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted ? 'Zeitüberschreitung — bitte erneut versuchen.' : 'Netzwerkfehler',
    }
  } finally {
    clearTimeout(timeout)
  }
}
