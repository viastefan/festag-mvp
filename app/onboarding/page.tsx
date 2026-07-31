'use client'

/**
 * /onboarding — Build Projects (Authentication & Onboarding Constitution).
 *
 * Post-auth Build steps: name (if needed) → Workspace Context → Focus Areas →
 * Connect → Workspace Type → /preparing. Invitees use /join — never this route.
 *
 * Visual foundation: Primary Dusk — continuous auth chrome.
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

import TagroFieldAssist from '@/components/auth/TagroFieldAssist'
import RotatingFieldHint from '@/components/auth/RotatingFieldHint'
import { syncAutoGrowTextarea } from '@/lib/ui/auto-grow-textarea'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import {
  RELATIONSHIP_LABELS,
  isDevRelationshipKind,
  type DevRelationshipKind,
} from '@/lib/dev/relationship'
import {
  WORKSPACE_CONTEXT_LABEL,
  inferWorkspaceUnderstanding,
  readWorkspaceProfile,
  workspaceProfilePatch,
} from '@/lib/platform/identity'
import {
  CONNECT_WORKSPACE_HEADLINE,
  CONNECT_WORKSPACE_SUPPORT,
  INTEGRATION_BLURBS,
  integrationStateLabel,
  rankIntegrationsForOnboarding,
  type IntegrationId,
} from '@/lib/platform/integrations'
import {
  FOCUS_AREA_IDS,
  FOCUS_AREA_LABELS,
  FOCUS_AREA_DESCRIPTIONS,
  focusAreasPatch,
  WORKSPACE_TYPES,
  WORKSPACE_TYPE_LABELS,
  suggestWorkspaceType,
  workspaceTypePatch,
  workspaceTypeToLegacyMode,
  type FocusAreaId,
  type WorkspaceType,
} from '@/lib/platform/workspace'
import {
  OnbLogoCalendar,
  OnbLogoDiscord,
  OnbLogoFigma,
  OnbLogoGithub,
  OnbLogoJira,
  OnbLogoLinear,
  OnbLogoNotion,
  OnbLogoSlack,
  OnbLogoVercel,
} from '@/components/auth/OnboardingSourceLogos'

/* ─── Types ─────────────────────────────────────────────────────────── */

type StepId = 'name' | 'context' | 'focus' | 'integrations' | 'workspace_type'

const CORE_STEPS: StepId[] = ['name', 'context', 'focus', 'integrations']
const ALL_STEPS: StepId[] = [...CORE_STEPS, 'workspace_type']

/** Legacy /dev/onboarding + mid-flow aliases → constitution step IDs. */
function normalizeStepParam(raw: string | null): StepId | null {
  if (!raw) return null
  if (raw === 'profil' || raw === 'profile' || raw === 'about') return 'name'
  if (raw === 'kontext' || raw === 'context') return 'context'
  if (raw === 'fokus' || raw === 'focus' || raw === 'focus_areas') return 'focus'
  if (raw === 'verbinden' || raw === 'quellen' || raw === 'integrations') return 'integrations'
  if (raw === 'typ' || raw === 'type' || raw === 'workspace_type') return 'workspace_type'
  if ((ALL_STEPS as string[]).includes(raw)) return raw as StepId
  return null
}

type LogoComp = (p: { className?: string }) => ReactElement

const INTEGRATION_LOGOS: Partial<Record<IntegrationId, LogoComp>> = {
  github: OnbLogoGithub,
  linear: OnbLogoLinear,
  jira: OnbLogoJira,
  slack: OnbLogoSlack,
  notion: OnbLogoNotion,
  figma: OnbLogoFigma,
  vercel: OnbLogoVercel,
  google_calendar: OnbLogoCalendar,
  outlook_calendar: OnbLogoCalendar,
  apple_calendar: OnbLogoCalendar,
  discord: OnbLogoDiscord,
}

function IntegrationMark({ id, name }: { id: string; name: string }) {
  const Logo = INTEGRATION_LOGOS[id as IntegrationId]
  if (Logo) return <Logo />
  const letter = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span className="onb-sources-mark-fallback" aria-hidden>
      {letter}
    </span>
  )
}

/* ─── Hero copy ──────────────────────────────────────────────────────── */

const NAME_HERO = {
  lead: 'Dein Name.',
  rest: ' Wie sollen dich andere im Workspace sehen?',
}

const CONTEXT_HERO = {
  lead: 'Erzähl Tagro von deiner Arbeit.',
  rest: ' Ein Satz reicht — Tagro personalisiert den Rest.',
}

const FOCUS_HERO = {
  lead: 'Wobei arbeitest du am meisten?',
  rest: ' Mehrere möglich. Optional.',
}

const INTEGRATIONS_HERO = {
  lead: CONNECT_WORKSPACE_HEADLINE,
  rest: ` ${CONNECT_WORKSPACE_SUPPORT}`,
}

const TYPE_HERO = {
  lead: 'Passt dieser Workspace-Typ?',
  rest: ' Tagro schlägt vor.',
}

/** Skip Workspace Type UI when Tagro is this confident or higher. */
const TYPE_CONFIDENCE_AUTO = 0.7

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

