'use client'

/**
 * InviteDevModal — send a developer invite from the dev team panel.
 *
 * Calls POST /api/dev/create-invite → gets back a secure invite link.
 * Until email delivery (Resend) is configured, the link is shown for
 * manual copying. Once the env variable RESEND_API_KEY is set and the
 * email block in the API route is uncommented, the modal shows a
 * "Mail versendet" confirmation instead.
 */

import { useState, useRef, useEffect } from 'react'
import { X, Copy, CheckCircle, ArrowRight, Envelope } from '@phosphor-icons/react'

interface Props {
  open: boolean
  onClose: () => void
}

const ROLE_OPTIONS = [
  { id: 'developer', label: 'Developer' },
  { id: 'designer',  label: 'Designer' },
  { id: 'reviewer',  label: 'Reviewer' },
  { id: 'admin',     label: 'Admin' },
]

export default function InviteDevModal({ open, onClose }: Props) {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState('developer')
  const [message, setMessage] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [link,    setLink]    = useState<string | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setEmail(''); setRole('developer'); setMessage('')
      setLink(null); setCopied(false); setErrMsg(null); setBusy(false)
      setTimeout(() => emailRef.current?.focus(), 80)
    }
  }, [open])

  async function handleSend() {
    setErrMsg(null)
    setBusy(true)
    try {
      const res = await fetch('/api/dev/create-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message: message || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error ?? 'Fehler.'); setBusy(false); return }
      setLink(json.link)
    } catch {
      setErrMsg('Verbindung fehlgeschlagen.')
    }
    setBusy(false)
  }

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) return null

  return (
    <div className="idm-backdrop" role="dialog" aria-modal="true" aria-label="Developer einladen" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <style>{CSS}</style>
      <div className="idm-panel">
        {/* Header */}
        <div className="idm-head">
          <div className="idm-head-left">
            <Envelope size={16} weight="regular" className="idm-head-icon" />
            <span className="idm-head-title">Developer einladen</span>
          </div>
          <button className="idm-close" onClick={onClose} aria-label="Schließen" type="button">
            <X size={14} weight="bold" />
          </button>
        </div>

        {!link ? (
          /* ── Form ───────────────────────────────────────── */
          <div className="idm-body">
            <div className="idm-field">
              <label className="idm-label" htmlFor="idm-email">E-Mail-Adresse</label>
              <input
                id="idm-email"
                ref={emailRef}
                className="idm-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="dev@example.com"
                autoComplete="email"
                onKeyDown={e => { if (e.key === 'Enter' && email) handleSend() }}
              />
            </div>

            <div className="idm-field">
              <label className="idm-label">Rolle</label>
              <div className="idm-role-row">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className={`idm-role-chip${role === r.id ? ' is-active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="idm-field">
              <label className="idm-label" htmlFor="idm-msg">Persönliche Nachricht <span className="idm-optional">(optional)</span></label>
              <textarea
                id="idm-msg"
                className="idm-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hallo! Ich freue mich, dass du dabei bist…"
                rows={3}
              />
            </div>

            {errMsg && <p className="idm-err">{errMsg}</p>}

            <button
              className={`idm-send-btn${busy ? ' is-busy' : ''}`}
              onClick={handleSend}
              disabled={busy || !email}
              type="button"
            >
              {busy
                ? <><span className="idm-spinner" />Wird erstellt…</>
                : <><ArrowRight size={14} weight="bold" />Einladungslink erstellen</>}
            </button>

            <p className="idm-note">
              Der Einladungslink ist 72 Stunden gültig und kann nur einmal verwendet werden.
              Der Devler sieht deinen Namen und Workspace, bevor er annimmt.
            </p>
          </div>
        ) : (
          /* ── Link result ─────────────────────────────────── */
          <div className="idm-body">
            <div className="idm-success-wrap">
              <CheckCircle size={28} weight="fill" className="idm-success-icon" />
              <p className="idm-success-title">Einladungslink bereit</p>
              <p className="idm-success-sub">
                Sende diesen Link an <strong>{email}</strong>.
                Er öffnet eine sichere Festag-Einladungsseite.
              </p>
            </div>

            <div className="idm-link-box">
              <span className="idm-link-text">{link}</span>
              <button className="idm-copy-btn" onClick={copyLink} type="button" title="Kopieren">
                {copied
                  ? <CheckCircle size={14} weight="fill" className="idm-copy-ok" />
                  : <Copy size={14} weight="regular" />}
              </button>
            </div>

            <p className="idm-link-hint">
              ✉️ Tipp: Sobald ein E-Mail-Dienst (z.B. Resend) konfiguriert ist,
              wird der Link automatisch direkt versendet.
            </p>

            <button className="idm-another-btn" onClick={() => setLink(null)} type="button">
              Weitere Einladung erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
.idm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.idm-panel {
  width: 100%;
  max-width: 440px;
  background: var(--fp-bg, #1a1a1e);
  border: 1px solid var(--fp-border, rgba(255,255,255,0.08));
  border-radius: 18px;
  overflow: hidden;
  animation: idmIn 0.18s cubic-bezier(0.16,1,0.3,1);
}
@keyframes idmIn {
  from { opacity:0; transform:scale(0.96) translateY(6px); }
  to   { opacity:1; transform:none; }
}

/* Head */
.idm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--fp-border, rgba(255,255,255,0.07));
}
.idm-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.idm-head-icon { color: rgba(245,245,247,0.45); }
.idm-head-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(245,245,247,0.88);
}
.idm-close {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(245,245,247,0.42);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.idm-close:hover { background: rgba(255,255,255,0.07); color: rgba(245,245,247,0.8); }

/* Body */
.idm-body {
  padding: 24px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* Fields */
.idm-field { display:flex; flex-direction:column; gap:7px; }
.idm-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(245,245,247,0.45);
  letter-spacing: 0.02em;
}
.idm-optional {
  font-size: 11px;
  color: rgba(245,245,247,0.25);
  font-weight: 400;
}
.idm-input {
  height: 40px;
  padding: 0 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  color: rgba(245,245,247,0.88);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.idm-input:focus { border-color: rgba(255,255,255,0.22); }
.idm-input::placeholder { color: rgba(245,245,247,0.25); }

.idm-textarea {
  padding: 10px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  color: rgba(245,245,247,0.88);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
  line-height: 1.55;
  field-sizing: content;
}
.idm-textarea:focus { border-color: rgba(255,255,255,0.22); }
.idm-textarea::placeholder { color: rgba(245,245,247,0.25); }

/* Role chips */
.idm-role-row { display: flex; gap: 6px; flex-wrap: wrap; }
.idm-role-chip {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.04);
  color: rgba(245,245,247,0.55);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.idm-role-chip:hover { background: rgba(255,255,255,0.08); color: rgba(245,245,247,0.82); }
.idm-role-chip.is-active {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.22);
  color: rgba(245,245,247,0.92);
}

/* Send */
.idm-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: rgba(245,245,247,0.92);
  color: #0a0a0c;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.idm-send-btn:hover { background: #fff; }
.idm-send-btn:disabled { opacity: 0.5; cursor: default; }
.idm-send-btn.is-busy { opacity: 0.7; cursor: default; }
.idm-spinner {
  width: 14px; height: 14px;
  border: 1.5px solid rgba(10,10,12,0.25);
  border-top-color: #0a0a0c;
  border-radius: 50%;
  animation: idmSpin 0.7s linear infinite;
}
@keyframes idmSpin { to { transform:rotate(360deg); } }

.idm-err { font-size:13px; color:#c45c5c; margin:0; text-align:center; }

.idm-note {
  font-size: 12px;
  line-height: 1.55;
  color: rgba(245,245,247,0.3);
  margin: -6px 0 0;
}

/* Success */
.idm-success-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding-bottom: 4px;
}
.idm-success-icon { color: #5B8A6B; }
.idm-success-title { font-size: 16px; font-weight: 500; margin: 0; color: rgba(245,245,247,0.9); }
.idm-success-sub { font-size: 13px; line-height: 1.6; color: rgba(245,245,247,0.48); margin: 0; }
.idm-success-sub strong { color: rgba(245,245,247,0.72); }

.idm-link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 10px;
  padding: 10px 12px;
}
.idm-link-text {
  font-size: 12px;
  color: rgba(245,245,247,0.5);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}
.idm-copy-btn {
  flex-shrink: 0;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
  color: rgba(245,245,247,0.55);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.idm-copy-btn:hover { background: rgba(255,255,255,0.10); }
.idm-copy-ok { color: #5B8A6B; }

.idm-link-hint {
  font-size: 12px;
  line-height: 1.55;
  color: rgba(245,245,247,0.3);
  margin: -4px 0 0;
  text-align: center;
}
.idm-another-btn {
  height: 38px;
  border-radius: 9px;
  border: 1px solid rgba(255,255,255,0.10);
  background: transparent;
  color: rgba(245,245,247,0.55);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.idm-another-btn:hover { background: rgba(255,255,255,0.06); color: rgba(245,245,247,0.82); }
`
