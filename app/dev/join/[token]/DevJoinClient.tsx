'use client'

/**
 * DevJoinClient — the visible layer of the invite acceptance page.
 *
 * Three states:
 *   valid   → show invite preview card + "Einladung annehmen" CTA
 *   expired → soft error: link has expired
 *   used    → soft error: invite already accepted
 *   invalid → hard error: token not found
 *
 * Design: Auth chrome (dark OLED, same tokens as /login).
 * No credential forms — dev only clicks one button to accept.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ShieldCheck, Clock, ArrowRight, CheckCircle, XCircle } from '@phosphor-icons/react'

type InviteData = {
  invitedEmail:   string
  inviterName:    string | null
  inviterEmail:   string | null
  workspaceName:  string | null
  role:           string
  message:        string | null
  expiresInHours: number | null
}

type State = 'valid' | 'expired' | 'used' | 'invalid' | 'unavailable'

interface Props {
  token:  string
  state:  State
  invite: InviteData | null
}

const ROLE_LABEL: Record<string, string> = {
  developer: 'Developer',
  designer:  'Designer',
  reviewer:  'Reviewer',
  admin:     'Admin',
  dev:       'Developer',
}

export default function DevJoinClient({ token, state, invite }: Props) {
  const router  = useRouter()
  const [busy,   setBusy]   = useState(false)
  const [done,   setDone]   = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  async function handleAccept() {
    setBusy(true)
    setErrMsg(null)
    try {
      const res = await fetch('/api/dev/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrMsg(json.error ?? 'Unbekannter Fehler.')
        setBusy(false)
        return
      }
      if (json.needsAuth && json.authHref) {
        window.location.assign(json.authHref)
        return
      }
      setDone(true)
      setTimeout(() => {
        router.push(json.redirectTo || '/dev')
      }, 1400)
    } catch {
      setErrMsg('Verbindung fehlgeschlagen. Bitte erneut versuchen.')
      setBusy(false)
    }
  }

  return (
    <div className="dji-root" data-theme-surface="dev">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Security domain badge (top) ───────────────────── */}
      <div className="dji-domain-badge">
        <ShieldCheck size={12} weight="fill" className="dji-domain-icon" />
        <span>festag.app/dev/join</span>
      </div>

      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="dji-logo-wrap">
        <Image
          className="dji-logo"
          src="/brand/auth-logo-dark.png?v=20260725-soft3d"
          alt="Festag"
          width={52}
          height={52}
        />
      </div>

      {/* ── Card ─────────────────────────────────────────────── */}
      <div className="dji-card">
        {state === 'valid' && invite && !done && (
          <>
            <h1 className="dji-title">
              {invite.inviterName ?? 'Ein Festag-Administrator'} lädt dich
              {invite.workspaceName ? ` in „${invite.workspaceName}"` : ''} ein.
            </h1>
            <p className="dji-lede">
              {ROLE_LABEL[invite.role] ?? invite.role}
              {invite.inviterEmail ? `, ${invite.inviterEmail}` : ''}
            </p>

            {invite.message && (
              <div className="dji-section dji-section--message">
                <p className="dji-message">{invite.message}</p>
              </div>
            )}

            {/* Anti-phishing hint */}
            <div className="dji-phishing-note">
              <ShieldCheck size={13} weight="fill" className="dji-phishing-icon" />
              <span>
                Festag fragt hier <strong>keine Passwörter</strong> ab.
                Gültige Einladungslinks kommen ausschließlich von <strong>festag.app</strong>.
              </span>
            </div>

            {/* Accept CTA */}
            {errMsg && <p className="dji-error">{errMsg}</p>}
            <button
              className={`dji-accept-btn${busy ? ' is-busy' : ''}`}
              onClick={handleAccept}
              disabled={busy}
              type="button"
            >
              {busy ? <span className="dji-spinner" /> : <ArrowRight size={16} weight="bold" />}
              {busy ? 'Wird verarbeitet…' : 'Einladung annehmen'}
            </button>

            {/* Expiry */}
            {invite.expiresInHours !== null && invite.expiresInHours > 0 && (
              <div className="dji-expiry">
                <Clock size={11} />
                <span>Läuft in {invite.expiresInHours} Stunden ab</span>
              </div>
            )}
          </>
        )}

        {/* ── Done state ───────────────────────────────────── */}
        {done && (
          <div className="dji-done">
            <CheckCircle size={36} weight="fill" className="dji-done-icon" />
            <p className="dji-done-title">Einladung angenommen. Du wirst weitergeleitet.</p>
          </div>
        )}

        {/* ── Error states ─────────────────────────────────── */}
        {state === 'expired' && (
          <ErrorCard
            icon={<Clock size={32} weight="regular" className="dji-err-icon dji-err-icon--warn" />}
            title="Dieser Einladungslink ist abgelaufen."
            body="Bitte frage die einladende Person um einen neuen Link. Alte Links können aus Sicherheitsgründen nicht verlängert werden."
          />
        )}
        {state === 'used' && (
          <ErrorCard
            icon={<CheckCircle size={32} weight="fill" className="dji-err-icon dji-err-icon--ok" />}
            title="Diese Einladung wurde bereits angenommen."
            body="Melde dich an, wenn du bereits Zugang hast."
            cta={{ label: 'Zur Anmeldung', href: '/login' }}
          />
        )}
        {state === 'invalid' && (
          <ErrorCard
            icon={<XCircle size={32} weight="regular" className="dji-err-icon dji-err-icon--err" />}
            title="Dieser Einladungslink wurde nicht gefunden."
            body="Prüfe, ob du den vollständigen Link aus der E-Mail geöffnet hast. Bei Fragen wende dich an die einladende Person."
          />
        )}
        {state === 'unavailable' && (
          <ErrorCard
            icon={<XCircle size={32} weight="regular" className="dji-err-icon dji-err-icon--warn" />}
            title="Die Einladung konnte gerade nicht geprüft werden."
            body="Bitte versuche es in wenigen Minuten erneut. Wenn es weiter fehlschlägt, kontaktiere die einladende Person."
          />
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <p className="dji-footer">
        <a href="https://festag.app/datenschutz" target="_blank" rel="noopener" className="dji-footer-link">Datenschutz</a>
        <span className="dji-footer-sep" />
        <a href="https://festag.app/agb" target="_blank" rel="noopener" className="dji-footer-link">AGB</a>
        <span className="dji-footer-sep" />
        <span>© Festag {new Date().getFullYear()}</span>
      </p>
    </div>
  )
}

