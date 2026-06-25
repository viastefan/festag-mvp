/**
 * Festag writing assistant — Tagro chip on focused text fields (Slice 1).
 *
 * Shows a small Tagro button when the user focuses a textarea or text input.
 * Click → action chips → preview → Übernehmen replaces the field value.
 */

(() => {
  if (window.__festagWritingAssistant) return
  window.__festagWritingAssistant = true

  const MIN_CHARS = 10
  const STORAGE_KEY = 'festagWritingEnabled'
  const EXCLUDED_TYPES = new Set([
    'password', 'hidden', 'file', 'checkbox', 'radio', 'submit', 'button',
    'reset', 'image', 'range', 'color', 'date', 'datetime-local', 'month',
    'week', 'time', 'number', 'tel', 'url',
  ])

  let enabled = true
  let activeField = null
  let host = null
  let shadow = null
  let busy = false
  let pendingImproved = null

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

  function isWritableField(el) {
    if (!(el instanceof HTMLTextAreaElement)) {
      if (!(el instanceof HTMLInputElement)) return false
      const type = (el.type || 'text').toLowerCase()
      if (EXCLUDED_TYPES.has(type)) return false
      if (type !== 'text' && type !== 'search' && type !== 'email') return false
    }
    if (el.disabled || el.readOnly) return false
    if (el.closest('festag-writing-assistant, festag-panel')) return false
    return true
  }

  function fieldText(el) {
    return (el.value || '').trim()
  }

  function setFieldText(el, text) {
    el.focus()
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
      <button type="button" class="fwa-chip" hidden aria-label="Mit Tagro verbessern">
        <span class="fwa-mark" aria-hidden>✦</span>
        <span class="fwa-label">Tagro</span>
      </button>
      <div class="fwa-pop" hidden role="dialog" aria-label="Tagro Schreibhilfe">
        <div class="fwa-pop-head">
          <strong>Schreibhilfe</strong>
          <button type="button" class="fwa-close" aria-label="Schließen">×</button>
        </div>
        <div class="fwa-actions">
          <button type="button" data-action="clearer">Klarer</button>
          <button type="button" data-action="professional">Professioneller</button>
          <button type="button" data-action="shorter">Kürzer</button>
        </div>
        <p class="fwa-hint"></p>
        <div class="fwa-preview" hidden>
          <p class="fwa-preview-label">Vorschau</p>
          <div class="fwa-preview-text"></div>
          <div class="fwa-preview-foot">
            <button type="button" class="fwa-secondary fwa-cancel">Abbrechen</button>
            <button type="button" class="fwa-primary fwa-apply">Übernehmen</button>
          </div>
        </div>
        <div class="fwa-loading" hidden>Tagro formuliert…</div>
      </div>
    `
    document.documentElement.appendChild(host)

    shadow.querySelector('.fwa-chip').addEventListener('click', (e) => {
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
    const chipW = 72
    const chipH = 30
    let left = r.right - chipW - 6
    let top = r.bottom - chipH - 6
    if (left < 8) left = r.left + 6
    if (top < 8) top = r.top + 6
    chip.style.left = `${left}px`
    chip.style.top = `${top}px`
    chip.hidden = false

    const pop = $('.fwa-pop')
    if (!pop.hidden) {
      let popLeft = Math.min(left, window.innerWidth - 300)
      let popTop = top + chipH + 8
      if (popTop + 220 > window.innerHeight) popTop = Math.max(8, top - 220)
      pop.style.left = `${Math.max(8, popLeft)}px`
      pop.style.top = `${popTop}px`
    }
  }

  function setHint(msg) {
    const el = $('.fwa-hint')
    if (el) {
      el.textContent = msg || ''
      el.hidden = !msg
    }
  }

  function openPop() {
    if (!activeField) return
    const text = fieldText(activeField)
    if (text.length < MIN_CHARS) {
      setHint(`Mindestens ${MIN_CHARS} Zeichen tippen.`)
      $('.fwa-preview').hidden = true
    } else {
      setHint('')
    }
    $('.fwa-pop').hidden = false
    $('.fwa-loading').hidden = true
    positionChip()
  }

  function closePop() {
    $('.fwa-pop').hidden = true
    $('.fwa-preview').hidden = true
    $('.fwa-loading').hidden = true
    pendingImproved = null
    busy = false
    setHint('')
  }

  function showPreview(text) {
    $('.fwa-preview-text').textContent = text
    $('.fwa-preview').hidden = false
    $('.fwa-loading').hidden = true
    pendingImproved = text
  }

  function applyPreview() {
    if (!activeField || !pendingImproved) return
    setFieldText(activeField, pendingImproved)
    closePop()
    toast('Übernommen')
  }

  function runAction(action) {
    if (!activeField || busy) return
    const text = fieldText(activeField)
    if (text.length < MIN_CHARS) {
      setHint(`Mindestens ${MIN_CHARS} Zeichen tippen.`)
      return
    }
    busy = true
    setHint('')
    $('.fwa-loading').hidden = false
    $('.fwa-preview').hidden = true
    shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = true })

    chrome.runtime.sendMessage({
      type: 'improveText',
      payload: {
        text,
        action,
        pageUrl: location.href,
        pageTitle: document.title || null,
      },
    }, (res) => {
      busy = false
      shadow.querySelectorAll('.fwa-actions button').forEach((b) => { b.disabled = false })
      if (!res || !res.ok || !res.improved) {
        $('.fwa-loading').hidden = true
        setHint(res?.error === 'unauthorized'
          ? 'Bitte bei festag.app anmelden.'
          : 'Tagro gerade nicht erreichbar.')
        return
      }
      showPreview(res.improved)
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

  function onFocusIn(e) {
    if (!enabled) return
    const t = e.target
    if (!isWritableField(t)) return
    mountUi()
    activeField = t
    closePop()
    positionChip()
    host.style.pointerEvents = 'auto'
  }

  function onFocusOut(e) {
    if (!activeField) return
    const related = e.relatedTarget
    if (related && host && (related === host || host.contains(related) || e.composedPath().includes(host))) return
    window.setTimeout(() => {
      if (document.activeElement === activeField) return
      if (host && shadow && !$('.fwa-pop')?.hidden) return
      activeField = null
      if ($('.fwa-chip')) $('.fwa-chip').hidden = true
      closePop()
      if (host) host.style.pointerEvents = 'none'
    }, 120)
  }

  function onScrollOrResize() {
    if (activeField) positionChip()
  }

  let bound = false
  function bind() {
    if (bound) return
    bound = true
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }

  function teardown() {
    activeField = null
    closePop()
    if ($('.fwa-chip')) $('.fwa-chip').hidden = true
    if (host) host.style.pointerEvents = 'none'
  }

  const CSS = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    button {
      font: 500 12.5px/1.2 -apple-system, 'Aeonik', Inter, sans-serif;
      cursor: pointer; border: 0; margin: 0;
    }
    .fwa-chip {
      position: fixed;
      display: inline-flex; align-items: center; gap: 5px;
      height: 30px; padding: 0 10px 0 8px;
      background: #5B647D; color: #fff;
      border-radius: 999px;
      box-shadow: 0 4px 14px rgba(0,0,0,.22);
      pointer-events: auto;
      transition: transform .12s ease, opacity .12s ease;
    }
    .fwa-chip:hover { transform: scale(1.03); }
    .fwa-mark { font-size: 11px; opacity: .9; }
    .fwa-label { font-size: 12px; font-weight: 600; letter-spacing: .01em; }
    .fwa-pop {
      position: fixed;
      width: min(288px, calc(100vw - 16px));
      background: #121214;
      color: #f4f4f4;
      border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.35);
      padding: 12px;
      pointer-events: auto;
    }
    .fwa-pop-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .fwa-pop-head strong { font-size: 13px; font-weight: 600; }
    .fwa-close {
      background: transparent; color: #aaa; font-size: 18px;
      width: 28px; height: 28px; border-radius: 8px;
    }
    .fwa-close:hover { background: rgba(255,255,255,.08); color: #fff; }
    .fwa-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .fwa-actions button {
      flex: 1 1 calc(50% - 3px);
      min-width: 0;
      height: 34px; padding: 0 10px;
      background: rgba(255,255,255,.08); color: #f4f4f4;
      border-radius: 999px;
    }
    .fwa-actions button:hover:not(:disabled) { background: rgba(255,255,255,.14); }
    .fwa-actions button:disabled { opacity: .5; cursor: default; }
    .fwa-hint { margin: 0; font-size: 11.5px; color: #9aa; }
    .fwa-loading { font-size: 12px; color: #9aa; padding: 8px 0; }
    .fwa-preview-label { margin: 0 0 6px; font-size: 11px; color: #9aa; text-transform: uppercase; letter-spacing: .06em; }
    .fwa-preview-text {
      margin: 0 0 10px; padding: 10px;
      background: rgba(255,255,255,.06); border-radius: 10px;
      font-size: 13px; line-height: 1.45; max-height: 140px; overflow-y: auto;
      white-space: pre-wrap;
    }
    .fwa-preview-foot { display: flex; gap: 8px; justify-content: flex-end; }
    .fwa-secondary {
      height: 34px; padding: 0 14px;
      background: rgba(255,255,255,.08); color: #f4f4f4;
      border-radius: 999px;
    }
    .fwa-primary {
      height: 34px; padding: 0 14px;
      background: #5B647D; color: #fff;
      border-radius: 999px;
    }
    .fwa-primary:hover { background: #6b7490; }
    .fwa-toast {
      position: fixed; left: 50%; bottom: 24px;
      transform: translateX(-50%) translateY(8px);
      background: #000; color: #fff;
      padding: 8px 14px; border-radius: 999px;
      font-size: 12px; opacity: 0; pointer-events: none;
      transition: all .2s ease;
    }
    .fwa-toast.on { opacity: 1; transform: translateX(-50%) translateY(0); }
  `
})()
