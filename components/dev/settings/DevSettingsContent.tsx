'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, CircleNotch, GithubLogo, Plus, SignOut, X,
} from '@phosphor-icons/react'

import { createClient } from '@/lib/supabase/client'
import { getTheme, setTheme, type PanelThemeMode, type ThemeMode } from '@/lib/theme'
import {
  applyUiDensity,
  getReducedMotion,
  getUiDensity,
  setReducedMotion,
  setUiDensity,
  type UiDensity,
} from '@/components/settings/settings-prefs'
import {
  DEV_SETTINGS_META,
  SETTINGS_SOON,
  type DevSettingsSectionId,
} from '@/lib/dev-settings-config'
import {
  SettingsRow,
  SettingsSection,
  SettingsSegmented,
  SettingsToggle,
} from '@/components/dev/settings/DevSettingsPrimitives'

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

const AVAILABILITY = [
  { id: 'full_time', label: 'Voll verfügbar', hint: 'Nimmt neue Projekte an' },
  { id: 'part_time', label: 'Teilzeit', hint: 'Begrenzte Kapazität' },
  { id: 'limited', label: 'Eingeschränkt', hint: 'Nur laufende Projekte' },
  { id: 'unavailable', label: 'Nicht verfügbar', hint: 'Pausiert' },
]
const TIMEZONES = ['Europe/Berlin', 'Europe/London', 'Europe/Lisbon', 'Europe/Athens', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore']
const LANGUAGES = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]
const ROLE_LABEL: Record<string, string> = {
  dev: 'Developer', developer: 'Developer', admin: 'Admin',
  project_owner: 'Project Owner', designer: 'Designer',
  pending_developer: 'In Prüfung',
}

const AI_MEMORY_KEY = 'festag-dev-tagro-memory'
const AI_VOICE_KEY = 'festag-dev-tagro-voice'
const AI_SUGGEST_KEY = 'festag-dev-tagro-suggestions'

