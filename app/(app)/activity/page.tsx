'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowsClockwise, ChartBar, ChatCircle, CheckCircle, Circle, ClipboardText,
  FileText, Flag, FunnelSimple, Key, Lock, PuzzlePiece, Target, Tray, UserPlus, WarningCircle,
  type Icon,
} from '@phosphor-icons/react'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import PortalMobileNavSheet from '@/components/portal/PortalMobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import { openTagro } from '@/components/TagroOverlay'
import { DECISION_CSS } from '@/components/decisions/decisions-styles'
import { ACTIVITY_CSS } from '@/components/activity/activity-styles'
import { fetchJson } from '@/lib/portal/fetch-api'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { DEMO_ACTIVITY_FEED, shouldUseDemoFallback } from '@/lib/demo/portal-preview'

const EVENT_ICONS: Record<string, Icon> = {
  task_created: ClipboardText, task_done: CheckCircle, task_status: ArrowsClockwise,
  dev_joined: UserPlus, ai_report: FileText, project_status: Flag, message_sent: ChatCircle,
  addon_added: PuzzlePiece, ai_priority: Target, login: Lock, password_changed: Key,
  report_generated: ChartBar, progress: CheckCircle, blocker: WarningCircle, risk: WarningCircle,
  issue: Circle, system: Circle,
}

function EventIcon({ type }: { type: string }) {
  const Ico = EVENT_ICONS[type] ?? Circle
  return <Ico size={18} weight="regular" color="var(--dec-soft)" />
}

const EVENT_ACTOR_COLORS: Record<string, string> = {
  ai: 'var(--blue)', dev: 'var(--green-dark)', client: 'var(--text)', system: 'var(--amber)',
}

type FilterId = 'all' | 'ai' | 'dev' | 'system'
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'ai', label: 'Tagro' },
  { id: 'dev', label: 'Developer' },
  { id: 'system', label: 'System' },
]

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

export default function ActivityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<FilterId>('all')
  const [navOpen, setNavOpen] = useState(false)

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

  const filtered = filter === 'all' ? feed : feed.filter(f => f.actor_role === filter)

  const grouped = useMemo(() => {
    const g: Record<string, FeedItem[]> = {}
    filtered.forEach(item => {
      const d = new Date(item.created_at)
      const today = new Date()
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
      let label = d.toLocaleDateString('de', { weekday: 'long', day: '2-digit', month: 'long' })
      if (d.toDateString() === today.toDateString()) label = 'Heute'
      else if (d.toDateString() === yesterday.toDateString()) label = 'Gestern'
      if (!g[label]) g[label] = []
      g[label].push(item)
    })
    return g
  }, [filtered])

  const tagroActivity = () => openTagro({
    contextType: 'empty',
    id: 'activity',
    title: 'Aktivität',
    subtitle: `${feed.length} Ereignisse`,
  })

  const pageLeadLine = loading
    ? 'Aktivität wird geladen…'
    : 'Slack, Team-Signale und Client-Updates in einem Feed.'

  return (
    <div className="dec-os">
      <style>{DECISION_CSS}</style>
      <style>{ACTIVITY_CSS}</style>

      <PortalMobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Aktivität"
            lead={pageLeadLine}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroActivity },
            ]}
            actions={(
              <button type="button" className="dec-head-tool" onClick={() => void load()} aria-label="Aktualisieren">
                <ArrowsClockwise size={15} />
              </button>
            )}
          />

          <div className="act-filters dec-dt">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                className={`act-filter${filter === f.id ? ' on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.id === 'all' ? `Alle (${feed.length})` : f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dec-scroll-body">
          {isDemo && <DemoPreviewBanner />}

          {loading ? (
            <p className="dec-empty">Lade Aktivität…</p>
          ) : error ? (
            <div className="dec-empty">
              <WarningCircle size={16} />
              <p>{error}</p>
              <button type="button" className="dec-cta" style={{ marginTop: 16 }} onClick={() => void load()}>Erneut laden</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="dec-empty">
              <Tray size={16} />
              <p>Noch keine Aktivitäten</p>
              <small>Anbindungen verbinden oder Work Signals erzeugen — Tagro klassifiziert automatisch.</small>
            </div>
          ) : (
            <div className="act-groups">
              {Object.entries(grouped).map(([date, items]) => (
                <section key={date} className="act-group">
                  <p className="act-date">{date}</p>
                  {items.map((item, i) => (
                    <div key={item.id}>
                      <div className="act-row">
                        <div className="act-icon"><EventIcon type={item.event_type} /></div>
                        <div className="act-body">
                          <div className="act-row-top">
                            <p className="act-title">{item.title}</p>
                            <span className="act-time">
                              {new Date(item.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="act-meta">
                            <span className="act-role" style={{ color: EVENT_ACTOR_COLORS[item.actor_role] || 'var(--dec-soft)' }}>
                              {item.actor_role.toUpperCase()}
                            </span>
                            {item.projects?.title && <span className="act-project">{item.projects.title}</span>}
                            {item.risk && <span className="act-impact">{item.impact || 'Risiko'}</span>}
                          </div>
                        </div>
                      </div>
                      {i < items.length - 1 && <div className="dec-divider-gradient" />}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{ contextType: 'empty', id: 'activity', title: 'Aktivität', subtitle: `${feed.length} Ereignisse` }}
        />
      </div>
    </div>
  )
}
