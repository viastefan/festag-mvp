'use client'

/**
 * /preparing — premium workspace initialization after Build / Join.
 * Never dump users straight onto a blank dashboard.
 */

import { Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyAuthTheme, prepareAuthRouteTransition } from '@/lib/auth-theme'
import WorkspaceInitSequence from '@/components/auth/WorkspaceInitSequence'
import { resolvePostAuthTarget } from '@/lib/auth-client-routing'
import { readWorkspaceProfile } from '@/lib/platform/identity'
import {
  personalizeWorkspace,
  personalizationPatch,
} from '@/lib/platform/workspace-personalization'
import {
  readWorkspaceType,
  suggestWorkspaceType,
  workspaceTypePatch,
  workspaceTypeToLegacyMode,
} from '@/lib/platform/workspace'

function PreparingInner() {
  const supabase = createClient()
  const router = useRouter()
  const search = useSearchParams()
  const nextParam = search.get('next')
  const [active, setActive] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useLayoutEffect(() => {
    /* Ivory light prepare — matches master auth onboarding canvas */
    applyAuthTheme('light', 'dev')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      if (cancelled) return
      setUserId(user.id)

      /* Persist personalized layout while the sequence plays. */
      const { data: owned } = await supabase
        .from('workspaces')
        .select('id, metadata, mode')
        .eq('primary_owner_id', user.id)
        .order('is_personal', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (owned?.id) {
        const profile = readWorkspaceProfile(owned.metadata)
        const personalized = personalizeWorkspace(profile?.inferred, profile?.context)
        const existingType = readWorkspaceType(owned.metadata, owned.mode)
        const suggestion = suggestWorkspaceType({
          companyType: profile?.inferred?.companyType,
          industry: profile?.inferred?.industry,
          role: profile?.inferred?.role,
          context: profile?.context,
        })
        const type = existingType || suggestion.type
        const alreadyConfirmed =
          Boolean(
            owned.metadata &&
              typeof owned.metadata === 'object' &&
              (owned.metadata as Record<string, unknown>).workspace_type_meta &&
              typeof (owned.metadata as Record<string, unknown>).workspace_type_meta === 'object' &&
              ((owned.metadata as Record<string, unknown>).workspace_type_meta as { confirmed?: boolean })
                .confirmed,
          )
        const confirmed = alreadyConfirmed || suggestion.confidence >= 0.7
        let nextMeta = personalizationPatch(
          (owned.metadata as Record<string, unknown>) ?? {},
          personalized,
        )
        nextMeta = workspaceTypePatch(nextMeta, type, {
          suggestedByTagro: true,
          confirmed,
        })
        await supabase
          .from('workspaces')
          .update({
            metadata: nextMeta,
            mode: workspaceTypeToLegacyMode(type),
            updated_at: new Date().toISOString(),
          })
          .eq('id', owned.id)
      }
    })()
    return () => { cancelled = true }
  }, [supabase, router])

  const finish = useCallback(async () => {
    setActive(false)
    let target = '/dashboard?welcome=1'
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      target = nextParam.includes('?')
        ? `${nextParam}&welcome=1`
        : `${nextParam}?welcome=1`
    } else if (userId) {
      const resolved = await resolvePostAuthTarget(supabase, userId, '/dashboard')
      target = resolved.includes('?')
        ? `${resolved}&welcome=1`
        : `${resolved}?welcome=1`
    }
    prepareAuthRouteTransition(target)
    window.setTimeout(() => {
      window.location.href = target
    }, 280)
  }, [userId, supabase, nextParam])

  return (
    <main
      data-theme="dark"
      className="ws-init-root"
      style={{
        minHeight: '100dvh',
        background: '#0C0D12',
        overflow: 'visible',
        margin: 0,
        padding: 0,
      }}
    >
      <WorkspaceInitSequence active={active} onComplete={() => { void finish() }} />
    </main>
  )
}

export default function PreparingWorkspacePage() {
  return (
    <Suspense
      fallback={
        <main
          data-theme="dark"
          className="ws-init-root"
          style={{
            minHeight: '100dvh',
            background: '#0C0D12',
            overflow: 'visible',
            margin: 0,
            padding: 0,
          }}
        />
      }
    >
      <PreparingInner />
    </Suspense>
  )
}
