/**
 * Festag extension — background service worker.
 *
 * The single API bridge. Content scripts run on arbitrary origins and
 * can't carry festag.app cookies; the service worker CAN (host_permissions
 * exempt extension fetches from CORS/SameSite). All Festag API calls go
 * through here via chrome.runtime.sendMessage.
 *
 * Messages:
 *   { type: 'getProjects' }                  → { ok, user?, projects?, error? }
 *   { type: 'createCapture', payload }       → { ok, capture?, error? }
 *   { type: 'approveCapture', captureId }    → { ok, capture?, error? }
 */

const BASES = ['https://festag.app', 'http://localhost:3000']

async function tryFetch(path, init) {
  let lastErr = 'unreachable'
  for (const base of BASES) {
    try {
      const res = await fetch(base + path, { credentials: 'include', ...init })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) { lastErr = 'unauthorized'; continue }
      return { ok: res.ok, status: res.status, data }
    } catch (e) {
      lastErr = String(e && e.message || e)
    }
  }
  return { ok: false, status: 0, data: { error: lastErr } }
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
    sendResponse({ ok: false, error: 'unknown_message' })
  })()
  return true // async response
})
