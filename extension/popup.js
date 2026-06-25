/**
 * Popup — Schreibhilfe toggle + sign-in check + project picker.
 */

const STORAGE_KEY = 'festagWritingEnabled'
const statusEl = document.getElementById('status')
const listEl = document.getElementById('list')
const writingToggle = document.getElementById('writing-toggle')
const writingHint = document.getElementById('writing-hint')

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
  hint.textContent = 'Danach das Popup erneut öffnen.'
  listEl.appendChild(hint)
}

chrome.runtime.sendMessage({ type: 'getProjects' }, (res) => {
  if (!res || !res.ok) { loginRow(); return }
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
