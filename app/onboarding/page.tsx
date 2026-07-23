'use client'

/**
 * Festag hybrid onboarding — after workspace create:
 *   1. profile — Name (required), Profilbild + Position (optional)
 *   2. team    — Alleine / Team / Kunden / Festag-Support
 *   3. done    — optional invites, then dashboard
 *
 * Workspace naming lives on /create-workspace (AuthLanding chrome).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Info, Hexagon, X } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  clearPendingWorkspaceName,
  rememberWorkspaceName,
} from '@/lib/pending-workspace'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import OnboardingWorkspaceExplainModal, {
  type OnboardingTeamFlag,
} from '@/components/auth/OnboardingWorkspaceExplainModal'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter } from '@/lib/auth-theme'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  getRememberedPersonalDetails,
  rememberFestagAccount,
  rememberPersonalDetails,
} from '@/lib/auth-device-memory'
import { isLegalPath, rememberLegalReturn } from '@/lib/legal-return'

type StepId = 'profile' | 'team' | 'done'
type TeamFlag = OnboardingTeamFlag
type WorkspaceMode = 'delivery' | 'team' | 'agency'

const STEPS: StepId[] = ['profile', 'team', 'done']

const TEAM_OPTIONS: Array<{ id: TeamFlag; title: string; desc: string }> = [
  { id: 'alone',            title: 'Alleine',                        desc: 'Ich organisiere und steuere das Projekt selbst.' },
  { id: 'existing_team',    title: 'Mit bestehendem Entwicklerteam', desc: 'Wir haben bereits Entwickler oder externe Partner.' },
  { id: 'clients_partners', title: 'Mit Kunden oder mehreren Beteiligten', desc: 'Mehrere Personen sollen Fortschritt und Aufgaben verfolgen.' },
  { id: 'festag_support',   title: 'Unterstützung durch Festag',     desc: 'Wir benötigen technische oder operative Unterstützung.' },
]

const WORKSPACE_MODE_FOR: Record<TeamFlag, WorkspaceMode> = {
  alone:            'team',
  existing_team:    'team',
  clients_partners: 'agency',
  festag_support:   'delivery',
}

type InviteNeed = 'devs' | 'clients' | 'none'
const INVITE_NEED_FOR: Record<TeamFlag, InviteNeed> = {
  alone:            'none',
  existing_team:    'devs',
  clients_partners: 'clients',
  festag_support:   'none',
}

const DONE_COPY: Record<TeamFlag, { title: string; lede: string; inviteLabel?: string; invitePlaceholder?: string; note?: string }> = {
  alone: {
    title: 'Festag ist bereit',
    lede: 'Du startest alleine — du kannst jederzeit später Mitwirkende oder ein Team einladen.',
  },
  existing_team: {
    title: 'Entwickler einladen',
    lede: 'Lade dein Entwicklerteam ein. Sie bekommen Zugriff aufs Execution Panel und ihre Tasks.',
    inviteLabel: 'Entwickler-E-Mails',
    invitePlaceholder: 'dev1@team.de, dev2@team.de',
  },
  clients_partners: {
    title: 'Beteiligte einladen',
    lede: 'Lade Kunden oder Stakeholder ein. Sie sehen ruhige, geprüfte Statusberichte — keine Roh-Arbeit.',
    inviteLabel: 'E-Mails der Beteiligten',
    invitePlaceholder: 'kunde@firma.com, partner@agentur.de',
  },
  festag_support: {
    title: 'Festag übernimmt',
    lede: 'Unser Team meldet sich, um dein Projekt mit geprüften Entwicklern aufzusetzen. Du musst nichts weiter tun.',
    note: 'Du bekommst innerhalb von 24 Stunden eine Nachricht von Festag.',
  },
}

/** One distinct headline per step — and per team card when on the team step. */
const PROFILE_HERO = {
  lead: 'Dein Profil.',
  rest: ' Name und optional Position für Workspace und Briefings.',
} as const

