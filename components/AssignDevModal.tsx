'use client'

/**
 * AssignDevModal — 1:1 nach Figma (Sa43AzpBStYcfRjUruBeHj).
 *
 * Zwei Eingangs-Modi (per `mode` Prop):
 *   • existing — "Vorhandenen Dev'ler zum Projekt hinzufügen." Eingabe via
 *     @Benutzer oder E-Mail. Auswahl + Enter feuert /assign-dev.
 *   • invite   — "Weise das Projekt einem neuen Dev'ler zu und lade diesen
 *     falls nötig damit zu festag ein." Eingabe = E-Mail-Adresse, CTA "Einladungs­
 *     link erstellen" (slate Primary).
 *
 * Beide Modi münden in den Success-State:
 *   "Wir haben die Einladung verschickt. Dein Dev'ler wird sich zeitnah
 *    dein Projekt bestätigen."  + Check-Icon rechts.
 *
 * Visual: vollbild-Overlay (Backdrop + Blur deckt auch die Sidebar ab),
 * zentriertes, sehr ruhiges weißes Pop-up, keine Linien, keine Boxen — nur
 * ein Underline-Input, kleine Hilfeschrift darunter, und (im Invite-Modus)
 * eine slate-Pille als CTA. Schließen-Kreuz oben rechts.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from '@phosphor-icons/react'

export type AssignDevMode = 'existing' | 'invite' | 'team' | 'festag'

interface Props {
  open: boolean
  projectId: string
  projectTitle: string
  onClose: () => void
  onAssigned?: (devId: string) => void
  /** existing = Benutzer/E-Mail-Lookup, invite = neuer Einladungslink. */
  mode?: AssignDevMode
}

