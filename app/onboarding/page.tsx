'use client'

/**
 * Festag hybrid onboarding — after workspace create:
 *   1. profile — Name (required), Titel (optional)
 *   2. team    — Alleine / Team / Kunden / Festag-Support
 *   3. done    — optional invites, then dashboard
 *
 * Workspace naming lives on /create-workspace (AuthLanding chrome).
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun, Info } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import {
  clearPendingWorkspaceName,
  getRememberedWorkspaceName,
  rememberWorkspaceName,
} from '@/lib/pending-workspace'
import FestagLoader from '@/components/FestagLoader'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthSecurityModal from '@/components/auth/AuthSecurityModal'
import OnboardingWorkspaceExplainModal, {
  type OnboardingTeamFlag,
} from '@/components/auth/OnboardingWorkspaceExplainModal'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import { prepareAuthRouteTransition, useAuthTheme, consumePanelEnter } from '@/lib/auth-theme'
import {
  getLastFestagAccount,
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
  const [done, setDone] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [booting, setBooting] = useState(true)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [explainId, setExplainId] = useState<TeamFlag | null>(null)

  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState('')
  const [teamChoice, setTeamChoice] = useState<TeamFlag>('alone')
  const [invites, setInvites] = useState('')

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
      // TEMP TEST — remove after onboarding UI QA.
      // Preview without auth/workspace gates so the screens are editable.
      const tempPreview = true
      const remembered = getRememberedPersonalDetails()
      if (tempPreview) {
        const chosen =
          getRememberedWorkspaceName() ||
          getLastFestagAccount()?.workspaceName?.trim() ||
          ''
        setWsName(chosen)
        setWsSlug(chosen ? slugify(chosen) : '')
        if (remembered.fullName) setFullName(remembered.fullName)
        if (remembered.position) setPosition(remembered.position)
        setBooting(false)
        return
      }

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
        supabase.from('profiles').select('full_name,position,work_mode').eq('id', uid).maybeSingle(),
        supabase.from('workspaces').select('id,name,slug,metadata').eq('primary_owner_id', uid).eq('is_personal', true).maybeSingle(),
      ])
      if (cancelled) return

      if (state?.completed_at) { router.replace('/dashboard'); return }

      // Prefer server profile, then OAuth/session metadata, then this device.
      if (profile?.full_name) setFullName(profile.full_name)
      else if (guessName) setFullName(guessName)
      if (profile?.position) setPosition(profile.position)
      else if (remembered.position) setPosition(remembered.position)

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
        project: 1, team: 1, invite: 2, done: 2,
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
  const wordmarkBase = wsName.trim()
    ? `Workspace ${wsName.trim().slice(0, 28)}${wsName.trim().length > 28 ? '…' : ''}`
    : 'Festag'

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

  const persist = useCallback(async (step: StepId): Promise<boolean> => {
    // TEMP TEST preview — advance UI without writing to DB
    if (!userId) {
      if (step === 'profile' && !fullName.trim()) {
        setError('Bitte gib deinen Namen ein.')
        return false
      }
      if (step === 'profile') {
        rememberPersonalDetails({
          fullName: fullName.trim(),
          position: position.trim() || null,
        })
      }
      return true
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
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
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
  }, [userId, workspaceId, wsName, fullName, position, teamChoice, invites, supabase])

  async function handleContinue() {
    if (submitting || animating) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) return
      if (isLast) {
        // TEMP TEST preview — stay on last step instead of leaving to portal
        if (!userId) {
          setError('')
          return
        }
        setDone(true)
        const slug = wsSlug.trim() || slugify(wsName)
        const target = slug
          ? `/${slug}?tour=1&newproject=1`
          : '/dashboard?tour=1&newproject=1'
        prepareAuthRouteTransition(target)
        setPageExiting(true)
        setTimeout(() => { window.location.href = target }, 900)
      } else {
        transition(+1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <FestagLoader fullscreen label="Festag wird vorbereitet…" />

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
      ? {
          lead: 'Profil einrichten.',
          rest: ' So wirst du im Workspace und in Briefings angezeigt.',
        }
      : current === 'team'
        ? {
            lead: 'Wie arbeitest du?',
            rest: ' Diese Wahl richtet Workspace-Modus und Einladungen ein.',
          }
        : {
            lead: `${DONE_COPY[teamChoice].title}.`,
            rest: ` ${DONE_COPY[teamChoice].lede}`,
          }

  return (
    <main
      className={`al-root al-root--centered${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}`}
      data-theme={theme}
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{ONB_EXTRA_CSS}</style>

      <div className="al-container">
        <header className="al-header">
          <a
            key={wordmarkBase}
            className="al-wordmark"
            href="/"
            onClick={e => { e.preventDefault(); navigateWithFade('/') }}
          >
            {wordmarkBase}
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
                        <h1 className="al-title al-title-display onb-hero-line">
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
                            <input
                              className="al-input"
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
                              placeholder="Dein Name"
                              maxLength={80}
                              aria-label="Dein Name"
                              autoFocus
                            />
                            <input
                              className="al-input"
                              type="text"
                              name="organization-title"
                              autoComplete="organization-title"
                              value={position}
                              onChange={(e) => setPosition(e.target.value)}
                              placeholder="Titel (optional)"
                              maxLength={64}
                              aria-label="Titel"
                            />
                            <button
                              type="submit"
                              className={`al-btn al-btn-primary${fullName.trim() ? ' al-btn-primary--ready' : ''}`}
                              disabled={submitting || !fullName.trim()}
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
                                      <Info size={16} weight="regular" />
                                    </button>
                                    <span className={`onb-radio${active ? ' is-on' : ''}`} aria-hidden>
                                      <span className="onb-radio-dot" />
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
                          </>
                        )}

                        {current === 'done' && (() => {
                          const copy = DONE_COPY[teamChoice]
                          const wantsInvite = INVITE_NEED_FOR[teamChoice] !== 'none'
                          return (
                            <>
                              {wantsInvite && (
                                <div className="al-method-group">
                                  <textarea
                                    className="al-input onb-textarea"
                                    name="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    value={invites}
                                    onChange={(e) => setInvites(e.target.value)}
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
                                  className="al-btn al-btn-primary al-btn-primary--ready"
                                  onClick={() => void handleContinue()}
                                  disabled={submitting}
                                >
                                  {submitting ? 'Speichere…' : 'Zum Dashboard'}
                                </button>
                                {wantsInvite && (
                                  <button
                                    type="button"
                                    className="al-btn al-btn-ghost"
                                    onClick={() => { setInvites(''); void handleContinue() }}
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

        <ol className="onb-dots" aria-label="Onboarding-Fortschritt">
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

        <footer className="al-footer-meta">
          <button
            type="button"
            className="al-theme-icon al-theme-icon--footer no-min-tap"
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} weight="regular" /> : <Moon size={17} weight="regular" />}
          </button>
          <span className="al-footer-sep al-footer-sep--desktop-only" aria-hidden="true">|</span>
          <div className="al-footer-links">
            <a
              className="al-dev-link al-dev-link--desktop-only"
              href="/dev/login"
              onClick={e => { e.preventDefault(); navigateWithFade('/dev/login') }}
            >
              Dev Zugang
            </a>
            <span className="al-footer-sep al-footer-sep--desktop-only" aria-hidden="true">|</span>
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
          <span className="al-footer-sep al-footer-sep--mode al-mode-switch--desktop-only" aria-hidden="true">|</span>
          <a
            className="al-dev-link al-mode-switch--desktop-only al-footer-mode-switch"
            href="/register"
            onClick={e => { e.preventDefault(); navigateWithFade('/register') }}
          >
            Zurück zur Registrierung
          </a>
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
  .onb-animating {
    opacity: 0;
    transform: translateY(6px);
    transition: opacity .16s ease, transform .16s ease;
  }
  textarea.al-input.onb-textarea {
    height: auto;
    min-height: 116px;
    padding: 14px 18px;
    line-height: 1.55;
    resize: vertical;
    border-radius: 18px;
  }
  .onb-toggle-list {
    list-style: none;
    padding: 0;
    margin: 0 0 8px;
    border: 1px solid var(--al-input-border, rgba(255,255,255,.08));
    border-radius: 12px;
    background: var(--al-input-bg, rgba(255,255,255,.02));
    overflow: hidden;
  }
  .onb-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid var(--al-input-border, rgba(255,255,255,.06));
    cursor: pointer;
    transition: background .12s ease;
    outline: none;
  }
  .onb-toggle-row:first-child { border-top: 0; }
  .onb-toggle-row:hover { background: rgba(255,255,255,.025); }
  .onb-toggle-row.is-active { background: rgba(91,100,125,.12); }
  .onb-toggle-row:focus-visible { box-shadow: inset 0 0 0 1px rgba(140,148,170,.5); }
  .onb-toggle-text { flex: 1; min-width: 0; }
  .onb-toggle-info {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--al-text-muted, #8891a0);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color .12s ease, background .12s ease;
  }
  .onb-toggle-info:hover,
  .onb-toggle-info:focus-visible {
    color: #1e1e20;
    background: rgba(15, 23, 42, 0.05);
    outline: none;
  }
  .al-root[data-theme="dark"] .onb-toggle-info:hover,
  .al-root[data-theme="dark"] .onb-toggle-info:focus-visible {
    color: #f5f5f7;
    background: rgba(255, 255, 255, 0.06);
  }
  .al-root[data-theme="light"] .onb-toggle-info,
  .al-root[data-theme="read"] .onb-toggle-info {
    color: #86868b;
  }
  .onb-toggle-title {
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
    letter-spacing: var(--ls-body, 0.017em);
  }
  .onb-toggle-desc {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--al-muted, rgba(255,255,255,.45));
    line-height: 1.45;
  }
  .onb-radio {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,.22);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .onb-radio.is-on {
    border-color: #8C94AA;
    background: rgba(91,100,125,.20);
  }
  .onb-radio-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    transform: scale(0);
    transition: transform .15s cubic-bezier(.22,.65,.35,1);
  }
  .onb-radio.is-on .onb-radio-dot { transform: scale(1); }
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

  .al-root[data-theme="light"] .onb-toggle-desc,
  .al-root[data-theme="light"] .onb-fine,
  .al-root[data-theme="read"] .onb-toggle-desc,
  .al-root[data-theme="read"] .onb-fine {
    color: #5c5c62;
  }
  .al-root[data-theme="light"] .onb-toggle-list,
  .al-root[data-theme="read"] .onb-toggle-list {
    background: rgba(255,255,255,0.72);
    border-color: rgba(0,0,0,0.08);
  }
  .al-root[data-theme="light"] .onb-toggle-row,
  .al-root[data-theme="read"] .onb-toggle-row {
    border-top-color: rgba(0,0,0,0.06);
  }
  .al-root[data-theme="light"] .onb-toggle-row.is-active,
  .al-root[data-theme="read"] .onb-toggle-row.is-active {
    background: rgba(0,0,0,0.04);
  }
  .al-root[data-theme="light"] .onb-radio,
  .al-root[data-theme="read"] .onb-radio {
    border-color: rgba(0,0,0,0.22);
  }
  .al-root[data-theme="light"] .onb-radio.is-on,
  .al-root[data-theme="read"] .onb-radio.is-on {
    border-color: #1d1d1f;
    background: rgba(29,29,31,0.08);
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