const TEAM_HERO: Record<TeamFlag, { lead: string; rest: string }> = {
  alone: {
    lead: 'Alleine starten.',
    rest: ' Du steuerst Workspace und Status selbst.',
  },
  existing_team: {
    lead: 'Mit deinem Entwicklerteam.',
    rest: ' Devs im Panel, Status und Blocker für dich.',
  },
  clients_partners: {
    lead: 'Mit Kunden und Beteiligten.',
    rest: ' Geprüfte Statusberichte statt Roh-Arbeit.',
  },
  festag_support: {
    lead: 'Mit Unterstützung durch Festag.',
    rest: ' Wir helfen beim Aufbau, du behältst den Überblick.',
  },
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
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
  const { mode: theme, setMode: setTheme } = useAuthTheme('client')

  const [stepIdx, setStepIdx] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [wsName, setWsName] = useState('')
  const [wsSlug, setWsSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reveal, setReveal] = useState<'leaving' | 'message' | 'departing' | null>(null)
  const [animating, setAnimating] = useState(false)
  const revealTimers = useRef<number[]>([])
  const [booting, setBooting] = useState(true)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [explainId, setExplainId] = useState<TeamFlag | null>(null)

  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarBlobRef = useRef<string | null>(null)
  const [teamChoice, setTeamChoice] = useState<TeamFlag>('alone')
  const invitesFieldRef = useRef<HTMLTextAreaElement>(null)
  const [invites, setInvites] = useState('')

  useLayoutEffect(() => {
    syncAutoGrowTextarea(invitesFieldRef.current, { minPx: 88, maxPx: 240 })
  }, [invites])

  useLayoutEffect(() => {
    if (consumePanelEnter() !== 'client') return
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
    setTimeout(() => router.push(href), 160)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const remembered = getRememberedPersonalDetails()

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) { router.replace('/login'); return }
      const uid = session.user.id
      setUserId(uid)
      const meta: any = session.user.user_metadata || {}
      const guessName = (meta.full_name || meta.name || remembered.fullName || '').trim()
      if (guessName) setFullName(guessName)
      if (remembered.position) setPosition(remembered.position)

      const [{ data: state }, { data: profile }, { data: ws }] = await Promise.all([
        supabase.from('onboarding_state').select('current_step,completed_at').eq('user_id', uid).maybeSingle(),
        supabase.from('profiles').select('full_name,position,avatar_url,work_mode').eq('id', uid).maybeSingle(),
        supabase.from('workspaces').select('id,name,slug,metadata').eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle(),
      ])
      if (cancelled) return

      if (state?.completed_at) { router.replace('/dashboard'); return }

      // Prefer server profile, then OAuth/session metadata, then this device.
      if (profile?.full_name) setFullName(profile.full_name)
      else if (guessName) setFullName(guessName)
      if (profile?.position) setPosition(profile.position)
      else if (remembered.position) setPosition(remembered.position)
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      else if (typeof meta.avatar_url === 'string' && meta.avatar_url) setAvatarUrl(meta.avatar_url)

      if (!ws?.id) {
        router.replace('/create-workspace')
        return
      }

      setWorkspaceId(ws.id)
      if (ws.name) {
        setWsName(ws.name)
        rememberWorkspaceName(ws.name)
      }
      if (ws.slug) setWsSlug(ws.slug)

      const savedChoice = (ws.metadata as any)?.team_choice
      if (savedChoice === 'alone' || savedChoice === 'existing_team'
          || savedChoice === 'clients_partners' || savedChoice === 'festag_support') {
        setTeamChoice(savedChoice)
      }

      const stepMap: Record<string, number> = {
        workspace: 0, mode: 0, design: 0, profile: 0,
        team: 1,
        // Legacy project step maps into done (invites).
        project: 2,
        invite: 2, done: 2,
      }
      const idx = state?.current_step ? stepMap[state.current_step] : 0
      if (typeof idx === 'number' && idx >= 0 && idx < STEPS.length) setStepIdx(idx)

      setBooting(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  const current = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1

  function transition(delta: number) {
    if (animating) return
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setStepIdx((i) => Math.max(0, Math.min(STEPS.length - 1, i + delta)))
      setAnimating(false)
    }, 160)
  }

  /** Go back to an already completed step (progress dots). */
  function goToStep(index: number) {
    if (animating || submitting) return
    if (index < 0 || index >= STEPS.length) return
    if (index >= stepIdx) return
    setError('')
    setAnimating(true)
    setTimeout(() => {
      setStepIdx(index)
      setAnimating(false)
    }, 160)
  }

  function clearAvatarBlob() {
    if (avatarBlobRef.current) {
      URL.revokeObjectURL(avatarBlobRef.current)
      avatarBlobRef.current = null
    }
  }

  async function handleAvatarPick(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Bitte ein Bild auswählen.')
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Maximal 4 MB.')
      return
    }
    setError('')

    // Local preview immediately (also covers TEMP preview without session).
    clearAvatarBlob()
    const localUrl = URL.createObjectURL(file)
    avatarBlobRef.current = localUrl
    setAvatarUrl(localUrl)

    if (!userId) return

    setAvatarUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub?.publicUrl || null
      if (url) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
        clearAvatarBlob()
        setAvatarUrl(url)
      }
    } catch (e: any) {
      setError(e?.message || 'Bild konnte nicht hochgeladen werden.')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function removeAvatar() {
    if (avatarUploading) return
    setError('')
    const previous = avatarUrl
    clearAvatarBlob()
    setAvatarUrl(null)

    if (!userId) return

    setAvatarUploading(true)
    try {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    } catch (e: any) {
      setAvatarUrl(previous)
      setError(e?.message || 'Profilbild konnte nicht entfernt werden.')
    } finally {
      setAvatarUploading(false)
    }
  }

  useEffect(() => () => clearAvatarBlob(), [])

  const persist = useCallback(async (step: StepId): Promise<boolean> => {
    if (!userId) {
      setError('Bitte melde dich erneut an.')
      return false
    }
    try {
      if (step === 'profile') {
        const name = fullName.trim()
        if (!name) {
          setError('Bitte gib deinen Namen ein.')
          return false
        }
        await supabase.from('profiles').update({
          full_name: name,
          position: position.trim() || null,
          avatar_url: avatarUrl && !avatarUrl.startsWith('blob:') ? avatarUrl : null,
        }).eq('id', userId)
        rememberPersonalDetails({
          userId,
          fullName: name,
          position: position.trim() || null,
        })
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'team',
          profile_done: true,
          workspace_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'team') {
        const wsMode = WORKSPACE_MODE_FOR[teamChoice]
        const needs = INVITE_NEED_FOR[teamChoice]

        await supabase.from('profiles').update({ work_mode: teamChoice }).eq('id', userId)
        if (workspaceId) {
          const { data: ws } = await supabase.from('workspaces').select('metadata').eq('id', workspaceId).maybeSingle()
          const merged = {
            ...((ws?.metadata as any) || {}),
            team_choice: teamChoice,
            needs_devs: needs === 'devs',
            needs_clients: needs === 'clients',
            festag_managed: teamChoice === 'festag_support',
          }
          await supabase.from('workspaces')
            .update({ mode: wsMode, metadata: merged })
            .eq('id', workspaceId)
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'done',
          profile_done: true,
          workspace_done: true,
          design_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'done') {
        const emails = invites.split(/[,;\s\n]+/).map(s => s.trim()).filter(isValidEmail)
        if (emails.length > 0) {
          await supabase.from('onboarding_invites').insert(
            emails.map(email => ({ user_id: userId, email })),
          )
          try {
            const res = await fetch('/api/onboarding/invites', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emails, teamChoice }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              setError(
                typeof data?.reason === 'string'
                  ? 'Einladung konnte nicht gesendet werden.'
                  : 'Einladung konnte nicht gesendet werden.',
              )
              return false
            }
          } catch {
            setError('Einladung konnte nicht gesendet werden.')
            return false
          }
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'done',
          profile_done: true,
          workspace_done: true,
          design_done: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        try {
          fetch('/api/onboarding/seed-memory', { method: 'POST', credentials: 'include' })
        } catch {}
        try {
          fetch('/api/onboarding/welcome-emails', { method: 'POST', credentials: 'include' })
        } catch {}

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          clearPendingWorkspaceName()
          rememberWorkspaceName(wsName.trim())
          rememberFestagAccount({
            userId: session.user.id,
            email: session.user.email ?? null,
            method: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
            onboardingCompleted: true,
            workspaceName: wsName.trim() || null,
            fullName: fullName.trim() || null,
            position: position.trim() || null,
          })
        }
      }
      return true
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
      return false
    }
  }, [userId, workspaceId, wsName, fullName, position, avatarUrl, teamChoice, invites, supabase])

  function clearRevealTimers() {
    for (const id of revealTimers.current) window.clearTimeout(id)
    revealTimers.current = []
  }

  function runReveal(target: string | null) {
    clearRevealTimers()
    setExplainId(null)
    setSecurityOpen(false)
    setReveal('leaving')
    const t1 = window.setTimeout(() => setReveal('message'), 520)
    const t2 = window.setTimeout(() => {
      setReveal('departing')
      if (target) {
        prepareAuthRouteTransition(target)
        const t3 = window.setTimeout(() => {
          window.location.href = target
        }, 780)
        revealTimers.current.push(t3)
      } else {
        const t3 = window.setTimeout(() => {
          setReveal(null)
        }, 780)
        revealTimers.current.push(t3)
      }
    }, 520 + 2400)
    revealTimers.current.push(t1, t2)
  }

  useEffect(() => () => clearRevealTimers(), [])

  async function handleContinue() {
    if (submitting || animating || reveal) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) return
      if (isLast) {
        const slug = wsSlug.trim() || slugify(wsName)
        const target = userId
          ? (slug ? `/${slug}?tour=1&newproject=1` : '/dashboard?tour=1&newproject=1')
          : null
        setError('')
        runReveal(target)
      } else {
        transition(+1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (booting) {
    return (
      <main
        data-theme={theme}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'alboot .8s linear infinite' }} />
      </main>
    )
  }

  const heroCopy =
    current === 'profile'
      ? PROFILE_HERO
      : current === 'team'
        ? TEAM_HERO[teamChoice]
        : {
            lead: `${DONE_COPY[teamChoice].title}.`,
            rest: ` ${DONE_COPY[teamChoice].lede}`,
          }

  const heroKey = current === 'team' || current === 'done' ? `${current}-${teamChoice}` : current
  const revealing = reveal != null

  return (
    <main
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}${revealing ? ` onb-revealing onb-reveal-${reveal}` : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{ONB_EXTRA_CSS}</style>

      {(reveal === 'message' || reveal === 'departing') && (
        <div className="onb-complete" aria-live="polite">
          <h1 className="onb-complete-title">Dein Dashboard ist eingerichtet.</h1>
          <p className="onb-complete-sub">Einen Moment — wir öffnen deinen Workspace.</p>
        </div>
      )}

      <div className={`al-container${revealing ? ' onb-chrome-exit' : ''}`}>
        <header className="al-header">
          <a
            className="al-wordmark"
            href="/"
            aria-label="festag"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            <span className="al-wordmark-mark" aria-hidden="true" />
          </a>
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
                  <section className="al-signin" aria-label="Onboarding">
                    <div className={`al-signin-head${animating ? ' onb-animating' : ''}`}>
                      <div className="al-hero-copy">
                        <h1 key={heroKey} className="al-title al-title-display onb-hero-line onb-hero-swap">
                          <span className="onb-hero-lead">{heroCopy.lead}</span>
                          <span className="al-hero-gray">{heroCopy.rest}</span>
                        </h1>
                      </div>
                    </div>

                    <div className={`al-content${animating ? ' onb-animating' : ''}`}>
                      <div className="al-signin-stack">
                        {current === 'profile' && (
                          <form
                            className="al-method-group"
                            autoComplete="on"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void handleContinue()
                            }}
                          >
                            <div className="onb-field-group">
                              <p className="onb-field-label">Bild & Name</p>
                              <div className="onb-name-row">
                                <div className="onb-avatar-wrap">
                                  <button
                                    type="button"
                                    className={`onb-avatar${avatarUploading ? ' is-busy' : ''}`}
                                    aria-label={avatarUrl ? 'Profilbild ändern' : 'Profilbild hinzufügen'}
                                    disabled={avatarUploading}
                                    onClick={() => avatarInputRef.current?.click()}
                                  >
                                    {avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={avatarUrl} alt="" className="onb-avatar-img" />
                                    ) : (
                                      <Hexagon size={20} weight="regular" className="onb-avatar-icon" />
                                    )}
                                  </button>
                                  {avatarUrl ? (
                                    <button
                                      type="button"
                                      className="onb-avatar-clear"
                                      aria-label="Profilbild entfernen"
                                      disabled={avatarUploading}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        void removeAvatar()
                                      }}
                                    >
                                      <X size={11} weight="bold" />
                                    </button>
                                  ) : null}
                                </div>
                                <input
                                  ref={avatarInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="onb-avatar-input"
                                  tabIndex={-1}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    e.target.value = ''
                                    void handleAvatarPick(file)
                                  }}
                                />
                                <input
                                  className="al-input onb-name-input"
                                  type="text"
                                  name="name"
                                  autoComplete="name"
                                  autoCapitalize="words"
                                  spellCheck={false}
                                  value={fullName}
                                  onChange={(e) => {
                                    setError('')
                                    setFullName(e.target.value)
                                  }}
                                  placeholder="Vollständiger Name…"
                                  maxLength={80}
                                  aria-label="Vollständiger Name"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="onb-position">Position</label>
                              <input
                                id="onb-position"
                                className="al-input"
                                type="text"
                                name="organization-title"
                                autoComplete="organization-title"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                placeholder="z. B. Startupgründer"
                                maxLength={64}
                                aria-label="Position"
                              />
                            </div>
                            <button
                              type="submit"
                              className={`al-btn al-btn-primary${fullName.trim() ? ' al-btn-primary--ready' : ''}`}
                              disabled={submitting || !fullName.trim() || avatarUploading}
                            >
                              {submitting ? 'Speichere…' : 'Weiter'}
                            </button>
                          </form>
                        )}

                        {current === 'team' && (
                          <>
                            <ul className="onb-toggle-list" role="radiogroup" aria-label="Arbeitsweise">
                              {TEAM_OPTIONS.map((opt) => {
                                const active = teamChoice === opt.id
                                return (
                                  <li
                                    key={opt.id}
                                    className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                    role="radio"
                                    aria-checked={active}
                                    tabIndex={0}
                                    onClick={() => setTeamChoice(opt.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setTeamChoice(opt.id)
                                      }
                                    }}
                                  >
                                    <div className="onb-toggle-text">
                                      <p className="onb-toggle-title">{opt.title}</p>
                                      <p className="onb-toggle-desc">{opt.desc}</p>
                                    </div>
                                    <button
                                      type="button"
                                      className="onb-toggle-info"
                                      aria-label={`${opt.title} erklären`}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setExplainId(opt.id)
                                      }}
                                    >
                                      <Info size={15} weight="regular" />
                                    </button>
                                    <span
                                      className={`onb-switch${active ? ' is-on' : ''}`}
                                      role="presentation"
                                      aria-hidden
                                    >
                                      <span className="onb-switch-knob" />
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>

                            <button
                              type="button"
                              className="al-btn al-btn-primary al-btn-primary--ready"
                              onClick={() => void handleContinue()}
                              disabled={submitting}
                            >
                              {submitting ? 'Speichere…' : 'Weiter'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              Später jederzeit in den Einstellungen änderbar.
                            </p>
                          </>
                        )}

                        {current === 'done' && (() => {
                          const copy = DONE_COPY[teamChoice]
                          const wantsInvite = INVITE_NEED_FOR[teamChoice] !== 'none'
                          const inviteEmails = invites
                            .split(/[,;\s\n]+/)
                            .map(s => s.trim())
                            .filter(isValidEmail)
                          const hasInviteEmails = inviteEmails.length > 0
                          const primaryReady = !wantsInvite || hasInviteEmails
                          const primaryLabel = wantsInvite
                            ? (submitting
                              ? (hasInviteEmails ? 'Sende Einladung…' : 'Speichere…')
                              : 'Einladung schicken')
                            : (submitting ? 'Speichere…' : 'Zum Dashboard')

                          return (
                            <>
                              {wantsInvite && (
                                <div className="al-method-group">
                                  <textarea
                                    ref={invitesFieldRef}
                                    className="al-input onb-textarea"
                                    name="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    value={invites}
                                    onChange={(e) => {
                                      setError('')
                                      setInvites(e.target.value)
                                    }}
                                    placeholder={copy.invitePlaceholder || 'anna@firma.com, max@agentur.de'}
                                    rows={4}
                                    maxLength={2000}
                                    autoFocus
                                    aria-label={copy.inviteLabel || 'E-Mails einladen'}
                                  />
                                  <p className="onb-fine">
                                    Wir senden eine ruhige E-Mail mit einem Beitrittslink. Keine Werbung.
                                  </p>
                                </div>
                              )}

                              {copy.note && <div className="onb-note">{copy.note}</div>}

                              <div className="al-method-group">
                                <button
                                  type="button"
                                  className={`al-btn al-btn-primary${primaryReady ? ' al-btn-primary--ready' : ''}`}
                                  onClick={() => {
                                    if (wantsInvite && !hasInviteEmails) {
                                      setError('Bitte mindestens eine gültige E-Mail eingeben — oder ohne Einladung weiter.')
                                      return
                                    }
                                    void handleContinue()
                                  }}
                                  disabled={submitting}
                                >
                                  {primaryLabel}
                                </button>
                                {wantsInvite && (
                                  <button
                                    type="button"
                                    className="al-btn al-btn-ghost"
                                    onClick={() => { setInvites(''); setError(''); void handleContinue() }}
                                    disabled={submitting}
                                  >
                                    Ohne Einladung weiter
                                  </button>
                                )}
                              </div>
                            </>
                          )
                        })()}

                        {error ? <p className="al-error" role="alert">{error}</p> : null}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        <ol className={`onb-dots${revealing ? ' onb-chrome-exit' : ''}`} aria-label="Onboarding-Fortschritt">
          {STEPS.map((s, i) => {
            const canGoBack = i < stepIdx
            return (
              <li key={s}>
                <button
                  type="button"
                  className={`onb-dot${i === stepIdx ? ' is-active' : ''}${canGoBack ? ' is-done' : ''}${canGoBack ? ' is-clickable' : ''}`}
                  aria-current={i === stepIdx ? 'step' : undefined}
                  aria-label={
                    i === stepIdx
                      ? `Schritt ${i + 1} von ${STEPS.length}`
                      : canGoBack
                        ? `Zurück zu Schritt ${i + 1}`
                        : `Schritt ${i + 1}`
                  }
                  disabled={!canGoBack}
                  onClick={() => goToStep(i)}
                />
              </li>
            )
          })}
        </ol>

        <footer className={`al-footer-meta${revealing ? ' onb-chrome-exit' : ''}`}>
          <div className="al-footer-center">
            <button
              type="button"
              className="al-theme-icon al-theme-icon--footer no-min-tap"
              aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
            </button>
            <button
              type="button"
              className="al-ssl-badge no-min-tap"
              aria-label="Sicherheit und Verschlüsselung"
              onClick={() => setSecurityOpen(true)}
            >
              <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M5.5 0.5C3.84315 0.5 2.5 1.84315 2.5 3.5V5H1.5C0.947715 5 0.5 5.44772 0.5 6V11.5C0.5 12.0523 0.947715 12.5 1.5 12.5H9.5C10.0523 12.5 10.5 12.0523 10.5 11.5V6C10.5 5.44772 10.0523 5 9.5 5H8.5V3.5C8.5 1.84315 7.15685 0.5 5.5 0.5ZM3.5 5V3.5C3.5 2.39543 4.39543 1.5 5.5 1.5C6.60457 1.5 7.5 2.39543 7.5 3.5V5H3.5Z" fill="currentColor"/>
              </svg>
              <span>SSL, End-to-End verschlüsselt</span>
            </button>
          </div>
          <div className="al-footer-links al-footer-links--desktop">
            <a
              className="al-dev-link"
              href="/register"
              onClick={e => { e.preventDefault(); navigateWithFade('/register') }}
            >
              Zurück zur Registrierung
            </a>
          </div>
        </footer>
      </div>

      <AuthSecurityModal open={securityOpen} onClose={() => setSecurityOpen(false)} />
      <OnboardingWorkspaceExplainModal
        open={explainId != null}
        optionId={explainId}
        onClose={() => setExplainId(null)}
      />
    </main>
  )
}

