'use client'

/**
 * /dev/pending — Wartezimmer für noch nicht freigegebene Developer.
 *
 * Wer sich neu mit GitHub anmeldet, landet auf pending_developer + hier.
 * Kein Zugriff auf echte Projekt-Daten, bis ein Admin / Project Owner
 * den Account freigibt (admin-seitig in einer späteren UI). Die Seite
 * ist absichtlich karg und ruhig — keine fake-Funktionalität.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const [profile, setProfile] = useState<ProfileBits | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Access is gated by DevAppShell — never hard-bounce to /login from
      // here (a transient null read would throw an authed user out). If
      // there is genuinely no user the shell handles the redirect.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: prof } = await supabase
        .from('profiles')
        .select('email,github_username,github_avatar_url,approval_status,role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (prof && (prof as any).role === 'dev') {
        // already approved — bounce to DEV portal
        router.replace('/dev'); return
      }
      setProfile(prof as ProfileBits | null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [router, supabase])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main className="dp-page">
      <style>{CSS}</style>
      <div className="dp-card">
        <p className="dp-kicker">Developer access · review</p>
        <h1 className="dp-title">Dein Zugang wird gerade geprüft.</h1>
        <p className="dp-text">
          {loading
            ? 'Wir laden deinen Profilstatus…'
            : 'Sobald ein Project Owner deinen Account freigibt, erscheinen hier deine zugewiesenen Projekte und Tasks. Du musst nichts weiter tun.'}
        </p>

        {profile && (
          <div className="dp-meta">
            <div>
              <p className="dp-meta-name">
                {profile.github_username ? `@${profile.github_username}` : (profile.email || 'Dein Konto')}
              </p>
              <p className="dp-meta-sub">{profile.email}</p>
            </div>
            <span className="dp-chip">
              {profile.approval_status === 'pending' ? 'wartet auf Freigabe' : profile.approval_status || 'unbekannt'}
            </span>
          </div>
        )}

        <p className="dp-foot">
          Wir benachrichtigen dich per E-Mail, sobald dein Zugang aktiv ist.
          Bei Fragen schreib gerne an{' '}
          <a href="mailto:hi@festag.io">hi@festag.io</a>.
        </p>

        <button className="dp-link" type="button" onClick={signOut}>Abmelden</button>
      </div>
    </main>
  )
}

const CSS = `
  .dp-page {
    min-height: 100dvh;
    background: var(--bg);
    color: var(--text);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: var(--font-aeonik,'Aeonik',Inter,sans-serif);
  }
  .dp-card {
    width: 100%; max-width: 460px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px;
  }
  .dp-kicker {
    margin: 0; font-size: 11px; font-weight: 600;
    letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted);
  }
  .dp-title {
    margin: 10px 0 12px;
    font-size: 22px; font-weight: 500; letter-spacing: -.015em;
    color: var(--text);
  }
  .dp-text {
    margin: 0 0 22px;
    font-size: 13.5px; line-height: 1.6; color: var(--text-secondary);
  }
  .dp-meta {
    display: flex; align-items: center; gap: 12px;
    padding: 12px; border: 1px solid var(--border); border-radius: 10px;
    margin-bottom: 22px;
  }
  .dp-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .dp-meta-name { margin: 0; font-size: 13.5px; font-weight: 500; color: var(--text); }
  .dp-meta-sub { margin: 1px 0 0; font-size: 11.5px; color: var(--text-muted); }
  .dp-chip {
    margin-left: auto; font-size: 10.5px; font-weight: 600;
    letter-spacing: .04em; text-transform: uppercase;
    color: var(--accent);
    padding: 3px 8px;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 6px;
    white-space: nowrap;
  }
  .dp-foot {
    margin: 0 0 14px;
    font-size: 12px; line-height: 1.55; color: var(--text-muted);
  }
  .dp-foot a { color: var(--text); text-decoration: underline; text-underline-offset: 2px; }
  .dp-link {
    background: transparent; border: 0; padding: 4px 0;
    color: var(--text-muted); font-size: 12px; cursor: pointer;
    font-family: inherit;
  }
  .dp-link:hover { color: var(--text); }
`
