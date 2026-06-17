/**
 * Festag content script — the right-side Tagro panel on ANY page.
 *
 *   ┌─────────────────────┐
 *   │   ◉ orb (pulses)    │  reacts to recording state
 *   │   live transcript   │  committed bullets + italic draft
 *   │  Sprechen | Tippen  │  input mode toggle
 *   │  [Element markieren]│  hover-highlight → click → bubble
 *   │  [Stop & senden]    │  → Tagro structuring via background
 *   └─────────────────────┘
 *
 * Everything renders inside a Shadow DOM so host-page CSS can't leak in.
 * API calls go through the background worker (carries festag.app cookies).
 */

(() => {
  if (window.__festagPanelMounted) return
  window.__festagPanelMounted = true

  let host = null
  let shadow = null
  let state = {
    project: null,
    recording: false,
    sections: [],            // { url, bullets: [], draft: '' }
    mode: 'voice',           // 'voice' | 'type'
    marker: false,           // element-marker engaged
    capture: null,           // structured result after stop
    busy: false,
  }
  let recognition = null

  // ── Helpers ─────────────────────────────────────────────────────────────
  const $ = (sel) => shadow && shadow.querySelector(sel)

  function currentSection() {
    if (state.sections.length === 0) {
      state.sections.push({ url: location.href, bullets: [], draft: '' })
    }
    return state.sections[state.sections.length - 1]
  }

  function cssPath(el) {
    // Compact, readable selector — id wins, else tag.class chain (max 4 hops).
    if (!(el instanceof Element)) return ''
    const parts = []
    let node = el
    while (node && node.nodeType === 1 && parts.length < 4) {
      if (node.id) { parts.unshift(`#${node.id}`); break }
      let part = node.tagName.toLowerCase()
      const cls = [...node.classList].slice(0, 2).join('.')
      if (cls) part += `.${cls}`
      parts.unshift(part)
      node = node.parentElement
    }
    return parts.join(' > ')
  }

  // ── Speech ──────────────────────────────────────────────────────────────
  function startSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast('Sprachaufnahme nicht verfügbar — tippe stattdessen.'); setMode('type'); return }
    recognition = new SR()
    recognition.lang = 'de-DE'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          const text = r[0].transcript.trim()
          if (text) currentSection().bullets.push(text)
          currentSection().draft = ''
        } else {
          interim += r[0].transcript
        }
      }
      if (interim) currentSection().draft = interim
      renderTranscript()
    }
    recognition.onend = () => { if (state.recording && state.mode === 'voice') { try { recognition.start() } catch {} } }
    try { recognition.start() } catch {}
  }
  function stopSpeech() { try { recognition && recognition.stop() } catch {}; recognition = null }

  // ── Element marker ──────────────────────────────────────────────────────
  let markerOverlay = null
  function enableMarker() {
    state.marker = true
    markerOverlay = document.createElement('div')
    markerOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483600;border:2px solid #5B647D;border-radius:6px;background:rgba(91,100,125,.12);transition:all .06s ease;display:none'
    document.documentElement.appendChild(markerOverlay)
    document.addEventListener('mousemove', onMarkerMove, true)
    document.addEventListener('click', onMarkerClick, true)
    renderControls()
  }
  function disableMarker() {
    state.marker = false
    document.removeEventListener('mousemove', onMarkerMove, true)
    document.removeEventListener('click', onMarkerClick, true)
    markerOverlay?.remove(); markerOverlay = null
    renderControls()
  }
  function onMarkerMove(e) {
    if (host && e.composedPath().includes(host)) { markerOverlay.style.display = 'none'; return }
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (!el || el === markerOverlay) return
    const r = el.getBoundingClientRect()
    Object.assign(markerOverlay.style, {
      display: 'block', left: r.left + 'px', top: r.top + 'px',
      width: r.width + 'px', height: r.height + 'px',
    })
  }
  function onMarkerClick(e) {
    if (host && e.composedPath().includes(host)) return
    e.preventDefault(); e.stopPropagation()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const sel = cssPath(el)
    disableMarker()
    askForElement(sel)
  }
  function askForElement(selector) {
    // Bubble: short prompt about the marked element. The answer lands as
    // a bullet prefixed with the selector so Tagro knows the exact spot.
    const text = window.prompt('Was soll hier passieren? (Wunsch oder Brainstorming-Frage)')
    if (text && text.trim()) {
      currentSection().bullets.push(`[Element: ${selector}] ${text.trim()}`)
      renderTranscript()
    }
  }

  // ── Recording lifecycle ─────────────────────────────────────────────────
  function startRecording() {
    state.recording = true
    state.capture = null
    state.sections = [{ url: location.href, bullets: [], draft: '' }]
    if (state.mode === 'voice') startSpeech()
    render()
  }

  function newPage() {
    currentSection().draft = ''
    state.sections.push({ url: location.href, bullets: [], draft: '' })
    renderTranscript()
  }

  async function stopAndSend() {
    state.recording = false
    stopSpeech()
    disableMarker()
    const transcript = state.sections
      .filter(s => s.bullets.length > 0 || s.draft.trim())
      .map(s => `[Seite: ${s.url}]\n` + [...s.bullets, s.draft].filter(Boolean).map(b => `- ${b.trim()}`).join('\n'))
      .join('\n\n')
    if (!transcript.trim()) { render(); toast('Nichts aufgenommen.'); return }
    state.busy = true; render()
    chrome.runtime.sendMessage({
      type: 'createCapture',
      payload: {
        projectId: state.project.id,
        pageUrl: state.sections[0]?.url || location.href,
        pageTitle: document.title || null,
        transcript,
        source: 'chrome_extension',
        process: true,
      },
    }, (res) => {
      state.busy = false
      if (!res || !res.ok || !res.capture) { toast(res?.error || 'Senden fehlgeschlagen.'); render(); return }
      state.capture = res.capture
      render()
    })
  }

  function approve() {
    if (!state.capture) return
    state.busy = true; render()
    chrome.runtime.sendMessage({ type: 'approveCapture', captureId: state.capture.id }, (res) => {
      state.busy = false
      if (res && res.ok) { toast('An Dev geschickt.'); closePanel() }
      else { toast(res?.error || 'Fehlgeschlagen.'); render() }
    })
  }

  function setMode(m) {
    state.mode = m
    if (state.recording) {
      if (m === 'voice') startSpeech()
      else stopSpeech()
    }
    renderControls()
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  function toast(msg) {
    const t = $('.fx-toast'); if (!t) return
    t.textContent = msg; t.classList.add('on')
    setTimeout(() => t.classList.remove('on'), 2400)
  }

  function openPanel(project) {
    state.project = project
    if (host) { render(); return }
    host = document.createElement('festag-panel')
    host.style.cssText = 'all:initial'
    shadow = host.attachShadow({ mode: 'open' })
    const css = document.createElement('style')
    css.textContent = PANEL_CSS
    shadow.appendChild(css)
    const root = document.createElement('div')
    root.className = 'fx'
    shadow.appendChild(root)
    document.documentElement.appendChild(host)
    render()
  }

  function closePanel() {
    stopSpeech(); disableMarker()
    host?.remove(); host = null; shadow = null
    state.recording = false; state.sections = []; state.capture = null
  }

  function render() {
    const root = shadow && shadow.querySelector('.fx'); if (!root) return
    root.innerHTML = `
      <div class="fx-head">
        <span class="fx-orb ${state.recording ? 'rec' : ''} ${state.busy ? 'busy' : ''}">
          <span></span><span></span><span></span>
        </span>
        <div class="fx-head-text">
          <strong>${esc(state.project?.title || 'Festag')}</strong>
          <small>${state.recording ? 'Aufnahme läuft' : state.capture ? 'Review' : 'Live-Feedback'}</small>
        </div>
        <button class="fx-x" title="Schließen">×</button>
      </div>
      <div class="fx-body"></div>
      <div class="fx-controls"></div>
      <div class="fx-toast"></div>
    `
    root.querySelector('.fx-x').addEventListener('click', closePanel)
    renderTranscript()
    renderControls()
  }

  function esc(s) { const d = document.createElement('span'); d.textContent = String(s ?? ''); return d.innerHTML }

  function renderTranscript() {
    const body = $('.fx-body'); if (!body) return
    if (state.busy && !state.capture) {
      body.innerHTML = '<p class="fx-empty">Tagro strukturiert …</p>'
      return
    }
    if (state.capture) {
      const changes = state.capture.structured_changes || []
      body.innerHTML = `
        ${state.capture.tagro_summary ? `<p class="fx-sum">${esc(state.capture.tagro_summary)}</p>` : ''}
        ${changes.map(c => `
          <div class="fx-change">
            <strong>${esc(c.title || 'Änderung')}</strong>
            ${c.affected ? `<small>${esc(c.affected)}</small>` : ''}
            ${c.description ? `<p>${esc(c.description)}</p>` : ''}
          </div>`).join('')}
        ${changes.length === 0 ? '<p class="fx-empty">Keine konkreten Änderungen erkannt.</p>' : ''}
      `
      return
    }
    if (!state.recording && state.sections.length === 0) {
      body.innerHTML = '<p class="fx-empty">Start drücken und einfach lossprechen — oder tippen.</p>'
      return
    }
    body.innerHTML = state.sections.map((s, i) => `
      ${i > 0 ? '<div class="fx-div">Neue Seite</div>' : ''}
      <div class="fx-url">${esc(s.url.replace(/^https?:\/\//, '').slice(0, 60))}</div>
      ${s.bullets.map(b => `<div class="fx-b">${esc(b)}</div>`).join('')}
      ${s.draft ? `<div class="fx-b fx-draft">${esc(s.draft)}</div>` : ''}
    `).join('')
    body.scrollTop = body.scrollHeight
  }

  function renderControls() {
    const c = $('.fx-controls'); if (!c) return
    if (state.capture) {
      c.innerHTML = `
        <button class="fx-btn" data-act="again">Neu</button>
        <button class="fx-btn fx-primary" data-act="approve" ${state.busy ? 'disabled' : ''}>An Dev senden</button>
      `
    } else if (!state.recording) {
      c.innerHTML = `<button class="fx-btn fx-primary fx-wide" data-act="start">● Aufnahme starten</button>`
    } else {
      c.innerHTML = `
        <div class="fx-mode">
          <button class="fx-seg ${state.mode === 'voice' ? 'on' : ''}" data-act="voice">Sprechen</button>
          <button class="fx-seg ${state.mode === 'type' ? 'on' : ''}" data-act="type">Tippen</button>
        </div>
        ${state.mode === 'type' ? '<textarea class="fx-input" placeholder="Feedback tippen, Enter = Satz"></textarea>' : ''}
        <button class="fx-btn ${state.marker ? 'fx-primary' : ''}" data-act="marker">${state.marker ? 'Markieren aktiv…' : 'Element markieren'}</button>
        <button class="fx-btn" data-act="page">Neue Seite</button>
        <button class="fx-btn fx-stop" data-act="stop">Stop & senden</button>
      `
      const input = c.querySelector('.fx-input')
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const v = input.value.trim()
            if (v) { currentSection().bullets.push(v); input.value = ''; renderTranscript() }
          }
        })
        setTimeout(() => input.focus(), 50)
      }
    }
    c.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.getAttribute('data-act')
        if (act === 'start') startRecording()
        if (act === 'stop') stopAndSend()
        if (act === 'page') newPage()
        if (act === 'voice') setMode('voice')
        if (act === 'type') setMode('type')
        if (act === 'marker') state.marker ? disableMarker() : enableMarker()
        if (act === 'approve') approve()
        if (act === 'again') { state.capture = null; render() }
      })
    })
  }

  const PANEL_CSS = `
    .fx {
      position: fixed; top: 16px; right: 16px; bottom: 16px;
      width: 340px; z-index: 2147483640;
      display: flex; flex-direction: column;
      background: #141518; color: #f4f4f4;
      border: 1px solid rgba(255,255,255,.1); border-radius: 18px;
      box-shadow: 0 30px 80px rgba(0,0,0,.5);
      font: 13.5px/1.5 -apple-system, 'Aeonik', Inter, sans-serif;
      overflow: hidden;
    }
    .fx-head { display:flex; align-items:center; gap:10px; padding:13px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
    .fx-orb {
      width:38px; height:38px; border-radius:999px; flex-shrink:0;
      background: radial-gradient(circle at 32% 30%, #7682A0, #4d566c);
      display:inline-flex; align-items:center; justify-content:center; gap:3px;
    }
    .fx-orb span { width:3.5px; height:10px; border-radius:99px; background:rgba(255,255,255,.85); }
    .fx-orb.rec span { animation: fxw 1.2s ease-in-out infinite; }
    .fx-orb.rec span:nth-child(2) { animation-delay:.15s; height:17px; }
    .fx-orb.rec span:nth-child(3) { animation-delay:.3s; }
    .fx-orb.busy span { animation: fxw .6s ease-in-out infinite; }
    @keyframes fxw { 0%,100%{transform:scaleY(.55)} 50%{transform:scaleY(1)} }
    .fx-head-text { flex:1; min-width:0; display:flex; flex-direction:column; }
    .fx-head-text strong { font-size:13.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fx-head-text small { color:#9aa; font-size:11px; }
    .fx-x { background:transparent; border:0; color:#aaa; font-size:20px; cursor:pointer; padding:2px 6px; border-radius:8px; }
    .fx-x:hover { background:rgba(255,255,255,.08); color:#fff; }
    .fx-body { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:7px; }
    .fx-empty { color:#889; margin:auto 0; text-align:center; }
    .fx-url { color:#9aa; font-size:11px; margin-top:4px; }
    .fx-b { background:rgba(255,255,255,.06); border-radius:10px; padding:8px 11px; }
    .fx-draft { color:#9aa; font-style:italic; }
    .fx-div { display:flex; align-items:center; gap:8px; color:#778; font-size:10px; letter-spacing:.08em; text-transform:uppercase; margin-top:6px; }
    .fx-div::before, .fx-div::after { content:''; flex:1; height:1px; background:rgba(255,255,255,.1); }
    .fx-sum { font-weight:500; }
    .fx-change { background:rgba(255,255,255,.06); border-radius:12px; padding:10px 12px; }
    .fx-change strong { display:block; font-size:13px; }
    .fx-change small { color:#9aa; font-size:11px; }
    .fx-change p { margin:4px 0 0; color:#ccd; font-size:12.5px; }
    .fx-controls { padding:12px 14px; border-top:1px solid rgba(255,255,255,.08); display:flex; flex-wrap:wrap; gap:7px; }
    .fx-btn {
      flex:1 1 auto; height:36px; padding:0 12px;
      background:rgba(255,255,255,.07); color:#f4f4f4;
      border:0; border-radius:999px; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;
      white-space:nowrap;
    }
    .fx-btn:hover { background:rgba(255,255,255,.12); }
    .fx-primary { background:#5B647D; }
    .fx-primary:hover { background:#6b7490; }
    .fx-stop { background:#E11D48; }
    .fx-stop:hover { background:#c81a40; }
    .fx-wide { flex-basis:100%; height:44px; font-size:14px; }
    .fx-mode { display:flex; flex-basis:100%; background:rgba(255,255,255,.06); border-radius:999px; padding:3px; }
    .fx-seg { flex:1; height:28px; border:0; border-radius:999px; background:transparent; color:#bbc; font:inherit; font-size:12px; cursor:pointer; }
    .fx-seg.on { background:#fff; color:#111; font-weight:600; }
    .fx-input {
      flex-basis:100%; min-height:54px; resize:vertical;
      background:rgba(255,255,255,.06); color:#f4f4f4;
      border:1px solid rgba(255,255,255,.12); border-radius:12px;
      padding:9px 11px; font:inherit; outline:0;
    }
    .fx-toast {
      position:absolute; left:50%; bottom:70px; transform:translateX(-50%) translateY(8px);
      background:#000; color:#fff; padding:7px 13px; border-radius:999px;
      font-size:12px; opacity:0; pointer-events:none; transition:all .2s ease;
    }
    .fx-toast.on { opacity:1; transform:translateX(-50%) translateY(0); }
  `

  // ── Entry points ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg?.type === 'festag:openPanel') {
      chrome.storage.local.get('festagProject', ({ festagProject }) => {
        if (festagProject?.id) openPanel(festagProject)
        else toast && toast('Kein Projekt gewählt.')
      })
      sendResponse({ ok: true })
    }
    return true
  })
})()
