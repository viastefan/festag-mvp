/**
 * Festag writing assistant — Tagro dock, field chip, and selection toolbar.
 * Light Festag design; dock bottom-right when idle, chip only on real inputs.
 */

(() => {
  if (window.__festagWritingAssistant) return

  function isFestagPortal() {
    const host = location.hostname
    if (/^(www\.)?festag\.app$/i.test(host)) return true
    if (document.querySelector('.portal-app-shell, .festag-app-shell, .dashboard-layout-root')) return true
    return false
  }

  if (isFestagPortal()) return

  window.__festagWritingAssistant = true

  const COMPOSE_PATH = 'M5 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7H5V5h7V3H5zm12.78 1c-.17 0-.34.07-.47.2l-1.22 1.21 2.5 2.5 1.21-1.22c.26-.26.26-.7 0-.95l-1.55-1.55c-.13-.13-.3-.19-.47-.19zm-2.41 2.12L8 13.5V16h2.5l7.37-7.38-2.5-2.5z'
  const STORAGE_KEY = 'festagWritingEnabled'
  const SITE_FILTER_KEY = 'festagSiteFilterEnabled'
  const LIVE_FEEDBACK_KEY = 'festagLiveFeedbackEnabled'
  const LIVE_VOICE_KEY = 'festagLiveVoiceEnabled'
  const LIVE_VOICE_AUTO_KEY = 'festagLiveVoiceAuto'
  const MIN_CHARS = 8
  const COMPOSE_HOSTS = [
    'mail.google.com', 'gmail.com', 'whatsapp.com', 'web.whatsapp.com',
    'outlook.live.com', 'outlook.office.com', 'office.com', 'linkedin.com',
    'twitter.com', 'x.com', 'slack.com', 'notion.so', 'docs.google.com',
    'facebook.com', 'instagram.com', 'teams.microsoft.com', 'discord.com',
  ]
  const EXCLUDED_TYPES = new Set([
    'password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button',
    'reset', 'image', 'range', 'color', 'date', 'datetime-local', 'month',
    'week', 'time', 'number', 'tel', 'url',
  ])
  const META_FIELD_RE = /empfänger|recipient|\bto\b|\bcc\b|\bbcc\b|kopie|blindkopie|betreff|subject|suchfeld|search input|\bsuche\b|\bsearch\b/i
  const CHAT_COMPOSE_RE = /type a message|nachricht eingeben|schreibe eine nachricht|write a message/i
  const EDITABLE_SELECTOR = '[contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable][role="textbox"]'
  const SIDEBAR_RE = /sidebar|properties|inspector|panel|layer|toolbar|nav|menu|popover|tooltip|modal|dialog|chrome-extension|festag-/i

  let enabled = true
  let siteFilter = false
  let liveFeedback = true
  let liveVoice = true
  let liveVoiceAuto = false
  let voiceBusy = false
  let lastVoiceKey = ''
  let voiceDebounceTimer = null
  let activeField = null
  let host = null
  let shadow = null
  let busy = false
  let pendingImproved = null
  let pendingOriginal = ''
  let pendingAction = 'clearer'
  let textSource = 'field' // 'field' | 'selection' | 'none'
  let selectionText = ''
  let selectionRange = null
  let bound = false

  chrome.storage.local.get(
    [STORAGE_KEY, SITE_FILTER_KEY, LIVE_FEEDBACK_KEY, LIVE_VOICE_KEY, LIVE_VOICE_AUTO_KEY],
    (data) => {
      enabled = data[STORAGE_KEY] !== false
      siteFilter = data[SITE_FILTER_KEY] === true
      liveFeedback = data[LIVE_FEEDBACK_KEY] !== false
      liveVoice = data[LIVE_VOICE_KEY] !== false
      liveVoiceAuto = data[LIVE_VOICE_AUTO_KEY] === true
      if (enabled && isAllowedSite()) bind()
    },
  )

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (STORAGE_KEY in changes) {
      enabled = changes[STORAGE_KEY].newValue !== false
      if (enabled && isAllowedSite()) bind()
      else teardown()
    }
    if (SITE_FILTER_KEY in changes) {
      siteFilter = changes[SITE_FILTER_KEY].newValue === true
      if (!isAllowedSite()) teardown()
      else if (enabled) bind()
    }
    if (LIVE_FEEDBACK_KEY in changes) {
      liveFeedback = changes[LIVE_FEEDBACK_KEY].newValue !== false
      if (!liveFeedback) stopVoice()
    }
    if (LIVE_VOICE_KEY in changes) {
      liveVoice = changes[LIVE_VOICE_KEY].newValue !== false
      if (!liveVoice) stopVoice()
    }
    if (LIVE_VOICE_AUTO_KEY in changes) {
      liveVoiceAuto = changes[LIVE_VOICE_AUTO_KEY].newValue === true
    }
  })

  function isAllowedSite() {
    if (!siteFilter) return true
    const h = location.hostname.replace(/^www\./, '')
    return COMPOSE_HOSTS.some((d) => h === d || h.endsWith('.' + d))
  }

  function fieldLabel(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('placeholder'),
      el.getAttribute('name'),
      el.getAttribute('id'),
      el.getAttribute('title'),
    ].filter(Boolean).join(' ')
  }

  function isInSidebarOrChrome(el) {
    if (!(el instanceof Element)) return false
    let node = el
    for (let i = 0; i < 12 && node; i++) {
      const role = node.getAttribute?.('role')
      if (role === 'navigation' || role === 'menubar' || role === 'toolbar' || role === 'search') return true
      const cls = `${node.className || ''} ${node.id || ''}`
      if (SIDEBAR_RE.test(cls)) return true
      if (node.tagName === 'ASIDE' || node.tagName === 'NAV' || node.tagName === 'HEADER') return true
      node = node.parentElement
    }
    return false
  }

  function isChatComposeField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (el.getAttribute('data-lexical-editor') === 'true') return true
    if (el.getAttribute('data-testid') === 'conversation-compose-box-input') return true
    const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim()
    if (CHAT_COMPOSE_RE.test(title)) return true
    if (el.getAttribute('role') === 'textbox' && el.closest('#main footer, footer [data-tab="10"], [data-tab="10"]')) return true
    const hostName = location.hostname
    if (hostName.includes('whatsapp') && el.getAttribute('role') === 'textbox' && el.closest('footer')) return true
    if ((hostName.includes('telegram') || hostName === 't.me') && el.getAttribute('role') === 'textbox') return true
    return false
  }

  function isLexicalEditor(el) {
    return el instanceof HTMLElement && el.getAttribute('data-lexical-editor') === 'true'
  }

  function isMetaComposeField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (isChatComposeField(el)) return false
    if (isInSidebarOrChrome(el)) return true
    if (META_FIELD_RE.test(fieldLabel(el))) return true
    if (el.getAttribute('role') === 'combobox') return true
    if (el.closest('[role="search"], [role="searchbox"]')) return true
    if (location.hostname.includes('figma.com')) return true
    if (location.hostname.includes('whatsapp')) {
      if (el.closest('[data-tab="3"]')) return true
      const label = fieldLabel(el).toLowerCase()
      if (/\bsearch\b|\bsuchen\b/.test(label) && !CHAT_COMPOSE_RE.test(label)) return true
    }
    const r = el.getBoundingClientRect()
    if (el.isContentEditable && r.height < 48 && !isChatComposeField(el)) return true
    if (el.isContentEditable && r.width < 160 && !isChatComposeField(el)) return true
    return false
  }

  function isContentEditableField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (!el.isContentEditable && el.getAttribute('contenteditable') !== 'plaintext-only') return false
    if (el.closest('festag-writing-assistant, festag-panel')) return false
    if (el.tagName === 'BODY' || el.tagName === 'HTML') return false
    if (isMetaComposeField(el)) return false
    const r = el.getBoundingClientRect()
    const minH = isChatComposeField(el) ? 28 : 44
    const minW = isChatComposeField(el) ? 100 : 180
    if (r.width < minW || r.height < minH) return false
    return true
  }

  function isWritableInput(el) {
    if (!(el instanceof HTMLTextAreaElement)) {
      if (!(el instanceof HTMLInputElement)) return false
      const type = (el.type || 'text').toLowerCase()
      if (EXCLUDED_TYPES.has(type)) return false
      if (type !== 'text' && type !== 'search' && type !== 'email') return false
    }
    if (el.disabled || el.readOnly) return false
    if (el.closest('festag-writing-assistant, festag-panel')) return false
    if (isMetaComposeField(el)) return false
    return true
  }

  function resolveField(target) {
    if (!(target instanceof Element)) return null
    if (isWritableInput(target)) return target
    let editable = target
    if (!(editable instanceof HTMLElement) || (!editable.isContentEditable && editable.getAttribute('contenteditable') !== 'plaintext-only')) {
      editable = target.closest(EDITABLE_SELECTOR)
    }
    if (editable instanceof HTMLElement && isContentEditableField(editable)) return editable
    return null
  }

  function fieldText(el) {
    if (!el) return ''
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'plaintext-only') {
      return (el.innerText || el.textContent || '')
        .replace(/\u200b/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }
    return (el.value || '').trim()
  }

  function currentSourceText() {
    if (textSource === 'selection') return selectionText
    if (activeField) return fieldText(activeField)
    return ''
  }

  function setLexicalFieldText(el, text) {
    el.focus()
    try { document.execCommand('selectAll', false, null) } catch { /* noop */ }
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    el.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }))
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: text }))
  }

  function setFieldText(el, text) {
    el.focus()
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'plaintext-only') {
      if (isLexicalEditor(el)) {
        setLexicalFieldText(el, text)
        return
      }
      try {
        const sel = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(el)
        sel?.removeAllRanges()
        sel?.addRange(range)
        const ok = document.execCommand('insertText', false, text)
        if (!ok) {
          el.innerHTML = ''
          el.textContent = text
        }
      } catch {
        el.textContent = text
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
      return
    }
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc?.set) desc.set.call(el, text)
    else el.value = text
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function applyToSelection(text) {
    if (!selectionRange) return false
    try {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(selectionRange)
      document.execCommand('insertText', false, text)
      return true
    } catch {
      return false
    }
  }

  function mountUi() {
    if (host) return
    host = document.createElement('festag-writing-assistant')
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;'
    shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>${CSS}</style>
      <button type="button" class="fwa-dock" aria-label="Tagro Schreibhilfe" title="Tagro Schreibhilfe">
        <span class="fwa-orb" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="${COMPOSE_PATH}"/></svg>
        </span>
      </button>
      <button type="button" class="fwa-chip" hidden aria-label="Tagro Schreibhilfe" title="Tagro Schreibhilfe">
        <span class="fwa-orb" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="${COMPOSE_PATH}"/></svg>
        </span>
      </button>
      <div class="fwa-sel" hidden role="toolbar" aria-label="Tagro für Markierung">
        <button type="button" class="fwa-sel-listen" hidden aria-label="Tagro anhören">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm-7-3h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h-2v-3.08A7 7 0 0 1 5 11z"/></svg>
          <span>Hören</span>
        </button>
        <button type="button" class="fwa-sel-btn" data-action="clearer">Klarer</button>
        <button type="button" class="fwa-sel-btn" data-action="professional">Professioneller</button>
        <button type="button" class="fwa-sel-btn" data-action="shorter">Kürzer</button>
        <button type="button" class="fwa-sel-more" aria-label="Mehr Optionen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="${COMPOSE_PATH}"/></svg>
        </button>
      </div>
      <div class="fwa-pop" hidden role="dialog" aria-label="Tagro Schreibhilfe" aria-modal="true">
        <div class="fwa-pop-inner">
          <div class="fwa-pop-head">
            <div class="fwa-pop-brand">
              <span class="fwa-pop-mark" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="${COMPOSE_PATH}"/></svg>
              </span>
              <div class="fwa-pop-titles">
                <span class="fwa-kicker">Festag Tagro</span>
                <strong class="fwa-title">Text verbessern</strong>
              </div>
            </div>
            <button type="button" class="fwa-close" aria-label="Schließen">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2.2 2.2l7.6 7.6M9.8 2.2L2.2 9.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="fwa-actions" role="group" aria-label="Stil">
            <button type="button" data-action="clearer">Klarer</button>
            <button type="button" data-action="professional">Professioneller</button>
            <button type="button" data-action="shorter">Kürzer</button>
          </div>
          <p class="fwa-hint" hidden></p>
          <div class="fwa-loading" hidden>
            <span class="fwa-spinner" aria-hidden></span>
            <span>Tagro formuliert…</span>
          </div>
          <div class="fwa-preview" hidden>
            <p class="fwa-preview-label">Vorschau</p>
            <div class="fwa-preview-text"></div>
            <div class="fwa-preview-foot">
              <button type="button" class="fwa-secondary fwa-cancel">Abbrechen</button>
              <button type="button" class="fwa-primary fwa-apply">Übernehmen</button>
            </div>
          </div>
        </div>
      </div>
    `
    document.documentElement.appendChild(host)

    shadow.querySelector('.fwa-dock').addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      textSource = activeField ? 'field' : (selectionText ? 'selection' : 'none')
      openPop()
    })
    shadow.querySelector('.fwa-chip').addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      textSource = 'field'
      openPop()
    })
    shadow.querySelector('.fwa-sel-more').addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      textSource = 'selection'
      openPop()
    })
    shadow.querySelector('.fwa-sel-listen')?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (selectionText) fetchAndSpeakLiveFeedback(selectionText, true)
    })
    shadow.querySelectorAll('.fwa-sel-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        textSource = 'selection'
        runAction(btn.dataset.action)
      })
    })
    shadow.querySelector('.fwa-close').addEventListener('click', closePop)
    shadow.querySelector('.fwa-cancel').addEventListener('click', closePop)
    shadow.querySelector('.fwa-apply').addEventListener('click', applyPreview)
    shadow.querySelectorAll('.fwa-actions button').forEach((btn) => {
      btn.addEventListener('click', () => runAction(btn.dataset.action))
    })
    shadow.addEventListener('mousedown', (e) => e.stopPropagation())
  }

  function $(sel) { return shadow?.querySelector(sel) }

  function positionDock() {
    const dock = $('.fwa-dock')
    if (!dock) return
    dock.hidden = !!activeField || !enabled
  }

  function positionChip() {
    const chip = $('.fwa-chip')
    if (!chip || !activeField) {
      if (chip) chip.hidden = true
      positionDock()
      return
    }
    const r = activeField.getBoundingClientRect()
    const chipSize = Math.min(40, Math.max(32, Math.round(r.height * 0.55)))
    chip.style.setProperty('--fwa-chip-size', `${chipSize}px`)
    const icon = chipSize >= 38 ? 16 : 14
    chip.querySelector('svg')?.setAttribute('width', String(icon))
    chip.querySelector('svg')?.setAttribute('height', String(icon))

    let left = r.right - chipSize - 8
    let top = r.top - chipSize - 10
    if (top < 12) top = r.bottom + 10
    if (left + chipSize > window.innerWidth - 12) left = window.innerWidth - chipSize - 12
    if (left < 12) left = 12
    chip.style.left = `${left}px`
    chip.style.top = `${top}px`
    chip.hidden = false
    positionDock()

    const pop = $('.fwa-pop')
    if (pop && !pop.hidden) positionPop(left, top, chipSize, r)
  }

  function positionSelectionBar(rect) {
    const bar = $('.fwa-sel')
    if (!bar || bar.hidden) return
    const barW = Math.min(360, window.innerWidth - 24)
    const barH = 40
    let left = rect.left + rect.width / 2 - barW / 2
    let top = rect.top - barH - 10
    if (top < 12) top = rect.bottom + 10
    left = Math.max(12, Math.min(left, window.innerWidth - barW - 12))
    bar.style.left = `${left}px`
    bar.style.top = `${top}px`
  }

  function positionPop(anchorLeft, anchorTop, anchorH, fieldRect) {
    const pop = $('.fwa-pop')
    if (!pop) return
    const popW = Math.min(340, window.innerWidth - 24)
    const popH = 320
    pop.style.width = `${popW}px`
    const narrow = window.innerWidth <= 768
    let popLeft = narrow ? 12 : anchorLeft - popW + 44
    let popTop = narrow
      ? Math.min(window.innerHeight - popH - 16, (fieldRect?.bottom || anchorTop) + 12)
      : anchorTop + anchorH + 12
    if (!narrow && popLeft < 12) popLeft = Math.min(fieldRect?.left || 12, window.innerWidth - popW - 12)
    if (popTop + popH > window.innerHeight - 12) {
      popTop = Math.max(12, anchorTop - popH - 12)
    }
    pop.style.left = `${Math.max(12, popLeft)}px`
    pop.style.top = `${Math.max(12, popTop)}px`
  }

  function positionPopFromDock() {
    const dock = $('.fwa-dock')
    const pop = $('.fwa-pop')
    if (!dock || !pop) return
    const popW = Math.min(340, window.innerWidth - 24)
    const popH = 320
    pop.style.width = `${popW}px`
    const margin = 20
    const dockRect = { left: window.innerWidth - 56 - margin, top: window.innerHeight - 56 - margin, width: 56, height: 56 }
    positionPop(dockRect.left, dockRect.top, dockRect.height, { bottom: dockRect.top, left: dockRect.left })
  }

  function setHint(msg) {
    const el = $('.fwa-hint')
    if (!el) return
    el.textContent = msg || ''
    el.hidden = !msg
  }

  function refreshPopState() {
    if ($('.fwa-pop')?.hidden) return
    const text = currentSourceText()
    const len = text.length
    if (textSource === 'none' || len === 0) {
      setHint('Text markieren oder ein Eingabefeld fokussieren, dann Tagro starten.')
      shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = true })
      return
    }
    if (len < MIN_CHARS) {
      setHint(`Noch ${MIN_CHARS - len} Zeichen, dann Tagro loslegen.`)
      shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = true })
    } else {
      setHint('')
      if (!busy) shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = false })
    }
  }

  function openPop() {
    mountUi()
    $('.fwa-pop').hidden = false
    $('.fwa-loading').hidden = true
    $('.fwa-preview').hidden = true
    host.style.pointerEvents = 'auto'
    refreshPopState()
    if (activeField) positionChip()
    else if (selectionText && selectionRange) {
      const r = selectionRange.getBoundingClientRect()
      positionPop(r.left, r.top, 0, r)
    } else {
      positionPopFromDock()
    }
  }

  function closePop() {
    if (!shadow) return
    $('.fwa-pop').hidden = true
    $('.fwa-preview').hidden = true
    $('.fwa-loading').hidden = true
    pendingImproved = null
    pendingOriginal = ''
    busy = false
    setHint('')
    shadow.querySelectorAll('.fwa-actions button').forEach((b) => {
      b.disabled = false
      b.classList.remove('active')
    })
    if (!activeField && !selectionText) host.style.pointerEvents = 'none'
  }

  function showPreview(text, action) {
    $('.fwa-preview-text').textContent = text
    $('.fwa-preview').hidden = false
    $('.fwa-loading').hidden = true
    pendingImproved = text
    pendingOriginal = currentSourceText()
    pendingAction = action || pendingAction
    if (activeField) positionChip()
  }

  function applyPreview() {
    if (!pendingImproved) return
    const original = pendingOriginal || currentSourceText()
    const improved = pendingImproved
    const action = pendingAction

    if (textSource === 'selection') {
      if (!applyToSelection(improved)) {
        toast('Markierung konnte nicht ersetzt werden')
        return
      }
    } else if (activeField) {
      setFieldText(activeField, improved)
    } else {
      return
    }

    chrome.runtime.sendMessage({
      type: 'recordWritingApply',
      payload: {
        original,
        improved,
        action,
        pageUrl: location.href,
        pageTitle: document.title || null,
      },
    }, () => void chrome.runtime.lastError)
    closePop()
    clearSelectionUi()
    toast('Übernommen — Tagro merkt sich deinen Stil')
  }

  function runAction(action) {
    if (busy) return
    const text = currentSourceText()
    if (text.length < MIN_CHARS) {
      if (!$('.fwa-pop')?.hidden) refreshPopState()
      else toast(`Mindestens ${MIN_CHARS} Zeichen markieren oder eingeben`)
      return
    }
    if ($('.fwa-pop')?.hidden) openPop()
    busy = true
    setHint('')
    $('.fwa-loading').hidden = false
    $('.fwa-preview').hidden = true
    shadow.querySelectorAll('.fwa-actions button, .fwa-sel-btn').forEach((b) => {
      b.disabled = true
      if (b.dataset.action) b.classList.toggle('active', b.dataset.action === action)
    })

    chrome.runtime.sendMessage({
      type: 'improveText',
      payload: { text, action, pageUrl: location.href, pageTitle: document.title || null },
    }, (res) => {
      busy = false
      shadow.querySelectorAll('.fwa-actions button, .fwa-sel-btn').forEach((b) => { b.disabled = false })
      if (chrome.runtime.lastError || !res || !res.ok || !res.improved) {
        $('.fwa-loading').hidden = true
        const msg = res?.error === 'unauthorized'
          ? 'Bitte bei festag.app anmelden und Popup neu öffnen.'
          : 'Tagro gerade nicht erreichbar — kurz warten und erneut versuchen.'
        if (!$('.fwa-pop')?.hidden) setHint(msg)
        else toast(msg)
        return
      }
      showPreview(res.improved, action)
    })
  }

  let toastTimer = null
  function toast(msg) {
    let t = shadow.querySelector('.fwa-toast')
    if (!t) {
      t = document.createElement('div')
      t.className = 'fwa-toast'
      shadow.appendChild(t)
    }
    t.textContent = msg
    t.classList.add('on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => t.classList.remove('on'), 2400)
  }

  function activateField(field) {
    if (!enabled || !field) return
    mountUi()
    activeField = field
    textSource = 'field'
    closePop()
    positionChip()
    host.style.pointerEvents = 'auto'
  }

  function clearSelectionUi() {
    selectionText = ''
    selectionRange = null
    lastVoiceKey = ''
    clearTimeout(voiceDebounceTimer)
    stopVoice()
    const bar = $('.fwa-sel')
    if (bar) bar.hidden = true
  }

  function pickGermanVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    const voices = window.speechSynthesis.getVoices()
    return [...voices]
      .filter((v) => v.lang.toLowerCase().startsWith('de'))
      .sort((a, b) => Number(b.localService) - Number(a.localService))[0] ?? null
  }

  function stopVoice() {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
    voiceBusy = false
    $('.fwa-sel-listen')?.classList.remove('is-speaking')
  }

  function speakCommentary(text) {
    if (!text?.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    stopVoice()
    try { window.speechSynthesis.getVoices() } catch { /* noop */ }
    const u = new SpeechSynthesisUtterance(text.trim().slice(0, 480))
    u.lang = 'de-DE'
    u.rate = 1.03
    u.pitch = 1
    const voice = pickGermanVoice()
    if (voice) u.voice = voice
    const btn = $('.fwa-sel-listen')
    u.onstart = () => btn?.classList.add('is-speaking')
    u.onend = () => { voiceBusy = false; btn?.classList.remove('is-speaking') }
    u.onerror = () => { voiceBusy = false; btn?.classList.remove('is-speaking') }
    voiceBusy = true
    window.speechSynthesis.speak(u)
  }

  function fetchAndSpeakLiveFeedback(text, force = false) {
    if (!liveFeedback || !liveVoice) return
    if (voiceBusy && !force) return
    const trimmed = text.trim()
    if (trimmed.length < MIN_CHARS) return
    const key = trimmed.slice(0, 160)
    if (!force && key === lastVoiceKey) return
    lastVoiceKey = key

    const listenBtn = $('.fwa-sel-listen')
    if (listenBtn) listenBtn.disabled = true

    chrome.runtime.sendMessage({
      type: 'improveText',
      payload: {
        text: trimmed,
        action: 'feedback',
        pageUrl: location.href,
        pageTitle: document.title || null,
      },
    }, (res) => {
      if (listenBtn) listenBtn.disabled = false
      if (chrome.runtime.lastError || !res?.ok || !res.improved) {
        if (force) toast('Tagro-Stimme gerade nicht verfügbar')
        return
      }
      speakCommentary(res.improved)
    })
  }

  function updateSelectionUi() {
    if (!enabled || !shadow) return
    if (host && shadow && !$('.fwa-pop')?.hidden) return

    const sel = window.getSelection()
    const text = sel?.toString().replace(/\s+/g, ' ').trim() || ''
    if (!text || text.length < 3 || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      clearSelectionUi()
      return
    }

    const anchor = sel.anchorNode
    const anchorEl = anchor instanceof Element ? anchor : anchor?.parentElement
    if (host?.contains(anchorEl)) return
    if (resolveField(anchorEl)) return

    try {
      selectionRange = sel.getRangeAt(0).cloneRange()
    } catch {
      clearSelectionUi()
      return
    }
    selectionText = text
    textSource = 'selection'

    const bar = $('.fwa-sel')
    if (!bar) return
    bar.hidden = false
    host.style.pointerEvents = 'auto'
    positionSelectionBar(selectionRange.getBoundingClientRect())

    const listenBtn = $('.fwa-sel-listen')
    const showListen = liveFeedback && liveVoice && !liveVoiceAuto
    if (listenBtn) {
      listenBtn.hidden = !showListen
      listenBtn.disabled = text.length < MIN_CHARS
    }

    if (liveFeedback && liveVoice && liveVoiceAuto && text.length >= MIN_CHARS) {
      clearTimeout(voiceDebounceTimer)
      voiceDebounceTimer = window.setTimeout(() => {
        fetchAndSpeakLiveFeedback(text)
      }, 680)
    }
  }

  function onFocusIn(e) {
    const t = resolveField(e.target)
    if (!t) return
    clearSelectionUi()
    activateField(t)
  }

  function onFocusOut(e) {
    if (!activeField) return
    if (host && e.composedPath().includes(host)) return
    window.setTimeout(() => {
      const next = resolveField(document.activeElement)
      if (next === activeField) return
      if (host && shadow && !$('.fwa-pop')?.hidden) return
      activeField = null
      positionChip()
      if (!selectionText) host.style.pointerEvents = 'none'
    }, 140)
  }

  function onScrollOrResize() {
    if (activeField) positionChip()
    if (selectionText && selectionRange) {
      try { positionSelectionBar(selectionRange.getBoundingClientRect()) } catch { /* noop */ }
    }
  }

  function onPointerDown(e) {
    if (!enabled) return
    if (host && e.composedPath().includes(host)) return
    const t = resolveField(e.target)
    if (!t) return
    window.setTimeout(() => {
      if (resolveField(document.activeElement) === t || t.contains(document.activeElement)) {
        activateField(t)
      }
    }, 0)
  }

  let selectionTimer = null
  function onSelectionChange() {
    clearTimeout(selectionTimer)
    selectionTimer = setTimeout(updateSelectionUi, 120)
  }

  function bind() {
    if (bound || !isAllowedSite()) return
    bound = true
    mountUi()
    positionDock()
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('input', onInput, true)
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('mouseup', onSelectionChange)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }

  function onInput(e) {
    if (!enabled) return
    const t = resolveField(e.target)
    if (t === activeField) {
      positionChip()
      refreshPopState()
    }
  }

  function teardown() {
    activeField = null
    clearSelectionUi()
    closePop()
    if ($('.fwa-chip')) $('.fwa-chip').hidden = true
    if ($('.fwa-dock')) $('.fwa-dock').hidden = true
    if (host) host.style.pointerEvents = 'none'
  }

  const CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      --fwa-r: 24px;
      --fwa-r-sm: 14px;
      --fwa-surface: #ffffff;
      --fwa-surface-2: #f5f5f7;
      --fwa-surface-hover: #ebebed;
      --fwa-text: #1e1e20;
      --fwa-muted: #6e717e;
      --fwa-border: rgba(0, 0, 0, 0.07);
      --fwa-accent: #1e1e20;
      --fwa-accent-hover: #000000;
      --fwa-cta: #5b647d;
      --fwa-dock-size: 56px;
      --fwa-chip-size: 36px;
      --fwa-shadow-orb:
        0 1px 1px rgba(0, 0, 0, 0.04),
        0 4px 12px rgba(15, 23, 42, 0.1),
        0 12px 28px rgba(15, 23, 42, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.95);
      --fwa-shadow-pop:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 8px 32px rgba(15, 23, 42, 0.14);
    }
    *, *::before, *::after { box-sizing: border-box; }
    button {
      font: 500 13px/1.2 -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      letter-spacing: -0.01em;
      cursor: pointer; border: 0; margin: 0; color: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .fwa-dock, .fwa-chip {
      position: fixed;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0;
      background: linear-gradient(180deg, #ffffff 0%, #f8f8fa 100%);
      color: var(--fwa-accent);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 50%;
      box-shadow: var(--fwa-shadow-orb);
      pointer-events: auto;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
    }
    .fwa-dock {
      width: var(--fwa-dock-size); height: var(--fwa-dock-size);
      right: max(20px, env(safe-area-inset-right, 0px));
      bottom: max(20px, env(safe-area-inset-bottom, 0px));
    }
    .fwa-chip {
      width: var(--fwa-chip-size); height: var(--fwa-chip-size);
    }
    .fwa-dock:hover, .fwa-chip:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow:
        0 2px 4px rgba(15, 23, 42, 0.06),
        0 8px 20px rgba(15, 23, 42, 0.12),
        0 16px 40px rgba(15, 23, 42, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 1);
    }
    .fwa-dock:active, .fwa-chip:active { transform: translateY(0) scale(0.98); }
    .fwa-orb { display: inline-flex; align-items: center; justify-content: center; }
    .fwa-sel {
      position: fixed;
      display: flex; align-items: center; gap: 4px;
      padding: 4px;
      background: var(--fwa-surface);
      border: 1px solid var(--fwa-border);
      border-radius: 999px;
      box-shadow: var(--fwa-shadow-pop);
      pointer-events: auto;
      animation: fwa-pop-in 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .fwa-sel-btn {
      height: 32px; padding: 0 12px;
      background: var(--fwa-surface-2); color: var(--fwa-text);
      border-radius: 999px; font-size: 12px; font-weight: 500;
      transition: background 0.15s ease;
    }
    .fwa-sel-btn:hover:not(:disabled) { background: var(--fwa-surface-hover); }
    .fwa-sel-btn.active { background: var(--fwa-accent); color: #fff; }
    .fwa-sel-btn:disabled { opacity: 0.45; }
    .fwa-sel-listen {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 11px;
      background: var(--fwa-cta);
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
      transition: opacity 0.15s ease, transform 0.12s ease;
    }
    .fwa-sel-listen:hover:not(:disabled) { opacity: 0.92; }
    .fwa-sel-listen:disabled { opacity: 0.45; cursor: default; }
    .fwa-sel-listen.is-speaking {
      animation: fwa-pulse 1s ease-in-out infinite;
    }
    @keyframes fwa-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.04); }
    }
    .fwa-sel-more {
      width: 32px; height: 32px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--fwa-accent); color: #fff;
    }
    .fwa-pop {
      position: fixed;
      width: min(340px, calc(100vw - 24px));
      pointer-events: auto;
      animation: fwa-pop-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    @keyframes fwa-pop-in {
      from { opacity: 0; transform: translateY(6px) scale(0.97); }
      to { opacity: 1; transform: none; }
    }
    .fwa-pop-inner {
      background: var(--fwa-surface);
      color: var(--fwa-text);
      border: 1px solid var(--fwa-border);
      border-radius: var(--fwa-r);
      box-shadow: var(--fwa-shadow-pop);
      padding: 18px 18px 16px;
      overflow: hidden;
    }
    .fwa-pop-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 12px; margin-bottom: 14px;
    }
    .fwa-pop-brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .fwa-pop-mark {
      width: 36px; height: 36px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--fwa-surface-2); color: var(--fwa-text);
      flex-shrink: 0;
    }
    .fwa-kicker {
      display: block; font-size: 11px; font-weight: 600;
      color: var(--fwa-muted); margin-bottom: 1px;
    }
    .fwa-title {
      display: block; font-size: 16px; font-weight: 600;
      letter-spacing: -0.022em; line-height: 1.2;
    }
    .fwa-close {
      width: 32px; height: 32px; min-width: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--fwa-surface-2); color: var(--fwa-muted);
      border-radius: 50%; flex-shrink: 0;
    }
    .fwa-close:hover { background: var(--fwa-surface-hover); color: var(--fwa-text); }
    .fwa-actions {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px; margin-bottom: 4px;
    }
    .fwa-actions button {
      min-width: 0; height: 40px; padding: 0 8px;
      background: var(--fwa-surface-2); color: var(--fwa-text);
      border-radius: var(--fwa-r-sm); font-size: 12.5px; font-weight: 500;
    }
    .fwa-actions button:hover:not(:disabled) { background: var(--fwa-surface-hover); }
    .fwa-actions button.active { background: var(--fwa-accent); color: #fff; }
    .fwa-actions button:disabled { opacity: 0.4; cursor: default; }
    .fwa-hint {
      margin: 8px 0 0; padding: 10px 12px;
      font-size: 12px; line-height: 1.45; color: var(--fwa-muted);
      background: var(--fwa-surface-2); border-radius: var(--fwa-r-sm);
    }
    .fwa-loading {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: var(--fwa-muted); padding: 14px 2px 6px;
    }
    .fwa-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #e5e5ea; border-top-color: var(--fwa-accent);
      animation: fwa-spin 0.75s linear infinite;
    }
    @keyframes fwa-spin { to { transform: rotate(360deg); } }
    .fwa-preview-label {
      margin: 12px 0 8px; font-size: 11px; font-weight: 600;
      color: var(--fwa-muted); letter-spacing: 0.03em; text-transform: uppercase;
    }
    .fwa-preview-text {
      margin: 0 0 14px; padding: 14px;
      background: var(--fwa-surface-2); border: 1px solid var(--fwa-border);
      border-radius: var(--fwa-r-sm); font-size: 14px; line-height: 1.55;
      max-height: 168px; overflow-y: auto; white-space: pre-wrap;
    }
    .fwa-preview-foot { display: grid; grid-template-columns: 1fr 1.2fr; gap: 8px; }
    .fwa-secondary {
      height: 44px; background: var(--fwa-surface-2); color: var(--fwa-text);
      border-radius: var(--fwa-r-sm); font-size: 13px; font-weight: 500;
    }
    .fwa-primary {
      height: 44px; background: var(--fwa-cta); color: #fff;
      border-radius: var(--fwa-r-sm); font-size: 13px; font-weight: 600;
    }
    .fwa-primary:hover { background: #4f586d; }
    .fwa-toast {
      position: fixed; left: 50%; bottom: max(88px, env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%) translateY(10px);
      background: rgba(30, 30, 32, 0.92); color: #fff;
      padding: 11px 18px; border-radius: 999px; font-size: 13px; font-weight: 500;
      opacity: 0; pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .fwa-toast.on { opacity: 1; transform: translateX(-50%) translateY(0); }
    @media (max-width: 380px) {
      .fwa-actions { grid-template-columns: 1fr; }
      .fwa-preview-foot { grid-template-columns: 1fr; }
      .fwa-sel { flex-wrap: wrap; max-width: calc(100vw - 24px); border-radius: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fwa-pop, .fwa-dock, .fwa-chip, .fwa-sel, .fwa-spinner { animation: none !important; transition: none !important; }
    }
  `
})()
