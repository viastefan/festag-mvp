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
      : <><strong>Weise das Projekt einem neuen Dev’ler zu</strong>{' '}und lade diesen falls nötig damit zu festag ein.</>

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
      <div className="adm-card" role="document" onMouseDown={e => e.stopPropagation()}>
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
              <Check size={14} weight="bold" />
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
            {mode === 'invite' && (
              <button
                type="button"
                className="adm-primary"
                onClick={submit}
                disabled={working || !value.trim()}
              >
                {working ? 'Sende …' : 'Einladungslink erstellen'}
              </button>
            )}
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

  .adm-card {
    position: relative; z-index: 1;
    width: min(440px, calc(100vw - 32px));
    background: var(--card);
    border-radius: 16px;
    padding: 22px 22px 18px;
    box-shadow: 0 1px 2px rgba(15,23,42,.06), 0 32px 80px -28px rgba(15,23,42,.35);
    animation: admPop .24s cubic-bezier(.16,1,.3,1) both;
  }
  [data-theme="dark"] .adm-card,
  [data-theme="classic-dark"] .adm-card {
    background: color-mix(in srgb, var(--card) 96%, #fff 4%);
    box-shadow: 0 1px 2px rgba(0,0,0,.5), 0 36px 90px -30px rgba(0,0,0,.7);
  }

  .adm-close {
    position: absolute; top: 12px; right: 12px;
    width: 28px; height: 28px;
    border: 0; background: transparent;
    color: var(--text-muted); border-radius: 999px;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .adm-close:hover:not(:disabled) {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-2) 65%, transparent);
  }
  .adm-close:disabled { opacity: .35; cursor: not-allowed; }

  .adm-title {
    margin: 4px 28px 14px 0;
    font-size: 15px; line-height: 1.45;
    color: var(--text);
    font-weight: 400;
  }
  .adm-title strong { font-weight: 500; }

  .adm-input {
    width: 100%;
    background: transparent;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    outline: 0;
    color: var(--text); font: inherit;
    font-size: 14px; line-height: 1.5;
    padding: 8px 0;
    transition: border-color .14s;
  }
  .adm-input::placeholder { color: var(--text-muted); opacity: .55; }
  .adm-input:focus {
    border-bottom-color: color-mix(in srgb, var(--btn-prim) 60%, var(--border));
  }

  .adm-primary {
    display: inline-flex; align-items: center; justify-content: center;
    width: 100%;
    height: 38px; padding: 0 16px;
    margin-top: 12px;
    border: 0; border-radius: 999px;
    background: var(--btn-prim); color: var(--btn-prim-text);
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: 0;
    cursor: pointer;
    transition: opacity .12s, transform .12s;
  }
  .adm-primary:hover:not(:disabled) { opacity: .92; }
  .adm-primary:active:not(:disabled) { transform: scale(.98); }
  .adm-primary:disabled { opacity: .35; cursor: not-allowed; }

  .adm-help {
    margin: 12px 0 0;
    font-size: 11.5px; line-height: 1.55;
    color: var(--text-muted);
    font-weight: 500;
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

  /* ---- Success state ---- */
  .adm-success {
    display: flex; align-items: center; justify-content: space-between;
    gap: 18px;
    padding: 6px 24px 4px 0;
  }
  .adm-success-text { flex: 1; min-width: 0; }
  .adm-success-title {
    margin: 0 0 4px;
    font-size: 14px; line-height: 1.45;
    color: var(--text);
    font-weight: 400;
  }
  .adm-success-title strong { font-weight: 500; }
  .adm-success-sub {
    margin: 0;
    font-size: 13px; line-height: 1.5;
    color: var(--text-muted);
    font-weight: 500;
  }
  .adm-success-mark {
    width: 30px; height: 30px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    background: var(--card);
    color: var(--text);
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    .adm-card { padding: 22px 18px 16px; border-radius: 18px; }
    .adm-title { font-size: 14.5px; }
  }
`
