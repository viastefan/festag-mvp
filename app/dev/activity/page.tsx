'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, Broadcast, Eye, GitCommit, GitPullRequest, Package, WarningOctagon,
} from '@phosphor-icons/react'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { DEMO_DEV_ACTIVITY, shouldUseDemoFallback } from '@/lib/demo/portal-preview'
import type { DevActivityOverview, DevActivityRow } from '@/lib/dev/activity-feed'

const KIND_ICON: Record<string, typeof Broadcast> = {
  signal: Broadcast,
  commit: GitCommit,
  pull_request: GitPullRequest,
  proof: Package,
  work_log: Broadcast,
  issue: WarningOctagon,
}

const KIND_LABEL: Record<string, string> = {
  signal: 'Signal',
  commit: 'Commit',
  pull_request: 'Pull Request',
  proof: 'Nachweis',
  work_log: 'Work-Log',
  issue: 'Vorfall',
}

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function ActivityRow({ row }: { row: DevActivityRow }) {
  const Icon = KIND_ICON[row.kind] ?? Broadcast
  const inner = (
    <div className="dv-list-row">
      <span className="dv-row-lead"><Icon size={15} /></span>
      <span className="dv-row-body">
        <span className="dv-row-title">{row.title}</span>
        <span className="dv-row-meta">
          {KIND_LABEL[row.kind] || row.kind}
          {row.project_title ? `, ${row.project_title}` : ''}
          {row.client_visible ? ' — Client sieht' : ''}
          {row.body ? ` — ${row.body.slice(0, 120)}` : ''}
        </span>
      </span>
      <span className="dv-row-trail">
        <span className="dv-row-time">{fmtWhen(row.created_at)}</span>
      </span>
    </div>
  )

  if (row.href?.startsWith('http')) {
    return <a href={row.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>
  }
  if (row.href) return <Link href={row.href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
  return inner
}

export default function DevActivityPage() {
  const [data, setData] = useState<DevActivityOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/dev/activity', { credentials: 'include' })
    const json = await res.json()
    if (res.ok) {
      setData(json)
      if ((json.rows?.length ?? 0) === 0 && shouldUseDemoFallback()) {
        setData(DEMO_DEV_ACTIVITY)
        setIsDemo(true)
      } else {
        setIsDemo(false)
      }
    } else if (shouldUseDemoFallback(res.status)) {
      setData(DEMO_DEV_ACTIVITY)
      setIsDemo(true)
      setError(null)
    } else {
      setError(json.error || 'Aktivität konnte nicht geladen werden.')
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="dev-page">
      <header className="dv-head">
        <h1 className="dv-title">Aktivität</h1>
        <div className="dv-head-actions">
          <Link href="/dev/visibility" className="dv-btn">
            <Eye size={13} /> Kunden-Sicht
          </Link>
          <Link href="/dev/github" className="dv-btn">
            <GitCommit size={13} /> GitHub
          </Link>
          <button type="button" className="dv-btn" onClick={() => void load()} aria-label="Aktualisieren">
            <ArrowsClockwise size={13} />
          </button>
        </div>
      </header>

      {isDemo && <DemoPreviewBanner note="Beispiel-Aktivität — Commits, Lieferungen und Tagro-Signale im Dev Feed." />}

      {data && (
        <div className="dv-section">
          <div className="dv-section-head">
            <h2 className="dv-section-title">Übersicht</h2>
          </div>
          <div style={{ display: 'flex', gap: 'var(--dv-4, 32px)', padding: 'var(--dv-2, 16px) var(--dv-card-pad-x, 16px)' }}>
            {[
              { label: 'Signale', value: data.stats.signals },
              { label: 'Commits 7d', value: data.stats.commits_7d },
              { label: 'PRs offen', value: data.stats.pulls_open },
              { label: 'Client-sichtbar', value: data.stats.client_visible },
            ].map(m => (
              <div key={m.label} style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 400, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--dv-text)' }}>{m.value}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--dv-text-3)' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="dv-empty">
          <p style={{ color: 'var(--dv-error)' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="dv-empty">
          <p>Lade Aktivität…</p>
        </div>
      )}

      {!loading && data && (
        <div className="dv-section">
          <div className="dv-section-head">
            <h2 className="dv-section-title">Feed</h2>
            <span className="dv-section-trail">
              <span className="dv-section-meta">{data.rows.length} Einträge</span>
            </span>
          </div>
          <div className="dv-list">
            {data.rows.length === 0 ? (
              <div className="dv-empty">
                <p>Noch keine Aktivität — Tasks bearbeiten, committen oder Lieferungen hochladen.</p>
              </div>
            ) : data.rows.map(row => <ActivityRow key={row.id} row={row} />)}
          </div>
        </div>
      )}
    </div>
  )
}
