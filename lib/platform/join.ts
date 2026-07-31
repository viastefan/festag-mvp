/**
 * Join Project path — constitution step 1.
 *
 * Invitees: name + avatar → open invited project.
 * Never force Build Projects onboarding or create-workspace theater.
 */

import { ONBOARDING_ROUTES } from '@/lib/platform/onboarding'
import {
  legacyMembershipRoleToProjectRole,
  type ProjectRole,
} from '@/lib/platform/roles'

export type JoinInviteSource = 'team' | 'developer'

/** Build the Join Project URL after auth / invite accept. */
export function joinProjectHref(opts: {
  token?: string | null
  projectId?: string | null
  source?: JoinInviteSource
}): string {
  const q = new URLSearchParams()
  if (opts.token) q.set('token', opts.token)
  if (opts.projectId) q.set('project', opts.projectId)
  if (opts.source === 'developer') q.set('source', 'developer')
  const qs = q.toString()
  return qs ? `${ONBOARDING_ROUTES.join}?${qs}` : ONBOARDING_ROUTES.join
}

/** Post-auth / middleware: invite join mid-flow must survive. */
export function isJoinMidFlowNext(next: string): boolean {
  return (
    next.startsWith('/join') ||
    next.startsWith('/invite/') ||
    next.startsWith('/dev/join/')
  )
}

/** Map invite kind → project_members role string (legacy DB) + constitution role. */
export function inviteKindToMembership(kind: 'contributor' | 'client'): {
  projectMemberRole: string
  assignmentRole: string
  projectRole: ProjectRole
  workspaceRole: string
} {
  if (kind === 'client') {
    return {
      projectMemberRole: 'client',
      assignmentRole: 'client',
      projectRole: 'client',
      workspaceRole: 'member',
    }
  }
  return {
    projectMemberRole: 'dev',
    assignmentRole: 'developer',
    projectRole: 'developer',
    workspaceRole: 'member',
  }
}

export function normalizeInviteProjectRole(role: string | null | undefined): ProjectRole {
  return legacyMembershipRoleToProjectRole(role)
}

/** Where to send the user after Join Project completes. */
export function joinCompletionRedirect(projectId: string | null | undefined): string {
  if (projectId) return `/project/${projectId}`
  return '/dashboard'
}
