'use client'

/**
 * /dev/onboarding — Dev Panel onboarding flow.
 *
 * Runs after GitHub OAuth (or any first-time dev login) when the dev
 * does not yet have a complete profile. Three calm steps:
 *   1. profil    — display name + freeform facts (Tagro personalizes panel)
 *   2. fokus     — optional multi-select focus
 *   3. verbinden — invite / later + Quellen; final CTA starts setup sequence
 *
 * Uses the exact same auth chrome as the client onboarding
 * (AUTH_LANDING_STYLES, al-btn, al-input, onb-dots, etc.) but with
 * dev-specific copy and dark-mode default.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type TouchEvent as ReactTouchEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AUTH_LANDING_STYLES } from '@/components/auth/auth-landing-styles'
import {
  applyAuthTheme,
  prepareAuthRouteTransition,
  consumePanelEnter,
  navigateLeavingAuthChrome,
} from '@/lib/auth-theme'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import AuthLandingMobileMenu from '@/components/auth/AuthLandingMobileMenu'
import AuthSandAmbient from '@/components/auth/AuthSandAmbient'
import OnboardingSetupSequence, {
  setupSequenceDuration,
} from '@/components/auth/OnboardingSetupSequence'
import TagroFieldAssist from '@/components/auth/TagroFieldAssist'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import {
  DEV_POSTURE_FALLBACK,
  POSTURE_FALLBACK_COPY,
  RELATIONSHIP_LABELS,
  extractDeveloperInviteToken,
  isDevRelationshipKind,
  type DevPostureFallback,
  type DevRelationshipKind,
} from '@/lib/dev/relationship'
import {
  OnbLogoCalendar,
  OnbLogoDiscord,
  OnbLogoFigma,
  OnbLogoGithub,
  OnbLogoJira,
  OnbLogoLinear,
  OnbLogoNotion,
  OnbLogoPhone,
  OnbLogoSlack,
  OnbLogoSpotify,
  OnbLogoVercel,
} from '@/components/auth/OnboardingSourceLogos'

/* ─── Types ─────────────────────────────────────────────────────────── */

type StepId = 'profil' | 'fokus' | 'verbinden'
type FocusId =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'devops'
  | 'design'
  | 'data'
  | 'security'
  | 'qa'
  | 'freelance'

const STEPS: StepId[] = ['profil', 'fokus', 'verbinden']

type IntegrationId =
  | 'github' | 'linear' | 'jira' | 'slack' | 'notion'
  | 'figma' | 'vercel' | 'spotify' | 'phone' | 'calendar' | 'discord'

const INTEGRATIONS: Array<{
  id: IntegrationId
  name: string
  available: boolean
  Logo: (p: { className?: string }) => ReactElement
}> = [
  { id: 'github', name: 'GitHub', available: true, Logo: OnbLogoGithub },
  { id: 'linear', name: 'Linear', available: false, Logo: OnbLogoLinear },
  { id: 'jira', name: 'Jira', available: false, Logo: OnbLogoJira },
  { id: 'slack', name: 'Slack', available: false, Logo: OnbLogoSlack },
  { id: 'notion', name: 'Notion', available: false, Logo: OnbLogoNotion },
  { id: 'figma', name: 'Figma', available: false, Logo: OnbLogoFigma },
  { id: 'vercel', name: 'Vercel', available: false, Logo: OnbLogoVercel },
  { id: 'spotify', name: 'Spotify', available: false, Logo: OnbLogoSpotify },
  { id: 'phone', name: 'Telefon', available: false, Logo: OnbLogoPhone },
  { id: 'calendar', name: 'Kalender', available: false, Logo: OnbLogoCalendar },
  { id: 'discord', name: 'Discord', available: false, Logo: OnbLogoDiscord },
]

/* ─── Focus options (optional, multi-select — Tagro does not require one) ─ */

const FOCUS_OPTIONS: Array<{ id: FocusId; title: string; desc: string }> = [
  { id: 'frontend',  title: 'Frontend',      desc: 'Web, Apps, Design-Systeme und UI.' },
  { id: 'backend',   title: 'Backend',       desc: 'APIs, Datenbanken und Services.' },
  { id: 'fullstack', title: 'Full-Stack',    desc: 'Von der Feature-Idee bis zum Deploy.' },
  { id: 'mobile',    title: 'Mobile',        desc: 'iOS, Android und Cross-Platform.' },
  { id: 'devops',    title: 'DevOps',        desc: 'CI/CD, Cloud und Platform Engineering.' },
  { id: 'design',    title: 'Design / UI',   desc: 'Interfaces, Prototypen und Design-Systeme.' },
  { id: 'data',      title: 'Data / ML',     desc: 'Pipelines, Analysen und Modelle.' },
  { id: 'security',  title: 'Security',      desc: 'Auth, Hardening und Reviews.' },
  { id: 'qa',        title: 'QA / Testing',  desc: 'Qualität, Automationen und Regression.' },
  { id: 'freelance', title: 'Freiberuflich', desc: 'Projektbasiert, mehrere Stacks.' },
]

/* ─── Hero copy ──────────────────────────────────────────────────────── */

const PROFIL_HERO = {
  lead: 'Dein Entwicklerprofil.',
  rest: ' Name und ein paar Fakten — Tagro richtet Panel und Module danach aus.',
}

const FOKUS_HERO = {
  lead: 'Dein Fokus.',
  rest: ' Optional — mehrere möglich, oder einfach überspringen.',
}

const VERBINDEN_HERO = {
  lead: 'Mit einem Client verbinden.',
  rest: ' Einladung einlösen — oder später.',
}

const VERBINDEN_LINKED_HERO = {
  lead: 'Du bist verbunden.',
  rest: ' Optional GitHub verknüpfen — das Panel richtet sich nach deinem Bezug ein.',
}

/** Top sand fade only after the list has scrolled; bottom fade stays always on. */
function useSandScrollTopFade() {
  const [scrolled, setScrolled] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  const syncFrom = useCallback((el: HTMLUListElement | null) => {
    if (!el) {
      setScrolled(false)
      return
    }
    setScrolled(el.scrollTop > 4)
  }, [])

  const listRef = useCallback(
    (el: HTMLUListElement | null) => {
      cleanupRef.current?.()
      cleanupRef.current = null
      if (!el) {
        setScrolled(false)
        return
      }
      const onScroll = () => syncFrom(el)
      onScroll()
      el.addEventListener('scroll', onScroll, { passive: true })
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null
      ro?.observe(el)
      cleanupRef.current = () => {
        el.removeEventListener('scroll', onScroll)
        ro?.disconnect()
      }
    },
    [syncFrom],
  )

  useEffect(() => () => cleanupRef.current?.(), [])

  return { listRef, scrolled }
}