function ErrorCard({
  icon, title, body, cta,
}: {
  icon: React.ReactNode
  title: string
  body: string
  cta?: { label: string; href: string }
}) {
  return (
    <div className="dji-error-card">
      {icon}
      <p className="dji-error-title">{title}</p>
      <p className="dji-error-body">{body}</p>
      {cta && (
        <a href={cta.href} className="dji-error-cta">{cta.label}</a>
      )}
    </div>
  )
}

/* ─── CSS ────────────────────────────────────────────────────────── */
const CSS = `
/* ── Shell ────────────────────────────────────────────────── */
.dji-root {
  min-height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: #000000;
  color: rgba(245,245,247,0.92);
  font-family: var(--font-aeonik, "Aeonik", Inter, -apple-system, sans-serif);
  padding: 48px 20px;
  box-sizing: border-box;
}

/* ── Domain badge ─────────────────────────────────────────── */
.dji-domain-badge {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: rgba(245,245,247,0.45);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 100px;
  padding: 5px 12px;
  white-space: nowrap;
}
.dji-domain-icon {
  color: #5B8A6B;
  flex-shrink: 0;
}

/* ── Logo ─────────────────────────────────────────────────── */
.dji-logo-wrap {
  margin-bottom: 28px;
}
.dji-logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
  border-radius: 14px;
  display: block;
}

/* ── Card ─────────────────────────────────────────────────── */
.dji-card {
  width: 100%;
  max-width: 420px;
  background: #111114;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.dji-title {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: -0.02em;
  color: rgba(245,245,247,0.92);
}
.dji-lede {
  margin: 0 0 22px;
  font-size: 14.5px;
  line-height: 1.55;
  color: rgba(245,245,247,0.48);
}

/* ── Sections inside card ─────────────────────────────────── */
.dji-section {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.dji-section:last-of-type {
  border-bottom: none;
}
.dji-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(245,245,247,0.42);
  margin: 0 0 6px;
}
.dji-sender-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(245,245,247,0.92);
  margin: 0 0 2px;
}
.dji-sender-email {
  font-size: 13px;
  color: rgba(245,245,247,0.42);
  margin: 0;
}

/* Workspace row */
.dji-ws-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.dji-ws-info { flex: 1; min-width: 0; }
.dji-ws-name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(245,245,247,0.92);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dji-role-pill {
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(245,245,247,0.55);
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 100px;
  padding: 4px 12px;
  white-space: nowrap;
  flex-shrink: 0;
}
.dji-message {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(245,245,247,0.65);
  margin: 0;
  white-space: pre-line;
}

/* ── Anti-phishing hint ───────────────────────────────────── */
.dji-phishing-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(245,245,247,0.38);
  background: rgba(91,138,107,0.08);
  border: 1px solid rgba(91,138,107,0.18);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 20px;
}
.dji-phishing-icon {
  color: #5B8A6B;
  flex-shrink: 0;
  margin-top: 1px;
}
.dji-phishing-note strong {
  font-weight: 600;
  color: rgba(245,245,247,0.58);
}

/* ── Accept button ────────────────────────────────────────── */
.dji-accept-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: rgba(245,245,247,0.94);
  color: #0a0a0c;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
  outline: none;
}
.dji-accept-btn:hover { background: #ffffff; }
.dji-accept-btn:active { background: #d9dfe6; }
.dji-accept-btn.is-busy { opacity: 0.7; cursor: default; }
.dji-accept-btn:disabled { opacity: 0.5; cursor: default; }

/* Spinner */
.dji-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(10,10,12,0.25);
  border-top-color: #0a0a0c;
  border-radius: 50%;
  animation: djiSpin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes djiSpin {
  to { transform: rotate(360deg); }
}

/* Expiry */
.dji-expiry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11.5px;
  color: rgba(245,245,247,0.28);
  margin-top: 14px;
}

/* Error inside card */
.dji-error {
  font-size: 13px;
  color: #c45c5c;
  margin: 0 0 12px;
  text-align: center;
}

/* ── Done state ───────────────────────────────────────────── */
.dji-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  text-align: center;
}
.dji-done-icon { color: #5B8A6B; }
.dji-done-title { font-size: 17px; font-weight: 500; line-height: 1.35; margin: 0; color: rgba(245,245,247,0.88); }
.dji-done-sub { font-size: 13px; color: rgba(245,245,247,0.42); margin: 0; }

/* ── Error card ───────────────────────────────────────────── */
.dji-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 0;
  text-align: center;
}
.dji-err-icon--warn { color: #C48B3C; }
.dji-err-icon--ok   { color: #5B8A6B; }
.dji-err-icon--err  { color: #C45C5C; }
.dji-error-title {
  font-size: 18px;
  font-weight: 500;
  color: rgba(245,245,247,0.92);
  margin: 0;
}
.dji-error-body {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(245,245,247,0.48);
  margin: 0;
  max-width: 300px;
}
.dji-error-cta {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(245,245,247,0.82);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s ease;
}
.dji-error-cta:hover { background: rgba(255,255,255,0.11); }

/* ── Footer ───────────────────────────────────────────────── */
.dji-footer {
  margin-top: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(245,245,247,0.22);
}
.dji-footer-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}
.dji-footer-link:hover { color: rgba(245,245,247,0.5); }
.dji-footer-sep {
  width: 1px;
  height: 10px;
  background: rgba(255,255,255,0.1);
}

/* ── Mobile ───────────────────────────────────────────────── */
@media (max-width: 480px) {
  .dji-card { border-radius: 16px; padding: 24px 20px; }
  .dji-root { justify-content: flex-start; padding-top: 80px; }
}
`
