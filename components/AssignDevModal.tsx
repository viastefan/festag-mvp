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

/** Was im Draft-Modus eingesammelt wird (Projekt existiert noch nicht). */
export type AssignDraftPayload =
  | { mode: 'existing'; devHandle?: string; devEmail?: string }
  | { mode: 'invite'; devEmail: string }
  | { mode: 'team'; emails: string[] }
  | { mode: 'festag' }

interface Props {
  open: boolean
  projectId: string
  projectTitle: string
  onClose: () => void
  onAssigned?: (devId: string) => void
  /** existing = Benutzer/E-Mail-Lookup, invite = neuer Einladungslink. */
  mode?: AssignDevMode
  /** Draft-Modus: keine API-Calls, nur Daten einsammeln und via
   *  onSubmitDraft zurückgeben. Verwendet wenn Projekt noch nicht in DB. */
  draft?: boolean
  onSubmitDraft?: (payload: AssignDraftPayload) => void
}

export default function AssignDevModal({
  open, projectId, projectTitle, onClose, onAssigned,
  mode = 'invite', draft = false, onSubmitDraft,
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

    const looksLikeEmail = /.+@.+\..+/.test(raw)
    const handle = !looksLikeEmail ? raw.replace(/^@/, '') : null

    // Draft-Modus: nur Daten zurückgeben, kein API-Call. Projekt wird
    // erst beim Finalisieren im NewProjectModal angelegt.
    if (draft) {
      const payload: AssignDraftPayload = mode === 'invite'
        ? { mode: 'invite', devEmail: raw.toLowerCase() }
        : { mode: 'existing', ...(handle ? { devHandle: handle } : { devEmail: raw.toLowerCase() }) }
      onSubmitDraft?.(payload)
      return
    }

    setWorking(true)
    try {
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
            <FestagSphere />
            <ul className="adm-sphere-legend">
              <li><span className="adm-sphere-dot dot-you" />Du brichtst Tagro ein</li>
              <li><span className="adm-sphere-dot dot-tagro" />Tagro analysiert &amp; matched</li>
              <li><span className="adm-sphere-dot dot-dev" />Entwickler setzt um</li>
              <li><span className="adm-sphere-dot dot-festag" />Festag sichert Qualität ab</li>
            </ul>
            <button
              ref={primaryRef}
              type="button"
              className="adm-primary"
              onClick={() => {
                if (draft) { onSubmitDraft?.({ mode: 'festag' }); return }
                setDone({ provisioned: false }); onAssigned?.('')
              }}
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
              projectId={projectId}
              projectTitle={projectTitle}
              draft={draft}
              onSubmitDraft={onSubmitDraft}
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
// FestagSphere — Concentric Network Illustration für Mode 'festag'
// ----------------------------------------------------------------------------
function FestagSphere() {
  // Konzentrische Ringe mit orbitierenden Knoten. Subtle pulse +
  // rotation. Modern, ohne Logo-Spam — fokussiert auf die Beziehungen.
  return (
    <div className="adm-sphere-wrap" aria-hidden>
      <svg viewBox="0 0 240 240" className="adm-sphere">
        <defs>
          <radialGradient id="admSphereBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5B647D" stopOpacity=".06" />
            <stop offset="100%" stopColor="#5B647D" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="admSphereLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5B647D" stopOpacity=".0" />
            <stop offset="50%" stopColor="#5B647D" stopOpacity=".5" />
            <stop offset="100%" stopColor="#5B647D" stopOpacity=".0" />
          </linearGradient>
        </defs>

        <circle cx="120" cy="120" r="118" fill="url(#admSphereBg)" />

        {/* Drei konzentrische Ringe — Tagro · Dev · Festag */}
        <circle cx="120" cy="120" r="46" fill="none" stroke="#E7EBF0" strokeWidth="1" />
        <circle cx="120" cy="120" r="76" fill="none" stroke="#E7EBF0" strokeWidth="1" strokeDasharray="2 4" />
        <circle cx="120" cy="120" r="106" fill="none" stroke="#E7EBF0" strokeWidth="1" />

        {/* Verbindungslinien Center → Ring1 → Ring2 → Ring3 */}
        <g className="adm-sphere-lines">
          <line x1="120" y1="120" x2="120" y2="74" stroke="url(#admSphereLine)" strokeWidth="1.2" />
          <line x1="120" y1="74" x2="166" y2="62" stroke="url(#admSphereLine)" strokeWidth="1.2" />
          <line x1="166" y1="62" x2="214" y2="98" stroke="url(#admSphereLine)" strokeWidth="1.2" />
          <line x1="120" y1="74" x2="74" y2="62" stroke="url(#admSphereLine)" strokeWidth="1.2" />
          <line x1="74" y1="62" x2="26" y2="98" stroke="url(#admSphereLine)" strokeWidth="1.2" />
        </g>

        {/* Center: Du / Briefing */}
        <g className="adm-sphere-node node-you">
          <circle cx="120" cy="120" r="14" fill="#5B647D" />
          <circle cx="120" cy="120" r="22" fill="none" stroke="#5B647D" strokeOpacity=".25" strokeWidth="1" />
        </g>

        {/* Ring 1: Tagro */}
        <g className="adm-sphere-node node-tagro">
          <circle cx="120" cy="74" r="9" fill="#FFFFFF" stroke="#5B647D" strokeWidth="1.5" />
          <circle cx="120" cy="74" r="3.5" fill="#5B647D" />
        </g>

        {/* Ring 2: Entwickler (2 Knoten — könnte ja mehrere geben) */}
        <g className="adm-sphere-node node-dev">
          <circle cx="166" cy="62" r="7" fill="#FFFFFF" stroke="#848D9B" strokeWidth="1.3" />
          <circle cx="74" cy="62" r="7" fill="#FFFFFF" stroke="#848D9B" strokeWidth="1.3" />
        </g>

        {/* Ring 3: Festag (Aussenring) */}
        <g className="adm-sphere-node node-festag">
          <circle cx="214" cy="98" r="6" fill="#FFFFFF" stroke="#C2C7D0" strokeWidth="1.2" />
          <circle cx="26" cy="98" r="6" fill="#FFFFFF" stroke="#C2C7D0" strokeWidth="1.2" />
          <circle cx="120" cy="226" r="6" fill="#FFFFFF" stroke="#C2C7D0" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  )
}

// ----------------------------------------------------------------------------
// TeamInviteList — Multi-Email-Chip-Eingabe für Mode 'team'
// ----------------------------------------------------------------------------
function TeamInviteList({
  onAssigned, onDone, primaryRef, EMAIL_RE, projectId, projectTitle,
  draft, onSubmitDraft,
}: {
  onAssigned: () => void
  onDone: () => void
  primaryRef: React.RefObject<HTMLButtonElement>
  EMAIL_RE: RegExp
  projectId: string
  projectTitle: string
  draft?: boolean
  onSubmitDraft?: (payload: AssignDraftPayload) => void
}) {
  const [emails, setEmails] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pending = input.trim().replace(/[,;]+$/, '')
  const pendingValid = EMAIL_RE.test(pending)
  // Button ist aktiv sobald es eine fertige Adresse gibt — entweder schon
  // als Chip ODER eine gültige Adresse im Eingabefeld. KEIN Enter nötig.
  const canSend = !busy && (emails.length > 0 || pendingValid)

  function commit(): string[] | null {
    if (!pending) return emails.length ? emails : null
    if (!pendingValid) { setErr('Bitte eine gültige E-Mail-Adresse.'); return null }
    if (emails.includes(pending)) { setInput(''); return emails }
    const next = [...emails, pending]
    setEmails(next); setInput(''); setErr(null)
    return next
  }

  function remove(e: string) { setEmails(emails.filter(x => x !== e)) }

  async function send() {
    if (busy) return
    // Offene Eingabe automatisch übernehmen, dann senden.
    const finalEmails = commit()
    if (!finalEmails || finalEmails.length === 0) {
      setErr('Bitte mindestens eine gültige E-Mail-Adresse eingeben.')
      return
    }
    // Draft-Modus: nur Daten zurückgeben.
    if (draft) {
      onSubmitDraft?.({ mode: 'team', emails: finalEmails })
      return
    }
    setErr(null); setBusy(true)
    try {
      const res = await fetch('/api/projects/assign-team', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectTitle, emails: finalEmails }),
      }).catch(() => null)
      if (!res || !res.ok) {
        await Promise.all(finalEmails.map(em => fetch('/api/projects/assign-dev', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, projectTitle, devEmail: em }),
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

  const count = emails.length + (pendingValid && !emails.includes(pending) ? 1 : 0)

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
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
            if (e.key === 'Backspace' && !input && emails.length) {
              remove(emails[emails.length - 1])
            }
          }}
          placeholder={emails.length ? 'Weitere hinzufügen…' : 'E-Mail-Adresse'}
        />
      </div>
      <button
        ref={primaryRef}
        type="button"
        className="adm-primary"
        onClick={send}
        disabled={!canSend}
      >
        {busy ? 'Sende …' : (count > 1 ? `${count} Einladungen versenden` : 'Einladung versenden')}
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
    background: #F3F4FA;
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
    background: #EDEFF8;
    box-shadow: 0 0 0 2px rgba(91,100,125,.12);
  }

  /* ---- Festag Sphere (Mode festag) ---- */
  .adm-sphere-wrap {
    display: flex; justify-content: center; align-items: center;
    margin: 4px 0 10px;
  }
  .adm-sphere {
    width: 220px; height: 220px;
    overflow: visible;
  }
  .adm-sphere-node.node-you {
    transform-origin: 120px 120px;
    animation: admPulseCore 3.6s ease-in-out infinite;
  }
  .adm-sphere-node.node-tagro {
    transform-origin: 120px 74px;
    animation: admFloat1 4.8s ease-in-out infinite;
  }
  .adm-sphere-node.node-dev {
    animation: admFloat2 5.2s ease-in-out infinite;
  }
  .adm-sphere-node.node-festag {
    animation: admFloat3 6s ease-in-out infinite;
  }
  .adm-sphere-lines line {
    stroke-dasharray: 80;
    stroke-dashoffset: 0;
    animation: admLineFlow 3.4s linear infinite;
  }
  @keyframes admPulseCore {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
  }
  @keyframes admFloat1 {
    0%, 100% { transform: translate(0, 0); }
    50%      { transform: translate(0, -3px); }
  }
  @keyframes admFloat2 {
    0%, 100% { transform: translate(0, 0); }
    50%      { transform: translate(2px, -2px); }
  }
  @keyframes admFloat3 {
    0%, 100% { transform: translate(0, 0); }
    50%      { transform: translate(-2px, 2px); }
  }
  @keyframes admLineFlow {
    from { stroke-dashoffset: 80; }
    to   { stroke-dashoffset: 0; }
  }

  /* Legende — kleine Punkte + Text statt nummerierter Karten */
  .adm-sphere-legend {
    list-style: none; margin: 0 0 16px; padding: 0;
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;
  }
  .adm-sphere-legend li {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 12.5px; color: #2A3032; font-weight: 400;
  }
  .adm-sphere-dot {
    width: 8px; height: 8px; border-radius: 999px;
    flex-shrink: 0;
  }
  .adm-sphere-dot.dot-you    { background: #5B647D; }
  .adm-sphere-dot.dot-tagro  { background: #FFFFFF; border: 1.5px solid #5B647D; }
  .adm-sphere-dot.dot-dev    { background: #FFFFFF; border: 1.5px solid #848D9B; }
  .adm-sphere-dot.dot-festag { background: #FFFFFF; border: 1.5px solid #C2C7D0; }

  /* ---- Chip-Input (Mode team) — 1:1 wie .adm-input + Chip-Zeile oben ---- */
  .adm-chip-input {
    width: 100%;
    min-height: 42px;
    background: #F3F4FA;
    border-radius: 8px !important;
    padding: 0 16px;
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    transition: background .14s, box-shadow .14s;
  }
  .adm-chip-input:focus-within {
    background: #EDEFF8;
    box-shadow: 0 0 0 2px rgba(91,100,125,.12);
  }
  .adm-chip {
    display: inline-flex; align-items: center; gap: 4px;
    height: 26px; padding: 0 6px 0 10px;
    background: #FFFFFF; color: #2A3032;
    border: 1px solid #E7EBF0;
    border-radius: 999px;
    font-size: 12px; font-weight: 500;
  }
  .adm-chip button {
    width: 18px; height: 18px;
    border: 0; background: transparent;
    color: #848D9B; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
  .adm-chip button:hover { background: #F1F3F6; color: #2A3032; }
  .adm-chip-input-field {
    flex: 1; min-width: 140px;
    height: 40px;
    border: 0; outline: 0; background: transparent;
    color: #2A3032; font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px;
    letter-spacing: .01em !important;
  }
  .adm-chip-input-field::placeholder { color: #C2C7D0; letter-spacing: .01em !important; }

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

  /* ---- Success state (Figma 184:88) — EIN Satz, kleiner Zeilenabstand ---- */
  .adm-success {
    display: flex; align-items: center; gap: 16px;
    padding: 4px 60px 0 0;  /* rechts Platz lassen damit Check NICHT ans X stößt */
  }
  .adm-success-text { flex: 1; min-width: 0; }
  .adm-success-title,
  .adm-success-sub {
    margin: 0;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 16px; line-height: 1.35;
    font-weight: 500;
    letter-spacing: -.002em;
  }
  .adm-success-title { color: #1E2126; }
  .adm-success-title strong { font-weight: 500; }
  .adm-success-sub { color: #ADB3BD; }
  .adm-success-mark {
    width: 48px; height: 48px;
    border-radius: 999px !important;
    border: 1px solid #E7EBF0;
    background: #FFFFFF;
    color: #5B647D;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 20px -10px rgba(15,23,42,.18);
  }
  .adm-success-mark svg { width: 20px; height: 20px; }
  .adm-success-mark svg { width: 22px; height: 22px; }

  @media (max-width: 480px) {
    .adm-card { padding: 22px 18px 16px; border-radius: 18px; }
    .adm-title { font-size: 14.5px; }
  }
`
