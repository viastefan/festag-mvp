'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePortalNavItems } from '@/hooks/usePortalNavItems'
import {
  allPortalShortcutRows,
  portalShortcutRowsForHrefs,
  type PortalShortcutRow,
} from '@/lib/portal-nav-shortcuts'

type Props = {
  /** Show every mapped shortcut (settings) vs. current sidebar only (docs). */
  scope?: 'sidebar' | 'all'
  className?: string
  showFooter?: boolean
}

function isMac() {
  if (typeof navigator === 'undefined') return true
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}

function KeyRow({ label, sub, keys }: { label: string; sub?: string; keys: string[] }) {
  return (
    <div className="ps-row">
      <div>
        <div className="ps-label">{label}</div>
        {sub ? <div className="ps-sub">{sub}</div> : null}
      </div>
      <div className="ps-keys">
        {keys.map(k => (
          <span key={`${label}-${k}`} className="ps-key">{k}</span>
        ))}
      </div>
    </div>
  )
}

export default function PortalShortcutsOverview({
  scope = 'sidebar',
  className = '',
  showFooter = true,
}: Props) {
  const { items: navItems } = usePortalNavItems()
  const rows = useMemo(() => {
    if (scope === 'all') return allPortalShortcutRows()
    return portalShortcutRowsForHrefs(navItems.map(i => i.href))
  }, [scope, navItems])

  const mod = isMac() ? '⌘' : 'Ctrl'

  return (
    <>
      <style>{`
        .ps-grid { display: flex; flex-direction: column; gap: 0; }
        .ps-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid color-mix(in srgb, var(--border) 28%, transparent);
        }
        .ps-row:last-child { border-bottom: 0; }
        .ps-label { font-size: 13.5px; font-weight: 500; color: var(--text); }
        .ps-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .ps-keys { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .ps-key {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 26px; padding: 3px 7px; border-radius: 6px;
          border: 1px solid var(--border); background: var(--bg);
          font-size: 11px; font-weight: 500; color: var(--text-secondary);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .ps-lead {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .ps-foot {
          margin-top: 14px;
          font-size: 12px;
          color: var(--text-muted);
        }
        .ps-foot a { color: var(--text-secondary); font-weight: 500; }
        .ps-section-label {
          margin: 16px 0 6px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
      `}</style>
      <div className={`ps-grid ${className}`.trim()}>
        <p className="ps-lead">
          Linear-style: <strong>G</strong>, dann Buchstabe — navigiert sofort. In der Sidebar erscheinen die Badges kurz beim Hover.
        </p>
        <p className="ps-section-label">Navigation</p>
        {rows.map((row: PortalShortcutRow) => (
          <KeyRow key={row.href} label={row.label} sub={row.href} keys={[...row.keys]} />
        ))}
        <p className="ps-section-label">Global</p>
        <KeyRow label="Command Palette" keys={[mod, 'K']} />
        <KeyRow label="Einstellungen" keys={[mod, ',']} />
        <KeyRow label="Diese Übersicht" keys={[mod, '/']} />
        {showFooter ? (
          <p className="ps-foot">
            Dauerhaft unter{' '}
            <Link href="/settings/shortcuts">Einstellungen → Tastenkürzel</Link>.
          </p>
        ) : null}
      </div>
    </>
  )
}