export default function DevOnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  /* Dev onboarding is always primary-dusk dark — no light toggle. */

  const [booting, setBooting]     = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)
  const [current, setCurrent]     = useState<StepId>('profil')
  const [animating, setAnimating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter]   = useState(false)
  const [reveal, setReveal]           = useState<'leaving' | 'message' | 'departing' | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revealTimers = useRef<any[]>([])

  /* Step data */
  const [fullName, setFullName]         = useState('')
  const [position, setPosition]         = useState('')
  const [facts, setFacts]               = useState('')
  const [factsAssistOpen, setFactsAssistOpen] = useState(false)
  const [focusIds, setFocusIds] = useState<FocusId[]>([])
  const factsRef = useRef<HTMLTextAreaElement | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<IntegrationId>>(new Set())
  const [inviteLinked, setInviteLinked] = useState(false)
  const [inviteWorkspaceName, setInviteWorkspaceName] = useState('')
  const [inviteRelationship, setInviteRelationship] = useState<DevRelationshipKind | null>(null)
  const [inviteDraft, setInviteDraft] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [showPostureFallback, setShowPostureFallback] = useState(false)
  const [postureFallback, setPostureFallback] = useState<DevPostureFallback | null>(null)
  const swipeRef = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)
  const swipeIgnoreRef = useRef(false)
  const focusScroll = useSandScrollTopFade()
  const sourcesScroll = useSandScrollTopFade()

  /* ── Boot: check auth + skip if already onboarded ─────────────────── */

  useLayoutEffect(() => {
    applyAuthTheme('dark', 'dev')
    const p = consumePanelEnter()
    if (p) setPanelEnter(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        /* TEMP TEST — UI preview without auth gates. */
        if (typeof window !== 'undefined') {
          try {
            if (new URLSearchParams(window.location.search).get('preview') === '1') {
              setFullName('Alex Developer')
              setPosition('Full-Stack')
              setFocusIds(['fullstack'])
              setCurrent('profil')
              setBooting(false)
              return
            }
          } catch { /* noop */ }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/dev/login')
          return
        }
        if (cancelled) return
        setUserId(user.id)

        /* Pre-fill name from Supabase user metadata (GitHub sets this) */
        const meta = user.user_metadata ?? {}
        const ghName = meta.full_name || meta.name || meta.user_name || ''
        if (ghName && !fullName) setFullName(ghName)

        /* Resuming from a mid-onboarding GitHub link redirect (see connectGithub
           below) — land back on the same step instead of bouncing to /dev. */
        const resumeStep = new URLSearchParams(window.location.search).get('step') as StepId | null
        const isResuming = resumeStep != null && STEPS.includes(resumeStep)

        /* Check if already onboarded: display name is enough (focus is optional). */
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, work_mode, position, dev_profile_facts, dev_relationship, dev_github_linked, github_username')
          .eq('id', user.id)
          .maybeSingle()

        /* GitHub: primary OAuth, linked identity, or profile stamp after persist-session */
        const providers = (user.app_metadata?.providers as string[] | undefined) ?? []
        const identityLinked = (user.identities ?? []).some((i: any) => i.provider === 'github')
        const isGhConnected =
          providers.includes('github') ||
          user.app_metadata?.provider === 'github' ||
          identityLinked ||
          !!(prof as any)?.dev_github_linked ||
          !!(prof as any)?.github_username
        if (isGhConnected) {
          setGithubConnected(true)
          setConnectedIntegrations(prev => { const s = new Set(prev); s.add('github'); return s })
        }

        const params = new URLSearchParams(window.location.search)
        const invitedFlag = params.get('invited') === '1'
        const relationshipParam = params.get('relationship')
        if (isDevRelationshipKind(relationshipParam)) {
          setInviteRelationship(relationshipParam)
          setInviteLinked(true)
        } else if (invitedFlag) {
          setInviteLinked(true)
        }

        const { data: memberships } = await supabase
          .from('workspace_members')
          .select('workspace_id, relationship_kind, workspaces(name)')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(3)

        const firstMember = ((memberships as any[]) ?? [])[0]
        if (firstMember) {
          setInviteLinked(true)
          const wsName = firstMember.workspaces?.name
            ?? (Array.isArray(firstMember.workspaces) ? firstMember.workspaces[0]?.name : null)
          if (wsName) setInviteWorkspaceName(String(wsName))
          if (isDevRelationshipKind(firstMember.relationship_kind)) {
            setInviteRelationship(firstMember.relationship_kind)
          }
        } else if (isDevRelationshipKind((prof as any)?.dev_relationship)) {
          setInviteRelationship((prof as any).dev_relationship)
          if ((DEV_POSTURE_FALLBACK as readonly string[]).includes((prof as any).dev_relationship)) {
            setPostureFallback((prof as any).dev_relationship as DevPostureFallback)
          }
        }

        if ((prof as any)?.position && !position) setPosition((prof as any).position)
        if ((prof as any)?.dev_profile_facts && !facts) {
          setFacts(String((prof as any).dev_profile_facts))
        }

        const alreadyDone = Boolean((prof as any)?.full_name)

        if (alreadyDone && !isResuming) {
          /* Returning dev — skip onboarding, go straight to panel */
          router.replace('/dev')
          return
        }

        if (isResuming) setCurrent(resumeStep)

        /* Pre-fill from existing profile if partial */
        if ((prof as any)?.full_name && !fullName) setFullName((prof as any).full_name)
        const savedModes = String((prof as any)?.work_mode ?? '')
          .split(',')
          .map((s: string) => s.trim())
          .filter((id: string): id is FocusId => FOCUS_OPTIONS.some((o) => o.id === id))
        if (savedModes.length) setFocusIds(savedModes)
        if (cancelled) return
        setBooting(false)
      } catch {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Step helpers ─────────────────────────────────────────────────── */

  const stepIdx = STEPS.indexOf(current)
  const isLast  = stepIdx === STEPS.length - 1

  function transition(delta: number) {
    const next = STEPS[stepIdx + delta]
    if (!next) return
    setError('')
    setAnimating(true)
    window.setTimeout(() => {
      setCurrent(next)
      setAnimating(false)
    }, 200)
  }

  function goToStep(idx: number) {
    if (idx === stepIdx) return
    if (idx > stepIdx) return
    setError('')
    setAnimating(true)
    window.setTimeout(() => {
      setCurrent(STEPS[idx])
      setAnimating(false)
    }, 200)
  }

  /** Dots: past = jump back; current or future = one step forward (same as swipe). */
  function onDotClick(idx: number) {
    if (submitting || revealing || animating) return
    if (idx < stepIdx) {
      goToStep(idx)
      return
    }
    if (isLast) return
    void handleContinue()
  }

  function onSwipeTouchStart(e: ReactTouchEvent) {
    const t = e.target as HTMLElement | null
    if (t?.closest('input, textarea, button, a, [role="radio"], [role="switch"], .onb-integration-btn, .onb-sources-scroll, .onb-focus-scroll, .onb-toggle-row')) {
      swipeIgnoreRef.current = true
      swipeRef.current = null
      return
    }
    swipeIgnoreRef.current = false
    const p = e.touches[0]
    if (!p) return
    swipeRef.current = { x: p.clientX, y: p.clientY, locked: null }
  }

  function onSwipeTouchMove(e: ReactTouchEvent) {
    if (swipeIgnoreRef.current || !swipeRef.current) return
    const p = e.touches[0]
    if (!p) return
    const dx = p.clientX - swipeRef.current.x
    const dy = p.clientY - swipeRef.current.y
    if (swipeRef.current.locked === null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      swipeRef.current.locked = Math.abs(dx) > Math.abs(dy) * 1.15
    }
  }

  function onSwipeTouchEnd(e: ReactTouchEvent) {
    if (swipeIgnoreRef.current) {
      swipeIgnoreRef.current = false
      swipeRef.current = null
      return
    }
    const start = swipeRef.current
    swipeRef.current = null
    if (!start || start.locked !== true) return
    const p = e.changedTouches[0]
    if (!p) return
    const dx = p.clientX - start.x
    if (Math.abs(dx) < 64) return
    if (dx < 0) {
      if (isLast || submitting || revealing) return
      void handleContinue()
    } else {
      if (stepIdx <= 0) return
      goToStep(stepIdx - 1)
    }
  }

  /* ── Persist + continue ───────────────────────────────────────────── */

  const persist = useCallback(async (step: StepId): Promise<boolean> => {
    const isPreview = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preview') === '1'
    if (isPreview) {
      if (step === 'profil' && !fullName.trim()) {
        setError('Bitte einen Namen eingeben.')
        return false
      }
      if (step === 'verbinden' && !inviteLinked && !postureFallback) {
        setError('Bitte Einladung einlösen oder einen Bezug wählen.')
        return false
      }
      return true
    }
    if (!userId) return false
    setError('')
    try {
      if (step === 'profil') {
        if (!fullName.trim()) {
          setError('Bitte einen Namen eingeben.')
          return false
        }
        const factsTrim = facts.trim()
        const shortPosition =
          position.trim() ||
          factsTrim
            .split(/[\n,]/)
            .map((s) => s.trim())
            .find((s) => s.length > 2)
            ?.slice(0, 64) ||
          ''
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName.trim(),
          ...(shortPosition ? { position: shortPosition } : {}),
          ...(factsTrim ? { dev_profile_facts: factsTrim } : { dev_profile_facts: null }),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
      } else if (step === 'fokus') {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          work_mode: focusIds.length ? focusIds.join(',') : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
      } else if (step === 'verbinden') {
        if (!inviteLinked && !postureFallback) {
          setError('Bitte Einladung einlösen, später mit Bezug wählen, oder „Später verbinden“.')
          return false
        }
        if (!inviteLinked && postureFallback) {
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: userId,
            dev_relationship: postureFallback,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          if (upsertError) {
            setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
            return false
          }
          setInviteRelationship(postureFallback)
        }
      }
      return true
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
      return false
    }
  }, [userId, fullName, position, facts, focusIds, inviteLinked, postureFallback, supabase])

  useEffect(() => {
    syncAutoGrowTextarea(factsRef.current, { minPx: 96, maxPx: 280 })
  }, [facts, current])

  const positionHint = useMemo(() => {
    if (position.trim()) return position.trim()
    return (
      facts
        .split(/[\n,]/)
        .map((s) => s.trim())
        .find((s) => s.length > 2)
        ?.slice(0, 64) || ''
    )
  }, [position, facts])

  async function handleContinue() {
    if (submitting || animating || reveal) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) { setSubmitting(false); return }

      const isPreview = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === '1'

      if (isLast) {
        if (isPreview) {
          clearRevealTimers()
          setReveal('leaving')
          const leaveMs = 420
          const seqMs = setupSequenceDuration()
          const t1 = window.setTimeout(() => setReveal('message'), leaveMs)
          const t2 = window.setTimeout(() => {
            setReveal('departing')
            prepareAuthRouteTransition('/login')
            const t3 = window.setTimeout(() => {
              window.location.href = '/login'
            }, 620)
            revealTimers.current.push(t3)
          }, leaveMs + seqMs)
          revealTimers.current.push(t1, t2)
          return
        }
        clearRevealTimers()
        setReveal('leaving')
        const leaveMs = 420
        const seqMs = setupSequenceDuration()
        const t1 = window.setTimeout(() => setReveal('message'), leaveMs)
        const t2 = window.setTimeout(() => {
          setReveal('departing')
          prepareAuthRouteTransition('/dev')
          const t3 = window.setTimeout(() => {
            window.location.href = '/dev'
          }, 620)
          revealTimers.current.push(t3)
        }, leaveMs + seqMs)
        revealTimers.current.push(t1, t2)
      } else {
        transition(+1)
        setSubmitting(false)
      }
    } catch {
      setError('Speichern fehlgeschlagen.')
      setSubmitting(false)
    }
  }

  async function connectGithub() {
    setError('')
    const { error: linkError } = await (supabase.auth as any).linkIdentity({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dev/onboarding?step=verbinden')}`,
        scopes: 'read:user user:email read:org repo',
      },
    })
    if (linkError) setError('GitHub-Verbindung fehlgeschlagen: ' + linkError.message)
  }

  async function redeemInvite() {
    setError('')
    const token = extractDeveloperInviteToken(inviteDraft)
    if (!token) {
      setError('Bitte einen gültigen Einladungslink oder Code einfügen.')
      return
    }
    setRedeeming(true)
    try {
      const res = await fetch('/api/dev/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.needsAuth && json.authHref) {
          window.location.href = json.authHref
          return
        }
        setError(json.error ?? 'Einladung konnte nicht eingelöst werden.')
        return
      }
      setInviteLinked(true)
      if (isDevRelationshipKind(json.relationshipKind)) {
        setInviteRelationship(json.relationshipKind)
      }
      setShowPostureFallback(false)
      setInviteDraft('')
    } catch {
      setError('Verbindung fehlgeschlagen.')
    } finally {
      setRedeeming(false)
    }
  }

  function onLaterConnect() {
    setError('')
    if (inviteLinked) {
      void handleContinue()
      return
    }
    setShowPostureFallback(true)
  }

  function clearRevealTimers() {
    for (const id of revealTimers.current) window.clearTimeout(id)
    revealTimers.current = []
  }

  useEffect(() => () => clearRevealTimers(), [])

  /* ── Hero copy ────────────────────────────────────────────────────── */

  function toggleFocus(id: FocusId) {
    setFocusIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const heroCopy =
    current === 'profil'    ? PROFIL_HERO
    : current === 'fokus'     ? FOKUS_HERO
    : (inviteLinked ? VERBINDEN_LINKED_HERO : VERBINDEN_HERO)

  const heroKey = current === 'fokus'
    ? `fokus-${focusIds.slice().sort().join('-') || 'none'}`
    : current === 'verbinden'
      ? `verbinden-${inviteLinked ? 'linked' : showPostureFallback ? 'posture' : 'open'}`
      : current
  const revealing  = reveal != null
  const verbindenReady = inviteLinked || Boolean(postureFallback)

  /* ── Loading spinner ─────────────────────────────────────────────── */

  if (booting) {
    return (
      <main
        data-theme="dark"
        className="al-root onb-sand-dark"
        style={{
          minHeight: '100dvh', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <style>{`@keyframes alboot{to{transform:rotate(360deg)}}`}</style>
        <style>{DEV_ONB_CSS}</style>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,176,188,.25)', borderTopColor: 'rgba(168,176,188,.9)', animation: 'alboot .8s linear infinite' }} />
      </main>
    )
  }

  /* ─────────────────────────────────────────────────────────────────── */

  return (
    <main
      className={`al-root al-root--centered onb-sand-dark${pageExiting ? ' exiting' : ''}${panelEnter ? ' al-panel-enter' : ''}${revealing ? ` onb-revealing onb-reveal-${reveal}` : ''}`}
      data-theme="dark"
    >
      <style>{AUTH_LANDING_STYLES}</style>
      <style>{DEV_ONB_CSS}</style>
      <AuthSandAmbient variant="dev-onboarding" />

      <OnboardingSetupSequence
        variant="dev"
        active={reveal === 'message' || reveal === 'departing'}
        departing={reveal === 'departing'}
        positionHint={positionHint}
      />

      <div className={`al-container${revealing ? ' onb-chrome-exit' : ''}`}>
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag Dev" role="img">
            <img
              className="al-wordmark-img al-wordmark-img--dark"
              src="/brand/festag-mark-fluid.png?v=20260731"
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
            />
          </span>
          <div className="al-header-actions">
            <AuthDocsPopover />
            <AuthLandingMobileMenu
              onNavigate={(href) => {
                navigateLeavingAuthChrome(href)
              }}
            />
          </div>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section
                    className="al-signin"
                    aria-label="Dev Onboarding"
                    onTouchStart={onSwipeTouchStart}
                    onTouchMove={onSwipeTouchMove}
                    onTouchEnd={onSwipeTouchEnd}
                    onTouchCancel={() => { swipeRef.current = null; swipeIgnoreRef.current = false }}
                  >

                    <div className={`al-signin-head${animating ? ' onb-animating' : ''}`}>
                      <div className="al-hero-copy">
                        {!animating ? (
                          <GlassyHeroWords
                            key={heroKey}
                            lead={heroCopy.lead}
                            rest={heroCopy.rest}
                          />
                        ) : (
                          <h1 className="al-title al-title-display onb-hero-line" aria-hidden>
                            <span className="onb-hero-lead">{heroCopy.lead}</span>
                            <span className="al-hero-gray">{heroCopy.rest}</span>
                          </h1>
                        )}
                      </div>
                    </div>

                    <div className={`al-content${animating ? ' onb-animating' : ''}`}>
                      <div className="al-signin-stack">

                        {/* ── Step 1: Profil ─────────────────────────── */}
                        {current === 'profil' && (
                          <form
                            className="al-method-group"
                            autoComplete="on"
                            onSubmit={(e) => { e.preventDefault(); void handleContinue() }}
                          >
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="dev-onb-name">
                                Anzeigename
                              </label>
                              <input
                                id="dev-onb-name"
                                className="al-input"
                                type="text"
                                name="name"
                                autoComplete="name"
                                autoCapitalize="words"
                                spellCheck={false}
                                value={fullName}
                                onChange={(e) => { setError(''); setFullName(e.target.value) }}
                                placeholder="Vollständiger Name…"
                                maxLength={80}
                                autoFocus
                              />
                            </div>
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="dev-onb-facts">
                                Über dich
                                <span className="onb-field-optional"> (optional)</span>
                              </label>
                              <textarea
                                id="dev-onb-facts"
                                ref={factsRef}
                                className="al-input onb-facts-area"
                                name="dev-profile-facts"
                                value={facts}
                                onChange={(e) => {
                                  setFacts(e.target.value)
                                  syncAutoGrowTextarea(e.currentTarget, { minPx: 96, maxPx: 280 })
                                }}
                                onFocus={() => setFactsAssistOpen(true)}
                                onClick={() => setFactsAssistOpen(true)}
                                placeholder="Position, Stack, wie du arbeitest — ein paar Fakten…"
                                maxLength={2000}
                                rows={3}
                              />
                              <TagroFieldAssist
                                open={factsAssistOpen}
                                onClose={() => setFactsAssistOpen(false)}
                                anchorRef={factsRef}
                                fieldValue={facts}
                                onFieldChange={setFacts}
                                contextLabel="Über dich"
                                surface="profile_facts"
                                theme="dark"
                              />
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="submit"
                              className={`al-btn al-btn-primary onb-cta${fullName.trim() ? ' al-btn-primary--ready' : ''}`}
                              disabled={submitting || !fullName.trim()}
                            >
                              {submitting ? 'Speichere…' : 'Weiter'}
                            </button>
                          </form>
                        )}

                        {/* ── Step 2: Fokus (optional, multi) ───────── */}
                        {current === 'fokus' && (
                          <>
                            <div className={`onb-sources-scroll onb-focus-scroll${focusScroll.scrolled ? ' is-scrolled' : ''}`}>
                              <ul
                                ref={focusScroll.listRef}
                                className="onb-toggle-list onb-focus-list"
                                role="group"
                                aria-label="Entwicklungsfokus, optional, Mehrfachauswahl"
                              >
                                {FOCUS_OPTIONS.map((opt) => {
                                  const active = focusIds.includes(opt.id)
                                  return (
                                    <li key={opt.id}>
                                      <button
                                        type="button"
                                        className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                        aria-pressed={active}
                                        onClick={() => toggleFocus(opt.id)}
                                      >
                                        <div className="onb-toggle-text">
                                          <p className="onb-toggle-title">{opt.title}</p>
                                          <p className="onb-toggle-desc">{opt.desc}</p>
                                        </div>
                                        <span
                                          className={`onb-switch${active ? ' is-on' : ''}`}
                                          role="presentation"
                                          aria-hidden
                                        >
                                          <span className="onb-switch-knob" />
                                        </span>
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                              <div className="onb-sources-fade onb-sources-fade--top" aria-hidden />
                              <div className="onb-sources-fade" aria-hidden />
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="button"
                              className={`al-btn al-btn-primary onb-cta${focusIds.length ? ' al-btn-primary--ready' : ''}`}
                              onClick={() => void handleContinue()}
                              disabled={submitting}
                            >
                              {submitting ? 'Speichere…' : focusIds.length ? 'Weiter' : 'Überspringen'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              Nicht nötig für Tagro — hilft nur bei Zuordnung und Briefings.
                            </p>
                          </>
                        )}

                        {/* ── Step 3: Verbinden — invite redeem / later + posture fallback ── */}
                        {current === 'verbinden' && (
                          <>
                            {inviteLinked ? (
                              <div className="onb-connect-card is-linked">
                                <p className="onb-connect-title">
                                  {inviteWorkspaceName
                                    ? `Verbunden mit ${inviteWorkspaceName}`
                                    : 'Workspace-Zugang aktiv'}
                                </p>
                                {inviteRelationship ? (
                                  <p className="onb-connect-meta">
                                    {RELATIONSHIP_LABELS[inviteRelationship].title}
                                    {' — '}
                                    {RELATIONSHIP_LABELS[inviteRelationship].hint}
                                  </p>
                                ) : (
                                  <p className="onb-connect-meta">
                                    Dein Panel richtet sich nach dem Invite-Bezug ein.
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="al-method-group">
                                <div className="onb-field-group">
                                  <label className="onb-field-label" htmlFor="dev-onb-invite">
                                    Einladung
                                  </label>
                                  <input
                                    id="dev-onb-invite"
                                    className="al-input"
                                    type="text"
                                    value={inviteDraft}
                                    onChange={(e) => { setError(''); setInviteDraft(e.target.value) }}
                                    placeholder="Link oder Code einfügen…"
                                    autoComplete="off"
                                    spellCheck={false}
                                  />
                                </div>
                                <button
                                  type="button"
                                  className={`al-btn al-btn-primary onb-cta${extractDeveloperInviteToken(inviteDraft) ? ' al-btn-primary--ready' : ''}`}
                                  onClick={() => void redeemInvite()}
                                  disabled={redeeming || !extractDeveloperInviteToken(inviteDraft)}
                                >
                                  {redeeming ? 'Löse ein…' : 'Einladung einlösen'}
                                </button>
                                <button
                                  type="button"
                                  className="al-btn al-btn-ghost onb-cta-ghost"
                                  onClick={onLaterConnect}
                                  disabled={redeeming}
                                >
                                  Später verbinden
                                </button>
                              </div>
                            )}

                            {showPostureFallback && !inviteLinked ? (
                              <ul className="onb-toggle-list onb-posture-list" role="listbox" aria-label="Bezug wählen">
                                {DEV_POSTURE_FALLBACK.map((id) => {
                                  const opt = POSTURE_FALLBACK_COPY[id]
                                  const active = postureFallback === id
                                  return (
                                    <li key={id}>
                                      <button
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                        onClick={() => { setError(''); setPostureFallback(id) }}
                                      >
                                        <div className="onb-toggle-text">
                                          <p className="onb-toggle-title">{opt.title}</p>
                                          <p className="onb-toggle-desc">{opt.desc}</p>
                                        </div>
                                        <span
                                          className={`onb-switch${active ? ' is-on' : ''}`}
                                          role="presentation"
                                          aria-hidden
                                        >
                                          <span className="onb-switch-knob" />
                                        </span>
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : null}

                            <div className={`onb-sources-scroll${sourcesScroll.scrolled ? ' is-scrolled' : ''}`}>
                              <ul
                                ref={sourcesScroll.listRef}
                                className="onb-sources-list"
                                role="list"
                                aria-label="Quellen"
                              >
                                {INTEGRATIONS.map((intg) => {
                                  const isConnected = connectedIntegrations.has(intg.id) || (intg.id === 'github' && githubConnected)
                                  const Logo = intg.Logo
                                  return (
                                    <li
                                      key={intg.id}
                                      className={`onb-sources-row${isConnected ? ' is-connected' : ''}${!intg.available ? ' is-soon' : ''}`}
                                    >
                                      <span className="onb-sources-logo" aria-hidden>
                                        <Logo />
                                      </span>
                                      <span className="onb-sources-name">{intg.name}</span>
                                      <span className="onb-sources-status">
                                        {isConnected ? 'Verbunden' : intg.available ? (
                                          <button
                                            type="button"
                                            className="onb-integration-btn"
                                            onClick={() => {
                                              if (intg.id === 'github') void connectGithub()
                                            }}
                                          >
                                            Verbinden
                                          </button>
                                        ) : (
                                          'Bald'
                                        )}
                                      </span>
                                    </li>
                                  )
                                })}
                              </ul>
                              <div className="onb-sources-fade onb-sources-fade--top" aria-hidden />
                              <div className="onb-sources-fade" aria-hidden />
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}

                            <button
                              type="button"
                              className={`al-btn al-btn-primary onb-cta onb-cta--confirm${verbindenReady ? ' al-btn-primary--ready' : ''}`}
                              onClick={() => void handleContinue()}
                              disabled={submitting || revealing || !verbindenReady}
                            >
                              {submitting || revealing
                                ? 'Einrichten…'
                                : 'Daten bestätigen und Konto erstellen'}
                            </button>
                            <p className="onb-fine onb-fine--under-cta">
                              {inviteLinked
                                ? 'Integrationen und Team folgen im Panel.'
                                : 'Ohne Invite wählst du nur den Start-Bezug — die Einladung überschreibt ihn später.'}
                            </p>
                          </>
                        )}

                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ── Progress dots ──────────────────────────────────────────── */}
        <ol
          className={`onb-dots${revealing ? ' onb-chrome-exit' : ''}`}
          aria-label="Onboarding-Fortschritt"
        >
          {STEPS.map((s, i) => {
            const canGoBack = i < stepIdx
            const canAdvance = i >= stepIdx && !isLast
            const clickable = canGoBack || canAdvance
            return (
              <li key={s}>
                <button
                  type="button"
                  className={`onb-dot${i === stepIdx ? ' is-active' : ''}${canGoBack ? ' is-done' : ''}${clickable ? ' is-clickable' : ''}`}
                  aria-current={i === stepIdx ? 'step' : undefined}
                  aria-label={
                    i === stepIdx
                      ? `Schritt ${i + 1} von ${STEPS.length}, tippen für weiter`
                      : canGoBack
                        ? `Zurück zu Schritt ${i + 1}`
                        : canAdvance
                          ? `Weiter zu Schritt ${i + 1}`
                          : `Schritt ${i + 1}`
                  }
                  disabled={!clickable || submitting || revealing}
                  onClick={() => onDotClick(i)}
                />
              </li>
            )
          })}
        </ol>
      </div>
    </main>
  )
}

/** Cursor-style hero: words rise from below with a quick glassy blur. */
function GlassyHeroWords({ lead, rest }: { lead: string; rest: string }) {
  const leadWords = lead.trim().split(/\s+/).filter(Boolean)
  const restWords = rest.trim().split(/\s+/).filter(Boolean)
  let i = 0
  return (
    <h1 className="al-title al-title-display onb-hero-line">
      {leadWords.map((word, idx) => {
        const n = i++
        const last = idx === leadWords.length - 1 && restWords.length === 0
        return (
          <span key={`l-${idx}`} className="onb-word" style={{ ['--i' as string]: n }}>
            <span className="onb-word-inner onb-hero-lead">
              {word}{last ? '' : '\u00A0'}
            </span>
          </span>
        )
      })}
      {restWords.map((word, idx) => {
        const n = i++
        const last = idx === restWords.length - 1
        return (
          <span key={`r-${idx}`} className="onb-word" style={{ ['--i' as string]: n }}>
            <span className="onb-word-inner al-hero-gray">
              {word}{last ? '' : '\u00A0'}
            </span>
          </span>
        )
      })}
    </h1>
  )
}

/* ─── Extra CSS ──────────────────────────────────────────────────────── */

const DEV_ONB_CSS = `
  /* ── Primary dusk — deep dark with Festag primary (#5B647D) atmosphere ── */
  .al-root.onb-sand-dark,
  .al-root.onb-sand-dark[data-theme="dark"] {
    --al-bg: #0C0D12;
    --al-text: #E6E8EE;
    --al-text-muted: rgba(230, 232, 238, 0.55);
    --al-text-muted-soft: rgba(230, 232, 238, 0.38);
    --festag-black-canvas: #0C0D12;
    --festag-black-content: #12141C;
    --festag-black-raised: #181B24;
    --festag-black-popup: #1C1F2A;
    --festag-night-ink: #E6E8EE;
    --onb-sand: #0C0D12;
    --onb-dusk-fade: #0E1018;
    background:
      radial-gradient(ellipse 100% 52% at 50% -6%, rgba(91, 100, 125, 0.14), transparent 58%),
      radial-gradient(ellipse 95% 50% at 50% 108%, rgba(91, 100, 125, 0.12), rgba(70, 78, 102, 0.045) 48%, transparent 74%),
      linear-gradient(180deg, #10121A 0%, #0C0D12 46%, #0E1018 100%) !important;
    color: #E6E8EE;
  }
  html:has(.al-root.onb-sand-dark),
  html:has(.al-root.onb-sand-dark) body {
    background: #0C0D12 !important;
  }
  .al-root.onb-sand-dark[data-theme="dark"] .al-container,
  .al-root.onb-sand-dark[data-theme="dark"] .al-main,
  .al-root.onb-sand-dark[data-theme="dark"] .al-desktop-left,
  .al-root.onb-sand-dark[data-theme="dark"] .al-mobile-sheet,
  .al-root.onb-sand-dark[data-theme="dark"] .al-sheet-body {
    background: transparent !important;
  }
  .al-root.onb-sand-dark .onb-hero-lead {
    color: #E6E8EE;
  }
  .al-root.onb-sand-dark .al-hero-gray {
    color: rgba(230, 232, 238, 0.52);
  }
  .al-root.onb-sand-dark .onb-field-label {
    color: rgba(230, 232, 238, 0.52);
  }
  .al-root.onb-sand-dark .onb-field-optional {
    color: rgba(230, 232, 238, 0.34);
  }
  .al-root.onb-sand-dark .al-input {
    color: #E6E8EE;
    border-width: 2px !important;
    border-color: rgba(232, 230, 225, 0.12) !important;
    caret-color: #5B647D;
    /* Color only — width 1→2 on focus caused layout jitter */
    transition: border-color .22s ease;
  }
  .al-root.onb-sand-dark .al-input:hover,
  .al-root.onb-sand-dark .al-input:not(:placeholder-shown) {
    border-color: rgba(232, 230, 225, 0.20) !important;
  }
  .al-root.onb-sand-dark .al-input:focus,
  .al-root.onb-sand-dark .al-input:focus-visible {
    border-width: 2px !important;
    border-color: #5B647D !important;
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
  }
  .al-root.onb-sand-dark .al-input::placeholder {
    color: rgba(232, 230, 225, 0.34);
    -webkit-text-fill-color: rgba(232, 230, 225, 0.34);
  }
  .al-root.onb-sand-dark .al-btn.al-btn-primary {
    transition:
      background .32s cubic-bezier(.22,1,.36,1),
      color .28s ease,
      border-color .28s ease,
      box-shadow .28s ease,
      opacity .28s ease !important;
  }
  .al-root.onb-sand-dark .al-btn.al-btn-primary:not(.al-btn-primary--ready) {
    background: transparent !important;
    color: rgba(230, 232, 238, 0.62) !important;
    border: 1px solid rgba(230, 232, 238, 0.10) !important;
    box-shadow: none !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready {
    background: #5B647D !important;
    color: #F5F5F7 !important;
    border-color: transparent !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready:hover:not(:disabled) {
    background: #66708A !important;
    color: #F5F5F7 !important;
  }
  .al-root.onb-sand-dark .al-btn-primary--ready:active:not(:disabled) {
    background: #515970 !important;
    color: #F5F5F7 !important;
  }
  .al-root.onb-sand-dark .onb-dots {
    background: rgba(232, 230, 225, 0.035);
    border: none;
    padding: 10px 16px;
    gap: 8px;
  }
  .al-root.onb-sand-dark .onb-dot {
    background: rgba(232, 230, 225, 0.20);
    width: 8px;
    height: 8px;
  }
  .al-root.onb-sand-dark .onb-dot.is-active {
    background: rgba(232, 230, 225, 0.90);
    width: 26px;
  }
  .al-root.onb-sand-dark .onb-dot.is-done {
    background: rgba(232, 230, 225, 0.40);
  }
  .al-root.onb-sand-dark .al-theme-icon--header,
  .al-root.onb-sand-dark .al-theme-icon--footer,
  .al-root.onb-sand-dark .al-footer-center {
    display: none !important;
  }
  .al-root.onb-sand-dark .al-wordmark::before {
    display: none !important;
  }
  .al-root.onb-sand-dark .al-wordmark-img {
    display: block !important;
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .al-root.onb-sand-dark .al-footer-meta {
    justify-content: center;
  }

  /* Hero — calm display; slightly open tracking, a touch under Login 32px */
  .onb-hero-line {
    margin: 0;
    max-width: 100%;
    font-size: 28px !important;
    line-height: 34px !important;
    letter-spacing: -0.012em;
    font-weight: 400;
    text-align: left;
  }
  .al-signin-head .al-title.al-title-display.onb-hero-line,
  .al-hero-copy .al-title.al-title-display.onb-hero-line {
    font-size: 28px !important;
    line-height: 34px !important;
    letter-spacing: -0.012em;
  }
  .onb-hero-lead {
    color: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-hero-lead {
    color: #f5f5f7;
  }

  /* Cursor-style glassy word reveal — rise from below + blur → sharp */
  .onb-word {
    display: inline-block;
    overflow: hidden;
    vertical-align: top;
    padding-bottom: 0.12em;
    margin-bottom: -0.12em;
  }
  .onb-word-inner {
    display: inline-block;
    will-change: transform, filter, opacity;
    animation: onbWordIn .58s cubic-bezier(.16, 1, .3, 1) both;
    animation-delay: calc(var(--i, 0) * 32ms);
  }
  @keyframes onbWordIn {
    from {
      opacity: 0;
      transform: translate3d(0, 118%, 0);
      filter: blur(10px);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      filter: blur(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .onb-word-inner {
      animation: none !important;
      opacity: 1;
      transform: none;
      filter: none;
    }
  }

  .onb-animating {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(6px);
    transition:
      opacity .2s ease,
      transform .2s cubic-bezier(.22, 1, .36, 1),
      filter .2s ease;
  }
  .al-content:not(.onb-animating) {
    animation: onbContentIn .52s cubic-bezier(.22, 1, .36, 1) both;
    animation-delay: .12s;
  }
  @keyframes onbContentIn {
    from {
      opacity: 0;
      transform: translateY(14px);
      filter: blur(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      filter: blur(0);
    }
  }

  /* Center content block vertically + wider side gutters; header stays left */
  .al-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .al-desktop-stage--centered,
  .al-desktop-left,
  .al-mobile-sheet,
  .al-sheet-body {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 0;
    width: 100%;
  }
  .al-sheet-body {
    padding-left: 32px;
    padding-right: 32px;
  }
  .al-signin {
    width: 100%;
    max-width: 360px;
    margin-inline: auto;
    text-align: left;
    flex: 0 0 auto;
  }
  .al-signin-head,
  .al-hero-copy {
    align-items: flex-start;
    text-align: left;
    width: 100%;
  }
  .al-content,
  .al-signin-stack,
  .al-method-group {
    width: 100%;
    text-align: left;
  }
  @media (max-width: 768px) {
    .al-sheet-body {
      padding-left: 36px;
      padding-right: 36px;
    }
  }
  @media (min-width: 769px) {
    .al-sheet-body {
      padding-left: 40px;
      padding-right: 40px;
    }
  }

  /* Header — Docs (ghost book) + Menü (ghost ···) on mobile */
  @media (max-width: 768px) {
    .al-header-actions .al-mobile-menu {
      display: inline-flex !important;
      background: transparent !important;
      box-shadow: none !important;
      height: auto;
      padding: 0;
    }
  }
  @media (min-width: 769px) {
    .al-header-actions .al-mobile-menu {
      display: none !important;
    }
  }

  /* Placeholders optically quieter — input stays 16px (iOS no-zoom) */
  .al-input::placeholder {
    font-size: 14.5px;
    letter-spacing: 0.02em;
  }

  /* Body / UI text — slightly open tracking for a calmer, serious read */
  .al-input,
  .al-btn,
  .onb-cta {
    letter-spacing: 0.015em;
  }
  .onb-facts-area {
    min-height: 96px !important;
    height: auto !important;
    max-height: none !important;
    padding: 12px 14px !important;
    line-height: 1.45 !important;
    font-size: 15px !important;
    resize: none !important;
    overflow: hidden !important;
    field-sizing: content;
  }
  .onb-cta {
    flex-shrink: 0;
    margin-top: 8px;
  }
  .onb-cta--confirm {
    font-size: 13px !important;
    letter-spacing: 0.01em !important;
    padding-inline: 12px !important;
  }
  .onb-cta-ghost {
    margin-top: 8px;
    width: 100%;
  }
  .onb-connect-card {
    width: 100%;
    text-align: left;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid rgba(232, 230, 225, 0.1);
    background: rgba(232, 230, 225, 0.04);
    margin-bottom: 4px;
  }
  .onb-connect-card.is-linked {
    border-color: rgba(232, 230, 225, 0.14);
    background: rgba(232, 230, 225, 0.06);
  }
  .onb-connect-title {
    margin: 0;
    font-size: 14.5px;
    font-weight: 400;
    letter-spacing: 0.015em;
    color: rgba(232, 230, 225, 0.92);
  }
  .onb-connect-meta {
    margin: 6px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    letter-spacing: 0.02em;
    color: rgba(232, 230, 225, 0.48);
  }
  .onb-posture-list {
    margin-top: 14px;
  }
  .onb-connect-tools {
    margin-top: 16px;
    width: 100%;
  }
  .onb-gh-quiet {
    width: 100%;
    justify-content: center;
  }
  .onb-gh-quiet.is-done {
    opacity: 0.55;
    cursor: default;
  }
  .onb-sources-scroll {
    position: relative;
    width: 100%;
    margin-top: 14px;
    margin-bottom: 10px;
  }
  .onb-sources-list {
    list-style: none;
    margin: 0;
    padding: 0 0 44px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 128px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-width: none;
  }
  .onb-sources-list::-webkit-scrollbar { display: none; }
  .onb-sources-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 2px solid rgba(232, 230, 225, 0.07);
    background: rgba(232, 230, 225, 0.035);
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .onb-sources-row.is-soon { opacity: 0.72; }
  .onb-sources-row.is-connected {
    border-color: #5B647D;
    background: rgba(91, 100, 125, 0.10);
  }
  .onb-sources-logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(232, 230, 225, 0.06);
    color: rgba(232, 230, 225, 0.88);
    flex-shrink: 0;
  }
  .onb-sources-name {
    flex: 1;
    font-size: 13.5px;
    letter-spacing: 0.015em;
    color: rgba(232, 230, 225, 0.9);
  }
  .onb-sources-status {
    font-size: 11.5px;
    letter-spacing: 0.02em;
    color: rgba(232, 230, 225, 0.45);
  }
  .onb-sources-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 72px;
    pointer-events: none;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(12, 13, 18, 0) 0%,
      rgba(14, 16, 24, 0.22) 28%,
      rgba(14, 16, 24, 0.62) 52%,
      rgba(14, 16, 24, 0.88) 74%,
      #0E1018 100%
    );
  }
  .onb-sources-fade--top {
    top: 0;
    bottom: auto;
    height: 56px;
    opacity: 0;
    transition: opacity .22s ease;
    background: linear-gradient(
      to top,
      rgba(12, 13, 18, 0) 0%,
      rgba(14, 16, 24, 0.22) 28%,
      rgba(14, 16, 24, 0.62) 52%,
      rgba(14, 16, 24, 0.88) 74%,
      #0E1018 100%
    );
  }
  .onb-sources-scroll.is-scrolled .onb-sources-fade--top {
    opacity: 1;
  }
  .onb-focus-scroll {
    margin-top: 6px;
    margin-bottom: 10px;
  }
  .onb-focus-list {
    max-height: 196px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 44px;
    margin: 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-width: none;
  }
  .onb-focus-list::-webkit-scrollbar { display: none; }
  .onb-focus-list .onb-toggle-row {
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .al-hero-gray {
    letter-spacing: -0.012em;
  }
  .al-error {
    letter-spacing: 0.015em;
  }

  /* Field groups — calm rhythm; CTA breathes below fields */
  .onb-field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .al-method-group:has(.onb-field-group) {
    gap: 16px;
  }
  .al-method-group:has(.onb-field-group) > .onb-cta {
    margin-top: 8px;
  }
  .al-method-group:has(.onb-field-group) > .al-error + .onb-cta {
    margin-top: 4px;
  }
  .al-signin-stack > .onb-cta {
    margin-top: 20px;
  }
  .al-signin-stack > .al-error + .onb-cta {
    margin-top: 12px;
  }
  @media (max-width: 768px) {
    .al-method-group:has(.onb-field-group) {
      gap: 14px;
    }
    .al-method-group:has(.onb-field-group) > .onb-cta {
      margin-top: 10px;
    }
    .al-signin-stack > .onb-cta {
      margin-top: 18px;
    }
  }
  .onb-field-label {
    font-size: 13px;
    font-weight: 400;
    color: #5c5c62;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-field-label {
    color: rgba(245, 245, 247, 0.55);
  }
  .onb-field-optional {
    color: #8891a0;
    font-size: 12px;
    margin-left: 3px;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-field-optional {
    color: rgba(245, 245, 247, 0.35);
  }

  /* Focus toggle list — same as client onboarding team cards */
  .onb-toggle-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .onb-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 2px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background .12s ease, border-color .12s ease;
    outline: none;
    box-sizing: border-box;
  }
  .onb-toggle-row:hover {
    background: #f7f8f8;
  }
  .onb-toggle-row.is-active {
    border-color: #5B647D;
    background: rgba(91, 100, 125, 0.08);
  }
  .al-root[data-theme="dark"] .onb-toggle-row {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.07);
    color: #f5f5f7;
  }
  .al-root[data-theme="dark"] .onb-toggle-row:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .al-root[data-theme="dark"] .onb-toggle-row.is-active {
    background: rgba(91, 100, 125, 0.12);
    border-color: #5B647D;
  }
  .al-root.onb-sand-dark .onb-toggle-row {
    background: rgba(234, 230, 223, 0.03);
    border-color: rgba(234, 230, 223, 0.07);
  }
  .al-root.onb-sand-dark .onb-toggle-row:hover {
    background: rgba(234, 230, 223, 0.055);
  }
  .al-root.onb-sand-dark .onb-toggle-row.is-active {
    background: rgba(91, 100, 125, 0.12);
    border-color: #5B647D;
  }
  .onb-toggle-text {
    flex: 1;
    min-width: 0;
  }
  .onb-toggle-title {
    font-size: 14.5px;
    font-weight: 400;
    color: #1e1e20;
    line-height: 1.3;
    margin: 0;
    letter-spacing: 0.015em;
  }
  .al-root[data-theme="dark"] .onb-toggle-title {
    color: #f5f5f7;
  }
  .onb-toggle-desc {
    font-size: 12.5px;
    color: #8891a0;
    line-height: 1.45;
    margin: 2px 0 0;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-toggle-desc {
    color: rgba(245, 245, 247, 0.42);
  }

  /* Toggle switch knob */
  .onb-switch {
    flex-shrink: 0;
    width: 30px;
    height: 18px;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.10);
    display: flex;
    align-items: center;
    padding: 2px;
    transition: background .14s ease;
  }
  .onb-switch.is-on {
    background: #5B647D;
  }
  .al-root[data-theme="dark"] .onb-switch {
    background: rgba(255, 255, 255, 0.12);
  }
  .al-root[data-theme="dark"] .onb-switch.is-on,
  .al-root.onb-sand-dark .onb-switch.is-on {
    background: #5B647D;
  }
  .onb-switch-knob {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
    transition: transform .14s cubic-bezier(.16,1,.3,1), background .14s ease;
  }
  .onb-switch.is-on .onb-switch-knob {
    transform: translateX(12px);
  }
  .al-root[data-theme="dark"] .onb-switch-knob {
    background: rgba(30, 30, 32, 0.85);
  }
  .al-root[data-theme="dark"] .onb-switch.is-on .onb-switch-knob,
  .al-root.onb-sand-dark .onb-switch.is-on .onb-switch-knob {
    background: #EBE8E3;
  }

  /* ── Integration cards (Verbinden step) ─── */
  .onb-integration-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .onb-integration-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid rgba(30, 30, 32, 0.08);
    background: #ffffff;
  }
  .onb-integration-row.is-connected {
    border-color: rgba(34, 197, 94, 0.28);
    background: rgba(34, 197, 94, 0.04);
  }
  .onb-integration-row.is-soon {
    opacity: 0.55;
  }
  .al-root[data-theme="dark"] .onb-integration-row {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.07);
  }
  .al-root[data-theme="dark"] .onb-integration-row.is-connected {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.06);
  }
  .onb-integration-logo {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1e1e20;
  }
  .al-root[data-theme="dark"] .onb-integration-logo {
    color: rgba(245, 245, 247, 0.85);
  }
  .onb-integration-text {
    flex: 1;
    min-width: 0;
  }
  .onb-integration-name {
    font-size: 14px;
    font-weight: 400;
    color: #1e1e20;
    line-height: 1.3;
    margin: 0;
    letter-spacing: 0.015em;
  }
  .al-root[data-theme="dark"] .onb-integration-name {
    color: #f5f5f7;
  }
  .onb-integration-desc {
    font-size: 12px;
    color: #8891a0;
    line-height: 1.4;
    margin: 2px 0 0;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-integration-desc {
    color: rgba(245, 245, 247, 0.38);
  }
  .onb-integration-action {
    flex-shrink: 0;
  }
  .onb-integration-btn {
    background: rgba(30, 30, 32, 0.06);
    color: #1e1e20;
    border: 1px solid rgba(30, 30, 32, 0.10);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 400;
    font-family: inherit;
    letter-spacing: 0.02em;
    padding: 5px 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .1s ease;
    outline: none;
  }
  .onb-integration-btn:hover {
    background: rgba(30, 30, 32, 0.10);
  }
  .al-root[data-theme="dark"] .onb-integration-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #f5f5f7;
    border-color: rgba(255, 255, 255, 0.12);
  }
  .al-root[data-theme="dark"] .onb-integration-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  .onb-integration-badge {
    font-size: 11.5px;
    font-weight: 400;
    color: #8891a0;
    background: rgba(30, 30, 32, 0.05);
    border-radius: 999px;
    padding: 4px 10px;
    white-space: nowrap;
    letter-spacing: 0.02em;
  }
  .onb-integration-badge--connected {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
  }
  .al-root[data-theme="dark"] .onb-integration-badge {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(245, 245, 247, 0.38);
  }
  .al-root[data-theme="dark"] .onb-integration-badge--connected {
    background: rgba(34, 197, 94, 0.14);
    color: #4ade80;
  }

  /* Fine print under CTA */
  .onb-fine {
    font-size: 12.5px;
    color: #8891a0;
    text-align: center;
    line-height: 1.4;
    margin: 0;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-fine {
    color: rgba(245, 245, 247, 0.38);
  }
  .onb-fine--under-cta { margin-top: 12px; }

  /* Progress — Apple page-control, soft wash, no stroke */
  .onb-dots {
    list-style: none;
    padding: 10px 16px;
    margin: 0;
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 5;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.04);
    border: none;
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
  }
  .onb-dots li {
    display: flex;
    align-items: center;
  }
  .onb-dot {
    width: 8px;
    height: 8px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(30, 30, 32, 0.16);
    transition:
      width .38s cubic-bezier(.22, 1, .36, 1),
      background .28s ease,
      transform .2s cubic-bezier(.22, 1, .36, 1),
      opacity .28s ease;
    appearance: none;
    -webkit-appearance: none;
    pointer-events: none;
    position: relative;
    outline: none;
  }
  .onb-dot.is-active {
    width: 26px;
    background: #1d1d1f;
  }
  .onb-dot.is-done {
    background: rgba(30, 30, 32, 0.32);
  }
  .onb-dot.is-clickable {
    pointer-events: auto;
    cursor: pointer;
  }
  .onb-dot.is-clickable::before {
    content: '';
    position: absolute;
    inset: -12px -8px;
  }
  .onb-dot.is-clickable:hover,
  .onb-dot.is-clickable:focus-visible {
    transform: scale(1.18);
    background: rgba(30, 30, 32, 0.48);
  }
  .onb-dot.is-active.is-clickable:hover,
  .onb-dot.is-active.is-clickable:focus-visible {
    background: #1d1d1f;
  }
  .al-root[data-theme="dark"] .onb-dots {
    background: rgba(232, 230, 225, 0.045);
    border: none;
  }
  .al-root[data-theme="dark"] .onb-dot {
    background: rgba(255, 255, 255, 0.22);
  }
  .al-root[data-theme="dark"] .onb-dot.is-active {
    background: rgba(255, 255, 255, 0.92);
  }
  .al-root[data-theme="dark"] .onb-dot.is-done {
    background: rgba(255, 255, 255, 0.42);
  }
  .al-root[data-theme="dark"] .onb-dot.is-clickable:hover,
  .al-root[data-theme="dark"] .onb-dot.is-clickable:focus-visible {
    background: rgba(255, 255, 255, 0.62);
  }
  .al-root[data-theme="dark"] .onb-dot.is-active.is-clickable:hover,
  .al-root[data-theme="dark"] .onb-dot.is-active.is-clickable:focus-visible {
    background: rgba(255, 255, 255, 0.92);
  }

  /* Completion reveal */
  .al-root.onb-revealing { pointer-events: none; }
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
    position: fixed; inset: 0; z-index: 40;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 32px; text-align: center;
    pointer-events: none;
  }
  .onb-complete-title {
    margin: 0; max-width: 18em;
    font-family: var(--font-aeonik), Aeonik, system-ui, sans-serif;
    font-size: 28px;
    line-height: 34px;
    letter-spacing: -0.012em;
    font-weight: 500;
    color: #1e1e20;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) both;
  }
  .onb-complete-sub {
    margin: 14px 0 0; max-width: 28em;
    font-size: 15px; font-weight: 400; line-height: 1.5;
    letter-spacing: 0.02em; color: #5c5c62;
    animation: onbCompleteIn .7s cubic-bezier(.16,1,.3,1) .12s both;
  }
  .al-root[data-theme="dark"] .onb-complete-title { color: #f5f5f7; }
  .al-root[data-theme="dark"] .onb-complete-sub { color: rgba(245,245,247,0.58); }
  .al-root.onb-reveal-departing .onb-complete-title,
  .al-root.onb-reveal-departing .onb-complete-sub {
    animation: onbCompleteOut .72s cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes onbCompleteIn {
    from { opacity: 0; transform: translateY(12px); letter-spacing: 0; filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0); letter-spacing: -0.012em; filter: blur(0); }
  }
  @keyframes onbCompleteOut {
    from { opacity: 1; transform: translateY(0); filter: blur(0); }
    to   { opacity: 0; transform: translateY(-6px); filter: blur(2px); }
  }
`
