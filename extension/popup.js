/**
 * Popup — Schreibhilfe toggle + sign-in check + project picker.
 */

const STORAGE_KEY = 'festagWritingEnabled'
const statusEl = document.getElementById('status')
const listEl = document.getElementById('list')
const writingToggle = document.getElementById('writing-toggle')
const writingHint = document.getElementById('writing-hint')
const authStatus = document.getElementById('auth-status')
const footEl = document.getElementById('foot')

const manifestVersion = chrome.runtime.getManifest().version
if (footEl) {
  footEl.innerHTML = `<strong>v${manifestVersion}</strong><br>Nach einem Update: Erweiterung unter chrome://extensions neu laden, dann die geöffnete Seite mit F5 aktualisieren.`
}

function setAuthStatus(text, isError = false) {
  if (!authStatus) return
  if (!text) {
    authStatus.hidden = true
    authStatus.textContent = ''
    authStatus.classList.remove('err')
    return
  }
  authStatus.hidden = false
  authStatus.textContent = text
  authStatus.classList.toggle('err', isError)
}

function setWritingToggle(on) {
  writingToggle.classList.toggle('on', on)
  writingToggle.setAttribute('aria-pressed', on ? 'true' : 'false')
  if (writingHint) writingHint.hidden = on
}

chrome.storage.local.get(STORAGE_KEY, (data) => {
  const on = data[STORAGE_KEY] !== false
  setWritingToggle(on)
})

writingToggle.addEventListener('click', () => {
  chrome.storage.local.get(STORAGE_KEY, (data) => {
    const on = data[STORAGE_KEY] !== false
    const next = !on
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
      setWritingToggle(next)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (tabId) chrome.tabs.reload(tabId)
      })
    })
  })
})

function loginRow() {
  statusEl.textContent = ''
  listEl.innerHTML = ''
  setAuthStatus('Nicht verbunden — bei festag.app anmelden, dann Popup neu öffnen.', true)
  const a = document.createElement('a')
  a.className = 'login'
  a.href = 'https://festag.app/login'
  a.target = '_blank'
  a.rel = 'noreferrer'
  a.textContent = 'Bei Festag anmelden'
  listEl.appendChild(a)
  const hint = document.createElement('p')
  hint.className = 'hint'
  hint.style.marginTop = '8px'
  hint.textContent = 'Festag-Tab einmal neu laden, dann dieses Popup erneut öffnen.'
  listEl.appendChild(hint)
}

chrome.runtime.sendMessage({ type: 'getProjects' }, (res) => {
  if (!res || !res.ok) { loginRow(); return }
  if (res.user?.email) {
    setAuthStatus(`Angemeldet als ${res.user.email}`)
  }
  const projects = res.projects || []
  statusEl.textContent = ''
  if (projects.length === 0) {
    statusEl.textContent = 'Keine Projekte gefunden.'
    return
  }
  for (const p of projects) {
    const btn = document.createElement('button')
    btn.className = 'row'
    btn.type = 'button'

    const dot = document.createElement('span')
    dot.className = 'dot'
    if (p.color) dot.style.background = p.color

    const title = document.createElement('span')
    title.className = 'title'
    title.textContent = p.title || 'Projekt'

    const hint = document.createElement('span')
    hint.className = 'hint'
    hint.textContent = p.staging_url ? '●' : ''

    btn.append(dot, title, hint)
    btn.addEventListener('click', async () => {
      await chrome.storage.local.set({
        festagProject: { id: p.id, title: p.title, stagingUrl: p.staging_url || null },
      })
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'festag:openPanel' }, () => void chrome.runtime.lastError)
      }
      window.close()
    })
    listEl.appendChild(btn)
  }
})
