'use client'

/**
 * Festag Onboarding — Linear-Pattern, vollständig im Festag-Dark-Theme.
 *
 * 5 Schritte:
 *   1. workspace  — Name, URL (slug), Region
 *   2. profile    — Name, Titel (optional Avatar später)
 *   3. project    — „Woran arbeitest du gerade?" (Tagro-Briefing)
 *   4. team       — Mehrfachauswahl: Alleine / Entwicklerteam / Kunden / Festag-Support
 *   5. done       — Bereit, optional E-Mail-Einladungen, „Zum Dashboard"
 *
 * Jedes Schritt-Submit persistiert sofort, sodass Resume nach Reload
 * funktioniert. Keine Daten gehen verloren. Buttons + Inputs übernehmen
 * den Slate/Festag-Dark-Look aus dem Login-Screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setTheme } from '@/lib/theme'
import FestagLoader from '@/components/FestagLoader'
import { rememberFestagAccount } from '@/lib/auth-device-memory'
import { User } from '@phosphor-icons/react'

type StepId = 'workspace' | 'profile' | 'project' | 'team' | 'done'
type WorkspaceRegion = 'eu' | 'us' | 'global'
type TeamFlag = 'alone' | 'existing_team' | 'clients_partners' | 'festag_support'

const STEPS: StepId[] = ['workspace', 'profile', 'project', 'team', 'done']

const REGION_LABEL: Record<WorkspaceRegion, string> = {
  eu:     'European Union',
  us:     'United States',
  global: 'Weltweit',
}

const TEAM_OPTIONS: Array<{ id: TeamFlag; title: string; desc: string }> = [
  { id: 'alone',            title: 'Alleine',                        desc: 'Ich organisiere und steuere das Projekt selbst.' },
  { id: 'existing_team',    title: 'Mit bestehendem Entwicklerteam', desc: 'Wir haben bereits Entwickler oder externe Partner.' },
  { id: 'clients_partners', title: 'Mit Kunden oder mehreren Beteiligten', desc: 'Mehrere Personen sollen Fortschritt und Aufgaben verfolgen.' },
  { id: 'festag_support',   title: 'Unterstützung durch Festag',     desc: 'Wir benötigen technische oder operative Unterstützung.' },
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

function isValidEmail(s: string): boolean {
  return /\S+@\S+\.\S+/.test(s)
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [stepIdx, setStepIdx]   = useState(0)
  const [userId, setUserId]     = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const [animating, setAnimating] = useState(false)

  // ── Form state per step ───────────────────────────────────────────
  const [wsName, setWsName] = useState('')
  const [wsSlug, setWsSlug] = useState('')
  const [wsSlugTouched, setWsSlugTouched] = useState(false)
  const [wsRegion, setWsRegion] = useState<WorkspaceRegion>('eu')

  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')

  const [project, setProject]   = useState('')

  const [teamFlags, setTeamFlags] = useState<Record<TeamFlag, boolean>>({
    alone: true, existing_team: false, clients_partners: false, festag_support: false,
  })

  const [invites, setInvites]   = useState('')

  // Force dark theme for the onboarding regardless of stored pref.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.style.backgroundColor = '#0A0D14'
      document.documentElement.style.colorScheme = 'dark'
    }
    setTheme('dark')
  }, [])

  // ── Load session + hydrate from any saved progress ────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { router.replace('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      const meta: any = session.user.user_metadata || {}
      const guessName = meta.full_name || meta.name || ''
      if (guessName) setFullName(guessName)

      const [{ data: state }, { data: profile }, { data: brief }, { data: ws }] = await Promise.all([
        supabase.from('onboarding_state').select('current_step,completed_at').eq('user_id', uid).maybeSingle(),
        supabase.from('profiles').select('full_name,position,work_mode,theme_pref').eq('id', uid).maybeSingle(),
        supabase.from('onboarding_briefs').select('description').eq('user_id', uid).maybeSingle(),
        supabase.from('workspaces').select('id,name,slug,region,metadata').eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle(),
      ])
      if (cancelled) return

      if (state?.completed_at) { router.replace('/dashboard'); return }

      if (profile?.full_name) setFullName(profile.full_name)
      if (profile?.position) setPosition(profile.position)
      if (brief?.description) setProject(brief.description)

      if (ws?.id) {
        setWorkspaceId(ws.id)
        if (ws.name) setWsName(ws.name)
        if (ws.slug) { setWsSlug(ws.slug); setWsSlugTouched(true) }
        if (ws.region) setWsRegion(ws.region as WorkspaceRegion)
        const flags = (ws.metadata as any)?.team_flags
        if (flags && typeof flags === 'object') {
          setTeamFlags((curr) => ({
            alone:            !!flags.alone,
            existing_team:    !!flags.existing_team,
            clients_partners: !!flags.clients_partners,
            festag_support:   !!flags.festag_support,
          }))
        }
      }

      // Jump to saved step
      const stepMap: Record<string, number> = {
        workspace: 0, mode: 0, design: 0,
        profile: 1, project: 2, team: 3, invite: 4, done: 4,
      }
      const idx = state?.current_step ? stepMap[state.current_step] : 0
      if (typeof idx === 'number' && idx > 0 && idx < STEPS.length) setStepIdx(idx)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  // Auto-derive slug from name until the user touches it.
  useEffect(() => {
    if (!wsSlugTouched) setWsSlug(slugify(wsName))
  }, [wsName, wsSlugTouched])

  const current = STEPS[stepIdx]
  const isLast  = stepIdx === STEPS.length - 1

  function transition(delta: number) {
    if (animating) return
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setStepIdx((i) => Math.max(0, Math.min(STEPS.length - 1, i + delta)))
      setAnimating(false)
    }, 160)
  }

  // ── Persist per step ──────────────────────────────────────────────
  const persist = useCallback(async (step: StepId): Promise<boolean> => {
    if (!userId) return false
    try {
      if (step === 'workspace') {
        const name = wsName.trim()
        if (!name) { setError('Bitte gib deinem Workspace einen Namen.'); return false }
        const slug = (wsSlug.trim() || slugify(name)).slice(0, 32)
        if (!slug) { setError('Bitte gib eine gültige URL an.'); return false }

        // Upsert the personal workspace.
        let wsId = workspaceId
        if (!wsId) {
          // Try to find one created by trigger / earlier session.
          const { data: existing } = await supabase
            .from('workspaces')
            .select('id')
            .eq('primary_owner_id', userId)
            .eq('is_personal', true)
            .maybeSingle()
          wsId = (existing as any)?.id ?? null
        }
        if (wsId) {
          const { error: err } = await supabase
            .from('workspaces')
            .update({ name, slug, region: wsRegion })
            .eq('id', wsId)
          if (err) { setError(err.message); return false }
        } else {
          const { data: created, error: err } = await supabase
            .from('workspaces')
            .insert({
              name, slug, region: wsRegion,
              primary_owner_id: userId, is_personal: true,
              mode: 'team', metadata: {},
            })
            .select('id')
            .single()
          if (err) { setError(err.message); return false }
          wsId = (created as any)?.id ?? null
          if (wsId) setWorkspaceId(wsId)
        }

        await supabase.from('onboarding_state').upsert({
          user_id: userId, current_step: 'profile',
          workspace_done: true, updated_at: new Date().toISOString(),
        })
      } else if (step === 'profile') {
        await supabase.from('profiles').update({
          full_name: fullName.trim() || null,
          position:  position.trim() || null,
        }).eq('id', userId)
        await supabase.from('onboarding_state').upsert({
          user_id: userId, current_step: 'project',
          profile_done: true, updated_at: new Date().toISOString(),
        })
      } else if (step === 'project') {
        if (project.trim()) {
          await supabase.from('onboarding_briefs').upsert({
            user_id: userId, description: project.trim(), updated_at: new Date().toISOString(),
          })
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId, current_step: 'team', updated_at: new Date().toISOString(),
        })
      } else if (step === 'team') {
        // Map multi-select team flags into:
        //   profiles.work_mode  — primary self-declared mode (single value)
        //   workspace.metadata.team_flags  — full set, lossless
        const primary: TeamFlag = teamFlags.existing_team ? 'existing_team'
          : teamFlags.clients_partners ? 'clients_partners'
          : teamFlags.festag_support ? 'festag_support'
          : 'alone'

        await supabase.from('profiles').update({ work_mode: primary }).eq('id', userId)
        if (workspaceId) {
          const { data: ws } = await supabase.from('workspaces').select('metadata').eq('id', workspaceId).maybeSingle()
          const merged = { ...((ws?.metadata as any) || {}), team_flags: teamFlags }
          await supabase.from('workspaces').update({ metadata: merged }).eq('id', workspaceId)
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId, current_step: 'done', updated_at: new Date().toISOString(),
        })
      } else if (step === 'done') {
        const emails = invites.split(/[,;\s\n]+/).map(s => s.trim()).filter(isValidEmail)
        if (emails.length > 0) {
          await supabase.from('onboarding_invites').insert(
            emails.map(email => ({ user_id: userId, email })),
          )
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'done',
          profile_done: true,
          workspace_done: true,
          design_done: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        try {
          fetch('/api/onboarding/seed-memory', { method: 'POST', credentials: 'include' })
        } catch {}
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          rememberFestagAccount({
            userId: session.user.id,
            email: session.user.email ?? null,
            method: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
            onboardingCompleted: true,
          })
        }
      }
      return true
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
      return false
    }
  }, [userId, workspaceId, wsName, wsSlug, wsRegion, fullName, position, project, teamFlags, invites, supabase])

  async function handleContinue() {
    if (submitting || animating) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) return
      if (isLast) {
        setDone(true)
        setTimeout(() => router.replace('/dashboard?tour=1'), 900)
      } else {
        transition(+1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSkip() {
    if (submitting || animating) return
    if (current === 'workspace') return // workspace is required
    if (isLast) return
    // Persist anyway so resume works, but skip validation friction.
    setSubmitting(true)
    try {
      await persist(current)
      transition(+1)
    } finally {
      setSubmitting(false)
    }
  }

  const userInitial = (fullName.trim().charAt(0) || '?').toUpperCase()

  if (done) return <FestagLoader fullscreen label="Festag wird vorbereitet…" />

  return (
    <main className="onb" data-theme="dark">
      <style jsx global>{CSS}</style>

      <div className="onb-stage">
        <div className={`onb-card${animating ? ' is-animating' : ''}`}>
          {current === 'workspace' && (
            <>
              <h1 className="onb-title">Workspace erstellen</h1>
              <p className="onb-lede">Dein zentraler Bereich für Projekte, Teams und Tagro-Briefings.</p>

              <Field label="Name">
                <input
                  className="onb-input is-primary"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="z. B. Studio Müller"
                  maxLength={64}
                  autoFocus
                />
              </Field>

              <Field label="URL">
                <div className="onb-url">
                  <span className="onb-url-prefix">festag.app/</span>
                  <input
                    className="onb-input onb-url-input"
                    value={wsSlug}
                    onChange={(e) => { setWsSlugTouched(true); setWsSlug(slugify(e.target.value)) }}
                    placeholder="studio-mueller"
                    maxLength={32}
                  />
                </div>
              </Field>

              <Field label="Region">
                <div className="onb-select-wrap">
                  <select
                    className="onb-input onb-select"
                    value={wsRegion}
                    onChange={(e) => setWsRegion(e.target.value as WorkspaceRegion)}
                  >
                    {(['eu', 'us', 'global'] as WorkspaceRegion[]).map((r) => (
                      <option key={r} value={r}>{REGION_LABEL[r]}</option>
                    ))}
                  </select>
                  <svg className="onb-select-caret" viewBox="0 0 12 8" aria-hidden>
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              </Field>

              <div className="onb-actions onb-actions-full">
                <button
                  type="button"
                  className="onb-primary onb-primary-full"
                  onClick={handleContinue}
                  disabled={submitting || !wsName.trim()}
                >
                  {submitting ? 'Workspace wird erstellt…' : 'Workspace erstellen'}
                </button>
              </div>
            </>
          )}

          {current === 'profile' && (
            <>
              <h1 className="onb-title">Profil einrichten</h1>
              <p className="onb-lede">So wirst du im Workspace und in Briefings angezeigt.</p>

              <Field label="Name & Bild">
                <div className="onb-name-row">
                  <div className="onb-avatar" aria-hidden>
                    {fullName.trim()
                      ? <span className="onb-avatar-initial">{userInitial}</span>
                      : <User size={18} weight="regular" />}
                  </div>
                  <input
                    className="onb-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dein Name"
                    maxLength={64}
                    autoFocus
                  />
                </div>
              </Field>

              <Field label="Titel">
                <input
                  className="onb-input"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Software Engineer, Founder, Designer…"
                  maxLength={64}
                />
              </Field>

              <DefaultActions
                onSkip={handleSkip}
                onContinue={handleContinue}
                submitting={submitting}
                continueDisabled={false}
              />
            </>
          )}

          {current === 'project' && (
            <>
              <h1 className="onb-title">Woran arbeitest du gerade?</h1>
              <p className="onb-lede">Tagro organisiert daraus die nächsten Schritte.</p>

              <Field label="Projekt">
                <textarea
                  className="onb-input onb-textarea"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder={'z. B. Software zur Buchung unserer Hotelzimmer, internes Tool für Kundenverwaltung, mobile App für unser Startup…'}
                  rows={5}
                  maxLength={2000}
                  autoFocus
                />
              </Field>

              <DefaultActions
                onSkip={handleSkip}
                onContinue={handleContinue}
                submitting={submitting}
                continueDisabled={false}
              />
            </>
          )}

          {current === 'team' && (
            <>
              <h1 className="onb-title">Managst du im Team oder alleine?</h1>
              <p className="onb-lede">Lade Co-Founder, Mitarbeiter oder Externe später per Teams ein.</p>

              <ul className="onb-toggle-list">
                {TEAM_OPTIONS.map((opt) => {
                  const active = !!teamFlags[opt.id]
                  return (
                    <li key={opt.id} className="onb-toggle-row">
                      <div className="onb-toggle-text">
                        <p className="onb-toggle-title">{opt.title}</p>
                        <p className="onb-toggle-desc">{opt.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        aria-label={opt.title}
                        className={`onb-switch${active ? ' is-on' : ''}`}
                        onClick={() => setTeamFlags((curr) => ({ ...curr, [opt.id]: !active }))}
                      >
                        <span className="onb-switch-thumb" />
                      </button>
                    </li>
                  )
                })}
              </ul>

              <DefaultActions
                onSkip={handleSkip}
                onContinue={handleContinue}
                submitting={submitting}
                continueDisabled={false}
              />
            </>
          )}

          {current === 'done' && (
            <>
              <h1 className="onb-title">Festag ist bereit</h1>
              <p className="onb-lede">Lade optional Mitwirkende ein — du kannst das später jederzeit nachholen.</p>

              <Field label="E-Mails einladen">
                <textarea
                  className="onb-input onb-textarea"
                  value={invites}
                  onChange={(e) => setInvites(e.target.value)}
                  placeholder="anna@firma.com, max@agentur.de, lukas@dev.team"
                  rows={4}
                  maxLength={2000}
                />
              </Field>

              <p className="onb-fine">Wir senden eine ruhige E-Mail mit einem Beitrittslink. Keine Werbung.</p>

              <div className="onb-actions">
                <button
                  type="button"
                  className="onb-ghost"
                  onClick={handleContinue}
                  disabled={submitting}
                >
                  Ohne Einladung weiter
                </button>
                <button
                  type="button"
                  className="onb-primary"
                  onClick={handleContinue}
                  disabled={submitting}
                >
                  {submitting ? 'Speichere…' : 'Zum Dashboard'}
                </button>
              </div>
            </>
          )}

          {error && <p className="onb-error" role="alert">{error}</p>}
        </div>

        <ol className="onb-dots" aria-label="Onboarding-Fortschritt">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={`onb-dot${i === stepIdx ? ' is-active' : ''}${i < stepIdx ? ' is-done' : ''}`}
              aria-current={i === stepIdx ? 'step' : undefined}
            />
          ))}
        </ol>
      </div>
    </main>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="onb-field">
      <label className="onb-label">{label}</label>
      {children}
    </div>
  )
}

function DefaultActions({
  onSkip, onContinue, submitting, continueDisabled,
}: {
  onSkip: () => void
  onContinue: () => void
  submitting: boolean
  continueDisabled: boolean
}) {
  return (
    <div className="onb-actions">
      <button type="button" className="onb-ghost" onClick={onSkip} disabled={submitting}>
        Überspringen
      </button>
      <button
        type="button"
        className="onb-primary"
        onClick={onContinue}
        disabled={submitting || continueDisabled}
      >
        {submitting ? 'Speichere…' : 'Weiter'}
      </button>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────

const CSS = `
  html, body { background: #0A0D14; color: #E8E8E5; }
  .onb {
    min-height: 100dvh; width: 100%;
    background: #0A0D14;
    color: #E8E8E5;
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 500;
    letter-spacing: .015em;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 20px 56px;
  }
  .onb-stage {
    width: 100%; max-width: 480px;
    display: flex; flex-direction: column; gap: 32px;
    align-items: stretch;
  }
  .onb-card {
    display: flex; flex-direction: column;
    transition: opacity .18s ease, transform .18s ease;
  }
  .onb-card.is-animating { opacity: 0; transform: translateY(6px); }

  .onb-title {
    margin: 0;
    font-size: 26px; font-weight: 500;
    letter-spacing: -.012em;
    line-height: 1.25;
    text-align: center;
    color: #FFFFFF;
  }
  .onb-lede {
    margin: 8px 0 32px;
    font-size: 14px;
    color: rgba(255,255,255,.55);
    text-align: center;
    line-height: 1.55;
  }

  .onb-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
  .onb-label {
    font-size: 12.5px; font-weight: 500;
    color: rgba(255,255,255,.55);
    letter-spacing: .015em;
  }

  .onb-input {
    width: 100%;
    height: 44px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 10px;
    padding: 0 14px;
    color: #FFFFFF;
    font: inherit; font-size: 14px; font-weight: 500;
    letter-spacing: .01em;
    outline: 0;
    transition: border-color .14s ease, background .14s ease, box-shadow .14s ease;
  }
  .onb-input::placeholder { color: rgba(255,255,255,.30); font-weight: 500; }
  .onb-input:hover { border-color: rgba(255,255,255,.18); }
  .onb-input:focus {
    border-color: rgba(140,148,170,.65);
    background: rgba(255,255,255,.035);
    box-shadow: 0 0 0 3px rgba(91,100,125,.18);
  }
  .onb-input.is-primary:focus {
    border-color: rgba(140,148,170,.85);
    box-shadow: 0 0 0 3px rgba(91,100,125,.28);
  }
  .onb-textarea {
    height: auto;
    min-height: 116px;
    padding: 12px 14px;
    line-height: 1.55;
    resize: vertical;
  }

  /* URL field — prefix segment */
  .onb-url {
    display: flex; align-items: stretch;
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 10px;
    background: rgba(255,255,255,.02);
    overflow: hidden;
    transition: border-color .14s ease;
  }
  .onb-url:focus-within {
    border-color: rgba(140,148,170,.65);
    box-shadow: 0 0 0 3px rgba(91,100,125,.18);
  }
  .onb-url-prefix {
    display: inline-flex; align-items: center;
    padding: 0 14px;
    background: rgba(255,255,255,.04);
    color: rgba(255,255,255,.45);
    font-size: 13.5px; font-weight: 500;
    border-right: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
  }
  .onb-url-input {
    border: 0 !important;
    background: transparent !important;
    border-radius: 0;
    box-shadow: none !important;
  }

  /* Select wrapper */
  .onb-select-wrap { position: relative; }
  .onb-select {
    appearance: none; -webkit-appearance: none;
    padding-right: 38px;
    cursor: pointer;
  }
  .onb-select-caret {
    position: absolute; right: 14px; top: 50%;
    width: 11px; height: 7px;
    transform: translateY(-50%);
    color: rgba(255,255,255,.55);
    pointer-events: none;
  }
  .onb-select option { background: #10151D; color: #FFFFFF; }

  /* Profile name row */
  .onb-name-row { display: flex; align-items: center; gap: 12px; }
  .onb-avatar {
    width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.03);
    display: inline-flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,.55);
  }
  .onb-avatar-initial { font-size: 14px; font-weight: 500; color: rgba(255,255,255,.85); }

  /* Toggle list */
  .onb-toggle-list {
    list-style: none; padding: 0; margin: 0 0 28px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    overflow: hidden;
  }
  .onb-toggle-row {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 16px;
    border-top: 1px solid rgba(255,255,255,.06);
  }
  .onb-toggle-row:first-child { border-top: 0; }
  .onb-toggle-text { flex: 1; min-width: 0; }
  .onb-toggle-title {
    margin: 0; font-size: 13.5px; color: #FFFFFF;
    font-weight: 500; letter-spacing: .005em;
  }
  .onb-toggle-desc {
    margin: 2px 0 0; font-size: 12px; color: rgba(255,255,255,.45);
    line-height: 1.45;
  }
  .onb-switch {
    flex-shrink: 0;
    width: 32px; height: 18px;
    border-radius: 999px;
    background: rgba(255,255,255,.10);
    border: 0; padding: 2px;
    cursor: pointer;
    transition: background .14s ease;
  }
  .onb-switch.is-on { background: #5B647D; }
  .onb-switch-thumb {
    display: block;
    width: 14px; height: 14px; border-radius: 50%;
    background: #FFFFFF;
    transform: translateX(0);
    transition: transform .15s cubic-bezier(.22,.65,.35,1);
    box-shadow: 0 1px 2px rgba(0,0,0,.4);
  }
  .onb-switch.is-on .onb-switch-thumb { transform: translateX(14px); }

  /* Actions */
  .onb-actions {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 8px; margin-top: 10px;
  }
  .onb-actions-full { justify-content: stretch; }
  .onb-primary {
    height: 36px; padding: 0 18px;
    border-radius: 999px;
    border: 0;
    background: #1F2630;
    color: #FFFFFF;
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
    transition: background .14s ease, transform .14s ease, opacity .14s ease;
  }
  .onb-primary:hover:not(:disabled) { background: #2A3240; }
  .onb-primary:active:not(:disabled) { transform: scale(.98); }
  .onb-primary:disabled { opacity: .45; cursor: not-allowed; }
  .onb-primary-full {
    width: 100%; height: 44px; padding: 0 24px; font-size: 14px;
    background: #1F2630;
  }
  .onb-primary-full:hover:not(:disabled) { background: #2A3240; }

  .onb-ghost {
    height: 36px; padding: 0 14px;
    border-radius: 999px;
    border: 0;
    background: transparent;
    color: rgba(255,255,255,.55);
    font: inherit; font-size: 13px; font-weight: 500; letter-spacing: .015em;
    cursor: pointer;
    transition: color .14s ease, background .14s ease;
  }
  .onb-ghost:hover:not(:disabled) { color: rgba(255,255,255,.85); background: rgba(255,255,255,.04); }
  .onb-ghost:disabled { opacity: .4; cursor: not-allowed; }

  .onb-fine {
    margin: -8px 0 22px;
    font-size: 11.5px; color: rgba(255,255,255,.40);
    line-height: 1.5;
  }

  /* Error */
  .onb-error {
    margin: 18px 0 0;
    padding: 10px 12px;
    border: 1px solid rgba(209,67,67,.35);
    background: rgba(209,67,67,.08);
    border-radius: 8px;
    font-size: 12.5px;
    color: #F5B5B5;
    text-align: center;
  }

  /* Step dots */
  .onb-dots {
    list-style: none; padding: 0; margin: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 8px;
  }
  .onb-dot {
    width: 6px; height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,.15);
    transition: width .2s ease, background .2s ease;
  }
  .onb-dot.is-active {
    width: 22px;
    background: rgba(255,255,255,.85);
  }
  .onb-dot.is-done { background: rgba(255,255,255,.35); }

  @media (max-width: 520px) {
    .onb { padding: 24px 16px 40px; }
    .onb-title { font-size: 22px; }
    .onb-lede { margin-bottom: 24px; font-size: 13.5px; }
    .onb-input { height: 46px; font-size: 15px; }
    .onb-primary-full { height: 48px; font-size: 15px; }
  }
`
