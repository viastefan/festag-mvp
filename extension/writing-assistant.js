/**
 * Festag writing assistant — Tagro chip on focused text fields.
 * Light Festag design, Gmail-aware field detection, contenteditable support.
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
  const EXCLUDED_TYPES = new Set([
    'password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button',
    'reset', 'image', 'range', 'color', 'date', 'datetime-local', 'month',
    'week', 'time', 'number', 'tel', 'url',
  ])
  const META_FIELD_RE = /empfänger|recipient|\bto\b|\bcc\b|\bbcc\b|kopie|blindkopie|betreff|subject|suchfeld|search input/i
  const CHAT_COMPOSE_RE = /type a message|nachricht eingeben|schreibe eine nachricht|write a message/i
  const EDITABLE_SELECTOR = '[contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable][role="textbox"]'

  let enabled = true
  let activeField = null
  let host = null
  let shadow = null
  let busy = false
  let pendingImproved = null
  let pendingOriginal = ''
  let pendingAction = 'clearer'

  chrome.storage.local.get(STORAGE_KEY, (data) => {
    enabled = data[STORAGE_KEY] !== false
    if (enabled) bind()
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEY in changes)) return
    enabled = changes[STORAGE_KEY].newValue !== false
    if (enabled) bind()
    else teardown()
  })

  function readDarkPreference() {
    // Schreibhilfe bleibt bewusst im hellen Festag-Look — vertrauenswürdig auf jeder Seite.
    if (host) host.classList.remove('fwa-dark')
  }

  function fieldLabel(el) {
    return [
      el.getAttribute('aria-label'),
      el.getAttribute('placeholder'),
      el.getAttribute('name'),
      el.getAttribute('id'),
    ].filter(Boolean).join(' ')
  }

  function isChatComposeField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (el.getAttribute('data-lexical-editor') === 'true') return true
    if (el.getAttribute('data-testid') === 'conversation-compose-box-input') return true
    const title = (el.getAttribute('title') || el.getAttribute('aria-label') || '').trim()
    if (CHAT_COMPOSE_RE.test(title)) return true
    if (el.getAttribute('role') === 'textbox' && el.closest('#main footer, footer [data-tab="10"], [data-tab="10"]')) return true
    const host = location.hostname
    if (host.includes('whatsapp') && el.getAttribute('role') === 'textbox' && el.closest('footer')) return true
    if ((host.includes('telegram') || host === 't.me') && el.getAttribute('role') === 'textbox') return true
    return false
  }

  function isLexicalEditor(el) {
    return el instanceof HTMLElement && el.getAttribute('data-lexical-editor') === 'true'
  }

  function isMetaComposeField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (isChatComposeField(el)) return false
    if (META_FIELD_RE.test(fieldLabel(el))) return true
    if (el.getAttribute('role') === 'combobox') return true
    if (el.closest('[role="search"], [role="searchbox"]')) return true
    if (location.hostname.includes('whatsapp')) {
      if (el.closest('[data-tab="3"]')) return true
      const label = fieldLabel(el).toLowerCase()
      if (/\bsearch\b|\bsuchen\b/.test(label) && !CHAT_COMPOSE_RE.test(label)) return true
    }
    const r = el.getBoundingClientRect()
    if (el.isContentEditable && r.height < 52) return true
    return false
  }

  function isContentEditableField(el) {
    if (!(el instanceof HTMLElement)) return false
    if (!el.isContentEditable && el.getAttribute('contenteditable') !== 'plaintext-only') return false
    if (el.closest('festag-writing-assistant, festag-panel')) return false
    if (el.tagName === 'BODY' || el.tagName === 'HTML') return false
    if (isMetaComposeField(el)) return false
    const r = el.getBoundingClientRect()
    const minH = isChatComposeField(el) ? 24 : 40
    const minW = isChatComposeField(el) ? 80 : 120
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

  function setLexicalFieldText(el, text) {
    el.focus()
    try {
      document.execCommand('selectAll', false, null)
    } catch { /* noop */ }
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

  function mountUi() {
    if (host) return
    host = document.createElement('festag-writing-assistant')
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;pointer-events:none;'
    shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `
      <style>${CSS}</style>
      <button type="button" class="fwa-chip" hidden aria-label="Tagro Schreibhilfe" title="Tagro Schreibhilfe">
        <span class="fwa-orb" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="${COMPOSE_PATH}"/></svg>
        </span>
      </button>
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
    const root = document.documentElement
    ;(root || document.body).appendChild(host)
    readDarkPreference()
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readDarkPreference)
    } catch { /* noop */ }

    shadow.querySelector('.fwa-chip').addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      openPop()
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

  function positionChip() {
    if (!activeField || !host) return
    const chip = $('.fwa-chip')
    const r = activeField.getBoundingClientRect()
    const chipW = 44
    const chipH = 44
    let left = r.right - chipW - 6
    let top = r.top - chipH - 8
    if (top < 8) top = r.bottom + 8
    if (left + chipW > window.innerWidth - 8) left = window.innerWidth - chipW - 8
    if (left < 8) left = 8
    chip.style.left = `${left}px`
    chip.style.top = `${top}px`
    chip.hidden = false

    const pop = $('.fwa-pop')
    if (pop && !pop.hidden) positionPop(left, top, chipH, r)
  }

  function positionPop(chipLeft, chipTop, chipH, fieldRect) {
    const pop = $('.fwa-pop')
    if (!pop) return
    const popW = Math.min(320, window.innerWidth - 20)
    const popH = 300
    const narrow = window.innerWidth <= 768
    let popLeft = narrow ? 8 : chipLeft - popW + 36
    let popTop = narrow
      ? Math.min(window.innerHeight - popH - 16, fieldRect.bottom + 10)
      : chipTop + chipH + 10
    if (!narrow && popLeft < 8) popLeft = Math.min(fieldRect.left, window.innerWidth - popW - 8)
    if (popTop + popH > window.innerHeight - 8) {
      popTop = Math.max(8, chipTop - popH - 8)
    }
    pop.style.left = `${Math.max(8, popLeft)}px`
    pop.style.top = `${Math.max(8, popTop)}px`
  }

  function setHint(msg) {
    const el = $('.fwa-hint')
    if (!el) return
    el.textContent = msg || ''
    el.hidden = !msg
  }

  function refreshPopState() {
    if (!activeField || $('.fwa-pop')?.hidden) return
    const len = fieldText(activeField).length
    if (len < MIN_CHARS) {
      setHint(`Noch ${MIN_CHARS - len} Zeichen, dann Tagro loslegen.`)
      shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = true })
    } else {
      setHint('')
      if (!busy) shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = false })
    }
  }

  function openPop() {
    if (!activeField) return
    $('.fwa-pop').hidden = false
    $('.fwa-loading').hidden = true
    $('.fwa-preview').hidden = true
    refreshPopState()
    positionChip()
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
  }

  function showPreview(text, action) {
    $('.fwa-preview-text').textContent = text
    $('.fwa-preview').hidden = false
    $('.fwa-loading').hidden = true
    pendingImproved = text
    pendingOriginal = fieldText(activeField)
    pendingAction = action || pendingAction
    positionChip()
  }

  function applyPreview() {
    if (!activeField || !pendingImproved) return
    const original = pendingOriginal || fieldText(activeField)
    const improved = pendingImproved
    const action = pendingAction
    setFieldText(activeField, improved)
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
    toast('Übernommen — Tagro merkt sich deinen Stil')
  }

  function runAction(action) {
    if (!activeField || busy) return
    const text = fieldText(activeField)
    if (text.length < MIN_CHARS) {
      refreshPopState()
      return
    }
    busy = true
    setHint('')
    $('.fwa-loading').hidden = false
    $('.fwa-preview').hidden = true
    shadow.querySelectorAll('.fwa-actions button').forEach((b) => {
      b.disabled = true
      b.classList.toggle('active', b.dataset.action === action)
    })

    chrome.runtime.sendMessage({
      type: 'improveText',
      payload: { text, action, pageUrl: location.href, pageTitle: document.title || null },
    }, (res) => {
      busy = false
      shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = false })
      if (chrome.runtime.lastError || !res || !res.ok || !res.improved) {
        $('.fwa-loading').hidden = true
        setHint(res?.error === 'unauthorized'
          ? 'Bitte bei festag.app anmelden und Popup neu öffnen.'
          : 'Tagro gerade nicht erreichbar — kurz warten und erneut versuchen.')
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
    toastTimer = setTimeout(() => t.classList.remove('on'), 2200)
  }

  function activateField(field) {
    if (!enabled || !field) return
    mountUi()
    activeField = field
    closePop()
    positionChip()
    host.style.pointerEvents = 'auto'
  }

  function onFocusIn(e) {
    const t = resolveField(e.target)
    if (!t) return
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
      if ($('.fwa-chip')) $('.fwa-chip').hidden = true
      closePop()
      if (host) host.style.pointerEvents = 'none'
    }, 140)
  }

  function onScrollOrResize() {
    if (activeField) positionChip()
  }

  function onPointerDown(e) {
    if (!enabled) return
    const t = resolveField(e.target)
    if (!t) return
    window.setTimeout(() => {
      if (resolveField(document.activeElement) === t || t.contains(document.activeElement)) {
        activateField(t)
      }
    }, 0)
  }

  let bound = false
  function bind() {
    if (bound) return
    bound = true
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('input', onInput, true)
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
    closePop()
    if ($('.fwa-chip')) $('.fwa-chip').hidden = true
    if (host) host.style.pointerEvents = 'none'
  }

  const CSS = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      --fwa-r: 24px;
      --fwa-r-sm: 14px;
      --fwa-canvas: #f5f5f7;
      --fwa-surface: #ffffff;
      --fwa-surface-2: #f5f5f7;
      --fwa-surface-hover: #ebebed;
      --fwa-text: #1d1d1f;
      --fwa-muted: #86868b;
      --fwa-border: rgba(0, 0, 0, 0.07);
      --fwa-accent: #1d1d1f;
      --fwa-accent-hover: #000000;
      --fwa-orb-size: 44px;
      --fwa-shadow-pop:
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 2px 8px rgba(0, 0, 0, 0.04),
        0 24px 64px -16px rgba(15, 23, 42, 0.22);
      --fwa-shadow-orb:
        0 1px 2px rgba(15, 23, 42, 0.06),
        0 8px 24px rgba(15, 23, 42, 0.12);
    }
    *, *::before, *::after { box-sizing: border-box; }
    button {
      font: 500 13px/1.2 -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      letter-spacing: -0.01em;
      cursor: pointer; border: 0; margin: 0; color: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .fwa-chip {
      position: fixed;
      display: inline-flex; align-items: center; justify-content: center;
      width: var(--fwa-orb-size); height: var(--fwa-orb-size); padding: 0;
      background: var(--fwa-surface);
      color: var(--fwa-accent);
      border: 1px solid var(--fwa-border);
      border-radius: 50%;
      box-shadow: var(--fwa-shadow-orb);
      pointer-events: auto;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
    }
    .fwa-chip:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow:
        0 2px 4px rgba(15, 23, 42, 0.06),
        0 12px 32px rgba(15, 23, 42, 0.16);
    }
    .fwa-chip:active { transform: translateY(0) scale(0.98); }
    .fwa-orb { display: inline-flex; align-items: center; justify-content: center; }
    .fwa-pop {
      position: fixed;
      width: min(320px, calc(100vw - 20px));
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
    .fwa-pop-titles { min-width: 0; }
    .fwa-kicker {
      display: block;
      font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
      color: var(--fwa-muted); margin-bottom: 1px;
    }
    .fwa-title {
      display: block;
      font-size: 16px; font-weight: 600; letter-spacing: -0.022em; line-height: 1.2;
    }
    .fwa-close {
      width: 32px; height: 32px; min-width: 32px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--fwa-surface-2); color: var(--fwa-muted);
      border-radius: 50%; flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .fwa-close:hover { background: var(--fwa-surface-hover); color: var(--fwa-text); }
    .fwa-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 4px;
    }
    .fwa-actions button {
      min-width: 0; height: 40px; padding: 0 8px;
      background: var(--fwa-surface-2); color: var(--fwa-text);
      border: 1px solid transparent;
      border-radius: var(--fwa-r-sm);
      font-size: 12.5px; font-weight: 500;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
    }
    .fwa-actions button:hover:not(:disabled) { background: var(--fwa-surface-hover); }
    .fwa-actions button.active {
      background: var(--fwa-accent); color: #ffffff;
      border-color: var(--fwa-accent);
    }
    .fwa-actions button:disabled { opacity: 0.4; cursor: default; }
    .fwa-hint {
      margin: 8px 0 0;
      padding: 10px 12px;
      font-size: 12px; line-height: 1.45;
      color: var(--fwa-muted);
      background: var(--fwa-surface-2);
      border-radius: var(--fwa-r-sm);
    }
    .fwa-loading {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: var(--fwa-muted);
      padding: 14px 2px 6px;
    }
    .fwa-spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #e5e5ea;
      border-top-color: var(--fwa-accent);
      animation: fwa-spin 0.75s linear infinite;
      flex-shrink: 0;
    }
    @keyframes fwa-spin { to { transform: rotate(360deg); } }
    .fwa-preview-label {
      margin: 12px 0 8px;
      font-size: 11px; font-weight: 600;
      color: var(--fwa-muted);
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .fwa-preview-text {
      margin: 0 0 14px;
      padding: 14px 14px;
      background: var(--fwa-surface-2);
      border: 1px solid var(--fwa-border);
      border-radius: var(--fwa-r-sm);
      font-size: 14px; line-height: 1.55;
      max-height: 168px; overflow-y: auto;
      white-space: pre-wrap;
      color: var(--fwa-text);
      -webkit-overflow-scrolling: touch;
    }
    .fwa-preview-foot {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 8px;
    }
    .fwa-secondary {
      height: 44px; padding: 0 14px;
      background: var(--fwa-surface-2); color: var(--fwa-text);
      border-radius: var(--fwa-r-sm);
      font-size: 13px; font-weight: 500;
      transition: background 0.15s ease;
    }
    .fwa-secondary:hover { background: var(--fwa-surface-hover); }
    .fwa-primary {
      height: 44px; padding: 0 16px;
      background: var(--fwa-accent); color: #ffffff;
      border-radius: var(--fwa-r-sm);
      font-size: 13px; font-weight: 600;
      transition: background 0.15s ease, transform 0.12s ease;
    }
    .fwa-primary:hover { background: var(--fwa-accent-hover); }
    .fwa-primary:active { transform: scale(0.98); }
    .fwa-toast {
      position: fixed; left: 50%; bottom: max(20px, env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%) translateY(10px);
      background: rgba(29, 29, 31, 0.92);
      color: #ffffff;
      padding: 11px 18px;
      border-radius: 999px;
      font-size: 13px; font-weight: 500;
      letter-spacing: -0.01em;
      opacity: 0; pointer-events: none;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .fwa-toast.on { opacity: 1; transform: translateX(-50%) translateY(0); }
    @media (max-width: 380px) {
      .fwa-actions { grid-template-columns: 1fr; }
      .fwa-actions button { height: 44px; }
      .fwa-preview-foot { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fwa-pop, .fwa-chip, .fwa-spinner { animation: none !important; transition: none !important; }
    }
  `
})()