function PageHead({
  section,
  save,
}: {
  section: DevSettingsSectionId
  save?: SaveState
}) {
  const meta = DEV_SETTINGS_META[section]
  return (
    <header className="ds-page-head">
      <div>
        <h1>{meta.title}</h1>
        <p className="ds-page-desc">{meta.description}</p>
      </div>
      {save && save !== 'idle' ? (
        <div className={`ds-save${save === 'saved' ? ' is-saved' : ''}${save === 'error' ? ' is-error' : ''}`}>
          {save === 'saving' && <><CircleNotch size={13} className="spin" /> Speichert…</>}
          {save === 'saved' && <><Check size={13} /> Gespeichert</>}
          {save === 'error' && <><X size={13} /> Fehler</>}
        </div>
      ) : null}
      <style jsx global>{`
        .spin { animation: dsSpin .8s linear infinite; }
        @keyframes dsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  )
}

function useProfileSettings() {
  const supabase = useMemo(() => createClient(), [])
  const [p, setP] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [save, setSave] = useState<SaveState>('idle')
  const [buf, setBuf] = useState<Record<string, string>>({})
  const [skillDraft, setSkillDraft] = useState('')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await (supabase as any).from('profiles')
      .select('id,email,full_name,role,position,bio,phone,linkedin_url,availability,skills,hourly_rate,timezone,language_pref,notif_email,notif_push,github_username,github_connected_at')
      .eq('id', user.id).maybeSingle()
    setP((data as Profile) ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const persist = useCallback(async (patch: Partial<Profile>) => {
    if (!p) return
    setP(curr => curr ? { ...curr, ...patch } : curr)
    setSave('saving')
    const { error } = await (supabase as any).from('profiles').update(patch).eq('id', p.id)
    if (error) { setSave('error'); return }
    setSave('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSave('idle'), 1600)
  }, [p, supabase])

  const field = (key: keyof Profile) => (buf[key] !== undefined ? buf[key] : (p?.[key] as string | null) ?? '')
  const onText = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setBuf(b => ({ ...b, [key]: e.target.value }))
  const onBlurText = (key: keyof Profile) => () => {
    if (buf[key] === undefined) return
    const next = buf[key].trim()
    if (next === ((p?.[key] as string | null) ?? '')) {
      setBuf(b => { const n = { ...b }; delete n[key]; return n })
      return
    }
    persist({ [key]: next || null } as Partial<Profile>)
    setBuf(b => { const n = { ...b }; delete n[key]; return n })
  }

  return { p, loading, save, persist, field, onText, onBlurText, skillDraft, setSkillDraft, supabase }
}

function ProfileSection() {
  const { p, loading, save, persist, field, onText, onBlurText, skillDraft, setSkillDraft, supabase } = useProfileSettings()

  if (loading) return <PageHead section="profile" />
  if (!p) {
    return (
      <>
        <PageHead section="profile" />
        <p className="ds-hint">Kein Profil gefunden. Bitte neu anmelden.</p>
      </>
    )
  }

  function addSkill() {
    const s = skillDraft.trim()
    if (!s || !p) return
    const current = p.skills ?? []
    if (current.some(x => x.toLowerCase() === s.toLowerCase())) { setSkillDraft(''); return }
    persist({ skills: [...current, s] })
    setSkillDraft('')
  }

  async function logout() {
    await supabase.auth.signOut()
    try { localStorage.removeItem('festag_dev_session') } catch {}
    window.location.href = '/dev/login'
  }

  return (
    <>
      <PageHead section="profile" save={save} />

      <SettingsSection title="Verfügbarkeit">
        <div style={{ padding: '14px 16px 6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {AVAILABILITY.map(a => (
              <button
                key={a.id}
                type="button"
                className="ds-btn"
                style={{
                  height: 'auto',
                  padding: '10px 12px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  background: (p.availability ?? 'full_time') === a.id ? 'var(--ds-active)' : 'transparent',
                  color: 'var(--ds-text)',
                }}
                onClick={() => persist({ availability: a.id })}
              >
                <strong style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</strong>
                <span style={{ fontSize: 12, color: 'var(--ds-text-3)' }}>{a.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <SettingsRow title="Zeitzone" description="Für Deadlines und Briefings.">
          <select className="ds-select" value={p.timezone ?? 'Europe/Berlin'} onChange={e => persist({ timezone: e.target.value })}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
          </select>
        </SettingsRow>
        <SettingsRow title="Sprache" description="UI-Sprache im Execution Panel.">
          <select className="ds-select" value={p.language_pref ?? 'de'} onChange={e => persist({ language_pref: e.target.value })}>
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </SettingsRow>
        <SettingsRow title="Stundensatz" description="Optional, nur intern sichtbar.">
          <input
            className="ds-input"
            type="number"
            min={0}
            step={5}
            value={field('hourly_rate' as keyof Profile)}
            placeholder="—"
            onChange={onText('hourly_rate' as keyof Profile)}
            onBlur={() => {
              const raw = field('hourly_rate' as keyof Profile)
              const num = raw.trim() === '' ? null : Number(raw)
              persist({ hourly_rate: Number.isFinite(num as number) ? (num as number) : null })
            }}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Skill-Profil">
        <div style={{ padding: '14px 16px' }}>
          <p className="ds-hint">Tagro nutzt das beim Matching von Projekten.</p>
          <div className="ds-chips">
            {(p.skills ?? []).map(s => (
              <span key={s} className="ds-chip">
                {s}
                <button type="button" aria-label={`${s} entfernen`} onClick={() => persist({ skills: (p.skills ?? []).filter(x => x !== s) })}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="ds-input"
              style={{ maxWidth: 'none', flex: 1 }}
              value={skillDraft}
              placeholder="Skill hinzufügen…"
              onChange={e => setSkillDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            />
            <button type="button" className="ds-btn" onClick={addSkill} disabled={!skillDraft.trim()}>
              <Plus size={13} /> Hinzufügen
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Persönliche Angaben">
        <SettingsRow title="Name">
          <input className="ds-input" value={field('full_name')} onChange={onText('full_name')} onBlur={onBlurText('full_name')} placeholder="Vor- und Nachname" />
        </SettingsRow>
        <SettingsRow title="Rolle / Position">
          <input className="ds-input" value={field('position')} onChange={onText('position')} onBlur={onBlurText('position')} placeholder="z. B. Frontend Developer" />
        </SettingsRow>
        <SettingsRow title="Telefon">
          <input className="ds-input" value={field('phone')} onChange={onText('phone')} onBlur={onBlurText('phone')} placeholder="+49 …" />
        </SettingsRow>
        <SettingsRow title="LinkedIn">
          <input className="ds-input" value={field('linkedin_url')} onChange={onText('linkedin_url')} onBlur={onBlurText('linkedin_url')} placeholder="https://linkedin.com/in/…" />
        </SettingsRow>
        <div className="ds-row" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ds-row-copy" style={{ width: '100%' }}>
            <p className="ds-row-title">Kurzprofil</p>
            <textarea className="ds-textarea" style={{ marginTop: 8 }} value={field('bio')} onChange={onText('bio')} onBlur={onBlurText('bio')} placeholder="Ein, zwei Sätze zu deinem Fokus." />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Konto">
        <SettingsRow title={p.email || 'Konto'} description={ROLE_LABEL[p.role ?? ''] ?? 'Developer'}>
          <button type="button" className="ds-btn" onClick={logout}>
            <SignOut size={14} /> Abmelden
          </button>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function AppearanceSection() {
  const [themeMode, setThemeMode] = useState<PanelThemeMode>('dark')
  const [density, setDensity] = useState<UiDensity>('comfortable')
  const [reduced, setReduced] = useState(false)
  const [save, setSave] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setThemeMode(getTheme('dev'))
    setDensity(getUiDensity())
    setReduced(getReducedMotion())
  }, [])

  function flash() {
    setSave('saved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSave('idle'), 1400)
  }

  function applyTheme(next: ThemeMode) {
    setTheme(next, 'dev')
    setThemeMode(getTheme('dev'))
    flash()
  }

  return (
    <>
      <PageHead section="appearance" save={save} />
      <SettingsSection title="Theme">
        <SettingsRow title="Erscheinungsbild" description="Gilt für das Execution Panel.">
          <SettingsSegmented
            value={(themeMode === 'dark' || themeMode === 'light' || themeMode === 'read') ? themeMode : 'dark'}
            options={[
              { id: 'light' as const, label: 'Hell' },
              { id: 'dark' as const, label: 'Dunkel' },
              { id: 'read' as const, label: 'Lesen' },
            ]}
            onChange={id => applyTheme(id)}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Dichte & Bewegung">
        <SettingsRow title="Sidebar-Dichte" description="Kompakter oder komfortabler Abstand in Listen.">
          <SettingsSegmented
            value={density}
            options={[
              { id: 'compact', label: 'Kompakt' },
              { id: 'comfortable', label: 'Komfortabel' },
            ]}
            onChange={id => {
              setUiDensity(id)
              applyUiDensity(id)
              setDensity(id)
              flash()
            }}
          />
        </SettingsRow>
        <SettingsRow title="Reduzierte Bewegung" description="Weniger Animationen im gesamten Panel.">
          <SettingsToggle
            on={reduced}
            label="Reduzierte Bewegung"
            onToggle={() => {
              const next = !reduced
              setReducedMotion(next)
              setReduced(next)
              flash()
            }}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Weitere Optionen" soon={SETTINGS_SOON}>
        <SettingsRow title="Akzentfarbe" description="Workspace-Akzent für Highlights und Status.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Code-Schrift" description="Monospace für Branches, Diffs und Logs.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function NotificationsSection() {
  const { p, loading, save, persist } = useProfileSettings()
  if (loading || !p) return <PageHead section="notifications" />
  return (
    <>
      <PageHead section="notifications" save={save} />
      <SettingsSection title="Kanäle">
        <SettingsRow title="E-Mail" description="Reviews, Blocker und Freigaben zusätzlich per Mail.">
          <SettingsToggle
            on={p.notif_email !== false}
            label="E-Mail-Benachrichtigungen"
            onToggle={() => persist({ notif_email: !(p.notif_email !== false) })}
          />
        </SettingsRow>
        <SettingsRow title="Push" description="Sofortige Hinweise im Browser.">
          <SettingsToggle
            on={!!p.notif_push}
            label="Push-Benachrichtigungen"
            onToggle={() => persist({ notif_push: !p.notif_push })}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Feintuning" soon={SETTINGS_SOON}>
        <SettingsRow title="Quiet Hours" description="Zeiten, in denen Festag schweigt.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Digest" description="Tägliche oder wöchentliche Zusammenfassung.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function GitHubSection() {
  const { p, loading } = useProfileSettings()
  if (loading || !p) return <PageHead section="github" />
  const connected = !!p.github_username
  return (
    <>
      <PageHead section="github" />
      <SettingsSection title="Verbindung">
        <SettingsRow
          title="GitHub-Konto"
          description={
            connected
              ? `Verbunden als @${p.github_username}${p.github_connected_at ? `, seit ${new Date(p.github_connected_at).toLocaleDateString('de-DE')}` : ''}`
              : 'Read-only — Tagro liest Commits und PRs, pusht oder kommentiert nie.'
          }
        >
          <Link href="/dev/github" className="ds-btn ds-btn-primary">
            <GithubLogo size={14} /> {connected ? 'Verwalten' : 'Verbinden'}
          </Link>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Repositories & Regeln" soon={SETTINGS_SOON}>
        <SettingsRow title="Default Branch" description="Vorgabe für neue Feature-Branches.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Branch-Namen" description="Vorlagen wie feature/… oder fix/….">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function AiSection() {
  const [memory, setMemory] = useState(true)
  const [voice, setVoice] = useState(true)
  const [suggest, setSuggest] = useState(true)
  const [save, setSave] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      setMemory(localStorage.getItem(AI_MEMORY_KEY) !== '0')
      setVoice(localStorage.getItem(AI_VOICE_KEY) !== '0')
      setSuggest(localStorage.getItem(AI_SUGGEST_KEY) !== '0')
    } catch { /* noop */ }
  }, [])

  function flash() {
    setSave('saved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSave('idle'), 1400)
  }

  function setFlag(key: string, value: boolean, setter: (v: boolean) => void) {
    setter(value)
    try { localStorage.setItem(key, value ? '1' : '0') } catch { /* noop */ }
    flash()
  }

  return (
    <>
      <PageHead section="ai" save={save} />
      <SettingsSection title="Tagro im Execution Panel">
        <SettingsRow
          title="So erreichst du den Client"
          description="Briefing (/dev/briefing) und Inbox (/dev/messages) senden client-sichere Updates. Tagro übersetzt — der Client sieht Fortschritt, nicht Commits. Interne Notizen bleiben unter Updates."
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/dev/briefing" className="ds-btn">Briefing</Link>
            <Link href="/dev/messages" className="ds-btn">Inbox</Link>
            <Link href="/dev/visibility" className="ds-btn">Kunden-Sicht</Link>
          </div>
        </SettingsRow>
        <SettingsRow
          title="Wo Tagro lebt"
          description="FAB unten rechts, Fokus-Compose, Review und Projekt-Aktionen — nicht als Sidebar-Zwilling von Einstellungen. Kontext kommt aus der aktuellen /dev-Route."
        >
          <span className="ds-hint" style={{ margin: 0 }}>Workspace-weit</span>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Präferenzen (dieses Gerät)">
        <SettingsRow title="Workspace-Kontext nutzen" description="Bevorzugt Access-konforme Workspace-Signale. Speichert nur lokal — Server-Tagro folgt Workspace-Permissions.">
          <SettingsToggle on={memory} label="Workspace-Kontext" onToggle={() => setFlag(AI_MEMORY_KEY, !memory, setMemory)} />
        </SettingsRow>
        <SettingsRow title="Aufgaben-Vorschläge" description="Ruhige Vorschläge aus Reviews, Captures und Status (lokal).">
          <SettingsToggle on={suggest} label="Aufgaben-Vorschläge" onToggle={() => setFlag(AI_SUGGEST_KEY, !suggest, setSuggest)} />
        </SettingsRow>
        <SettingsRow title="Voice Intelligence" description="Sprachnotizen und Briefings mit Tagro (lokal).">
          <SettingsToggle on={voice} label="Voice" onToggle={() => setFlag(AI_VOICE_KEY, !voice, setVoice)} />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Modelle & Privacy" soon={SETTINGS_SOON}>
        <SettingsRow title="Default-Modell" description="Welches Modell Tagro standardmäßig nutzt.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Prompt-Bibliothek" description="Wiederkehrende Arbeitsweisen speichern.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function SecuritySection() {
  return (
    <>
      <PageHead section="security" />
      <SettingsSection title="Zugang">
        <SettingsRow title="Passwort oder PIN" description="Zugang zum Execution Panel zurücksetzen.">
          <Link href="/dev/login" className="ds-btn">Zurücksetzen</Link>
        </SettingsRow>
        <SettingsRow title="Passkeys" description="Gerätegebunden, ohne Passwort.">
          <span className="ds-hint" style={{ margin: 0 }}>{SETTINGS_SOON}</span>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Sessions & Geräte" soon={SETTINGS_SOON}>
        <SettingsRow title="Aktive Sessions" description="Andere Geräte abmelden.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Login-Verlauf" description="Wann und wo du dich angemeldet hast.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function UsersSection() {
  return (
    <>
      <PageHead section="users" />
      <SettingsSection title="Mitglieder">
        <SettingsRow title="Team verwalten" description="Einladen, Rollen und Auslastung im Execution Panel.">
          <Link href="/dev/team" className="ds-btn ds-btn-primary">Team öffnen</Link>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Rollen & Policies" soon={SETTINGS_SOON}>
        <SettingsRow title="Access Matrix" description="Wer was sehen und entscheiden darf.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
        <SettingsRow title="Custom Roles" description="Eigene Rollen für Agenturen und Studios.">
          <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function AboutSection() {
  return (
    <>
      <PageHead section="about" />
      <SettingsSection title="Produkt">
        <SettingsRow title="Version" description="Execution Panel auf festag.app.">
          <span className="ds-hint" style={{ margin: 0 }}>Festag MVP</span>
        </SettingsRow>
        <SettingsRow title="Systemstatus">
          <a className="ds-btn" href="https://festag.app" target="_blank" rel="noreferrer">Status öffnen</a>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Rechtliches">
        <SettingsRow title="Datenschutz">
          <Link href="/datenschutz" className="ds-btn">Öffnen</Link>
        </SettingsRow>
        <SettingsRow title="AGB">
          <Link href="/agb" className="ds-btn">Öffnen</Link>
        </SettingsRow>
        <SettingsRow title="Support">
          <a className="ds-btn" href="mailto:hello@festag.app">hello@festag.app</a>
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

function ComingSection({
  section,
  rows,
}: {
  section: DevSettingsSectionId
  rows: { title: string; description: string }[]
}) {
  return (
    <>
      <PageHead section={section} />
      <SettingsSection title="Einstellungen" soon={SETTINGS_SOON}>
        {rows.map(row => (
          <SettingsRow key={row.title} title={row.title} description={row.description}>
            <span className="ds-hint" style={{ margin: 0 }}>Bald</span>
          </SettingsRow>
        ))}
      </SettingsSection>
    </>
  )
}

export default function DevSettingsContent({ section }: { section: DevSettingsSectionId }) {
  switch (section) {
    case 'profile':
      return <ProfileSection />
    case 'appearance':
      return <AppearanceSection />
    case 'notifications':
      return <NotificationsSection />
    case 'github':
      return <GitHubSection />
    case 'ai':
      return <AiSection />
    case 'security':
      return <SecuritySection />
    case 'users':
      return <UsersSection />
    case 'about':
      return <AboutSection />
    case 'workspace':
      return (
        <ComingSection
          section="workspace"
          rows={[
            { title: 'Workspace-Name', description: 'Sichtbarer Name für Team und Clients.' },
            { title: 'Slug & URL', description: 'Feste Adresse des Workspaces.' },
            { title: 'Logo & Farbe', description: 'Markenzeichen im Execution Panel.' },
            { title: 'Export & Backup', description: 'Workspace-Daten sichern und wiederherstellen.' },
          ]}
        />
      )
    case 'projects':
      return (
        <ComingSection
          section="projects"
          rows={[
            { title: 'Default-Template', description: 'Startstruktur für neue Projekte.' },
            { title: 'Status-Workflow', description: 'Welche Schritte ein Projekt durchläuft.' },
            { title: 'Task-Defaults', description: 'Vorlagen für Definition of Done und Nachweise.' },
          ]}
        />
      )
    case 'developer':
      return (
        <ComingSection
          section="developer"
          rows={[
            { title: 'Branch-Regeln', description: 'Naming und Protected Branches.' },
            { title: 'Environment Variables', description: 'Secrets für Deployments und Agents.' },
            { title: 'Review-Standards', description: 'Was „fertig“ für Code bedeutet.' },
          ]}
        />
      )
    case 'automations':
      return (
        <ComingSection
          section="automations"
          rows={[
            { title: 'Statusbericht-Automation', description: 'Wann Clients Updates erhalten.' },
            { title: 'Trigger & Actions', description: 'Ereignisse in ruhige Abläufe übersetzen.' },
            { title: 'Geplante Jobs', description: 'Wiederkehrende Execution-Schritte.' },
          ]}
        />
      )
    case 'billing':
      return (
        <ComingSection
          section="billing"
          rows={[
            { title: 'Aktueller Plan', description: 'Sitze, Speicher und KI-Kontingent.' },
            { title: 'Rechnungen', description: 'Histor und Zahlungsmethoden.' },
            { title: 'Nutzung', description: 'Transparente Workspace-Kosten.' },
          ]}
        />
      )
    case 'api':
      return (
        <ComingSection
          section="api"
          rows={[
            { title: 'API Keys', description: 'Persönliche und Workspace-Schlüssel.' },
            { title: 'Webhooks', description: 'Events an eigene Systeme senden.' },
            { title: 'Scopes & Logs', description: 'Was erlaubt ist — und was passiert ist.' },
          ]}
        />
      )
    case 'integrations':
      return (
        <ComingSection
          section="integrations"
          rows={[
            { title: 'Vercel', description: 'Deployments mit Delivery verknüpfen.' },
            { title: 'Slack / Discord', description: 'Ruhige Hinweise in bestehende Kanäle.' },
            { title: 'Linear / Figma', description: 'Arbeitssignale ohne Tool-Wechsel.' },
          ]}
        />
      )
    case 'storage':
      return (
        <ComingSection
          section="storage"
          rows={[
            { title: 'Workspace-Nutzung', description: 'Dateien, Medien und Dokumente.' },
            { title: 'Cleanup', description: 'Duplikate und veraltete Assets.' },
            { title: 'Backups', description: 'Wiederherstellbare Snapshots.' },
          ]}
        />
      )
    case 'data':
      return (
        <ComingSection
          section="data"
          rows={[
            { title: 'Export', description: 'Workspace-Daten herunterladen.' },
            { title: 'Löschung', description: 'Kontrolliertes Entfernen nach GDPR.' },
            { title: 'Aufbewahrung', description: 'Wie lange Signale und Dateien bleiben.' },
          ]}
        />
      )
    case 'advanced':
      return (
        <ComingSection
          section="advanced"
          rows={[
            { title: 'Labs', description: 'Experimentelle Execution-Funktionen.' },
            { title: 'Feature Flags', description: 'Interne Schalter für Early Access.' },
            { title: 'Diagnose', description: 'Logs und Performance-Hinweise.' },
          ]}
        />
      )
    default:
      return <PageHead section="profile" />
  }
}
