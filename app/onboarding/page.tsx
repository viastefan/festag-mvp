'use client'

/**
 * /onboarding — Master Build flow (canvas 1:1 mobile).
 * Intent → Clarify? → Connect → /preparing
 * Auth identity stays on /login|/register. Invitees use /join.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  applyAuthTheme,
  prepareAuthRouteTransition,
  consumePanelEnter,
} from '@/lib/auth-theme'
import AuthDocsPopover from '@/components/auth/AuthDocsPopover'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import { providerProfileFields } from '@/lib/auth-provider-profile'
import {
  inferWorkspaceUnderstanding,
  readWorkspaceProfile,
  workspaceProfilePatch,
} from '@/lib/platform/identity'
import {
  analyzeIntent,
  blueprintMetadataPatch,
  type TagroBlueprint,
} from '@/lib/tagro/workspace-blueprint'
import {
  workspaceTypePatch,
  workspaceTypeToLegacyMode,
} from '@/lib/platform/workspace'
import type { IntegrationId } from '@/lib/platform/integrations'
import {
  MASTER_FLOW_DOTS,
  type MasterBuildStep,
  type ClarifyOption,
  blueprintTypeToWorkspaceType,
  clarifyToWorkspaceType,
  normalizeMasterStep,
} from '@/lib/platform/master-onboarding'
import { MASTER_ONBOARDING_STYLES } from '@/components/auth/master-onboarding/styles'
import IntentStage from '@/components/auth/master-onboarding/IntentStage'
import ClarifyStage from '@/components/auth/master-onboarding/ClarifyStage'
import ConnectStage, {
  rankConnectSources,
} from '@/components/auth/master-onboarding/ConnectStage'

export default function MasterBuildOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="mob is-booting"
          style={{
            position: 'fixed',
            inset: 0,
            background: '#FAF9F5',
          }}
        />
      }
    >
      <MasterBuildInner />
    </Suspense>
  )
}

function MasterBuildInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === '1'

  const [booting, setBooting] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [current, setCurrent] = useState<MasterBuildStep>('intent')
  const [visitedClarify, setVisitedClarify] = useState(false)
  const [intentText, setIntentText] = useState('')
  const [intentReady, setIntentReady] = useState(false)
  const [clarifyPick, setClarifyPick] = useState('')
  const [connected, setConnected] = useState<Set<string>>(() => new Set(['github']))
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pageExiting, setPageExiting] = useState(false)
  const [panelEnter, setPanelEnter] = useState(false)

  const swipeRef = useRef<{ x: number; y: number; locked: boolean | null } | null>(null)

  const blueprint: TagroBlueprint = useMemo(
    () => analyzeIntent(intentText, clarifyPick),
    [intentText, clarifyPick],
  )

  const sources = useMemo(
    () => rankConnectSources(blueprint.integrations),
    [blueprint.integrations],
  )

  const flowSteps = useMemo(() => {
    const dots = [...MASTER_FLOW_DOTS]
    if (!visitedClarify && current !== 'clarify' && !blueprint.needsClarify) {
      return dots.filter((d) => d.id !== 'clarify')
    }
    return dots
  }, [visitedClarify, current, blueprint.needsClarify])

  const flowActive = Math.max(
    0,
    flowSteps.findIndex((d) => d.id === (current === 'clarify' ? 'clarify' : current)),
  )

  useLayoutEffect(() => {
    applyAuthTheme('light', 'client')
    if (consumePanelEnter()) setPanelEnter(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (isPreview) {
          setIntentText('Ich entwickle Webseiten für Kunden.')
          setBooting(false)
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        if (cancelled) return
        setUserId(user.id)

        const fromProvider = providerProfileFields(user)
        const providerName = fromProvider.fullName || ''

        const resumeStep = normalizeMasterStep(
          new URLSearchParams(window.location.search).get('step'),
        )
        const isResuming = resumeStep != null

        const [{ data: prof }, { data: onboarding }, { data: ownedWs }, { data: memberWs }, { data: projectMember }] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, position, dev_profile_facts, dev_github_linked, github_username')
              .eq('id', user.id)
              .maybeSingle(),
            supabase
              .from('onboarding_state')
              .select('completed_at, current_step')
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
              .select('workspace_id')
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

        const existingProfile = readWorkspaceProfile(ownedWs?.metadata)
        if (existingProfile?.context) setIntentText(existingProfile.context)
        else if (prof?.dev_profile_facts) setIntentText(String(prof.dev_profile_facts))

        if (
          !ownedWs?.id &&
          (projectMember?.project_id || memberWs?.workspace_id) &&
          !onboarding?.completed_at &&
          !isResuming
        ) {
          router.replace('/join')
          return
        }

        if (!ownedWs?.id && !memberWs?.workspace_id && !projectMember?.project_id) {
          router.replace('/create-workspace')
          return
        }

        const providers = (user.app_metadata?.providers as string[] | undefined) ?? []
        const identityLinked = (user.identities ?? []).some((i) => i.provider === 'github')
        const isGhConnected =
          providers.includes('github') ||
          user.app_metadata?.provider === 'github' ||
          identityLinked ||
          !!prof?.dev_github_linked ||
          !!prof?.github_username
        if (isGhConnected) {
          setConnected((prev) => {
            const next = new Set(prev)
            next.add('github')
            return next
          })
        }

        if (onboarding?.completed_at && !isResuming) {
          const target = await resolvePostAuthTarget(supabase, user.id, '/dashboard')
          router.replace(target)
          return
        }

        const resolvedName =
          String(prof?.full_name || '').trim() || providerName.trim()
        if (resolvedName) {
          setFullName(resolvedName)
          void supabase.from('profiles').upsert(
            {
              id: user.id,
              full_name: resolvedName,
              ...(fromProvider.firstName ? { first_name: fromProvider.firstName } : {}),
              ...(fromProvider.avatarUrl ? { avatar_url: fromProvider.avatarUrl } : {}),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          )
        }

        if (isResuming && resumeStep) {
          setCurrent(resumeStep)
          if (resumeStep === 'clarify') setVisitedClarify(true)
        }

        if (cancelled) return
        setBooting(false)
      } catch {
        if (!cancelled) setBooting(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistIntent = useCallback(
    async (text: string, clarify: string): Promise<TagroBlueprint | null> => {
      if (isPreview) return analyzeIntent(text, clarify)
      if (!userId) return null
      const ctx = text.trim()
      if (!ctx) {
        setError('Bitte kurz beschreiben, woran du arbeitest.')
        return null
      }
      const bp = analyzeIntent(ctx, clarify)
      const inferred = inferWorkspaceUnderstanding(ctx)
      const shortPosition =
        inferred.role?.slice(0, 64) || inferred.companyType?.slice(0, 64) || ''

      const { error: upsertError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
          ...(shortPosition ? { position: shortPosition } : {}),
          dev_profile_facts: ctx,
          ...(bp.intentSummary
            ? {
                dev_profile_summary: `${bp.workspaceType}: ${bp.intentSummary}`.slice(0, 400),
              }
            : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      if (upsertError) {
        setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
        return null
      }

      let wsId = workspaceId
      let meta: Record<string, unknown> = {}
      if (!wsId) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, metadata')
          .eq('primary_owner_id', userId)
          .order('is_personal', { ascending: false })
          .limit(1)
          .maybeSingle()
        wsId = owned?.id ?? null
        meta = (owned?.metadata as Record<string, unknown>) ?? {}
        if (wsId) setWorkspaceId(wsId)
      } else {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('metadata')
          .eq('id', wsId)
          .maybeSingle()
        meta = (ws?.metadata as Record<string, unknown>) ?? {}
      }

      if (wsId) {
        let nextMeta = workspaceProfilePatch(meta, {
          context: ctx,
          inferred,
          source: 'onboarding',
        })
        nextMeta = blueprintMetadataPatch(nextMeta, bp)
        const type = clarify
          ? clarifyToWorkspaceType(clarify)
          : blueprintTypeToWorkspaceType(bp.workspaceType)
        nextMeta = workspaceTypePatch(nextMeta, type, {
          suggestedByTagro: true,
          confirmed: Boolean(clarify) || bp.confidence >= 72,
        })
        const { error: wsErr } = await supabase
          .from('workspaces')
          .update({
            metadata: nextMeta,
            mode: workspaceTypeToLegacyMode(type),
            updated_at: new Date().toISOString(),
          })
          .eq('id', wsId)
        if (wsErr) {
          setError('Speichern fehlgeschlagen. Bitte erneut versuchen.')
          return null
        }
      }

      await supabase.from('onboarding_state').upsert(
        {
          user_id: userId,
          current_step: clarify ? 'clarify' : 'intent',
          workspace_done: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )

      /* Also hit API for OKM seed consistency when persist=true */
      void fetch('/api/onboarding/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ctx, clarify, persist: true }),
      }).catch(() => null)

      return bp
    },
    [fullName, isPreview, supabase, userId, workspaceId],
  )

  const finishToPreparing = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const bp = await persistIntent(intentText, clarifyPick)
      if (!bp && !isPreview) {
        setSubmitting(false)
        return
      }

      if (!isPreview && userId) {
        await supabase.from('onboarding_state').upsert(
          {
            user_id: userId,
            current_step: 'connect',
            workspace_done: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        void fetch('/api/onboarding/seed-memory', { method: 'POST' }).catch(() => null)
        void fetch('/api/onboarding/welcome-emails', { method: 'POST' }).catch(() => null)
      }

      setPageExiting(true)
      const target = isPreview ? '/login' : '/preparing'
      prepareAuthRouteTransition(target)
      window.setTimeout(() => {
        window.location.href = target
      }, 280)
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte erneut versuchen.')
      setSubmitting(false)
    }
  }, [
    clarifyPick,
    intentText,
    isPreview,
    persistIntent,
    submitting,
    supabase,
    userId,
  ])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (current === 'connect' && !submitting) {
        e.preventDefault()
        void finishToPreparing()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, submitting, finishToPreparing])

  const goAfterIntent = useCallback(async () => {
    if (!intentReady && intentText.trim().length < 8) return
    setError('')
    const bp = await persistIntent(intentText, clarifyPick)
    if (!bp && !isPreview) return
    const needs = (bp ?? analyzeIntent(intentText, clarifyPick)).needsClarify
    if (needs) {
      setVisitedClarify(true)
      setCurrent('clarify')
    } else {
      setCurrent('connect')
    }
  }, [clarifyPick, intentReady, intentText, isPreview, persistIntent])

  const onClarifyPick = useCallback(
    (opt: ClarifyOption) => {
      if (clarifyPick === opt) {
        void (async () => {
          setError('')
          const ok = await persistIntent(intentText, opt)
          if (!ok && !isPreview) return
          setCurrent('connect')
        })()
        return
      }
      setClarifyPick(opt)
    },
    [clarifyPick, intentText, isPreview, persistIntent],
  )

  const toggleSource = useCallback(
    async (id: IntegrationId) => {
      const wasOn = connected.has(id)
      setConnected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })

      if (id === 'github' && !wasOn && !isPreview) {
        try {
          const origin = window.location.origin
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: linkError } = await (supabase.auth as any).linkIdentity({
            provider: 'github',
            options: {
              redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/onboarding?step=connect')}`,
            },
          })
          if (linkError) {
            console.warn('[onboarding] github link', linkError.message)
          }
        } catch {
          /* noop */
        }
      }
    },
    [connected, isPreview, supabase.auth],
  )

  function canSwipeForward() {
    if (current === 'intent') return intentReady
    if (current === 'clarify') return Boolean(clarifyPick)
    if (current === 'connect') return !submitting
    return false
  }

  function advance() {
    if (current === 'intent') {
      void goAfterIntent()
      return
    }
    if (current === 'clarify' && clarifyPick) {
      void (async () => {
        const ok = await persistIntent(intentText, clarifyPick)
        if (!ok && !isPreview) return
        setCurrent('connect')
      })()
      return
    }
    if (current === 'connect') void finishToPreparing()
  }

  function retreat() {
    if (current === 'connect') {
      setCurrent(visitedClarify || clarifyPick ? 'clarify' : 'intent')
      return
    }
    if (current === 'clarify') setCurrent('intent')
  }

  function onFlowDotClick(id: (typeof MASTER_FLOW_DOTS)[number]['id']) {
    if (id === 'preparing') {
      if (submitting) return
      if (current === 'connect' || intentReady || intentText.trim().length >= 8) {
        void finishToPreparing()
      }
      return
    }
    if (id === 'intent') {
      setCurrent('intent')
      return
    }
    if (id === 'clarify') {
      if (!intentReady && intentText.trim().length < 8) return
      setVisitedClarify(true)
      setCurrent('clarify')
      return
    }
    if (id === 'connect') {
      if (!intentReady && intentText.trim().length < 8) return
      setCurrent('connect')
    }
  }

  function onTouchStart(e: ReactTouchEvent) {
    const t = e.changedTouches[0]
    if (!t) return
    swipeRef.current = { x: t.clientX, y: t.clientY, locked: null }
  }

  function onTouchMove(e: ReactTouchEvent) {
    const start = swipeRef.current
    const t = e.changedTouches[0]
    if (!start || !t || start.locked === false) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (start.locked == null) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.2
    }
  }

  function onTouchEnd(e: ReactTouchEvent) {
    const start = swipeRef.current
    swipeRef.current = null
    const t = e.changedTouches[0]
    if (!start || !t || start.locked !== true) return
    const dx = t.clientX - start.x
    if (dx < -56 && canSwipeForward()) advance()
    else if (dx > 56 && current !== 'intent') retreat()
  }

  return (
    <>
      <style>{MASTER_ONBOARDING_STYLES}</style>
      <div
        className={[
          'mob',
          booting ? 'is-booting' : '',
          pageExiting ? 'is-exiting' : '',
          panelEnter ? 'is-panel-enter' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-theme="light"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <header className="mob-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="mob-mark"
            src="/brand/festag-mark-fluid.png?v=20260731"
            alt="festag"
            width={28}
            height={28}
          />
          <div className="mob-header-actions">
            <AuthDocsPopover />
          </div>
        </header>

        <div className="mob-body">
          <div className="mob-stage" key={current}>
            {error ? <p className="mob-error">{error}</p> : null}

            {current === 'intent' ? (
              <IntentStage
                value={intentText}
                onChange={(v) => {
                  setIntentText(v)
                  if (error) setError('')
                }}
                onReadyChange={setIntentReady}
                onAdvance={() => void goAfterIntent()}
              />
            ) : null}

            {current === 'clarify' ? (
              <ClarifyStage
                value={clarifyPick}
                onPick={onClarifyPick}
                blueprint={blueprint}
              />
            ) : null}

            {current === 'connect' ? (
              <ConnectStage
                sources={sources}
                connected={connected}
                onToggle={(id) => void toggleSource(id)}
              />
            ) : null}
          </div>
        </div>

        <nav className="mob-dots" aria-label="Onboarding Fortschritt">
          {flowSteps.map((dot, idx) => {
            const active = idx === flowActive
            const done = idx < flowActive
            return (
              <button
                key={dot.id}
                type="button"
                className={`mob-dot${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                aria-label={dot.label}
                aria-current={active ? 'step' : undefined}
                disabled={submitting && dot.id === 'preparing'}
                onClick={() => onFlowDotClick(dot.id)}
              />
            )
          })}
        </nav>
      </div>
    </>
  )
}
