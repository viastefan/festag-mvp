export type WorkspaceType =
  | 'personal_workspace'
  | 'founder_team'
  | 'developer_team'
  | 'agency_workspace'
  | 'agency_client_workspace'
  | 'enterprise_workspace'

export type WorkspaceRole =
  | 'owner'
  | 'admin'
  | 'founder'
  | 'cofounder'
  | 'developer'
  | 'lead_developer'
  | 'agency_admin'
  | 'agency_developer'
  | 'client_member'
  | 'enterprise_member'
  | 'viewer'

export type WorkspaceSurface = 'festwerk' | 'relations' | 'teams'

export type WorkspaceSurfaceConfig = {
  id: WorkspaceSurface
  label: string
  shortLabel: string
  description: string
  href: string
}

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  personal_workspace: 'Personal Workspace',
  founder_team: 'Founder Team',
  developer_team: 'Developer Team',
  agency_workspace: 'Agency Workspace',
  agency_client_workspace: 'Agency Client Workspace',
  enterprise_workspace: 'Enterprise Workspace',
}

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  founder: 'Founder',
  cofounder: 'Co-Founder',
  developer: 'Developer',
  lead_developer: 'Lead Developer',
  agency_admin: 'Agency Admin',
  agency_developer: 'Agency Developer',
  client_member: 'Client Member',
  enterprise_member: 'Enterprise Member',
  viewer: 'Viewer',
}

export const WORKSPACE_SURFACES: WorkspaceSurfaceConfig[] = [
  {
    id: 'festwerk',
    label: 'Festwerk Core',
    shortLabel: 'Festwerk',
    description: 'Projekte, Status, Tasks und AI-Kontext',
    href: '/dashboard',
  },
  {
    id: 'relations',
    label: 'Relations Layer',
    shortLabel: 'Relations',
    description: 'Kundenkommunikation, Dokumente und Notizen',
    href: '/relations',
  },
  {
    id: 'teams',
    label: 'Teams Layer',
    shortLabel: 'Teams',
    description: 'Mitglieder, Rollen, Seats und Execution',
    href: '/teams',
  },
]

export function getWorkspaceSurface(pathname: string): WorkspaceSurface {
  if (pathname.startsWith('/relations')) return 'relations'
  if (pathname.startsWith('/teams')) return 'teams'
  return 'festwerk'
}

export function getWorkspaceSurfaceConfig(pathname: string): WorkspaceSurfaceConfig {
  const activeSurface = getWorkspaceSurface(pathname)
  return WORKSPACE_SURFACES.find((surface) => surface.id === activeSurface) ?? WORKSPACE_SURFACES[0]
}