const ONB_EXTRA_CSS = `
  .onb-hero-line {
    margin: 0;
    max-width: 100%;
  }
  .onb-hero-lead {
    color: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-hero-lead {
    color: #f5f5f7;
  }
  .onb-hero-swap {
    animation: onbHeroIn .32s cubic-bezier(.16,1,.3,1) both;
  }
  @keyframes onbHeroIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .onb-animating {
    opacity: 0;
    transform: translateY(6px);
    transition: opacity .16s ease, transform .16s ease;
  }

  /* Completion reveal — calm Linear-like dissolve into dashboard */
  .al-root.onb-revealing {
    pointer-events: none;
  }
  .onb-chrome-exit {
    opacity: 0;
    transform: translateY(4px) scale(0.992);
    filter: blur(1.5px);
    transition:
      opacity .48s cubic-bezier(.22,1,.36,1),
      transform .48s cubic-bezier(.22,1,.36,1),
      filter .48s cubic-bezier(.22,1,.36,1);
  }
  .onb-complete {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 28px;
    text-align: center;
    pointer-events: none;
  }
  .onb-complete-title {
    margin: 0;
    max-width: 18em;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: clamp(28px, 4.2vw, 40px);
    font-weight: 500;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: #1e1e20;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) both;
  }
  .onb-complete-sub {
    margin: 14px 0 0;
    max-width: 28em;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: 0.01em;
    color: #5c5c62;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) .12s both;
  }
  .al-root[data-theme="dark"] .onb-complete-title {
    color: #f5f5f7;
  }
  .al-root[data-theme="dark"] .onb-complete-sub {
    color: rgba(245,245,247,0.58);
  }
  .al-root.onb-reveal-departing .onb-complete-title,
  .al-root.onb-reveal-departing .onb-complete-sub {
    animation: onbCompleteOut .72s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes onbCompleteIn {
    from {
      opacity: 0;
      transform: translateY(12px);
      letter-spacing: -0.01em;
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      letter-spacing: -0.03em;
      filter: blur(0);
    }
  }
  @keyframes onbCompleteOut {
    from {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
    to {
      opacity: 0;
      transform: translateY(-8px);
      filter: blur(2px);
    }
  }
  .al-root.onb-reveal-departing {
    animation: onbRevealCanvasOut .78s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes onbRevealCanvasOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  textarea.al-input.onb-textarea {
    height: auto;
    min-height: 116px;
    padding: 14px 18px;
    line-height: 1.55;
    resize: none;
    overflow-y: hidden;
    border-radius: 18px;
    field-sizing: content;
    max-block-size: 320px;
  }
  .onb-project-input {
    min-height: 95px;
    border-radius: 12px;
  }
  .onb-project-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
    margin-top: 4px;
  }
  .onb-skip {
    height: 45px;
    padding: 0 16px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--al-text-muted, #8891a0);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color .12s ease, background .12s ease;
  }
  .onb-skip:hover:not(:disabled) {
    color: #1e1e20;
    background: rgba(0, 0, 0, 0.03);
  }
  .onb-skip:disabled { opacity: 0.5; cursor: default; }
  .onb-project-next {
    width: auto;
    min-width: 90px;
    padding: 0 22px;
  }
  .al-root[data-theme="dark"] .onb-skip:hover:not(:disabled) {
    color: #f5f5f7;
    background: rgba(255, 255, 255, 0.06);
  }
  .onb-field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .al-method-group:has(.onb-field-group) {
    gap: 14px;
  }
  .onb-field-label {
    margin: 0;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.3;
    color: var(--al-text-muted, #8891a0);
  }
  .onb-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
  .onb-avatar-wrap {
    position: relative;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
  }
  .onb-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 0;
    background: #F5F5F7;
    color: var(--al-text-muted-soft, #b0b7c4);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    transition: background .14s ease, color .14s ease, opacity .14s ease;
  }
  .onb-avatar-icon {
    color: inherit;
    opacity: 1;
  }
  .onb-avatar:hover:not(:disabled) {
    background: #EEEEF0;
    color: var(--al-text-muted-soft, #b0b7c4);
  }
  .onb-avatar:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(91, 100, 125, 0.22);
  }
  .onb-avatar.is-busy,
  .onb-avatar:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .onb-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .onb-avatar-clear {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #5c5c62;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, color .12s ease;
  }
  .onb-avatar-clear:hover:not(:disabled) {
    background: #f4f4f5;
    color: #1e1e20;
  }
  .onb-avatar-clear:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .onb-avatar-input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .onb-name-input {
    flex: 1;
    min-width: 0;
  }
  .al-root[data-theme="dark"] .onb-field-label {
    color: #98a2b3;
  }
  .al-root[data-theme="dark"] .onb-avatar {
    background: var(--festag-input-fill, #1c1d22);
    color: rgba(245, 245, 247, 0.40);
  }
  .al-root[data-theme="dark"] .onb-avatar:hover:not(:disabled) {
    background: var(--festag-input-fill-focus, #24262c);
    color: rgba(245, 245, 247, 0.40);
  }
  .al-root[data-theme="dark"] .onb-avatar-clear {
    background: #121214;
    color: rgba(245, 245, 247, 0.72);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
  }
  .al-root[data-theme="dark"] .onb-avatar-clear:hover:not(:disabled) {
    background: #1a1a1c;
    color: #f5f5f7;
  }
  .onb-toggle-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px;
    display: flex;
    flex-direction: column;
    border: 0;
    background: transparent;
    overflow: visible;
  }
  .onb-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 0;
    border: 0;
    border-bottom: 0.7px solid rgba(255, 255, 255, 0.08);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    transition: opacity .12s ease;
    outline: none;
  }
  .onb-toggle-row:last-child { border-bottom: 0; }
  .onb-toggle-row:hover { opacity: 0.92; }
  .onb-toggle-row.is-active { background: transparent; }
  .onb-toggle-row:focus-visible {
    opacity: 1;
    box-shadow: inset 0 0 0 1px rgba(140, 148, 170, 0.35);
    border-radius: 8px;
  }
  .onb-toggle-text { flex: 1; min-width: 0; }
  .onb-toggle-info {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: rgba(152, 162, 179, 0.55);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color .12s ease, background .12s ease;
  }
  .onb-toggle-info:hover,
  .onb-toggle-info:focus-visible {
    color: rgba(243, 245, 247, 0.88);
    background: rgba(255, 255, 255, 0.06);
    outline: none;
  }
  .al-root[data-theme="light"] .onb-toggle-info,
  .al-root[data-theme="read"] .onb-toggle-info {
    color: rgba(134, 134, 139, 0.75);
  }
  .al-root[data-theme="light"] .onb-toggle-info:hover,
  .al-root[data-theme="light"] .onb-toggle-info:focus-visible,
  .al-root[data-theme="read"] .onb-toggle-info:hover,
  .al-root[data-theme="read"] .onb-toggle-info:focus-visible {
    color: #1e1e20;
    background: rgba(15, 23, 42, 0.05);
  }
  .al-root[data-theme="dark"] .onb-toggle-info:hover,
  .al-root[data-theme="dark"] .onb-toggle-info:focus-visible {
    color: #f5f5f7;
    background: rgba(255, 255, 255, 0.06);
  }
  /* Beat .al-root p { 400 } — Aeonik Medium for option labels. */
  .al-root .onb-toggle-title {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 20px;
    color: rgba(254, 254, 255, 0.8);
  }
  .onb-toggle-desc {
    margin: 0;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    line-height: 20px;
    color: rgba(132, 141, 155, 0.6);
  }
  .onb-toggle-row.is-active .onb-toggle-title {
    color: #f3f5f7;
  }
  /* Figma Toggle — 25×14, hairline track, white knob */
  .onb-switch {
    position: relative;
    flex-shrink: 0;
    width: 25px;
    height: 14px;
    border-radius: 100px;
    background: #3f4852;
    box-shadow:
      inset 0 -0.5px 1px rgba(94, 94, 94, 0.3),
      inset 0 -0.5px 1px rgba(255, 255, 255, 0.2),
      inset 0 3px 3px rgba(128, 128, 128, 0.18),
      inset 0 3px 3px rgba(0, 0, 0, 0.15);
    display: inline-flex;
    align-items: center;
    padding: 1px;
    transition: background .18s ease;
    pointer-events: none;
    overflow: hidden;
  }
  .onb-switch.is-on {
    background: #5B647D;
    box-shadow:
      inset 0 -0.5px 1px rgba(255, 255, 255, 0.18),
      inset 0 2px 3px rgba(0, 0, 0, 0.22);
  }
  .onb-switch-knob {
    width: 12px;
    height: 12px;
    border-radius: 100px;
    background: #ffffff;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
    transform: translateX(0);
    transition: transform .2s cubic-bezier(.22, .68, .36, 1);
  }
  .onb-switch.is-on .onb-switch-knob {
    transform: translateX(11px);
  }
  .onb-note {
    margin: 0 0 8px;
    padding: 12px 14px;
    border: 1px solid rgba(91,100,125,.28);
    background: rgba(91,100,125,.10);
    border-radius: 10px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--al-muted, rgba(255,255,255,.78));
  }
  .onb-fine {
    margin: 0;
    font-size: 12px;
    color: var(--al-muted, rgba(255,255,255,.40));
    line-height: 1.5;
  }
  .onb-fine--under-cta {
    margin-top: 12px;
  }
  .onb-dots {
    list-style: none;
    padding: 0;
    margin: 0;
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 72px);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 5;
  }
  .onb-dots li {
    display: flex;
    align-items: center;
  }
  .onb-dot {
    width: 6px;
    height: 6px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255,255,255,.15);
    transition: width .25s ease, background .25s ease, transform .12s ease;
    appearance: none;
    -webkit-appearance: none;
    pointer-events: none;
    position: relative;
  }
  .onb-dot.is-active {
    width: 24px;
    background: rgba(255,255,255,.85);
  }
  .onb-dot.is-done { background: rgba(255,255,255,.35); }
  .onb-dot.is-clickable {
    pointer-events: auto;
    cursor: pointer;
  }
  /* Larger tap target without changing the visible dot size. */
  .onb-dot.is-clickable::before {
    content: '';
    position: absolute;
    inset: -10px;
  }
  .onb-dot.is-clickable:hover {
    transform: scale(1.35);
    background: rgba(255,255,255,.55);
  }
  .onb-dot.is-clickable:focus-visible {
    outline: none;
    transform: scale(1.35);
    background: rgba(255,255,255,.55);
  }

  .al-root[data-theme="light"] .onb-toggle-title,
  .al-root[data-theme="read"] .onb-toggle-title {
    color: #1e1e20;
  }
  .al-root[data-theme="light"] .onb-toggle-row.is-active .onb-toggle-title,
  .al-root[data-theme="read"] .onb-toggle-row.is-active .onb-toggle-title {
    color: #1e1e20;
  }
  .al-root[data-theme="light"] .onb-toggle-desc,
  .al-root[data-theme="light"] .onb-fine,
  .al-root[data-theme="read"] .onb-toggle-desc,
  .al-root[data-theme="read"] .onb-fine {
    color: rgba(92, 92, 98, 0.78);
  }
  .al-root[data-theme="light"] .onb-toggle-list,
  .al-root[data-theme="read"] .onb-toggle-list {
    background: transparent;
    border: 0;
  }
  .al-root[data-theme="light"] .onb-toggle-row,
  .al-root[data-theme="read"] .onb-toggle-row {
    background: transparent;
    border-bottom-color: rgba(0, 0, 0, 0.08);
    box-shadow: none;
  }
  .al-root[data-theme="light"] .onb-toggle-row:hover,
  .al-root[data-theme="read"] .onb-toggle-row:hover {
    background: transparent;
    opacity: 0.88;
  }
  .al-root[data-theme="light"] .onb-toggle-row.is-active,
  .al-root[data-theme="read"] .onb-toggle-row.is-active {
    background: transparent;
    box-shadow: none;
  }
  .al-root[data-theme="light"] .onb-switch,
  .al-root[data-theme="read"] .onb-switch {
    background: #D1D1D6;
    box-shadow:
      inset 0 -0.5px 1px rgba(0, 0, 0, 0.08),
      inset 0 2px 3px rgba(0, 0, 0, 0.06);
  }
  .al-root[data-theme="light"] .onb-switch.is-on,
  .al-root[data-theme="read"] .onb-switch.is-on {
    background: #5B647D;
    box-shadow:
      inset 0 -0.5px 1px rgba(255, 255, 255, 0.2),
      inset 0 2px 3px rgba(0, 0, 0, 0.18);
  }
  .al-root[data-theme="light"] .onb-dot,
  .al-root[data-theme="read"] .onb-dot { background: rgba(0,0,0,0.12); }
  .al-root[data-theme="light"] .onb-dot.is-active,
  .al-root[data-theme="read"] .onb-dot.is-active { background: #1d1d1f; }
  .al-root[data-theme="light"] .onb-dot.is-done,
  .al-root[data-theme="read"] .onb-dot.is-done { background: rgba(0,0,0,0.28); }
  .al-root[data-theme="light"] .onb-dot.is-clickable:hover,
  .al-root[data-theme="light"] .onb-dot.is-clickable:focus-visible,
  .al-root[data-theme="read"] .onb-dot.is-clickable:hover,
  .al-root[data-theme="read"] .onb-dot.is-clickable:focus-visible {
    background: rgba(0,0,0,0.45);
  }
  .al-root[data-theme="light"] .onb-note,
  .al-root[data-theme="read"] .onb-note {
    border-color: rgba(0,0,0,0.08);
    background: rgba(0,0,0,0.03);
    color: #5c5c62;
  }
`
