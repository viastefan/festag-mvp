/**
 * resolvePostAuthTarget — single source of truth for "where should this
 * user land after login / OAuth callback / OTP verify?"
 *
 * One path for every user (ChatGPT-style unified auth):
 *   1. Device memory only pre-fills UI (laptop).
 *   2. Auth creates or signs in the account (email / Google / SSO).
 *   3. Personal workspace → create-workspace if missing.
 *   4. Build Projects (/onboarding) until onboarding_state.completed_at.
 *      Invitees use Join Project (/join) instead.
 *   5. Execution-capable roles land in `/dev` when mode/role says so.
 */

import {
  canAccessExecutionPanel,
  defaultPostAuthPathForExecution,
  isExecutionPanelPending,
  isExecutionPanelRole,
} from '@/lib/execution-panel/access'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'
import { isDevMidFlowNext } from '@/lib/github/link-session'
import { isJoinMidFlowNext, joinProjectHref } from '@/lib/platform/join'

export type PostAuthTarget =
  | '/onboarding'
  | '/create-workspace'
  | '/dev'
  | '/dev/pending'
  | '/dashboard'
  | string

async function resolveWorkspaceMode(supabase: any, userId: string): Promise<PortalWorkspaceMode | null> {
  try {
    const { data: owned } = await supabase
      .from('workspaces')
      .select('id, mode')
      .eq('primary_owner_id', userId)
      .order('is_personal', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (owned?.mode === 'delivery' || owned?.mode === 'team' || owned?.mode === 'agency') {
      return owned.mode
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (!membership?.workspace_id) return null

    const { data: memberWs } = await supabase
      .from('workspaces')
      .select('mode')
      .eq('id', membership.workspace_id)
      .maybeSingle()
    if (memberWs?.mode === 'delivery' || memberWs?.mode === 'team' || memberWs?.mode === 'agency') {
      return memberWs.mode
    }
  } catch {
    /* soft — routing still works without mode */
  }
  return null
}

export async function resolvePostAuthTarget(
  supabase: any,
  userId: string,
  preferredNext?: string | null,
): Promise<PostAuthTarget> {
  try {
    const [{ data: onboarding }, { data: profile }] = await Promise.all([
      supabase.from('onboarding_state').select('completed_at,workspace_done').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('role,approval_status').eq('id', userId).maybeSingle(),
    ])

    const onboarded = !!(onboarding?.completed_at)
    const role = (profile?.role as string | null) ?? null
    const approval = (profile?.approval_status as string | null) ?? 'approved'
    const bits = { role, approval_status: approval }

    if (isExecutionPanelPending(bits)) return '/dev/pending'

    const [{ data: ownedWs }, { data: memberWs }, { data: projectMember }] = await Promise.all([
      supabase
        .from('workspaces')
        .select('id')
        .eq('primary_owner_id', userId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle(),
    ])

    const hasWorkspace = Boolean(ownedWs?.id || memberWs?.workspace_id || projectMember?.project_id)

    // Mid-flow destinations must survive — never collapse to /onboarding or bare /dev.
    if (preferredNext && (isJoinMidFlowNext(preferredNext) || isDevMidFlowNext(preferredNext))) {
      // Legacy /invite/:token → Join Project path.
      if (preferredNext.startsWith('/invite/')) {
        const token = preferredNext.slice('/invite/'.length).split(/[/?#]/)[0]
        return joinProjectHref({ token: token || null })
      }
      if (preferredNext.startsWith('/dev/join/')) {
        const token = preferredNext.slice('/dev/join/'.length).split(/[/?#]/)[0]
        return joinProjectHref({ token: token || null, source: 'developer' })
      }
      return preferredNext
    }

    if (!hasWorkspace) {
      if (preferredNext?.startsWith('/dev')) {
        return isExecutionPanelRole(role) ? '/dev' : '/create-workspace'
      }
      return '/create-workspace'
    }

    if (!onboarded) {
      return '/onboarding'
    }

    const workspaceMode = await resolveWorkspaceMode(supabase, userId)

    if (preferredNext) {
      if (
        preferredNext === '/dashboard' ||
        preferredNext === '/onboarding' ||
        preferredNext === '/create-workspace'
      ) {
        return '/dashboard'
      }
      if (preferredNext.startsWith('/dev')) {
        return canAccessExecutionPanel(bits) ? '/dev' : '/dashboard'
      }
    }

    return defaultPostAuthPathForExecution(bits, workspaceMode)
  } catch {
    return '/dashboard'
  }
}
