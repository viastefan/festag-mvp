'use client'

/**
 * /dev/pending — Wartezimmer für noch nicht freigegebene Developer.
 * Auth-Chrome wie /dev/login. Pollt den Freigabe-Status.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter } from '@/lib/auth-theme'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

type ProfileBits = {
  email: string | null
  github_username: string | null
  github_avatar_url: string | null
  approval_status: string | null
  role: string | null
}

export default function DevPendingPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { mode: theme, setMode: setTheme } = useAuthTheme('dev')
  const [profile, setProfile] = useState<ProfileBits | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'dev') return
    setPanelEnter(true)
    const t = window.setTimeout(() => setPanelEnter(false), 360)
    return () => window.clearTimeout(t)
  }, [])

  function navigateWithFade(href: string) {
    router.prefetch(href)
    try {
      const path = new URL(href, window.location.origin).pathname
      if (isLegalPath(path)) rememberLegalReturn()
    } catch { /* noop */ }
    prepareAuthRouteTransition(href)
    setPageExiting(true)
    setTimeout(() => { window.location.href = href }, 160)
  }

  const refreshStatus = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setChecking(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        setChecking(false)
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('email,github_username,github_avatar_url,approval_status,role')
        .eq('id', user.id)
        .maybeSingle()

      if (prof && ((prof as any).role === 'dev' || (prof as any).role === 'admin' || (prof as any).role === 'project_owner')) {
        prepareAuthRouteTransition('/dev')
        setPageExiting(true)
        window.location.href = '/dev'
        return
      }
      setProfile(prof as ProfileBits | null)
    } finally {
      setLoading(false)
      setChecking(false)
    }
  }, [supabase])

  useEffect(() => {
    void refreshStatus({ silent: true })
    const id = window.setInterval(() => { void refreshStatus({ silent: true }) }, 12_000)
    return () => window.clearInterval(id)
  }, [refreshStatus])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const displayName = profile?.github_username
    ? `@${profile.github_username}`
    : (profile?.email || 'Dein Konto')

  return (
    <main
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{PENDING_EXTRA}</style>

      <div className="al-container">
        <header className="al-header">
          <div className="al-header-actions">
            <AuthDocsPopover />
            <button
              type="button"
              className="al-theme-icon al-theme-icon--header"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
          </div>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section className="al-signin" aria-label="Zugang wird geprüft">
                    <div className="al-signin-head">
                      <div className="al-hero-copy">
                        <h1 className="al-title al-title-display">Dein Zugang wird geprüft</h1>
                        <p className="al-subtitle dp-lede">
                          {loading
                            ? 'Wir laden deinen Profilstatus und prüfen, ob dein Developer-Zugang freigegeben ist.'
                            : 'Sobald ein Project Owner deinen Account freigibt, erscheinen hier deine zugewiesenen Projekte und Tasks. Du musst nichts weiter tun — wir benachrichtigen dich per E-Mail.'}
                        </p>
                      </div>
                    </div>

                    <div className="al-content">
                      <div className="al-signin-stack">
                        {profile && (
                          <div className="dp-meta">
                            {profile.github_avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                className="dp-avatar"
                                src={profile.github_avatar_url}
                                alt=""
                                width={36}
                                height={36}
                              />
                            ) : null}
                            <div className="dp-meta-text">
                              <p className="dp-meta-name">{displayName}</p>
                              {profile.email ? <p className="dp-meta-sub">{profile.email}</p> : null}
                            </div>
                            <span className="dp-chip">
                              {profile.approval_status === 'pending'
                                ? 'Wartet auf Freigabe'
                                : profile.approval_status || 'Unbekannt'}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="al-btn al-btn-primary"
                          onClick={() => void refreshStatus()}
                          disabled={checking || loading}
                        >
                          {checking ? 'Wird geprüft…' : 'Status prüfen'}
                        </button>

                        <p className="dp-foot">
                          Bei Fragen schreib an{' '}
                          <a href="mailto:hi@festag.io">hi@festag.io</a>.
                        </p>

                        <button type="button" className="al-btn al-btn-ghost" onClick={() => void signOut()}>
                          Abmelden
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="al-footer-meta">
          <button
            type="button"
            className="al-theme-icon al-theme-icon--footer"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
        </footer>
      </div>
    </main>
  )
}

const PENDING_EXTRA = `
  .dp-lede {
    margin: 10px 0 0;
    max-width: 36em;
  }
  .dp-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 12px;
    background: rgba(255,255,255,.03);
  }
  .dp-avatar {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .dp-meta-text { flex: 1; min-width: 0; }
  .dp-meta-name {
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
  }
  .dp-meta-sub {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--al-muted, rgba(255,255,255,.55));
  }
  .dp-chip {
    margin-left: auto;
    font-size: 11px;
    font-weight: 500;
    color: inherit;
    opacity: 0.72;
    padding: 4px 8px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 6px;
    white-space: nowrap;
  }
  .dp-foot {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--al-muted, rgba(255,255,255,.55));
    text-align: center;
  }
  .dp-foot a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .al-root[data-theme="light"] .dp-meta,
  .al-root[data-theme="read"] .dp-meta {
    background: rgba(255,255,255,0.72);
    border-color: rgba(0,0,0,0.08);
  }
  .al-root[data-theme="light"] .dp-meta-sub,
  .al-root[data-theme="light"] .dp-foot,
  .al-root[data-theme="read"] .dp-meta-sub,
  .al-root[data-theme="read"] .dp-foot {
    color: #5c5c62;
  }
  .al-root[data-theme="light"] .dp-chip,
  .al-root[data-theme="read"] .dp-chip {
    border-color: rgba(0,0,0,0.1);
    opacity: 0.85;
  }
`
