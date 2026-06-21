'use client'

/**
 * Beitritts-Landing — Link-first, kein PIN.
 *
 * Der Eingeladene öffnet festag.app/invite/<token>. Wir zeigen, wer wozu
 * einlädt, und bieten genau einen Weg:
 *   - eingeloggt   → „Beitreten" (POST /api/invites/join → Redirect)
 *   - nicht        → „Konto erstellen & beitreten" (/register?invite=token)
 *                    bzw. „Ich habe schon ein Konto" (/login?invite=token)
 *
 * Kein Workspace-Zwang: der User behält sein eigenes Konto, das zugewiesene
 * Projekt wird nach dem Beitritt sichtbar. Kunden landen im Client-Panel,
 * Mitwirkende im Projekt.
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthThemeSwitcher from '@/components/AuthThemeSwitcher'
import { useAuthTheme } from '@/lib/auth-theme'

type Info = {
  ok: boolean
  status?: string
  expired?: boolean
  kind?: 'contributor' | 'client'
  email?: string | null
  invitedName?: string | null
  inviterName?: string | null
  workspaceName?: string | null
  projectTitle?: string | null
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const { mode: theme, setMode: setThemeMode } = useAuthTheme('client')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: { session } }, res] = await Promise.all([
        supabase.auth.getSession(),
        fetch(`/api/invites/info?token=${encodeURIComponent(String(token || ''))}`).then(r => r.json()).catch(() => ({ ok: false })),
      ])
      if (cancelled) return
      setAuthed(!!session)
      setInfo(res as Info)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [token, supabase])

  async function join() {
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/invites/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error === 'invite-expired'
          ? 'Diese Einladung ist abgelaufen oder wurde bereits verwendet.'
          : 'Beitritt fehlgeschlagen. Bitte versuche es erneut.')
        setJoining(false)
        return
      }
      router.replace(data.redirect || '/dashboard')
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
      setJoining(false)
    }
  }

  const goRegister = () => {
    const q = new URLSearchParams({ invite: String(token) })
    if (info?.email) q.set('email', info.email)
    router.push(`/register?${q.toString()}`)
  }
  const goLogin = () => {
    const q = new URLSearchParams({ invite: String(token) })
    if (info?.email) q.set('email', info.email)
    router.push(`/login?${q.toString()}`)
  }

  const isClient = info?.kind === 'client'
  const inviter = info?.inviterName || info?.workspaceName || 'Ein Festag-Workspace'
  const roleWord = isClient ? 'als Kunde' : 'als Mitwirkender'

  return (
    <main className="inv2" data-theme={theme}>
      <div className="inv2-theme-switch">
        <AuthThemeSwitcher mode={theme} onChange={setThemeMode} variant="compact" />
      </div>
      <style jsx global>{CSS}</style>
      <div className="inv2-card">
        <img src="/brand/logo.svg" alt="festag" className="inv2-logo" />

        {loading ? (
          <div className="inv2-loading">Einladung wird geladen…</div>
        ) : !info?.ok || info?.expired ? (
          <>
            <h1 className="inv2-title">Einladung nicht verfügbar</h1>
            <p className="inv2-lede">
              Dieser Link ist abgelaufen, wurde bereits verwendet oder ist ungültig.
              Bitte den Workspace um einen neuen Link.
            </p>
            <button type="button" className="inv2-primary" onClick={() => router.push('/login')}>
              Zum Login
            </button>
          </>
        ) : (
          <>
            <p className="inv2-kicker">{inviter} lädt dich ein</p>
            <h1 className="inv2-title">
              {info.projectTitle ? <>Tritt „{info.projectTitle}" bei</> : 'Tritt dem Workspace bei'}
            </h1>
            <p className="inv2-lede">
              {isClient
                ? 'Du bekommst Zugriff auf ruhige, geprüfte Statusberichte und Entscheidungen — keine Roh-Arbeit. Du behältst dein eigenes Festag-Konto.'
                : 'Du arbeitest mit am Projekt — mit Zugriff auf das Execution Panel und deine Aufgaben. Du behältst dein eigenes Festag-Konto.'}
            </p>

            <div className="inv2-meta">
              <Row label="Rolle" value={isClient ? 'Kunde · Lesezugriff' : 'Mitwirkender · Projektzugang'} />
              {info.projectTitle && <Row label="Projekt" value={info.projectTitle} />}
              <Row label="Eingeladen" value={roleWord} />
            </div>

            {error && <p className="inv2-error" role="alert">{error}</p>}

            {authed ? (
              <button type="button" className="inv2-primary" onClick={join} disabled={joining}>
                {joining ? 'Beitritt läuft…' : 'Jetzt beitreten →'}
              </button>
            ) : (
              <div className="inv2-actions">
                <button type="button" className="inv2-primary" onClick={goRegister}>
                  Konto erstellen & beitreten →
                </button>
                <button type="button" className="inv2-ghost" onClick={goLogin}>
                  Ich habe schon ein Konto
                </button>
              </div>
            )}

            <p className="inv2-fine">
              Wenn du diese Einladung nicht erwartet hast, kannst du die Seite einfach schließen.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="inv2-row">
      <span className="inv2-row-label">{label}</span>
      <span className="inv2-row-value">{value}</span>
    </div>
  )
}

const CSS = `
  html, body { background: #000000; color: #E8E8E5; }
  .inv2 {
    min-height: 100dvh; width: 100%;
    background: #000000; color: #E8E8E5;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 500; letter-spacing: var(--ls-body, 0.017em);
    -webkit-font-smoothing: antialiased;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 20px;
  }
  .inv2-card { width: 100%; max-width: 440px; display: flex; flex-direction: column; }
  .inv2-logo { height: 18px; width: auto; margin: 0 auto 30px; opacity: .9; }
  .inv2-loading { text-align: center; color: rgba(255,255,255,.55); font-size: 13.5px; padding: 28px 0; }

  .inv2-kicker {
    margin: 0 0 8px; text-align: center;
    font-size: 12.5px; color: rgba(255,255,255,.55);
    letter-spacing: var(--ls-body, 0.017em);
  }
  .inv2-title {
    margin: 0; text-align: center;
    font-size: 26px; font-weight: 500; line-height: 1.22;
    letter-spacing: var(--ls-header, 0.012em); color: #FFFFFF;
  }
  .inv2-lede {
    margin: 12px 0 24px; text-align: center;
    font-size: 14px; line-height: 1.6; color: rgba(255,255,255,.58);
    letter-spacing: var(--ls-body, 0.017em);
  }

  .inv2-meta {
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    overflow: hidden; margin-bottom: 22px;
  }
  .inv2-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding: 12px 16px;
    border-top: 1px solid rgba(255,255,255,.06);
  }
  .inv2-row:first-child { border-top: 0; }
  .inv2-row-label { font-size: 12.5px; color: rgba(255,255,255,.45); }
  .inv2-row-value { font-size: 13px; color: #FFFFFF; text-align: right; }

  .inv2-actions { display: flex; flex-direction: column; gap: 10px; }
  .inv2-primary {
    width: 100%; height: 48px; padding: 0 24px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.08);
    background: linear-gradient(180deg, #262E3A 0%, #1B222B 100%);
    color: #FFFFFF; font: inherit; font-size: 14.5px; font-weight: 500;
    letter-spacing: var(--ls-body, 0.017em); cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.35), 0 6px 18px -6px rgba(0,0,0,.45);
    transition: transform .14s ease, box-shadow .14s ease, background .14s ease, opacity .14s ease;
  }
  .inv2-primary:hover:not(:disabled) {
    background: linear-gradient(180deg, #2D3543 0%, #1F2731 100%);
    transform: translateY(-1px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 2px 4px rgba(0,0,0,.40), 0 10px 24px -8px rgba(0,0,0,.55);
  }
  .inv2-primary:active:not(:disabled) { transform: translateY(0); }
  .inv2-primary:disabled { opacity: .5; cursor: not-allowed; }

  .inv2-ghost {
    width: 100%; height: 44px; padding: 0 18px;
    border-radius: 999px; border: 1px solid transparent;
    background: transparent; color: rgba(255,255,255,.6);
    font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer;
    transition: color .14s ease, background .14s ease;
  }
  .inv2-ghost:hover { color: rgba(255,255,255,.92); background: rgba(255,255,255,.04); }

  .inv2-error {
    margin: 0 0 14px; padding: 10px 12px;
    border: 1px solid rgba(209,67,67,.35); background: rgba(209,67,67,.08);
    border-radius: 8px; font-size: 12.5px; color: #F5B5B5; text-align: center;
  }
  .inv2-fine {
    margin: 18px 0 0; text-align: center;
    font-size: 11.5px; color: rgba(255,255,255,.38); line-height: 1.5;
  }

  .inv2-theme-switch {
    position: fixed;
    top: max(20px, env(safe-area-inset-top));
    right: 20px;
    z-index: 10;
  }

  html[data-theme="light"] body,
  .inv2[data-theme="light"] { background: #F5F5F7; color: #1D1D1F; }
  html[data-theme="read"] body,
  .inv2[data-theme="read"] { background: #F7F4EC; color: #4A4030; }
  .inv2[data-theme="light"] .inv2-title,
  .inv2[data-theme="read"] .inv2-title { color: #1D1D1F; }
  .inv2[data-theme="light"] .inv2-kicker,
  .inv2[data-theme="light"] .inv2-lede,
  .inv2[data-theme="light"] .inv2-row-label,
  .inv2[data-theme="light"] .inv2-fine,
  .inv2[data-theme="read"] .inv2-kicker,
  .inv2[data-theme="read"] .inv2-lede,
  .inv2[data-theme="read"] .inv2-row-label,
  .inv2[data-theme="read"] .inv2-fine { color: #86868B; }
  .inv2[data-theme="light"] .inv2-row-value,
  .inv2[data-theme="read"] .inv2-row-value { color: #1D1D1F; }
  .inv2[data-theme="light"] .inv2-meta,
  .inv2[data-theme="read"] .inv2-meta {
    background: #FFFFFF;
    border-color: rgba(0,0,0,0.08);
  }
  .inv2[data-theme="light"] .inv2-row,
  .inv2[data-theme="read"] .inv2-row { border-top-color: rgba(0,0,0,0.06); }
  .inv2[data-theme="light"] .inv2-primary,
  .inv2[data-theme="read"] .inv2-primary {
    background: #1D1D1F;
    border-color: #1D1D1F;
    box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 8px 20px rgba(15,23,42,0.10);
  }
  .inv2[data-theme="light"] .inv2-primary:hover:not(:disabled),
  .inv2[data-theme="read"] .inv2-primary:hover:not(:disabled) {
    background: #2C2C2E;
    box-shadow: 0 2px 8px rgba(15,23,42,0.10), 0 12px 28px rgba(15,23,42,0.12);
  }
  .inv2[data-theme="light"] .inv2-ghost,
  .inv2[data-theme="read"] .inv2-ghost { color: #86868B; }
  .inv2[data-theme="light"] .inv2-ghost:hover,
  .inv2[data-theme="read"] .inv2-ghost:hover {
    color: #1D1D1F;
    background: rgba(0,0,0,0.04);
  }
  .inv2[data-theme="light"] .inv2-loading,
  .inv2[data-theme="read"] .inv2-loading { color: #86868B; }
`
