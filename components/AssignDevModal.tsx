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

export type AssignDevMode = 'existing' | 'invite'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

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

  async function submit() {
    const raw = value.trim()
    setError(null)
    // existing: erlaubt @username oder E-Mail. invite: nur E-Mail.
    if (mode === 'invite') {
      if (!/.+@.+\..+/.test(raw)) { setError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    } else {
      if (raw.length < 2) { setError('Bitte @Benutzer oder E-Mail-Adresse eingeben.'); return }
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
      : <><strong>Weise das Projekt einem neuen Dev’ler zu</strong>{' '}<span className="muted">und lade diesen falls nötig damit zu festag ein.</span></>

  const helper = done
    ? null
    : mode === 'existing'
      ? 'Der Dev’ler erhält die Nachricht „Neues Projekt“ in seinem Panel und kann dieses damit bestätigen.'
      : <>Nach erfolgreicher Anmeldung im Dev-Panel gibt es Benutzer und PIN. Finden Sie in <a href="/docs/neues-projekt-erstellen">festag Docs</a> den genauen Ablauf des Vorgangs beschrieben.</>

  return createPortal((
    <div className="adm-overlay" role="dialog" aria-modal="true" aria-label={mode === 'existing' ? 'Dev’ler zuweisen' : 'Dev’ler einladen'}>
      <style>{CSS}</style>
      <div
        className="adm-backdrop"
        onMouseDown={e => {
          if (working) return
          if (e.target === e.currentTarget) onClose()
        }}
        aria-hidden
      />
      <div className={`adm-card${done ? ' is-success' : ''}`} role="document" onMouseDown={e => e.stopPropagation()}>
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
        ) : (
          <>
            <p className="adm-title">{title}</p>
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

const CSS = `
  /* Festag AssignDevModal — Fullscreen-Overlay, Figma 1:1 */
  .adm-overlay {
    position: fixed; inset: 0; z-index: 2147483600;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    animation: admFade .18s ease both;
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
    background: #F3F5F7;
    border: 0;
    border-radius: 8px !important;
    outline: 0;
    color: #2A3032;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-size: 13px; line-height: 1.5; font-weight: 400;
    padding: 0 16px;
    transition: background .14s, box-shadow .14s;
  }
  .adm-input::placeholder { color: #ADB3BD; opacity: 1; }
  .adm-input:focus {
    background: #EDF0F3;
    box-shadow: 0 0 0 2px rgba(91,100,125,.12);
  }

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
