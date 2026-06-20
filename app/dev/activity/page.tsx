'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise, Broadcast, Eye, GitCommit, GitPullRequest, Package, WarningOctagon,
} from '@phosphor-icons/react'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
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
    <article className="cd-card" style={{ marginBottom: 8 }}>
      <div className="cd-card-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon size={18} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <h3 className="cd-card-title">{row.title}</h3>
            <p className="cd-card-meta">
              {KIND_LABEL[row.kind] || row.kind}
              {row.project_title ? ` · ${row.project_title}` : ''}
              {row.client_visible ? ' · Client sieht' : ''}
            </p>
          </div>
        </div>
        <time className="cd-tl-time">{fmtWhen(row.created_at)}</time>
      </div>
      {row.body && <p className="cd-body">{row.body.slice(0, 320)}</p>}
    </article>
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/dev/activity', { credentials: 'include' })
    const json = await res.json()
    if (res.ok) setData(json)
    else setError(json.error || 'Aktivität konnte nicht geladen werden.')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 960, margin: '0 auto' }}>
      <style>{CLIENT_DELIVERABLES_CSS}</style>

      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Broadcast size={22} /> Aktivitäts-Feed
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', maxWidth: 540 }}>
            Commits, PRs, Nachweise, Vorfälle und Tagro-Signale — alles, was du tust, fließt in die Kunden-Sichtbarkeit.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/dev/visibility" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--text)' }}>
            <Eye size={16} /> Kunden-Sicht
          </Link>
          <Link href="/dev/github" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--text)' }}>
            <GitCommit size={16} /> GitHub
          </Link>
          <button type="button" onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </header>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Signale', value: data.stats.signals },
            { label: 'Commits 7d', value: data.stats.commits_7d },
            { label: 'PRs offen', value: data.stats.pulls_open },
            { label: 'Client-sichtbar', value: data.stats.client_visible },
          ].map(m => (
            <div key={m.label} className="cd-card" style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 500 }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Lade Aktivität…</p>}

      {!loading && data && (
        data.rows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Noch keine Aktivität — Tasks bearbeiten, committen oder Lieferungen hochladen.</p>
        ) : data.rows.map(row => <ActivityRow key={row.id} row={row} />)
      )}
    </div>
  )
}
