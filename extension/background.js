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
 *   { type: 'recordWritingApply', payload }  → { ok }
 */

const BASES = ['https://festag.app', 'https://www.festag.app', 'http://localhost:3000']

const FESTAG_URLS = [
  'https://festag.app/',
  'https://www.festag.app/',
  'http://localhost:3000/',
]

async function getFestagCookies() {
  if (!chrome.cookies?.getAll) return []
  const seen = new Set()
  const out = []
  for (const url of FESTAG_URLS) {
    let cookies = []
    try {
      cookies = await chrome.cookies.getAll({ url })
    } catch {
      cookies = []
    }
    for (const c of cookies) {
      if (!c.name || seen.has(c.name)) continue
      seen.add(c.name)
      out.push(c)
    }
  }
  return out
}

function decodeSupabaseSession(raw) {
  if (!raw) return null
  try {
    if (raw.startsWith('base64-')) {
      const b64 = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/')
      const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
      return JSON.parse(atob(b64 + pad))
    }
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    try { return JSON.parse(raw) } catch { return null }
  }
}

function festagAccessToken(cookies) {
  const authCookies = cookies
    .filter((c) => /sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => {
      const chunk = (name) => {
        const m = name.match(/\.(\d+)$/)
        return m ? Number(m[1]) : 0
      }
      const base = (name) => name.replace(/\.\d+$/, '')
      if (base(a.name) !== base(b.name)) return base(a.name).localeCompare(base(b.name))
      return chunk(a.name) - chunk(b.name)
    })

  if (!authCookies.length) return null

  const groups = new Map()
  for (const c of authCookies) {
    const key = c.name.replace(/\.\d+$/, '')
    const chunk = c.name.includes('.') ? Number(c.name.split('.').pop()) : 0
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ chunk, value: c.value })
  }

  for (const parts of groups.values()) {
    parts.sort((a, b) => a.chunk - b.chunk)
    const session = decodeSupabaseSession(parts.map((p) => p.value).join(''))
    const token = session?.access_token
    if (typeof token === 'string' && token.length > 20) return token
  }
  return null
}

async function festagAuthHeaders() {
  const cookies = await getFestagCookies()
  const headers = new Headers()
  if (cookies.length) {
    headers.set('Cookie', cookies.map((c) => `${c.name}=${c.value}`).join('; '))
  }
  const token = festagAccessToken(cookies)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

async function tryFetch(path, init = {}) {
  const authHeaders = await festagAuthHeaders()
  const headers = new Headers(init.headers || {})
  authHeaders.forEach((value, key) => headers.set(key, value))

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
    if (msg?.type === 'getSession') {
      const r = await tryFetch('/api/extension/session')
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
          error: r.status === 401 ? 'unauthorized'
            : r.status === 429 ? 'rate_limit'
              : r.status === 503 ? 'ai_unavailable'
                : (r.data?.error || 'request_failed'),
        })
        return
      }
      sendResponse({ ok: true, ...r.data, remaining: r.data?.remaining })
      return
    }
    if (msg?.type === 'recordWritingApply') {
      const r = await tryFetch('/api/extension/improve-text/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.payload || {}),
      })
      sendResponse({ ok: r.ok, ...(r.data || {}) })
      return
    }
    sendResponse({ ok: false, error: 'unknown_message' })
  })()
  return true
})

function notifyOpenTabs(type = 'festag:extension-updated') {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab?.id || !tab.url) continue
      if (/^(chrome|edge|devtools):/i.test(tab.url)) continue
      chrome.tabs.sendMessage(tab.id, { type }, () => void chrome.runtime.lastError)
    }
  })
}

chrome.runtime.onInstalled.addListener(() => {
  notifyOpenTabs()
})
