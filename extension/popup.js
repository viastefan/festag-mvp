/**
 * Popup — Tagro settings + auth status.
 */

const KEYS = {
  writing: 'festagWritingEnabled',
  feedback: 'festagLiveFeedbackEnabled',
  sites: 'festagSiteFilterEnabled',
  voice: 'festagLiveVoiceEnabled',
  voiceAuto: 'festagLiveVoiceAuto',
  defaultAction: 'festagDefaultAction',
  blockedDomains: 'festagBlockedDomains',
}

const manifestVersion = chrome.runtime.getManifest().version
const versionLabel = document.getElementById('version-label')
const statusStrip = document.getElementById('status-strip')
const statusTitle = document.getElementById('status-title')
const statusDesc = document.getElementById('status-desc')
const connectSlotTop = document.getElementById('connect-slot-top')
const connectSlotBottom = document.getElementById('connect-slot-bottom')
const connectBtn = document.getElementById('connect-btn')
const connectHint = document.getElementById('connect-hint')
const projectsWrap = document.getElementById('projects')
const projectList = document.getElementById('project-list')
const voicePanel = document.getElementById('voice-panel')
const toggleWriting = document.getElementById('toggle-writing')
const toggleFeedback = document.getElementById('toggle-feedback')
const toggleSites = document.getElementById('toggle-sites')
const toggleVoice = document.getElementById('toggle-voice')
const toggleVoiceAuto = document.getElementById('toggle-voice-auto')
const defaultActionRow = document.getElementById('default-action-row')
const blockSiteBtn = document.getElementById('block-site-btn')
const blockedList = document.getElementById('blocked-list')

if (versionLabel) versionLabel.textContent = `v${manifestVersion}`

function setToggle(btn, on) {
  if (!btn) return
  btn.classList.toggle('on', on)
  btn.setAttribute('aria-pressed', on ? 'true' : 'false')
}

function syncVoicePanel(feedbackOn) {
  if (!voicePanel) return
  voicePanel.classList.toggle('on', feedbackOn)
}

function wireToggle(btn, key, { reloadTab = false, defaultOn = true } = {}) {
  if (!btn) return
  btn.addEventListener('click', () => {
    chrome.storage.local.get(key, (data) => {
      const current = defaultOn ? data[key] !== false : data[key] === true
      const next = !current
      chrome.storage.local.set({ [key]: next }, () => {
        setToggle(btn, next)
        if (key === KEYS.feedback) syncVoicePanel(next)
        if (reloadTab) reloadActiveTab()
      })
    })
  })
}

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id
    if (tabId) chrome.tabs.reload(tabId)
  })
}

chrome.storage.local.get(Object.values(KEYS), (data) => {
  setToggle(toggleWriting, data[KEYS.writing] !== false)
  const feedbackOn = data[KEYS.feedback] !== false
  setToggle(toggleFeedback, feedbackOn)
  setToggle(toggleSites, data[KEYS.sites] === true)
  setToggle(toggleVoice, data[KEYS.voice] !== false)
  setToggle(toggleVoiceAuto, data[KEYS.voiceAuto] === true)
  syncVoicePanel(feedbackOn)
  renderDefaultAction(data[KEYS.defaultAction] || 'clearer')
  renderBlockedList(data[KEYS.blockedDomains] || [])
})

wireToggle(toggleWriting, KEYS.writing, { reloadTab: true })
wireToggle(toggleFeedback, KEYS.feedback, { reloadTab: true })
wireToggle(toggleVoice, KEYS.voice, { reloadTab: true })
wireToggle(toggleVoiceAuto, KEYS.voiceAuto, { reloadTab: true, defaultOn: false })

toggleSites?.addEventListener('click', () => {
  chrome.storage.local.get(KEYS.sites, (data) => {
    const on = data[KEYS.sites] === true
    const next = !on
    chrome.storage.local.set({ [KEYS.sites]: next }, () => {
      setToggle(toggleSites, next)
      reloadActiveTab()
    })
  })
})

function setStatus(tone, title, desc) {
  if (!statusStrip || !statusTitle || !statusDesc) return
  statusStrip.className = `status status--${tone}`
  statusTitle.textContent = title
  statusDesc.textContent = desc
}

function ensureReloadButton(slot) {
  if (!slot || slot.querySelector('.reload-btn')) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'reload-btn'
  btn.textContent = 'Seite neu laden (F5)'
  btn.addEventListener('click', reloadActiveTab)
  slot.appendChild(btn)
}

