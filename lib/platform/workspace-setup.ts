/**
 * Post–workspace-create setup — Phase 2b SSOT.
 *
 * After a workspace exists: Welcome → First Project (required) → Invite → Overview.
 * Titles use AuthGlassyHero lead + muted rest — never a support <p>.
 *
 * @see lib/platform/workspace-creation.ts
 * @see docs/festag-os-workspace-phases.md
 */

import {
  PROJECT_ROLES,
  type ProjectRole,
  PROJECT_ROLE_LABELS,
} from '@/lib/platform/roles'
import type { InviteLegacyRole } from '@/lib/invites/create-and-send'

/** Roles selectable when inviting into a project (not workspace ownership). */
export const PROJECT_INVITE_ROLES = [
  'project_owner',
  'developer',
  'designer',
  'client',
  'viewer',
] as const satisfies readonly ProjectRole[]

export type ProjectInviteRole = (typeof PROJECT_INVITE_ROLES)[number]

export const PROJECT_INVITE_ROLE_LABELS: Record<ProjectInviteRole, string> = {
  project_owner: 'Projektinhaber',
  developer: 'Developer',
  designer: 'Designer',
  client: 'Client',
  viewer: 'Beobachter',
}

/** Map constitution project roles → legacy team_invites.role for mail/RPC. */
export function projectRoleToInviteLegacy(role: ProjectRole): InviteLegacyRole {
  switch (role) {
    case 'project_owner':
    case 'admin':
      return 'admin'
    case 'developer':
      return 'dev'
    case 'client':
      return 'client'
    default:
      return 'collaborator'
  }
}

export function isProjectInviteRole(value: unknown): value is ProjectInviteRole {
  return (
    typeof value === 'string' &&
    (PROJECT_INVITE_ROLES as readonly string[]).includes(value)
  )
}

export function inviteLegacyToProjectRole(role: string | null | undefined): ProjectRole {
  const r = (role || '').toLowerCase().trim()
  if (r === 'admin' || r === 'project_owner' || r === 'owner') return 'project_owner'
  if (r === 'dev' || r === 'developer') return 'developer'
  if (r === 'designer') return 'designer'
  if (r === 'client') return 'client'
  if (r === 'viewer' || r === 'observer') return 'viewer'
  if ((PROJECT_ROLES as readonly string[]).includes(r)) return r as ProjectRole
  return 'member'
}

export const WORKSPACE_SETUP_COPY = {
  welcomeReady: 'Dein Workspace ist bereit.',
  projectTitle: 'Erstelle dein erstes Projekt.',
  projectTitleRest: 'Projekte sind das Fundament jedes Workspace.',
  projectNameLabel: 'Projektname',
  projectNamePlaceholder: 'Airport Website',
  projectDescLabel: 'Beschreibung (optional)',
  projectDescPlaceholder: 'Kurz, worum es geht…',
  projectCreate: 'Projekt erstellen',
  inviteTitle: 'Lade dein Team ein.',
  inviteTitleRest: 'Clients, Developer und Stakeholder arbeiten im Projekt zusammen.',
  inviteUsernameLabel: 'Festag-Nutzer',
  inviteUsernamePlaceholder: '@stefan',
  inviteEmailLabel: 'Per E-Mail',
  inviteEmailPlaceholder: 'name@firma.de',
  inviteRoleLabel: 'Rolle im Projekt',
  inviteSend: 'Einladen',
  inviteSent: 'Einladung gesendet.',
  inviteContinue: 'Weiter zur Übersicht',
  inviteSkip: 'Später einladen',
  pendingSectionTitle: 'Offene Einladungen',
  pendingAccept: 'Annehmen',
  pendingDecline: 'Ablehnen',
  pendingEmpty: '',
  pendingInvitedBy: 'Eingeladen von',
  pendingWorkspace: 'Workspace',
  pendingProject: 'Projekt',
  pendingRole: 'Rolle',
} as const

export function formatInviteRoleLabel(role: string | null | undefined): string {
  const mapped = inviteLegacyToProjectRole(role)
  if (isProjectInviteRole(mapped)) return PROJECT_INVITE_ROLE_LABELS[mapped]
  return PROJECT_ROLE_LABELS[mapped] || mapped
}
