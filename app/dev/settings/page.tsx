'use client'

/**
 * /dev/settings — Execution profile, availability & integrations.
 *
 * Reads and writes `profiles` directly (RLS scopes every row to the
 * signed-in user). Availability, skills and capacity feed the matching /
 * assignment layer; notification prefs gate the email fan-out in
 * `lib/sync/bus.ts` (notif_email). GitHub connection state is mirrored on
 * `profiles` by the OAuth callback — we show it read-only here and link
 * to /dev/github to manage.
 *
 * Autosave model: text fields persist on blur, toggles / segmented /
 * skills persist immediately. A quiet status pill reflects the write —
 * no "Save" wall, in line with the calm Linear/Stripe UX principles.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Bell, Briefcase, Check, CircleNotch, GithubLogo, LinkedinLogo, Lightning,
  MapPin, Phone, Plus, SignOut, Translate, User, X,
} from '@phosphor-icons/react'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  position: string | null
  bio: string | null
  phone: string | null
  linkedin_url: string | null
  availability: string | null
  skills: string[] | null
  hourly_rate: number | null
  timezone: string | null
  language_pref: string | null
  notif_email: boolean | null
  notif_push: boolean | null
  github_username: string | null
  github_connected_at: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const AVAILABILITY: { id: string; label: string; hint: string }[] = [
  { id: 'full_time',   label: 'Voll verfügbar', hint: 'Nimmt neue Projekte an' },
  { id: 'part_time',   label: 'Teilzeit',       hint: 'Begrenzte Kapazität' },
  { id: 'limited',     label: 'Eingeschränkt',  hint: 'Nur laufende Projekte' },
  { id: 'unavailable', label: 'Nicht verfügbar', hint: 'Pausiert, keine Zuweisungen' },
]
const TIMEZONES = ['Europe/Berlin', 'Europe/London', 'Europe/Lisbon', 'Europe/Athens', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore']
const LANGUAGES: { id: string; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

const ROLE_LABEL: Record<string, string> = {
  dev: 'Developer', developer: 'Developer', admin: 'Admin',
  project_owner: 'Project Owner', designer: 'Designer', marketer: 'Marketer',
  pending_developer: 'In Prüfung',
}

export default function DevSettingsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [p, setP] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [save, setSave] = useState<SaveState>('idle')
  const [skillDraft, setSkillDraft] = useState('')
  const [backendHealth, setBackendHealth] = useState<{ ok: boolean; hints: string[] } | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const meRes = await fetch('/api/dev/me', { credentials: 'include' }).catch(() => null)
    const me = meRes?.ok ? await meRes.json().catch(() => null) : null
    const uid = me?.user?.id
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await (supabase as any).from('profiles')
        .select('id,email,full_name,role,position,bio,phone,linkedin_url,availability,skills,hourly_rate,timezone,language_pref,notif_email,notif_push,github_username,github_connected_at')
        .eq('id', user.id).maybeSingle()
      setP((data as Profile) ?? null)
      setLoading(false)
      return
    }
    const { data } = await (supabase as any).from('profiles')
      .select('id,email,full_name,role,position,bio,phone,linkedin_url,availability,skills,hourly_rate,timezone,language_pref,notif_email,notif_push,github_username,github_connected_at')
      .eq('id', uid).maybeSingle()
    setP((data as Profile) ?? null)
    setLoading(false)
  }, [supabase])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/dev/health', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setBackendHealth({ ok: !!d?.ok, hints: d?.hints ?? [] }))
      .catch(() => setBackendHealth({ ok: false, hints: ['Backend-Check fehlgeschlagen'] }))
  }, [])

  /** Persist a patch for the current user, with a quiet status pill. */
  const persist = useCallback(async (patch: Partial<Profile>) => {
    if (!p) return
    setP(curr => curr ? { ...curr, ...patch } : curr)   // optimistic
    setSave('saving')
    const { error } = await (supabase as any).from('profiles').update(patch).eq('id', p.id)
    if (error) { setSave('error'); return }
    setSave('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSave('idle'), 1800)
  }, [p, supabase])

  // Local-only edit buffer for text fields (persist on blur).
  const [buf, setBuf] = useState<Record<string, string>>({})
  const field = (key: keyof Profile) => (buf[key] !== undefined ? buf[key] : (p?.[key] as string | null) ?? '')
  const onText = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBuf(b => ({ ...b, [key]: e.target.value }))
  const onBlurText = (key: keyof Profile) => () => {
    if (buf[key] === undefined) return
    const next = buf[key].trim()
    if (next === ((p?.[key] as string | null) ?? '')) { setBuf(b => { const n = { ...b }; delete n[key]; return n }); return }
    persist({ [key]: next || null } as Partial<Profile>)
    setBuf(b => { const n = { ...b }; delete n[key]; return n })
  }

  function addSkill() {
    const s = skillDraft.trim()
    if (!s || !p) return
    const current = p.skills ?? []
    if (current.some(x => x.toLowerCase() === s.toLowerCase())) { setSkillDraft(''); return }
    persist({ skills: [...current, s] })
    setSkillDraft('')
  }
  function removeSkill(s: string) {
    if (!p) return
    persist({ skills: (p.skills ?? []).filter(x => x !== s) })
  }

  async function logout() {
    await supabase.auth.signOut()
    try { localStorage.removeItem('festag_dev_session') } catch {}
    window.location.href = '/dev/login'
  }

  if (loading) {
    return (
      <div className="dev-page">
        <header className="dv-head"><h1 className="dv-title">Einstellungen</h1></header>
        <div className="dv-empty"><p>Profil wird geladen…</p></div>
      </div>
    )
  }
  if (!p) {
    return (
      <div className="dev-page">
        <header className="dv-head"><h1 className="dv-title">Einstellungen</h1></header>
        <div className="dv-empty"><p>Kein Profil gefunden. Bitte neu anmelden.</p></div>
      </div>
    )
  }

  const ghConnected = !!p.github_username
  const initials = (p.full_name || p.email || 'D').slice(0, 2).toUpperCase()

  return (
    <div className="dev-page">
      <header className="dv-head">
        <h1 className="dv-title">Einstellungen</h1>
        <div className={`st-save st-${save}`}>
          {save === 'saving' && <><CircleNotch size={13} className="spin" /> Speichert…</>}
          {save === 'saved'  && <><Check size={13} /> Gespeichert</>}
          {save === 'error'  && <><X size={13} /> Fehler — erneut versuchen</>}
        </div>
      </header>

      {backendHealth && !backendHealth.ok && (
        <section className="st-card dev-surface st-backend-warn">
          <p className="st-card-hint"><Lightning size={13} weight="fill" /> Backend-Verbindung unvollständig</p>
          <ul className="st-backend-list">
            {backendHealth.hints.map(h => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="st-backend-foot">
            Lokal: <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>, dann <code>npm run db:push</code>
          </p>
        </section>
      )}

      {/* Identity */}
      <section className="st-card dev-surface">
        <div className="st-identity">
          <div className="st-avatar">{initials}</div>
          <div className="st-identity-main">
            <strong>{p.full_name || p.email?.split('@')[0] || 'Developer'}</strong>
            <span className="st-identity-sub">
              {ROLE_LABEL[p.role ?? ''] ?? 'Developer'}, {p.email}
            </span>
          </div>
        </div>
      </section>

      {/* Availability */}
      <p className="dev-section-title">Verfügbarkeit</p>
      <section className="st-card dev-surface">
        <p className="st-card-hint"><Lightning size={13} weight="regular" /> Steuert, ob dir neue Projekte zugewiesen werden können.</p>
        <div className="st-avail-grid">
          {AVAILABILITY.map(a => (
            <button
              key={a.id}
              type="button"
              className={`st-avail${(p.availability ?? 'full_time') === a.id ? ' on' : ''}`}
              onClick={() => persist({ availability: a.id })}
            >
              <strong>{a.label}</strong>
              <span>{a.hint}</span>
            </button>
          ))}
        </div>
        <div className="st-inline-row">
          <label className="st-field st-field-sm">
            <span className="st-label"><MapPin size={12} weight="regular" /> Zeitzone</span>
            <select className="st-input" value={p.timezone ?? 'Europe/Berlin'} onChange={e => persist({ timezone: e.target.value })}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
            </select>
          </label>
          <label className="st-field st-field-sm">
            <span className="st-label"><Translate size={12} weight="regular" /> Sprache</span>
            <select className="st-input" value={p.language_pref ?? 'de'} onChange={e => persist({ language_pref: e.target.value })}>
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
          <label className="st-field st-field-sm">
            <span className="st-label">Stundensatz (optional)</span>
            <div className="st-rate">
              <input
                className="st-input" type="number" min={0} step={5} inputMode="numeric"
                value={field('hourly_rate' as keyof Profile)}
                placeholder="—"
                onChange={onText('hourly_rate' as keyof Profile)}
                onBlur={() => {
                  const raw = buf['hourly_rate']
                  if (raw === undefined) return
                  const num = raw.trim() === '' ? null : Number(raw)
                  persist({ hourly_rate: Number.isFinite(num as number) ? (num as number) : null })
                  setBuf(b => { const n = { ...b }; delete n['hourly_rate']; return n })
                }}
              />
              <span className="st-rate-unit">€/h</span>
            </div>
          </label>
        </div>
      </section>

      {/* Skills */}
      <p className="dev-section-title">Skill-Profil</p>
      <section className="st-card dev-surface">
        <p className="st-card-hint">Wofür wirst du eingesetzt? Tagro nutzt das beim Matching von Projekten.</p>
        <div className="st-skills">
          {(p.skills ?? []).length === 0 && <span className="st-skills-empty">Noch keine Skills hinterlegt.</span>}
          {(p.skills ?? []).map(s => (
            <span key={s} className="st-skill">
              {s}
              <button type="button" aria-label={`${s} entfernen`} onClick={() => removeSkill(s)}><X size={11} weight="bold" /></button>
            </span>
          ))}
        </div>
        <div className="st-skill-add">
          <input
            className="st-input"
            value={skillDraft}
            placeholder="Skill hinzufügen (z. B. React, Figma, SEO)…"
            onChange={e => setSkillDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
          />
          <button type="button" className="dev-secondary-btn" onClick={addSkill} disabled={!skillDraft.trim()}>
            <Plus size={13} weight="regular" /> Hinzufügen
          </button>
        </div>
      </section>

      {/* Profile details */}
      <p className="dev-section-title">Profil</p>
      <section className="st-card dev-surface">
        <div className="st-fields">
          <label className="st-field">
            <span className="st-label"><User size={12} weight="regular" /> Name</span>
            <input className="st-input" value={field('full_name')} onChange={onText('full_name')} onBlur={onBlurText('full_name')} placeholder="Vor- und Nachname" />
          </label>
          <label className="st-field">
            <span className="st-label"><Briefcase size={12} weight="regular" /> Rolle / Position</span>
            <input className="st-input" value={field('position')} onChange={onText('position')} onBlur={onBlurText('position')} placeholder="z. B. Frontend Developer" />
          </label>
          <label className="st-field">
            <span className="st-label"><Phone size={12} weight="regular" /> Telefon</span>
            <input className="st-input" value={field('phone')} onChange={onText('phone')} onBlur={onBlurText('phone')} placeholder="+49 …" />
          </label>
          <label className="st-field">
            <span className="st-label"><LinkedinLogo size={12} weight="regular" /> LinkedIn</span>
            <input className="st-input" value={field('linkedin_url')} onChange={onText('linkedin_url')} onBlur={onBlurText('linkedin_url')} placeholder="https://linkedin.com/in/…" />
          </label>
          <label className="st-field st-field-full">
            <span className="st-label">Kurzprofil</span>
            <textarea className="st-input st-textarea" rows={3} value={field('bio')} onChange={onText('bio')} onBlur={onBlurText('bio')} placeholder="Ein, zwei Sätze zu deinem Fokus." />
          </label>
        </div>
      </section>

      {/* Notifications */}
      <p className="dev-section-title">Benachrichtigungen</p>
      <section className="st-card dev-surface">
        <Toggle
          icon={<Bell size={14} weight="regular" />}
          title="E-Mail-Benachrichtigungen"
          desc="Wichtige Ereignisse (Reviews, Blocker, Freigaben) zusätzlich per E-Mail."
          on={p.notif_email !== false}
          onToggle={() => persist({ notif_email: !(p.notif_email !== false) })}
        />
        <div className="st-divider" />
        <Toggle
          icon={<Bell size={14} weight="regular" />}
          title="Push-Benachrichtigungen"
          desc="Sofortige Hinweise im Browser / auf dem Gerät."
          on={!!p.notif_push}
          onToggle={() => persist({ notif_push: !p.notif_push })}
        />
      </section>

      {/* Integrations */}
      <p className="dev-section-title">Integrationen</p>
      <section className="st-card dev-surface">
        <div className="st-integration">
          <span className="st-integration-icon"><GithubLogo size={18} weight="regular" /></span>
          <div className="st-integration-main">
            <strong>GitHub</strong>
            <span className="st-integration-sub">
              {ghConnected
                ? `Verbunden als @${p.github_username}${p.github_connected_at ? `, seit ${new Date(p.github_connected_at).toLocaleDateString('de-DE')}` : ''}`
                : 'Read-only — Tagro liest Commits & PRs, pusht oder kommentiert nie.'}
            </span>
          </div>
          <Link href="/dev/github" className="dev-secondary-btn">
            {ghConnected ? 'Verwalten' : 'Verbinden'}
          </Link>
        </div>
      </section>

      {/* Account */}
      <p className="dev-section-title">Konto</p>
      <section className="st-card dev-surface">
        <div className="st-account">
          <div>
            <strong>{p.email}</strong>
            <span className="st-account-sub">{ROLE_LABEL[p.role ?? ''] ?? 'Developer'}</span>
          </div>
          <button type="button" className="dev-secondary-btn st-signout" onClick={logout}>
            <SignOut size={14} weight="regular" /> Abmelden
          </button>
        </div>
      </section>

      <style jsx>{`
        .st-save {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          height: 28px; padding: 0 11px; border-radius: 7px;
          font-size: 11.5px; font-weight: 500; color: var(--dv-text-3);
          opacity: 0; transition: opacity .18s ease, color .18s ease;
        }
        .st-save.st-saving, .st-save.st-saved, .st-save.st-error { opacity: 1; }
        .st-save.st-saved { color: var(--dv-green); }
        .st-save.st-error { color: var(--dv-error); }
        .st-save :global(.spin) { animation: stspin 1s linear infinite; }
        @keyframes stspin { to { transform: rotate(360deg); } }

        .st-card { padding: var(--dv-2, 16px) var(--dv-4, 32px); margin-bottom: 2px; }
        .dev-section-title { margin-top: var(--dv-3, 24px); }
        .st-card-hint {
          display: flex; align-items: center; gap: 6px;
          margin: 0 0 14px; font-size: 12px; color: var(--dv-text-3); line-height: 1.5;
        }
        .st-card-hint :global(svg) { color: var(--dv-text-2); flex-shrink: 0; }

        .st-backend-warn { border: none; background: rgba(255,149,0,.06); }
        .st-backend-list { margin: 0 0 10px; padding-left: 18px; font-size: 13px; line-height: 1.5; color: var(--dv-text-3); }
        .st-backend-foot { margin: 0; font-size: 12px; color: var(--dv-text-3); line-height: 1.45; }
        .st-backend-foot code { font-size: 11px; padding: 1px 5px; border-radius: 4px; background: var(--dv-surface); }

        .st-identity { display: flex; align-items: center; gap: 13px; }
        .st-avatar {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: grid; place-items: center;
          background: var(--dv-surface); border: 1px solid var(--dv-line);
          color: var(--dv-text); font-size: 14px; font-weight: 500; letter-spacing: -.01em;
        }
        .st-identity-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .st-identity-main strong { font-size: 14px; font-weight: 500; letter-spacing: -.01em; color: var(--dv-text); }
        .st-identity-sub { font-size: 12.5px; color: var(--dv-text-3); overflow: hidden; text-overflow: ellipsis; }

        .st-avail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .st-avail {
          text-align: left; padding: 11px 13px; border-radius: var(--dv-r-sm, 8px); cursor: pointer;
          border: 1px solid var(--dv-line); background: transparent; font-family: inherit;
          display: flex; flex-direction: column; gap: 3px;
          transition: border-color var(--dv-speed, .12s), background var(--dv-speed, .12s);
        }
        .st-avail:hover { background: var(--dv-surface); }
        .st-avail.on { border-color: var(--dv-accent); background: rgba(0,122,255,.06); }
        .st-avail strong { font-size: 13px; font-weight: 500; color: var(--dv-text); }
        .st-avail span { font-size: 11.5px; color: var(--dv-text-3); }
        .st-avail.on strong { color: var(--dv-accent); }

        .st-inline-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
        .st-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .st-field-sm { min-width: 150px; }
        .st-field-full { flex-basis: 100%; }
        .st-label { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--dv-text-3); font-weight: 500; }
        .st-label :global(svg) { color: var(--dv-text-2); }
        .st-input {
          width: 100%; height: 34px; padding: 0 11px; border-radius: var(--dv-r-sm, 8px);
          background: var(--dv-canvas); border: 1px solid var(--dv-line);
          color: var(--dv-text); font: inherit; font-size: 13px; outline: none;
          transition: border-color var(--dv-speed, .12s);
        }
        .st-input:focus { border-color: var(--dv-text-3); }
        select.st-input { cursor: pointer; }
        .st-textarea { height: auto; padding: 9px 11px; resize: none; line-height: 1.5; min-height: 70px; field-sizing: content; }
        .st-rate { position: relative; }
        .st-rate-unit { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--dv-text-3); pointer-events: none; }
        .st-rate .st-input { padding-right: 38px; }

        .st-skills { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; min-height: 22px; align-items: center; }
        .st-skills-empty { font-size: 12px; color: var(--dv-text-3); }
        .st-skill {
          display: inline-flex; align-items: center; gap: 6px;
          height: 26px; padding: 0 6px 0 11px; border-radius: 7px;
          background: var(--dv-surface); border: 1px solid var(--dv-line);
          font-size: 12px; color: var(--dv-text); font-weight: 500;
        }
        .st-skill button {
          display: inline-flex; align-items: center; justify-content: center;
          width: 16px; height: 16px; border-radius: 4px; border: 0;
          background: transparent; color: var(--dv-text-3); cursor: pointer;
          transition: background var(--dv-speed, .12s), color var(--dv-speed, .12s);
        }
        .st-skill button:hover { background: rgba(0,122,255,.12); color: var(--dv-accent); }
        .st-skill-add { display: flex; gap: 8px; }
        .st-skill-add .st-input { flex: 1; }
        .st-skill-add :global(.dev-secondary-btn) { flex-shrink: 0; }

        .st-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }

        .st-divider { height: 1px; background: var(--dv-line); margin: 13px 0; }

        .st-integration { display: flex; align-items: center; gap: 12px; }
        .st-integration-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: grid; place-items: center;
          background: var(--dv-surface); border: 1px solid var(--dv-line); color: var(--dv-text);
        }
        .st-integration-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .st-integration-main strong { font-size: 13px; font-weight: 500; color: var(--dv-text); }
        .st-integration-sub { font-size: 11.5px; color: var(--dv-text-3); line-height: 1.45; }
        .st-integration :global(.dev-secondary-btn) { flex-shrink: 0; text-decoration: none; }

        .st-account { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .st-account strong { display: block; font-size: 13px; font-weight: 500; color: var(--dv-text); }
        .st-account-sub { font-size: 11.5px; color: var(--dv-text-3); }
        .st-signout { text-decoration: none; }
        .st-signout:hover { border-color: var(--dv-error); color: var(--dv-error); }

        @media (max-width: 640px) {
          .st-avail-grid { grid-template-columns: 1fr; }
          .st-fields { grid-template-columns: 1fr; }
          .st-field-sm { flex-basis: 100%; }
        }
      `}</style>
    </div>
  )
}

function Toggle({ icon, title, desc, on, onToggle }: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void
}) {
  return (
    <div className="tg-row">
      <span className="tg-icon">{icon}</span>
      <div className="tg-main">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      <button type="button" role="switch" aria-checked={on} className={`tg-switch${on ? ' on' : ''}`} onClick={onToggle}>
        <span className="tg-knob" />
      </button>
      <style jsx>{`
        .tg-row { display: flex; align-items: flex-start; gap: 11px; }
        .tg-icon {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          display: grid; place-items: center;
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text-secondary);
        }
        .tg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .tg-main strong { font-size: 13px; font-weight: 500; color: var(--text); }
        .tg-main span { font-size: 11.5px; color: var(--text-muted); line-height: 1.45; }
        .tg-switch {
          flex-shrink: 0; width: 40px; height: 23px; border-radius: 999px; cursor: pointer;
          border: 1px solid var(--border); background: var(--surface-2);
          position: relative; transition: background .16s ease, border-color .16s ease; padding: 0;
        }
        .tg-switch.on { background: var(--accent); border-color: var(--accent); }
        .tg-knob {
          position: absolute; top: 50%; left: 2px; transform: translateY(-50%);
          width: 17px; height: 17px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: left .16s ease;
        }
        .tg-switch.on .tg-knob { left: 19px; }
      `}</style>
    </div>
  )
}
