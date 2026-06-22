'use client'

import {
  loadViewMode,
  saveViewMode,
  VIEW_MODE_LABELS,
  type SidebarViewMode,
} from '@/lib/sidebar-prefs'

const MODES: SidebarViewMode[] = ['delivery', 'agency', 'team']

type Props = {
  viewMode: SidebarViewMode
  onChange: (mode: SidebarViewMode) => void
  collapsed?: boolean
}

export default function PortalModeSwitcher({ viewMode, onChange, collapsed }: Props) {
  if (collapsed) return null

  return (
    <div className="portal-mode-switcher" role="tablist" aria-label="Sidebar-Modus">
      {MODES.map(m => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={viewMode === m}
          className={`portal-mode-pill${viewMode === m ? ' on' : ''}`}
          onClick={() => {
            onChange(m)
            saveViewMode(m)
          }}
        >
          {VIEW_MODE_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

export function readInitialViewMode(): SidebarViewMode {
  return loadViewMode()
}
