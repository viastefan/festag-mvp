// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Preferences Store
//
// Personal preferences for what shows in the left sidebar — modeled after
// Linear's "Customize sidebar" panel. Stored in localStorage. The Sidebar
// reads visibility per item, the CustomizeSidebarModal writes it back.
//
// Three visibility modes per item:
//   - always   : item is always visible
//   - badged   : item is only visible when its badge count > 0
//   - never    : item is hidden from the sidebar; surfaces via the "Mehr"
//                popover instead so nothing is unreachable.
//
// Plus a global "badge_style" — how unread counts render across the bar:
//   - count    : numeric (default — "12")
//   - dot      : tiny dot, no number
//   - bold     : item label gets weight bump instead of a chip
// ─────────────────────────────────────────────────────────────────────────────

export type SidebarVisibility = 'always' | 'badged' | 'never'
export type BadgeStyle = 'count' | 'dot' | 'bold'

export type SidebarItemId =
  | 'inbox' | 'my-issues' | 'drafts' | 'statusabfrage'
  | 'projects' | 'reports' | 'tasks' | 'issues' | 'decisions' | 'observers'
  | 'members' | 'teams'
  | 'tagro-chat' | 'tagro-notes'
  | 'estimator' | 'connectors' | 'addons'

export type SidebarSection = 'personal' | 'workspace' | 'teams' | 'tagro' | 'tools'

export type SidebarPrefs = {
  // Per-item visibility map. Items not in the map use their default.
  visibility: Partial<Record<SidebarItemId, SidebarVisibility>>
  // Global badge rendering style.
  badgeStyle: BadgeStyle
  // Manual order per section. Items not in the order use schema order.
  order: Partial<Record<SidebarSection, SidebarItemId[]>>
}

const STORAGE_KEY = 'festag_sidebar_prefs_v1'

// Defaults match the current Sidebar.tsx behaviour so nothing changes for
// users until they open the customize modal.
export const DEFAULT_VISIBILITY: Record<SidebarItemId, SidebarVisibility> = {
  // Personal
  inbox:         'always',
  'my-issues':   'badged',
  drafts:        'badged',
  statusabfrage: 'always',
  // Workspace
  projects:      'always',
  reports:       'always',
  tasks:         'always',
  issues:        'always',
  decisions:     'always',
  observers:     'badged',
  members:       'never',
  teams:         'never',
  // Tagro
  'tagro-chat':  'always',
  'tagro-notes': 'always',
  // Tools
  estimator:     'always',
  connectors:    'always',
  addons:        'always',
}

export const ITEM_LABELS: Record<SidebarItemId, string> = {
  inbox:         'Inbox',
  'my-issues':   'Meine Tasks',
  drafts:        'Entwürfe',
  statusabfrage: 'Statusabfrage',
  projects:      'Projekte',
  reports:       'Statusberichte',
  tasks:         'Tasks',
  issues:        'Issues',
  decisions:     'Entscheidungen',
  observers:     'Mitwirkende',
  members:       'Mitglieder',
  teams:         'Teams',
  'tagro-chat':  'Tagro Chat',
  'tagro-notes': 'Notizen',
  estimator:     'Preisschätzer',
  connectors:    'Connectors',
  addons:        'Add-ons',
}

export const ITEM_SECTION: Record<SidebarItemId, SidebarSection> = {
  inbox: 'personal', 'my-issues': 'personal', drafts: 'personal', statusabfrage: 'personal',
  projects: 'workspace', reports: 'workspace', tasks: 'workspace',
  issues: 'workspace', decisions: 'workspace', observers: 'workspace',
  members: 'teams', teams: 'teams',
  'tagro-chat': 'tagro', 'tagro-notes': 'tagro',
  estimator: 'tools', connectors: 'tools', addons: 'tools',
}

export const SECTION_LABELS: Record<SidebarSection, string> = {
  personal:  'Persönlich',
  workspace: 'Workspace',
  teams:     'Teams',
  tagro:     'Tagro AI',
  tools:     'Tools',
}

const EMPTY_PREFS: SidebarPrefs = { visibility: {}, badgeStyle: 'count', order: {} }

export function loadPrefs(): SidebarPrefs {
  if (typeof window === 'undefined') return EMPTY_PREFS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_PREFS
    const parsed = JSON.parse(raw)
    return {
      visibility: parsed.visibility && typeof parsed.visibility === 'object' ? parsed.visibility : {},
      badgeStyle: parsed.badgeStyle === 'dot' || parsed.badgeStyle === 'bold' ? parsed.badgeStyle : 'count',
      order: parsed.order && typeof parsed.order === 'object' ? parsed.order : {},
    }
  } catch {
    return EMPTY_PREFS
  }
}

export function savePrefs(next: SidebarPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('festag-sidebar-prefs-change'))
  } catch {
    /* quota or disabled — ignore */
  }
}

export function visibilityOf(id: SidebarItemId, prefs: SidebarPrefs): SidebarVisibility {
  return prefs.visibility[id] ?? DEFAULT_VISIBILITY[id] ?? 'always'
}

/**
 * Decide whether an item should appear in the main sidebar given current
 * visibility setting and whether it has unread/badged signal.
 */
export function shouldShowInSidebar(
  id: SidebarItemId,
  prefs: SidebarPrefs,
  hasBadge: boolean,
): boolean {
  const v = visibilityOf(id, prefs)
  if (v === 'always') return true
  if (v === 'never') return false
  return hasBadge // 'badged'
}

/**
 * The items that should appear under "Mehr" — visibility is 'never', or
 * 'badged' with no current badge.
 */
export function hiddenItemsForMore(
  ids: SidebarItemId[],
  prefs: SidebarPrefs,
  badgeMap: Partial<Record<SidebarItemId, boolean>>,
): SidebarItemId[] {
  return ids.filter((id) => !shouldShowInSidebar(id, prefs, !!badgeMap[id]))
}

/**
 * Subscribe to live prefs changes from anywhere in the app.
 */
export function onPrefsChange(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const wrapped = () => handler()
  window.addEventListener('festag-sidebar-prefs-change', wrapped)
  window.addEventListener('storage', wrapped)
  return () => {
    window.removeEventListener('festag-sidebar-prefs-change', wrapped)
    window.removeEventListener('storage', wrapped)
  }
}