export default function AssignDevModal({
  open, projectId, projectTitle, onClose, onAssigned,
  mode = 'invite',
}: Props) {
  const [value, setValue] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ provisioned: boolean } | null>(null)
  const [suggestions, setSuggestions] = useState<Array<{ handle: string; name?: string; email?: string }>>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef<number | null>(null)
  const touchDeltaRef = useRef(0)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  function onSheetTouchStart(e: React.TouchEvent) {
    if (working) return
    touchStartYRef.current = e.touches[0].clientY
    touchDeltaRef.current = 0
  }
  function onSheetTouchMove(e: React.TouchEvent) {
    if (touchStartYRef.current == null || !sheetRef.current) return
    const dy = e.touches[0].clientY - touchStartYRef.current
    if (dy <= 0) { sheetRef.current.style.transform = 'translateY(0)'; return }
    touchDeltaRef.current = dy
    sheetRef.current.style.transform = `translateY(${dy}px)`
    sheetRef.current.style.transition = 'none'
  }
  function onSheetTouchEnd() {
    if (!sheetRef.current) return
    const dy = touchDeltaRef.current
    sheetRef.current.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)'
    if (dy > 110) {
      sheetRef.current.style.transform = 'translateY(100%)'
      setTimeout(onClose, 280)
    } else {
      sheetRef.current.style.transform = 'translateY(0)'
    }
    touchStartYRef.current = null
    touchDeltaRef.current = 0
  }

  // @-Autocomplete für Existing-Modus
  useEffect(() => {
    if (mode !== 'existing') { setSuggestions([]); return }
    const raw = value.trim()
    if (!raw.startsWith('@') || raw.length < 2) { setSuggestions([]); return }
    const q = raw.slice(1)
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/devs/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (Array.isArray(data?.devs)) setSuggestions(data.devs.slice(0, 6))
      } catch {/* offline / no endpoint — silently */}
    }, 250)
    return () => { ctrl.abort(); window.clearTimeout(t) }
  }, [value, mode])

  useEffect(() => {
    const apply = () => {
      primaryRef.current?.style.setProperty('border-radius', '999px', 'important')
    }
    apply()
    const t = window.setTimeout(apply, 50)
    return () => window.clearTimeout(t)
  })

  // Reset when the modal closes so the next open is clean.
  useEffect(() => {
    if (!open) return
    setValue(''); setWorking(false); setError(null); setDone(null)
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open, mode])

  // ESC closes (unless mid-request).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !working) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, working])

  // Body scroll-lock.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!open || !mounted) return null

  // Robusterer Email-Regex (RFC 5322-light) — verbietet trivial-Schrott.
  const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/

  async function submit() {
    const raw = value.trim()
    setError(null)
    if (mode === 'invite') {
      if (!EMAIL_RE.test(raw)) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    } else {
      // existing: entweder @username (≥2 Zeichen) ODER vollständige Email
      const isHandle = raw.startsWith('@') && raw.length >= 3 && /^@[\w.-]+$/.test(raw)
      const isEmail = EMAIL_RE.test(raw)
      if (!isHandle && !isEmail) {
        setError('Bitte @benutzername oder eine gültige E-Mail-Adresse eingeben.')
        return
      }
    }

    setWorking(true)
    try {
      const looksLikeEmail = /.+@.+\..+/.test(raw)
      const handle = !looksLikeEmail ? raw.replace(/^@/, '') : null
      const res = await fetch('/api/projects/assign-dev', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          devEmail: looksLikeEmail ? raw.toLowerCase() : undefined,
          devHandle: handle || undefined,
          projectTitle,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error === 'forbidden'
          ? 'Nur der Projekt-Owner kann einen Entwickler zuweisen.'
          : (data.error ?? 'Zuweisung fehlgeschlagen.'))
        return
      }
      setDone({ provisioned: Boolean(data.provisioned) })
      onAssigned?.(data.devId)
    } catch (e: any) {
      setError(e?.message ?? 'Netzwerkfehler.')
    } finally {
      setWorking(false)
    }
  }

  const title = done
    ? null
    : mode === 'existing'
      ? <>Vorhandenen Dev’ler zum Projekt hinzufügen.</>
      : mode === 'invite'
        ? <><strong>Weise das Projekt einem neuen Dev’ler zu</strong>{' '}<span className="muted">und lade diesen falls nötig damit zu festag ein.</span></>
        : mode === 'team'
          ? <><strong>Team­mitglieder zum Projekt hinzufügen.</strong>{' '}<span className="muted">Wer mitarbeiten soll, wird zum Projekt eingeladen.</span></>
          : <><strong>Festag findet den passenden Entwickler.</strong>{' '}<span className="muted">Du musst nichts weiter tun.</span></>

  const helper = done
    ? null
    : mode === 'existing'
      ? 'Der Dev’ler erhält die Nachricht „Neues Projekt“ in seinem Panel und kann dieses damit bestätigen.'
      : mode === 'invite'
        ? <>Nach erfolgreicher Anmeldung im Dev-Panel gibt es Benutzer und PIN. Finden Sie in <a href="/docs/neues-projekt-erstellen">festag Docs</a> den genauen Ablauf des Vorgangs beschrieben.</>
        : mode === 'team'
          ? 'Jede Person erhält eine Einladung per E-Mail und sieht das Projekt nach Annahme direkt in ihrem Festag-Panel.'
          : null

  return createPortal((
    <div className={`adm-overlay${isMobile ? ' is-mobile' : ''}`} role="dialog" aria-modal="true" aria-label={mode === 'existing' ? 'Dev’ler zuweisen' : 'Dev’ler einladen'}>
      <style>{CSS}</style>
      <div
        className="adm-backdrop"
        onMouseDown={e => {
          if (working) return
          if (e.target === e.currentTarget) onClose()
        }}
        aria-hidden
      />
      <div
        ref={sheetRef}
        className={`adm-card${done ? ' is-success' : ''}${isMobile ? ' is-sheet' : ''}`}
        role="document"
        onMouseDown={e => e.stopPropagation()}
      >
        {isMobile && (
          <div
            className="adm-drag-area"
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            role="button"
            tabIndex={0}
            aria-label="Nach unten ziehen zum Schließen"
          >
            <div className="adm-drag-handle" aria-hidden />
          </div>
        )}
        <button
          type="button" className="adm-close"
          onClick={onClose} disabled={working}
          aria-label="Schließen"
        >
          <X size={14} />
        </button>

        {done ? (
          <div className="adm-success">
            <div className="adm-success-text">
              <p className="adm-success-title"><strong>Wir haben die Einladung verschickt.</strong></p>
              <p className="adm-success-sub">Dein Dev’ler wird sich zeitnah dein Projekt bestätigen.</p>
            </div>
            <span className="adm-success-mark" aria-hidden>
              <Check size={22} weight="regular" />
            </span>
          </div>
        ) : mode === 'festag' ? (
          <>
            <p className="adm-title">{title}</p>
            <ul className="adm-info-list">
              <li><span className="adm-info-num">1</span><span>Tagro analysiert dein Briefing und wählt den passenden Festag-Entwickler aus.</span></li>
              <li><span className="adm-info-num">2</span><span>Du bekommst eine Benachrichtigung sobald jemand zugewiesen ist — meist innerhalb von 24 h.</span></li>
              <li><span className="adm-info-num">3</span><span>Der Entwickler beginnt mit der Umsetzung. Du verfolgst den Fortschritt in deinem Panel.</span></li>
            </ul>
            <button
              ref={primaryRef}
              type="button"
              className="adm-primary"
              onClick={() => { setDone({ provisioned: false }); onAssigned?.('') }}
              disabled={working}
            >
              Verstanden — Tagro übernimmt
            </button>
          </>
        ) : mode === 'team' ? (
          <>
            <p className="adm-title">{title}</p>
            <TeamInviteList
              onAssigned={() => onAssigned?.('')}
              onDone={() => setDone({ provisioned: false })}
              primaryRef={primaryRef}
              EMAIL_RE={EMAIL_RE}
            />
            {helper && <p className="adm-help">{helper}</p>}
          </>
        ) : (
          <>
            <p className="adm-title">{title}</p>
            <div className="adm-input-wrap">
              <input
                ref={inputRef}
                className="adm-input"
                type={mode === 'invite' ? 'email' : 'text'}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                placeholder={mode === 'existing' ? '@Benutzer oder E-Mail' : 'E-Mail-Adresse'}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="adm-suggest" role="listbox" aria-label="Vorschläge">
                  {suggestions.map(s => (
                    <li key={s.handle}>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setValue('@' + s.handle); setSuggestions([]) }}
                      >
                        <span className="adm-suggest-handle">@{s.handle}</span>
                        {s.name && <span className="adm-suggest-name">{s.name}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              ref={primaryRef}
              type="button"
              className="adm-primary"
              onClick={submit}
              disabled={working || !value.trim()}
            >
              {working ? 'Sende …' : (mode === 'existing' ? 'Einladung versenden' : 'Einladungslink erstellen')}
            </button>
            {helper && <p className="adm-help">{helper}</p>}
            {error && <p className="adm-error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  ), document.body)
}

// ----------------------------------------------------------------------------
// TeamInviteList — Multi-Email-Chip-Eingabe für Mode 'team'
// ----------------------------------------------------------------------------
function TeamInviteList({
  onAssigned, onDone, primaryRef, EMAIL_RE,
}: {
  onAssigned: () => void
  onDone: () => void
  primaryRef: React.RefObject<HTMLButtonElement>
  EMAIL_RE: RegExp
}) {
  const [emails, setEmails] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function commit() {
    const raw = input.trim().replace(/,$/, '')
    if (!raw) return
    if (!EMAIL_RE.test(raw)) { setErr('Bitte eine gültige E-Mail-Adresse.'); return }
    if (emails.includes(raw)) { setErr('Diese Adresse steht bereits in der Liste.'); return }
    setEmails([...emails, raw])
    setInput(''); setErr(null)
  }

  function remove(e: string) { setEmails(emails.filter(x => x !== e)) }

  async function send() {
    if (busy || emails.length === 0) return
    setErr(null); setBusy(true)
    try {
      // Best-effort gegen vorhandenes Endpoint; Fallback: alle einzeln.
      const res = await fetch('/api/projects/assign-team', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      }).catch(() => null)
      if (!res || !res.ok) {
        // Fallback: einzelne Einladungen
        await Promise.all(emails.map(em => fetch('/api/projects/assign-dev', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devEmail: em }),
        }).catch(() => null)))
      }
      onAssigned()
      onDone()
    } catch (e: any) {
      setErr(e?.message || 'Einladungen konnten nicht versendet werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="adm-chip-input">
        {emails.map(e => (
          <span key={e} className="adm-chip">
            {e}
            <button type="button" onClick={() => remove(e)} aria-label={`${e} entfernen`}><X size={11} weight="bold" /></button>
          </span>
        ))}
        <input
          className="adm-chip-input-field"
          type="email"
          value={input}
          onChange={e => { setInput(e.target.value); setErr(null) }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); commit() }
            if (e.key === 'Backspace' && !input && emails.length) {
              remove(emails[emails.length - 1])
            }
          }}
          onBlur={commit}
          placeholder={emails.length ? '' : 'E-Mail-Adresse hinzufügen (Enter)'}
        />
      </div>
      <button
        ref={primaryRef}
        type="button"
        className="adm-primary"
        onClick={send}
        disabled={busy || emails.length === 0}
      >
        {busy ? 'Sende …' : `${emails.length || ''} ${emails.length === 1 ? 'Einladung versenden' : 'Einladungen versenden'}`.trim()}
      </button>
      {err && <p className="adm-error" role="alert">{err}</p>}
    </>
  )
}

const CSS = `
  /* Festag AssignDevModal — Fullscreen-Overlay, Figma 1:1 */
  .adm-overlay {
    position: fixed; inset: 0; z-index: 2147483600;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: admFade .18s ease both;
    letter-spacing: 0 !important;
  }
  .adm-overlay *,
  .adm-overlay *::before,
  .adm-overlay *::after {
    letter-spacing: 0 !important;
  }
  .adm-backdrop {
    position: absolute; inset: 0;
    background: rgba(15,18,24,.58);
    backdrop-filter: blur(12px) saturate(115%);
    -webkit-backdrop-filter: blur(12px) saturate(115%);
  }
  @keyframes admFade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes admPop  { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: none; } }

  .adm-card.is-success {
    width: min(520px, calc(100vw - 32px));
    padding: 28px 30px;
  }
  .adm-card {
    position: relative; z-index: 1;
    width: min(440px, calc(100vw - 32px));
    background: #FFFFFF;
    border-radius: 20px;
    padding: 26px 26px 22px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 32px 80px -28px rgba(15,23,42,.35);
    animation: admPop .24s cubic-bezier(.16,1,.3,1) both;
    overflow: hidden !important;
  }
  /* Mobile Bottom-Sheet — gleiche Sprache wie das NewProjectModal */
  .adm-overlay.is-mobile { padding: 0; align-items: flex-end; }
  .adm-card.is-sheet {
    width: 100% !important; max-width: 100% !important;
    border-radius: 28px 28px 0 0;
    padding: 6px 22px 28px;
    box-shadow: 0 -8px 32px -12px rgba(15,23,42,.28);
    animation: admSheetIn .38s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes admSheetIn { from { transform: translateY(100%); } to { transform: none; } }
  .adm-drag-area {
    width: 100%; padding: 8px 0 6px;
    display: flex; justify-content: center;
    cursor: grab; touch-action: pan-y;
  }
  .adm-drag-handle {
    width: 36px; height: 4px;
    background: color-mix(in srgb, #848D9B 32%, transparent);
    border-radius: 999px;
  }
  [data-theme="dark"] .adm-card,
  [data-theme="classic-dark"] .adm-card {
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 40px 96px -30px rgba(0,0,0,.7);
  }

  .adm-close {
    position: absolute; top: 14px; right: 14px;
    width: 30px; height: 30px;
    border: 0; background: transparent;
    color: #ADB3BD; border-radius: 999px !important;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .14s, color .12s;
  }
  .adm-close svg { width: 16px; height: 16px; }
  .adm-close:hover:not(:disabled) {
    color: #5B647D;
    background: #F1F3F6;
  }
  .adm-close:disabled { opacity: .35; cursor: not-allowed; }

  .adm-title {
    margin: 0 28px 18px 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 17px; line-height: 1.35;
    color: #1E2126;
    font-weight: 500;
    letter-spacing: -.002em;
  }
  .adm-title strong { font-weight: 500; color: #1E2126; }
  .adm-title .muted { color: #ADB3BD; font-weight: 500; }

  .adm-input {
    width: 100%;
    height: 42px;
    background: #F7F8FB;
    border: 0;
    border-radius: 8px !important;
    outline: 0;
    color: #2A3032;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; line-height: 1.5; font-weight: 400;
    padding: 0 16px;
    transition: background .14s, box-shadow .14s;
    letter-spacing: .01em !important;
  }
  .adm-input::placeholder { color: #C2C7D0; opacity: 1; letter-spacing: .01em !important; }
  .adm-input:focus {
    background: #F1F3F8;
    box-shadow: 0 0 0 2px rgba(91,100,125,.12);
  }

  /* ---- Info-Liste (Mode festag) ---- */
  .adm-info-list {
    list-style: none; margin: 0 0 14px; padding: 0;
    display: flex; flex-direction: column; gap: 10px;
  }
  .adm-info-list li {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 14px;
    background: #F7F8FB;
    border-radius: 12px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; line-height: 1.5;
    color: #2A3032;
  }
  .adm-info-num {
    width: 22px; height: 22px; flex-shrink: 0;
    border-radius: 999px;
    background: #5B647D; color: #FFFFFF;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 500;
  }

  /* ---- Chip-Input (Mode team) ---- */
  .adm-chip-input {
    width: 100%;
    min-height: 56px;
    background: #F7F8FB;
    border-radius: 12px;
    padding: 8px 10px;
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    transition: background .14s, box-shadow .14s;
  }
  .adm-chip-input:focus-within {
    background: #F1F3F8;
    box-shadow: 0 0 0 2px rgba(91,100,125,.12);
  }
  .adm-chip {
    display: inline-flex; align-items: center; gap: 4px;
    height: 28px; padding: 0 6px 0 10px;
    background: #FFFFFF; color: #2A3032;
    border: 1px solid #E7EBF0;
    border-radius: 999px;
    font-size: 12.5px; font-weight: 500;
  }
  .adm-chip button {
    width: 20px; height: 20px;
    border: 0; background: transparent;
    color: #848D9B; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .adm-chip button:hover { background: #F1F3F6; color: #2A3032; }
  .adm-chip-input-field {
    flex: 1; min-width: 140px;
    border: 0; outline: 0; background: transparent;
    color: #2A3032; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px;
  }
  .adm-chip-input-field::placeholder { color: #C2C7D0; }

  /* ---- @-Autocomplete ---- */
  .adm-input-wrap { position: relative; }
  .adm-suggest {
    list-style: none; margin: 6px 0 0; padding: 6px;
    border: 1px solid #E7EBF0; border-radius: 12px;
    background: #FFFFFF;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 16px 36px -20px rgba(15,23,42,.25);
    max-height: 220px; overflow-y: auto;
  }
  .adm-suggest li button {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border: 0; border-radius: 8px !important;
    background: transparent; color: #2A3032;
    cursor: pointer; text-align: left;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; font-weight: 400;
    transition: background .12s;
  }
  .adm-suggest li button:hover { background: #F3F5F7; }
  .adm-suggest-handle { color: #5B647D; font-weight: 500; }
  .adm-suggest-name { color: #848D9B; font-size: 12px; }

  .adm-primary {
    display: inline-flex; align-items: center; justify-content: center;
    width: 100%;
    height: 47px; padding: 0 18px;
    margin-top: 10px;
    border: 1px solid #DCE1EA;
    border-radius: 999px !important;
    background: #FFFFFF; color: #202532;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 14px; font-weight: 500; letter-spacing: .14px;
    box-shadow: 0 1px 3px rgba(15,23,42,.06), 0 8px 24px -10px rgba(15,23,42,.12);
    cursor: pointer;
    transition: background .12s, border-color .12s, transform .12s;
  }
  .adm-primary:hover:not(:disabled) {
    background: #F7F8FB; border-color: #CBCFD6;
  }
  .adm-primary:active:not(:disabled) { transform: scale(.985); }
  .adm-primary:disabled { opacity: .35; cursor: not-allowed; }

  .adm-help {
    margin: 14px 0 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 11.5px; line-height: 1.55;
    color: #848D9B;
    font-weight: 400;
    letter-spacing: .01em;
  }
  .adm-help a {
    color: var(--text-secondary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .adm-help a:hover { color: var(--text); }

  .adm-error {
    margin: 12px 0 0;
    padding: 9px 12px;
    background: color-mix(in srgb, #ef4444 10%, transparent);
    color: #d44b4b;
    border-radius: 10px;
    font-size: 12px; font-weight: 500; line-height: 1.5;
  }

  /* ---- Success state (Figma 184:88) ---- */
  .adm-success {
    display: flex; align-items: center; justify-content: space-between;
    gap: 18px;
    padding: 4px 0 0;
  }
  .adm-success-text { flex: 1; min-width: 0; }
  .adm-success-title {
    margin: 0 0 6px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 17px; line-height: 1.3;
    color: #1E2126;
    font-weight: 500;
    letter-spacing: -.002em;
  }
  .adm-success-title strong { font-weight: 500; }
  .adm-success-sub {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 17px; line-height: 1.35;
    color: #ADB3BD;
    font-weight: 500;
    letter-spacing: -.002em;
  }
  .adm-success-mark {
    width: 56px; height: 56px;
    border-radius: 999px !important;
    border: 1px solid #E7EBF0;
    background: #FFFFFF;
    color: #5B647D;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 20px -10px rgba(15,23,42,.18);
  }
  .adm-success-mark svg { width: 22px; height: 22px; }

  @media (max-width: 480px) {
    .adm-card { padding: 22px 18px 16px; border-radius: 18px; }
    .adm-title { font-size: 14.5px; }
  }
`
