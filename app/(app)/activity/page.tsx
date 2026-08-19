'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { fetchJson } from '@/lib/portal/fetch-api'
import { DEMO_ACTIVITY_FEED, shouldUseDemoFallback } from '@/lib/demo/portal-preview'

type FilterId = 'all' | 'ai' | 'dev' | 'system'
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'ai', label: 'Tagro' },
  { id: 'dev', label: 'Developer' },
  { id: 'system', label: 'System' },
]

const ACTOR_LABEL: Record<string, string> = {
  ai: 'Tagro', dev: 'Developer', client: 'Du', system: 'System',
}

type FeedItem = {
  id: string
  title: string
  event_type: string
  actor_role: string
  created_at: string
  projects?: { title: string } | null
  impact?: string
  risk?: boolean
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Heute'
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern'
  return d.toLocaleDateString('de', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function ActivityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchJson<{ items: any[]; unclassified_signals?: number }>('/api/activity/feed?limit=100')
    if (!res.ok) {
      if (shouldUseDemoFallback(res.status)) {
        setFeed(DEMO_ACTIVITY_FEED)
        setIsDemo(true)
        setError(null)
      } else {
        setFeed([])
        setIsDemo(false)
        setError(res.error || 'Aktivität konnte nicht geladen werden.')
      }
      setLoading(false)
      return
    }
    setIsDemo(false)
    const items = (res.data?.items ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      event_type: item.meaning || item.kind || item.source,
      actor_role: item.actor_role || 'system',
      created_at: item.created_at,
      projects: item.project_title ? { title: item.project_title } : null,
      impact: item.impact,
      risk: item.risk,
    }))
    setFeed(items)
    if ((res.data?.unclassified_signals ?? 0) > 0) {
      fetch('/api/activity/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ limit: 15 }),
      }).catch(() => null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = filter === 'all' ? feed : feed.filter((f) => f.actor_role === filter)

  const grouped = useMemo(() => {
    const g: Array<{ label: string; items: FeedItem[] }> = []
    for (const item of filtered) {
      const label = dateLabel(item.created_at)
      const last = g[g.length - 1]
      if (last && last.label === label) last.items.push(item)
      else g.push({ label, items: [item] })
    }
    return g
  }, [filtered])

  return (
    <div className="fps">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FESTAG_PAGE_STYLES }} />

      <header className="fps-head">
        <h1 className="fps-title">Activity</h1>
        <p className="fps-stat-line">
          <strong>{feed.length}</strong> {feed.length === 1 ? 'Ereignis' : 'Ereignisse'} insgesamt
        </p>
      </header>

      {isDemo && <DemoPreviewBanner />}

      <div className="fps-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`fps-filter${filter === f.id ? ' is-on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.id === 'all' ? `Alle (${feed.length})` : f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="fps-empty">Lade Aktivität…</p>
      ) : error ? (
        <div className="fps-empty">
          <p>{error}</p>
          <button type="button" className="fps-filter" style={{ marginTop: 12 }} onClick={() => void load()}>
            Erneut laden
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="fps-list">
          <p className="fps-empty">Noch keine Aktivitäten. Anbindungen verbinden oder Work Signals erzeugen — Tagro klassifiziert automatisch.</p>
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.label} className="fps-section">
            <p className="fps-section-title">{group.label}</p>
            <div className="fps-list">
              {group.items.map((item) => (
                <div key={item.id} className="fps-row">
                  <div className="fps-row-body">
                    <span
                      className={`fps-mark${item.risk ? ' is-attn is-red' : ''}`}
                      aria-hidden
                    >
                      {item.risk ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                    </span>
                    <span className="fps-row-copy">
                      <span className="fps-row-title">{item.title}</span>
                      <span className="fps-row-sub">
                        {ACTOR_LABEL[item.actor_role] || item.actor_role}
                        {item.projects?.title ? ` · ${item.projects.title}` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="fps-row-right">
                    <span className="fps-row-meta">{fmtTime(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
