/**
 * Festag extension — background service worker.
 *
 * API bridge for content scripts and popup. Supabase session cookies are
 * HttpOnly + SameSite, so fetch(credentials:'include') from the extension
 * origin does NOT receive them. We read festag.app cookies via chrome.cookies
 * and forward them on API requests.
 *
 * Messages:
 *   { type: 'getProjects' }                  → { ok, user?, projects?, error? }
 *   { type: 'createCapture', payload }       → { ok, capture?, error? }
 *   { type: 'approveCapture', captureId }    → { ok, capture?, error? }
 *   { type: 'improveText', payload }         → { ok, improved?, error? }
 */

const BASES = ['https://festag.app', 'https://www.festag.app', 'http://localhost:3000']

const COOKIE_DOMAINS = ['festag.app', '.festag.app', 'www.festag.app', 'localhost']

async function festagCookieHeader() {
  if (!chrome.cookies?.getAll) return ''
  const seen = new Set()
  const parts = []
  for (const domain of COOKIE_DOMAINS) {
    let cookies = []
    try {
      cookies = await chrome.cookies.getAll({ domain })
    } catch {
      cookies = []
    }
    for (const c of cookies) {
      if (!c.name || seen.has(c.name)) continue
      seen.add(c.name)
      parts.push(`${c.name}=${c.value}`)
    }
  }
  return parts.join('; ')
}

async function tryFetch(path, init = {}) {
  const cookieHeader = await festagCookieHeader()
  const headers = new Headers(init.headers || {})
  if (cookieHeader) headers.set('Cookie', cookieHeader)

  let lastErr = 'unreachable'
  for (const base of BASES) {
    try {
      const res = await fetch(base + path, {
        ...init,
        headers,
        credentials: 'omit',
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) { lastErr = 'unauthorized'; continue }
      return { ok: res.ok, status: res.status, data }
    } catch (e) {
      lastErr = String(e && e.message || e)
    }
  }
  return { ok: false, status: lastErr === 'unauthorized' ? 401 : 0, data: { error: lastErr } }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  ;(async () => {
    if (msg?.type === 'getProjects') {
      const r = await tryFetch('/api/extension/projects')
      sendResponse({ ok: r.ok, ...r.data })
      return
    }
    if (msg?.type === 'createCapture') {
      const r = await tryFetch('/api/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload || {}),
      })
      sendResponse({ ok: r.ok, ...r.data })
      return
    }
    if (msg?.type === 'approveCapture') {
      const r = await tryFetch(`/api/captures/${msg.captureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      sendResponse({ ok: r.ok, ...r.data })
      return
    }
    if (msg?.type === 'improveText') {
      const r = await tryFetch('/api/extension/improve-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload || {}),
      })
      if (!r.ok) {
        sendResponse({
          ok: false,
          error: r.status === 401 ? 'unauthorized' : (r.data?.error || 'request_failed'),
        })
        return
      }
      sendResponse({ ok: true, ...r.data })
      return
    }
    sendResponse({ ok: false, error: 'unknown_message' })
  })()
  return true
})