function setAuthState({ ok, email, backendReady, pageBlocked }) {
  if (connectHint) connectHint.hidden = true

  if (ok && email) {
    connectSlotTop.hidden = true
    connectSlotBottom.hidden = false
    ensureReloadButton(connectSlotBottom)

    if (pageBlocked) {
      setStatus('warn', 'Auf dieser Seite inaktiv', 'Filter prüfen oder Seite neu laden.')
    } else if (backendReady === false) {
      setStatus('warn', `Angemeldet als ${email}`, 'KI-Backend startet noch — kurz warten.')
    } else {
      setStatus('ok', `Verbunden als ${email}`, 'Tagro bereit — Seite neu laden, dann Text markieren.')
    }
    return
  }

  connectSlotTop.hidden = false
  connectSlotBottom.hidden = true
  if (connectBtn) {
    connectBtn.textContent = 'Mit Festag verbinden'
    connectBtn.href = 'https://festag.app/login?returnTo=/settings/apps'
  }
  setStatus('warn', 'Nicht verbunden', 'Bei festag.app anmelden, um Tagro zu nutzen.')
}

function renderProjects(projects) {
  if (!projectsWrap || !projectList) return
  projectList.innerHTML = ''
  if (!projects.length) {
    projectsWrap.classList.remove('on')
    return
  }
  projectsWrap.classList.add('on')
  for (const p of projects) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'project-row'
    const dot = document.createElement('span')
    dot.className = 'project-dot'
    if (p.color) dot.style.background = p.color
    const title = document.createElement('span')
    title.className = 'project-title'
    title.textContent = p.title || 'Projekt'
    btn.append(dot, title)
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
    projectList.appendChild(btn)
  }
}

function loadProjectsIfNeeded() {
  if (!toggleFeedback?.classList.contains('on')) {
    projectsWrap?.classList.remove('on')
    return
  }
  chrome.runtime.sendMessage({ type: 'getProjects' }, (res) => {
    if (res?.ok) renderProjects(res.projects || [])
  })
}

function refreshAuth() {
  chrome.runtime.sendMessage({ type: 'getSession' }, (sessionRes) => {
    if (chrome.runtime.lastError) {
      setAuthState({ ok: false })
      return
    }
    if (sessionRes?.ok && sessionRes.user?.email) {
      const state = {
        ok: true,
        email: sessionRes.user.email,
        backendReady: sessionRes.backendReady,
        pageBlocked: false,
      }
      setAuthState(state)
      loadProjectsIfNeeded()

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id
        if (!tabId) return
        chrome.tabs.sendMessage(tabId, { type: 'festag:ping' }, (ping) => {
          if (chrome.runtime.lastError || !ping?.ok) return
          if (!ping.allowed) {
            setAuthState({ ...state, pageBlocked: true })
          }
        })
      })
      return
    }
    setAuthState({ ok: false })
    projectsWrap?.classList.remove('on')
  })
}

refreshAuth()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshAuth()
})

toggleFeedback?.addEventListener('click', () => {
  window.setTimeout(loadProjectsIfNeeded, 80)
})

function renderDefaultAction(action) {
  if (!defaultActionRow) return
  defaultActionRow.querySelectorAll('.pref-chip').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.action === action)
  })
}

defaultActionRow?.querySelectorAll('.pref-chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action
    if (!action) return
    chrome.storage.local.set({ [KEYS.defaultAction]: action }, () => {
      renderDefaultAction(action)
      reloadActiveTab()
    })
  })
})

blockSiteBtn?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url
    if (!url) return
    let host = ''
    try { host = new URL(url).hostname.replace(/^www\./, '') } catch { return }
    if (!host) return
    chrome.storage.local.get(KEYS.blockedDomains, (data) => {
      const prev = Array.isArray(data[KEYS.blockedDomains]) ? data[KEYS.blockedDomains] : []
      if (prev.includes(host)) {
        blockSiteBtn.textContent = `${host} blockiert`
        return
      }
      const next = [...prev, host]
      chrome.storage.local.set({ [KEYS.blockedDomains]: next }, () => {
        blockSiteBtn.textContent = `${host} blockiert`
        renderBlockedList(next)
        reloadActiveTab()
      })
    })
  })
})

function renderBlockedList(domains) {
  if (!blockedList) return
  blockedList.innerHTML = ''
  const list = Array.isArray(domains) ? domains.filter(Boolean) : []
  if (!list.length) return
  for (const domain of list) {
    const li = document.createElement('li')
    li.className = 'blocked-row'
    const label = document.createElement('span')
    label.textContent = domain
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'blocked-remove'
    btn.textContent = 'Entfernen'
    btn.addEventListener('click', () => {
      chrome.storage.local.get(KEYS.blockedDomains, (data) => {
        const prev = Array.isArray(data[KEYS.blockedDomains]) ? data[KEYS.blockedDomains] : []
        const next = prev.filter((d) => d !== domain)
        chrome.storage.local.set({ [KEYS.blockedDomains]: next }, () => {
          renderBlockedList(next)
          blockSiteBtn.textContent = 'Diese Seite blockieren'
          reloadActiveTab()
        })
      })
    })
    li.append(label, btn)
    blockedList.appendChild(li)
  }
}