export default function BuildProjectsOnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  /* Build Projects uses Primary Dusk — same foundation as auth onboarding chrome. */

  const [booting, setBooting]     = useState(true)
  const [userId, setUserId]       = useState<string | null>(null)
  const [current, setCurrent]     = useState<StepId>('name')
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
  const [workspaceContext, setWorkspaceContext] = useState('')
  const [focusAreas, setFocusAreas] = useState<FocusAreaId[]>([])
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('personal')
  const [typeSuggested, setTypeSuggested] = useState(false)
  const [includeTypeStep, setIncludeTypeStep] = useState(true)
  const [contextAssistOpen, setContextAssistOpen] = useState(false)
  const [contextFocused, setContextFocused] = useState(false)
  const contextRef = useRef<HTMLTextAreaElement | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [githubConnected, setGithubConnected] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set())
  const [inviteLinked, setInviteLinked] = useState(false)
  const [inviteWorkspaceName, setInviteWorkspaceName] = useState('')
  const [inviteRelationship, setInviteRelationship] = useState<DevRelationshipKind | null>(null)
  const swipeRef = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)
  const swipeIgnoreRef = useRef(false)
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
              setFullName('Alex')
              setWorkspaceContext('Ich führe eine Software-Agentur mit acht Entwicklern.')
              setCurrent('name')
              setBooting(false)
              return
            }
          } catch { /* noop */ }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        if (cancelled) return
        setUserId(user.id)

        /* Pre-fill name from Supabase user metadata (GitHub / OAuth) */
        const meta = user.user_metadata ?? {}
        const ghName = meta.full_name || meta.name || meta.user_name || ''
        if (ghName && !fullName) setFullName(ghName)

        /* Resuming from mid-onboarding GitHub link — keep step query. */
        const resumeStep = normalizeStepParam(new URLSearchParams(window.location.search).get('step'))
        const isResuming = resumeStep != null

        const [{ data: prof }, { data: onboarding }, { data: ownedWs }, { data: memberWs }, { data: projectMember }] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, position, dev_profile_facts, dev_relationship, dev_github_linked, github_username')
              .eq('id', user.id)
              .maybeSingle(),
            supabase
              .from('onboarding_state')
              .select('completed_at')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('workspaces')
              .select('id, metadata')
              .eq('primary_owner_id', user.id)
              .order('is_personal', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('workspace_members')
              .select('workspace_id, relationship_kind, workspaces(name)')
              .eq('user_id', user.id)
              .order('joined_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('project_members')
              .select('project_id')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle(),
          ])

        if (ownedWs?.id) setWorkspaceId(ownedWs.id)
        else if (memberWs?.workspace_id) setWorkspaceId(memberWs.workspace_id)

        const existingProfile = readWorkspaceProfile((ownedWs as any)?.metadata)
        if (existingProfile?.context) setWorkspaceContext(existingProfile.context)
        else if ((prof as any)?.dev_profile_facts) {
          setWorkspaceContext(String((prof as any).dev_profile_facts))
        }

        /* Invitees finish on /join — never Build Projects. */
        if (
          !ownedWs?.id &&
          (projectMember?.project_id || memberWs?.workspace_id) &&
          !(onboarding as any)?.completed_at &&
          !isResuming
        ) {
          router.replace('/join')
          return
        }

        if (!ownedWs?.id && !memberWs?.workspace_id && !projectMember?.project_id) {
          router.replace('/create-workspace')
          return
        }

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

        if (memberWs) {
          const wsName = (memberWs as any).workspaces?.name
            ?? (Array.isArray((memberWs as any).workspaces) ? (memberWs as any).workspaces[0]?.name : null)
          if (wsName) setInviteWorkspaceName(String(wsName))
          if (isDevRelationshipKind((memberWs as any).relationship_kind)) {
            setInviteRelationship((memberWs as any).relationship_kind)
          }
        } else if (isDevRelationshipKind((prof as any)?.dev_relationship)) {
          setInviteRelationship((prof as any).dev_relationship)
        }

        if ((prof as any)?.position && !position) setPosition((prof as any).position)

        if ((onboarding as any)?.completed_at && !isResuming) {
          const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
          router.replace(target)
          return
        }

        if (isResuming && resumeStep) setCurrent(resumeStep)

        if ((prof as any)?.full_name && !fullName) setFullName((prof as any).full_name)
        if (cancelled) return
        setBooting(false)
      } catch {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const workspaceUnderstandingEarly = useMemo(
    () => (workspaceContext.trim() ? inferWorkspaceUnderstanding(workspaceContext) : null),
    [workspaceContext],
  )

  const typeSuggestion = useMemo(() => {
    if (!workspaceContext.trim()) return null
    const u = workspaceUnderstandingEarly
    return suggestWorkspaceType({
      companyType: u?.companyType,
      industry: u?.industry,
      role: u?.role,
      context: workspaceContext,
    })
  }, [workspaceContext, workspaceUnderstandingEarly])

  useEffect(() => {
    if (!typeSuggestion) return
    setIncludeTypeStep(typeSuggestion.confidence < TYPE_CONFIDENCE_AUTO)
    if (!typeSuggested) {
      setWorkspaceType(typeSuggestion.type)
      setTypeSuggested(true)
    }
  }, [typeSuggestion, typeSuggested])

  const STEPS: StepId[] = includeTypeStep ? ALL_STEPS : CORE_STEPS
  const workspaceUnderstanding = workspaceUnderstandingEarly

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
      if (step === 'name' && !fullName.trim()) {
        setError('Bitte einen Namen eingeben.')
        return false
      }
      if (step === 'context' && !workspaceContext.trim()) {
        setError('Bitte kurz beschreiben, woran du arbeitest.')
        return false
      }
      return true
    }
    if (!userId) return false
    setError('')
    try {
      if (step === 'name') {
        if (!fullName.trim()) {
          setError('Bitte einen Namen eingeben.')
          return false
        }
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'name',
          workspace_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'context') {
        const ctx = workspaceContext.trim()
        if (!ctx) {
          setError('Bitte kurz beschreiben, woran du arbeitest.')
          return false
        }
        /* Silent Tagro understanding — never shown as technical analysis. */
        const inferred = inferWorkspaceUnderstanding(ctx)
        const shortPosition =
          position.trim() ||
          inferred.role?.slice(0, 64) ||
          inferred.companyType?.slice(0, 64) ||
          ''

        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: userId,
          ...(shortPosition ? { position: shortPosition } : {}),
          /* Bridge until Settings reads Workspace Profile only. */
          dev_profile_facts: ctx,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        if (upsertError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }

        let wsId = workspaceId
        if (!wsId) {
          const { data: owned } = await supabase
            .from('workspaces')
            .select('id, metadata')
            .eq('primary_owner_id', userId)
            .order('is_personal', { ascending: false })
            .limit(1)
            .maybeSingle()
          wsId = owned?.id ?? null
          if (wsId) setWorkspaceId(wsId)
          if (owned) {
            const nextMeta = workspaceProfilePatch(
              (owned.metadata as Record<string, unknown>) ?? {},
              { context: ctx, inferred, source: 'onboarding' },
            )
            await supabase.from('workspaces').update({
              metadata: nextMeta,
              updated_at: new Date().toISOString(),
            }).eq('id', wsId)
          }
        } else {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('metadata')
            .eq('id', wsId)
            .maybeSingle()
          const nextMeta = workspaceProfilePatch(
            (ws?.metadata as Record<string, unknown>) ?? {},
            { context: ctx, inferred, source: 'onboarding' },
          )
          const { error: wsErr } = await supabase.from('workspaces').update({
            metadata: nextMeta,
            updated_at: new Date().toISOString(),
          }).eq('id', wsId)
          if (wsErr) {
            setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
            return false
          }
        }

        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'context',
          workspace_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'focus') {
        let wsId = workspaceId
        if (!wsId) {
          const { data: owned } = await supabase
            .from('workspaces')
            .select('id, metadata')
            .eq('primary_owner_id', userId)
            .order('is_personal', { ascending: false })
            .limit(1)
            .maybeSingle()
          wsId = owned?.id ?? null
          if (wsId) setWorkspaceId(wsId)
          if (owned?.id) {
            const nextMeta = focusAreasPatch(
              (owned.metadata as Record<string, unknown>) ?? {},
              focusAreas,
            )
            await supabase.from('workspaces').update({
              metadata: nextMeta,
              updated_at: new Date().toISOString(),
            }).eq('id', owned.id)
          }
        } else {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('metadata')
            .eq('id', wsId)
            .maybeSingle()
          const nextMeta = focusAreasPatch(
            (ws?.metadata as Record<string, unknown>) ?? {},
            focusAreas,
          )
          const { error: wsErr } = await supabase.from('workspaces').update({
            metadata: nextMeta,
            updated_at: new Date().toISOString(),
          }).eq('id', wsId)
          if (wsErr) {
            setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
            return false
          }
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'focus',
          workspace_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'integrations') {
        /* Soft-suggest type for the next screen while connections are optional. */
        const inferredNow = workspaceContext.trim()
          ? inferWorkspaceUnderstanding(workspaceContext)
          : null
        const suggestion = suggestWorkspaceType({
          companyType: inferredNow?.companyType,
          industry: inferredNow?.industry,
          role: inferredNow?.role,
          context: workspaceContext,
        })
        if (!typeSuggested) {
          setWorkspaceType(suggestion.type)
          setTypeSuggested(true)
        }
        await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'integrations',
          workspace_done: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      } else if (step === 'workspace_type') {
        let wsId = workspaceId
        if (!wsId) {
          const { data: owned } = await supabase
            .from('workspaces')
            .select('id, metadata')
            .eq('primary_owner_id', userId)
            .order('is_personal', { ascending: false })
            .limit(1)
            .maybeSingle()
          wsId = owned?.id ?? null
          if (wsId) setWorkspaceId(wsId)
        }
        if (wsId) {
          const { data: ws } = await supabase
            .from('workspaces')
            .select('metadata')
            .eq('id', wsId)
            .maybeSingle()
          const nextMeta = workspaceTypePatch(
            (ws?.metadata as Record<string, unknown>) ?? {},
            workspaceType,
            { suggestedByTagro: true, confirmed: true },
          )
          const { error: wsErr } = await supabase.from('workspaces').update({
            metadata: nextMeta,
            mode: workspaceTypeToLegacyMode(workspaceType),
            updated_at: new Date().toISOString(),
          }).eq('id', wsId)
          if (wsErr) {
            setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
            return false
          }
        }
        const { error: doneError } = await supabase.from('onboarding_state').upsert({
          user_id: userId,
          current_step: 'build_complete',
          workspace_done: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (doneError) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return false
        }
        void fetch('/api/onboarding/seed-memory', { method: 'POST' }).catch(() => null)
        void fetch('/api/onboarding/welcome-emails', { method: 'POST' }).catch(() => null)
      }
      return true
    } catch (e: any) {
      setError(e?.message || 'Speichern fehlgeschlagen.')
      return false
    }
  }, [userId, fullName, position, workspaceContext, workspaceId, focusAreas, workspaceType, typeSuggested, supabase])

  useEffect(() => {
    syncAutoGrowTextarea(contextRef.current, { minPx: 96, maxPx: 280 })
  }, [workspaceContext, current])

  const rankedIntegrations = useMemo(
    () =>
      rankIntegrationsForOnboarding({
        understanding: workspaceUnderstanding,
        connectedIds: [
          ...connectedIntegrations,
          ...(githubConnected ? (['github'] as const) : []),
        ],
      }),
    [workspaceUnderstanding, connectedIntegrations, githubConnected],
  )


  async function finalizeWorkspaceType(type: WorkspaceType, confirmed: boolean): Promise<boolean> {
    let wsId = workspaceId
    if (!wsId) {
      const { data: owned } = await supabase
        .from('workspaces')
        .select('id, metadata')
        .eq('primary_owner_id', userId)
        .order('is_personal', { ascending: false })
        .limit(1)
        .maybeSingle()
      wsId = owned?.id ?? null
      if (wsId) setWorkspaceId(wsId)
    }
    if (wsId) {
      const { data: ws } = await supabase
        .from('workspaces')
        .select('metadata')
        .eq('id', wsId)
        .maybeSingle()
      const nextMeta = workspaceTypePatch(
        (ws?.metadata as Record<string, unknown>) ?? {},
        type,
        { suggestedByTagro: true, confirmed },
      )
      const { error: wsErr } = await supabase.from('workspaces').update({
        metadata: nextMeta,
        mode: workspaceTypeToLegacyMode(type),
        updated_at: new Date().toISOString(),
      }).eq('id', wsId)
      if (wsErr) {
        setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
        return false
      }
    }
    const { error: doneError } = await supabase.from('onboarding_state').upsert({
      user_id: userId!,
      current_step: 'build_complete',
      workspace_done: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (doneError) {
      setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
      return false
    }
    void fetch('/api/onboarding/seed-memory', { method: 'POST' }).catch(() => null)
    void fetch('/api/onboarding/welcome-emails', { method: 'POST' }).catch(() => null)
    return true
  }

  function startPreparingTransition(isPreview = false) {
    clearRevealTimers()
    setReveal('leaving')
    const leaveMs = 360
    const target = isPreview ? '/login' : '/preparing'
    const t1 = window.setTimeout(() => {
      setReveal('departing')
      prepareAuthRouteTransition(target)
      const t2 = window.setTimeout(() => {
        window.location.href = target
      }, 480)
      revealTimers.current.push(t2)
    }, leaveMs)
    revealTimers.current.push(t1)
  }

  async function handleContinue() {
    if (submitting || animating || reveal) return
    setSubmitting(true)
    try {
      const ok = await persist(current)
      if (!ok) { setSubmitting(false); return }

      const isPreview = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('preview') === '1'

      /* Integrations → auto-confirm type when Tagro is confident; else show Type UI. */
      if (current === 'integrations') {
        const suggestion = typeSuggestion || suggestWorkspaceType({
          context: workspaceContext,
        })
        setWorkspaceType(suggestion.type)
        setTypeSuggested(true)
        if (suggestion.confidence >= TYPE_CONFIDENCE_AUTO) {
          setIncludeTypeStep(false)
          if (!isPreview) {
            const done = await finalizeWorkspaceType(suggestion.type, true)
            if (!done) { setSubmitting(false); return }
          }
          startPreparingTransition(isPreview)
          return
        }
        setIncludeTypeStep(true)
        transition(+1)
        setSubmitting(false)
        return
      }

      if (current === 'workspace_type') {
        startPreparingTransition(isPreview)
        return
      }

      const stepIdxNow = STEPS.indexOf(current)
      const last = stepIdxNow === STEPS.length - 1
      if (last) {
        startPreparingTransition(isPreview)
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
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/onboarding?step=integrations')}`,
        scopes: 'read:user user:email read:org repo',
      },
    })
    if (linkError) setError('GitHub-Verbindung fehlgeschlagen: ' + linkError.message)
  }

  function clearRevealTimers() {
    for (const id of revealTimers.current) window.clearTimeout(id)
    revealTimers.current = []
  }

  useEffect(() => () => clearRevealTimers(), [])

  /* ── Hero copy ────────────────────────────────────────────────────── */

  const heroCopy =
    current === 'name' ? NAME_HERO
    : current === 'context' ? CONTEXT_HERO
    : current === 'focus' ? FOCUS_HERO
    : current === 'workspace_type' ? TYPE_HERO
    : INTEGRATIONS_HERO

  const heroKey = current === 'context'
    ? `context-${workspaceContext.trim() ? 'filled' : 'empty'}`
    : current === 'integrations'
      ? `integrations-${rankedIntegrations.map((r) => r.def.id).join('-')}`
      : current
  const revealing  = reveal != null
  const integrationsReady = true
  const hasAnyConnection = githubConnected || connectedIntegrations.size > 0

  const commandDisabled =
    submitting ||
    revealing ||
    (current === 'name' && !fullName.trim()) ||
    (current === 'context' && !workspaceContext.trim()) ||
    (current === 'integrations' && !integrationsReady)

  const commandLabel = (() => {
    if (submitting || revealing) {
      return current === 'workspace_type' ? 'Vorbereiten…' : 'Weiter…'
    }
    if (current === 'workspace_type') return 'Workspace starten'
    if (current === 'focus' && !focusAreas.length) return 'Überspringen'
    if (current === 'integrations' && !hasAnyConnection) return 'Überspringen'
    return 'Weiter'
  })()

  const showHeaderSkip = current === 'focus' || current === 'integrations'

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

      {/* Premium init lives on /preparing — soft chrome exit only here. */}

      <div className={`al-container${revealing ? ' onb-chrome-exit' : ''}`}>
        <header className="al-header">
          <span className="al-wordmark" aria-label="Festag" role="img">
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
            {showHeaderSkip ? (
              <button
                type="button"
                className="onb-header-skip"
                disabled={submitting || revealing}
                onClick={() => void handleContinue()}
              >
                Überspringen
              </button>
            ) : (
              <>
                <AuthDocsPopover />
                <AuthLandingMobileMenu
                  onNavigate={(href) => {
                    navigateLeavingAuthChrome(href)
                  }}
                />
              </>
            )}
          </div>
        </header>

        <main className="al-main">
          <div className="al-desktop-stage al-desktop-stage--centered">
            <div className="al-desktop-left">
              <div className="al-mobile-sheet">
                <div className="al-sheet-body">
                  <section
                    className="al-signin"
                    aria-label="Workspace Onboarding"
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

                        {/* ── Step 1: Account name ──────────────────── */}
                        {current === 'name' && (
                          <form
                            className="al-method-group"
                            autoComplete="on"
                            onSubmit={(e) => { e.preventDefault(); void handleContinue() }}
                          >
                            <div className="onb-field-group">
                              <label className="onb-field-label" htmlFor="build-onb-name">
                                Anzeigename
                              </label>
                              <input
                                id="build-onb-name"
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

                            {error ? <p className="al-error" role="alert">{error}</p> : null}
                          </form>
                        )}

                        {/* ── Step 2: Workspace Context (one NL question) ─ */}
                        {current === 'context' && (
                          <form
                            className="al-method-group"
                            autoComplete="off"
                            onSubmit={(e) => { e.preventDefault(); void handleContinue() }}
                          >
                            <div className="onb-field-group">
                              <label
                                htmlFor="build-onb-context"
                                style={{
                                  position: 'absolute',
                                  width: 1,
                                  height: 1,
                                  padding: 0,
                                  margin: -1,
                                  overflow: 'hidden',
                                  clip: 'rect(0, 0, 0, 0)',
                                  whiteSpace: 'nowrap',
                                  border: 0,
                                }}
                              >
                                {WORKSPACE_CONTEXT_LABEL}
                              </label>
                              <div className="onb-facts-wrap">
                                <textarea
                                  id="build-onb-context"
                                  ref={contextRef}
                                  className="al-input onb-facts-area"
                                  name="workspace-context"
                                  value={workspaceContext}
                                  onChange={(e) => {
                                    setError('')
                                    setWorkspaceContext(e.target.value)
                                    syncAutoGrowTextarea(e.currentTarget, { minPx: 96, maxPx: 280 })
                                  }}
                                  onFocus={() => {
                                    setContextFocused(true)
                                    setContextAssistOpen(true)
                                  }}
                                  onClick={() => setContextAssistOpen(true)}
                                  onBlur={() => setContextFocused(false)}
                                  placeholder=""
                                  aria-label={WORKSPACE_CONTEXT_LABEL}
                                  maxLength={2000}
                                  rows={3}
                                  autoFocus
                                />
                                <RotatingFieldHint
                                  active={!workspaceContext.trim()}
                                  dimmed={contextFocused}
                                />
                                <TagroFieldAssist
                                  open={contextAssistOpen}
                                  onClose={() => setContextAssistOpen(false)}
                                  anchorRef={contextRef}
                                  fieldValue={workspaceContext}
                                  onFieldChange={setWorkspaceContext}
                                  contextLabel={WORKSPACE_CONTEXT_LABEL}
                                  surface="profile_facts"
                                  theme="dark"
                                />
                              </div>
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}
                          </form>
                        )}

                        {/* ── Step 3: Focus Areas (optional) ─────────── */}
                        {current === 'focus' && (
                          <>
                            <div
                              className={`onb-sources-scroll onb-focus-scroll${sourcesScroll.scrolled ? ' is-scrolled' : ''}`}
                              data-scroll-trap="1"
                            >
                              <ul
                                ref={sourcesScroll.listRef}
                                className="onb-toggle-list onb-focus-list"
                                aria-label="Schwerpunkte"
                              >
                                {FOCUS_AREA_IDS.map((id) => {
                                  const active = focusAreas.includes(id)
                                  return (
                                    <li key={id}>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={active}
                                        className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                        onClick={() => {
                                          setFocusAreas((prev) =>
                                            prev.includes(id)
                                              ? prev.filter((x) => x !== id)
                                              : [...prev, id],
                                          )
                                        }}
                                      >
                                        <span className="onb-toggle-text">
                                          <span className="onb-toggle-title">{FOCUS_AREA_LABELS[id]}</span>
                                          <span className="onb-toggle-desc">{FOCUS_AREA_DESCRIPTIONS[id]}</span>
                                        </span>
                                        <span className={`onb-toggle-switch${active ? ' is-on' : ''}`} aria-hidden>
                                          <span className="onb-toggle-knob" />
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
                          </>
                        )}

                        {/* ── Step 4: Connect your workspace (optional) ── */}
                        {current === 'integrations' && (
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
                                    Dein Panel richtet sich nach dem Workspace ein.
                                  </p>
                                )}
                              </div>
                            ) : null}

                            <div className={`onb-sources-scroll${sourcesScroll.scrolled ? ' is-scrolled' : ''}`}>
                              <ul
                                ref={sourcesScroll.listRef}
                                className="onb-sources-list"
                                role="list"
                                aria-label="Workspace verbinden"
                              >
                                {rankedIntegrations.map(({ def, state }) => {
                                  const isConnected = state === 'connected'
                                  const isRecommended = state === 'recommended'
                                  const canConnect = def.connectable && !isConnected
                                  const blurb = INTEGRATION_BLURBS[def.id]
                                  const rowClass = [
                                    'onb-sources-row',
                                    isConnected ? 'is-connected' : '',
                                    !def.connectable && !isConnected ? 'is-soon' : '',
                                    isRecommended ? 'is-recommended' : '',
                                    canConnect ? 'is-actionable' : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')

                                  const statusNode = isConnected ? (
                                    <span className="onb-sources-badge onb-sources-badge--connected">
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                                        <path
                                          d="M2.2 5.2L4.1 7.1L7.8 2.9"
                                          stroke="currentColor"
                                          strokeWidth="1.4"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                      {integrationStateLabel('connected')}
                                    </span>
                                  ) : isRecommended ? (
                                    <span className="onb-sources-status onb-sources-status--rec">
                                      {integrationStateLabel('recommended')}
                                    </span>
                                  ) : def.connectable ? (
                                    <span className="onb-sources-status onb-sources-status--rec">
                                      {integrationStateLabel('available')}
                                    </span>
                                  ) : (
                                    <span className="onb-sources-status">
                                      {integrationStateLabel('coming_soon')}
                                    </span>
                                  )

                                  const body = (
                                    <>
                                      <span className="onb-sources-logo" aria-hidden>
                                        <IntegrationMark id={def.id} name={def.name} />
                                      </span>
                                      <span className="onb-sources-copy">
                                        <span className="onb-sources-name">{def.name}</span>
                                        {blurb ? (
                                          <span className="onb-sources-blurb">{blurb}</span>
                                        ) : null}
                                      </span>
                                      {statusNode}
                                      <span className="onb-sources-chev" aria-hidden>
                                        ›
                                      </span>
                                    </>
                                  )

                                  return (
                                    <li key={def.id}>
                                      {canConnect ? (
                                        <button
                                          type="button"
                                          className={rowClass}
                                          onClick={() => {
                                            if (def.id === 'github') void connectGithub()
                                          }}
                                        >
                                          {body}
                                        </button>
                                      ) : (
                                        <div className={rowClass}>{body}</div>
                                      )}
                                    </li>
                                  )
                                })}
                              </ul>
                              <div className="onb-sources-fade onb-sources-fade--top" aria-hidden />
                              <div className="onb-sources-fade" aria-hidden />
                            </div>

                            {error ? <p className="al-error" role="alert">{error}</p> : null}
                          </>
                        )}

                        {/* ── Step 5: Workspace Type confirm ─────────── */}
                        {current === 'workspace_type' && (
                          <>
                            <div
                              className={`onb-sources-scroll onb-focus-scroll${sourcesScroll.scrolled ? ' is-scrolled' : ''}`}
                              data-scroll-trap="1"
                            >
                              <ul
                                ref={sourcesScroll.listRef}
                                className="onb-toggle-list onb-focus-list"
                                role="radiogroup"
                                aria-label="Workspace-Typ"
                              >
                                {WORKSPACE_TYPES.map((id) => {
                                  const active = workspaceType === id
                                  return (
                                    <li key={id}>
                                      <button
                                        type="button"
                                        role="radio"
                                        aria-checked={active}
                                        className={`onb-toggle-row${active ? ' is-active' : ''}`}
                                        onClick={() => setWorkspaceType(id)}
                                      >
                                        <span className="onb-toggle-text">
                                          <span className="onb-toggle-title">{WORKSPACE_TYPE_LABELS[id]}</span>
                                          {active && typeSuggested ? (
                                            <span className="onb-toggle-desc">Tagro-Vorschlag</span>
                                          ) : null}
                                        </span>
                                        <span className={`onb-toggle-switch${active ? ' is-on' : ''}`} aria-hidden>
                                          <span className="onb-toggle-knob" />
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

        {/* ── OS command bar: progress + primary action ─────────────── */}
        <div className={`onb-command-bar${revealing ? ' onb-chrome-exit' : ''}`}>
          <ol className="onb-dots" aria-label="Onboarding-Fortschritt">
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
          <span className="onb-command-divider" aria-hidden />
          <button
            type="button"
            className={`onb-command-cta${commandDisabled ? '' : ' is-ready'}`}
            disabled={commandDisabled}
            onClick={() => void handleContinue()}
          >
            <span>{commandLabel}</span>
            <span className="onb-command-arrow" aria-hidden>
              →
            </span>
          </button>
        </div>
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
    /* Cool slate muted — same as light #8891a0 (blau-grau), not washed warm gray */
    --al-text-muted: #8891a0;
    --al-text-muted-soft: #6B7385;
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
    color: #8891a0;
  }
  .al-root.onb-sand-dark .onb-field-label {
    color: #8891a0;
  }
  .al-root.onb-sand-dark .onb-field-optional {
    color: #6B7385;
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
    color: #6B7385;
    -webkit-text-fill-color: #6B7385;
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
  .al-root.onb-sand-dark .onb-command-bar {
    background: rgba(18, 19, 24, 0.72);
    border: 1px solid rgba(232, 230, 225, 0.08);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 12px 40px rgba(0, 0, 0, 0.42);
  }
  .al-root.onb-sand-dark .onb-dots {
    background: transparent;
    border: none;
    padding: 4px 2px;
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

  /* Hero — tight display; lead + muted share one lh (no color gap) */
  .onb-hero-line {
    margin: 0;
    max-width: 100%;
    font-size: 28px !important;
    line-height: 30px !important;
    letter-spacing: -0.02em;
    font-weight: 400;
    text-align: left;
  }
  .al-signin-head .al-title.al-title-display.onb-hero-line,
  .al-hero-copy .al-title.al-title-display.onb-hero-line {
    font-size: 28px !important;
    line-height: 30px !important;
    letter-spacing: -0.02em;
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
    vertical-align: baseline;
    padding-bottom: 0.04em;
    margin-bottom: -0.04em;
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
    max-width: 400px;
    margin-inline: auto;
    text-align: left;
    flex: 0 0 auto;
    padding-bottom: 96px;
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
    transition: padding-bottom .28s cubic-bezier(.22, 1, .36, 1);
  }
  .onb-facts-area.is-tagro-chip {
    padding-bottom: 46px !important;
  }
  .onb-facts-wrap {
    position: relative;
    width: 100%;
  }
  .onb-rotating-hint {
    position: absolute;
    left: 14px;
    top: 14px;
    right: 14px;
    font-size: 14px;
    line-height: 1.45;
    letter-spacing: 0.02em;
    font-weight: 400;
    color: #6B7385;
    pointer-events: none;
    opacity: 0;
    transform: translateY(5px);
    filter: blur(4px);
    transition:
      opacity .32s cubic-bezier(.22, 1, .36, 1),
      transform .32s cubic-bezier(.22, 1, .36, 1),
      filter .32s ease;
  }
  .onb-rotating-hint.is-in {
    opacity: 0.72;
    transform: translateY(0);
    filter: blur(0);
  }
  .onb-rotating-hint.is-in.is-dim {
    opacity: 0.42;
  }
  @media (prefers-reduced-motion: reduce) {
    .onb-rotating-hint {
      transition: none !important;
      filter: none !important;
      transform: none !important;
    }
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
    margin-top: 18px;
    margin-bottom: 0;
  }
  .onb-sources-list {
    list-style: none;
    margin: 0;
    padding: 0 0 56px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: min(52vh, 420px);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    scrollbar-width: none;
  }
  .onb-sources-list::-webkit-scrollbar { display: none; }
  .onb-sources-list > li {
    list-style: none;
    margin: 0;
    padding: 0;
    flex-shrink: 0;
  }
  .onb-sources-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 13px 14px;
    border-radius: 14px;
    border: 1px solid rgba(232, 230, 225, 0.07);
    background: rgba(232, 230, 225, 0.035);
    flex-shrink: 0;
    box-sizing: border-box;
    text-align: left;
    font: inherit;
    color: inherit;
    appearance: none;
    -webkit-appearance: none;
    cursor: default;
    transition:
      background .32s cubic-bezier(.22, 1, .36, 1),
      border-color .32s cubic-bezier(.22, 1, .36, 1),
      box-shadow .36s cubic-bezier(.22, 1, .36, 1),
      transform .36s cubic-bezier(.22, 1, .36, 1);
  }
  .onb-sources-row.is-actionable {
    cursor: pointer;
  }
  .onb-sources-row.is-actionable:hover {
    background: rgba(232, 230, 225, 0.055);
    border-color: rgba(232, 230, 225, 0.12);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
    transform: translateY(-1px);
  }
  .onb-sources-row.is-soon .onb-sources-status { opacity: 0.72; }
  .onb-sources-row.is-soon .onb-sources-name { opacity: 0.88; }
  .onb-sources-row.is-soon .onb-sources-logo { opacity: 1; filter: none; }
  .onb-sources-row.is-connected {
    border-color: rgba(91, 100, 125, 0.55);
    background: rgba(91, 100, 125, 0.10);
    box-shadow: 0 0 0 1px rgba(91, 100, 125, 0.18);
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
  .onb-sources-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .onb-sources-name {
    font-size: 14px;
    letter-spacing: -0.01em;
    line-height: 1.25;
    color: rgba(232, 230, 225, 0.94);
    font-weight: 500;
  }
  .onb-sources-blurb {
    font-size: 12px;
    letter-spacing: 0.01em;
    line-height: 1.35;
    color: #8891a0;
  }
  .onb-sources-rec {
    flex-shrink: 0;
    font-size: 10.5px;
    letter-spacing: 0.01em;
    line-height: 1.2;
    color: #8891a0;
    padding: 2px 7px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .onb-sources-row.is-recommended:not(.is-connected) {
    background: rgba(232, 230, 225, 0.045);
  }
  .onb-sources-mark-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 12px;
    font-weight: 500;
    color: rgba(232, 230, 225, 0.55);
  }
  .onb-sources-status {
    flex-shrink: 0;
    font-size: 12px;
    letter-spacing: 0.01em;
    line-height: 1.2;
    color: #8891a0;
  }
  .onb-sources-status--rec {
    color: rgba(168, 178, 198, 0.88);
  }
  .onb-sources-badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    letter-spacing: 0.01em;
    line-height: 1;
    padding: 6px 10px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .onb-sources-badge--connected {
    background: rgba(91, 100, 125, 0.42);
    color: rgba(245, 245, 247, 0.94);
  }
  .onb-sources-chev {
    flex-shrink: 0;
    font-size: 16px;
    line-height: 1;
    color: rgba(232, 230, 225, 0.28);
    margin-left: -2px;
  }
  .onb-sources-row.is-connected .onb-sources-chev {
    opacity: 0.35;
  }
  .onb-sources-fade {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 88px;
    pointer-events: none;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      rgba(12, 13, 18, 0) 0%,
      rgba(14, 16, 24, 0.28) 30%,
      rgba(14, 16, 24, 0.72) 58%,
      rgba(14, 16, 24, 0.94) 82%,
      #0E1018 100%
    );
  }
  .onb-sources-fade--top {
    top: 0;
    bottom: auto;
    height: 64px;
    opacity: 0;
    transition: opacity .32s cubic-bezier(.22, 1, .36, 1);
    background: linear-gradient(
      to top,
      rgba(12, 13, 18, 0) 0%,
      rgba(14, 16, 24, 0.28) 30%,
      rgba(14, 16, 24, 0.72) 58%,
      rgba(14, 16, 24, 0.94) 82%,
      #0E1018 100%
    );
  }
  .onb-sources-scroll.is-scrolled .onb-sources-fade--top {
    opacity: 1;
  }
  .onb-focus-scroll {
    margin-top: 10px;
    margin-bottom: 0;
  }
  .onb-focus-list {
    max-height: min(48vh, 360px);
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 56px;
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
    letter-spacing: -0.02em;
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
    color: #8891a0;
  }
  .onb-field-optional {
    color: #8891a0;
    font-size: 12px;
    margin-left: 3px;
    letter-spacing: 0.02em;
  }
  .al-root[data-theme="dark"] .onb-field-optional {
    color: #6B7385;
  }
  .onb-field-support {
    margin: 0 0 10px;
    font-size: 13.5px;
    line-height: 1.45;
    color: #8891a0;
    letter-spacing: 0.01em;
  }
  .al-root[data-theme="dark"] .onb-field-support {
    color: #8891a0;
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
    opacity: 1;
  }
  .onb-integration-row.is-soon .onb-integration-text,
  .onb-integration-row.is-soon .onb-integration-status {
    opacity: 0.72;
  }
  .onb-integration-row.is-soon .onb-integration-logo {
    opacity: 1;
    filter: none;
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
  
  .onb-toggle-switch {
    width: 36px;
    height: 22px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.10);
    position: relative;
    flex-shrink: 0;
    transition: background .18s ease, border-color .18s ease;
  }
  .onb-toggle-switch.is-on {
    background: rgba(91, 100, 125, 0.45);
    border-color: #5B647D;
  }
  .onb-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(230, 232, 238, 0.88);
    transition: transform .18s cubic-bezier(.22,1,.36,1);
  }
  .onb-toggle-switch.is-on .onb-toggle-knob {
    transform: translateX(14px);
  }
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
  .onb-fine--sources-lead {
    margin: 18px 0 0;
    text-align: left;
  }

  /* Progress — Apple page-control inside OS command bar */
  .onb-header-skip {
    appearance: none;
    -webkit-appearance: none;
    border: 0;
    background: transparent;
    color: #8891a0;
    font: inherit;
    font-size: 14px;
    letter-spacing: 0.01em;
    padding: 8px 4px;
    cursor: pointer;
    transition: color .28s ease, opacity .28s ease;
  }
  .onb-header-skip:hover:not(:disabled),
  .onb-header-skip:focus-visible:not(:disabled) {
    color: rgba(232, 230, 225, 0.78);
  }
  .onb-header-skip:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .onb-command-bar {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    z-index: 5;
    padding: 6px 6px 6px 14px;
    border-radius: 999px;
    background: rgba(18, 19, 24, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.04) inset,
      0 12px 40px rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(20px) saturate(1.25);
    -webkit-backdrop-filter: blur(20px) saturate(1.25);
    max-width: calc(100vw - 32px);
  }
  .onb-command-divider {
    width: 1px;
    height: 16px;
    margin: 0 4px 0 10px;
    background: rgba(255, 255, 255, 0.12);
    flex-shrink: 0;
  }
  .onb-command-cta {
    appearance: none;
    -webkit-appearance: none;
    border: 0;
    background: transparent;
    color: rgba(245, 245, 247, 0.88);
    font: inherit;
    font-size: 14.5px;
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1;
    padding: 11px 14px 11px 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 999px;
    white-space: nowrap;
    transition:
      background .32s cubic-bezier(.22, 1, .36, 1),
      color .28s ease,
      opacity .28s ease;
  }
  .onb-command-cta:disabled {
    opacity: 0.34;
    cursor: default;
  }
  .onb-command-cta.is-ready:not(:disabled):hover,
  .onb-command-cta.is-ready:not(:disabled):focus-visible {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(245, 245, 247, 0.98);
  }
  .onb-command-arrow {
    font-size: 15px;
    line-height: 1;
    opacity: 0.72;
  }

  .onb-dots {
    list-style: none;
    padding: 4px 2px;
    margin: 0;
    position: relative;
    left: auto;
    bottom: auto;
    transform: none;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1;
    border-radius: 999px;
    background: transparent;
    border: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
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
    background: transparent;
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
