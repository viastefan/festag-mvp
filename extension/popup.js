/**
 * Popup — Figma settings surface (400:84) + voice prefs + auth.
 */

const KEYS = {
  writing: 'festagWritingEnabled',
  feedback: 'festagLiveFeedbackEnabled',
  sites: 'festagSiteFilterEnabled',
  voice: 'festagLiveVoiceEnabled',
  voiceAuto: 'festagLiveVoiceAuto',
}

const manifestVersion = chrome.runtime.getManifest().version
const versionLabel = document.getElementById('version-label')
const authBanner = document.getElementById('auth-banner')
const connectBtn = document.getElementById('connect-btn')
const projectsWrap = document.getElementById('projects')
const projectList = document.getElementById('project-list')
const voicePanel = document.getElementById('voice-panel')
const toggleWriting = document.getElementById('toggle-writing')
const toggleFeedback = document.getElementById('toggle-feedback')
const toggleSites = document.getElementById('toggle-sites')
const toggleVoice = document.getElementById('toggle-voice')
const toggleVoiceAuto = document.getElementById('toggle-voice-auto')

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

function setAuthState({ ok, email }) {
  if (!authBanner || !connectBtn) return
  if (ok && email) {
    authBanner.hidden = false
    authBanner.className = 'auth-banner ok'
    authBanner.textContent = `Verbunden als ${email}`
    connectBtn.textContent = `Verbunden als ${email}`
    connectBtn.classList.add('connected')
    connectBtn.removeAttribute('href')
  } else {
    authBanner.hidden = false
    authBanner.className = 'auth-banner'
    authBanner.textContent = 'Noch nicht verbunden — bei festag.app anmelden, dann dieses Popup neu öffnen.'
    connectBtn.textContent = 'Mit Festag verbinden'
    connectBtn.classList.remove('connected')
    connectBtn.href = 'https://festag.app/login'
  }
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

chrome.runtime.sendMessage({ type: 'getProjects' }, (res) => {
  if (!res || !res.ok) {
    setAuthState({ ok: false })
    return
  }
  setAuthState({ ok: true, email: res.user?.email })
  if (toggleFeedback?.classList.contains('on')) {
    renderProjects(res.projects || [])
  }
})

toggleFeedback?.addEventListener('click', () => {
  window.setTimeout(() => {
    if (!toggleFeedback.classList.contains('on')) {
      projectsWrap?.classList.remove('on')
      return
    }
    chrome.runtime.sendMessage({ type: 'getProjects' }, (res) => {
      if (res?.ok) renderProjects(res.projects || [])
    })
  }, 80)
})
