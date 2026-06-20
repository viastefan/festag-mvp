'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowsClockwise, ChartBar, ChatCircle, CheckCircle, Circle, ClipboardText,
  FileText, Flag, FunnelSimple, Key, Lock, PuzzlePiece, Target, Tray, UserPlus,
  PencilSimple, Sparkle,
  type Icon,
} from '@phosphor-icons/react'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import MobilePageHeader from '@/components/MobilePageHeader'
import { openTagro } from '@/components/TagroOverlay'

const EVENT_ICONS: Record<string, Icon> = {
  task_created: ClipboardText,
  task_done: CheckCircle,
  task_status: ArrowsClockwise,
  dev_joined: UserPlus,
  ai_report: FileText,
  project_status: Flag,
  message_sent: ChatCircle,
  addon_added: PuzzlePiece,
  ai_priority: Target,
  login: Lock,
  password_changed: Key,
  report_generated: ChartBar,
}

function EventIcon({ type }: { type: string }) {
  const Ico = EVENT_ICONS[type] ?? Circle
  return <Ico size={18} weight="regular" color="var(--text-secondary)" />
}

const EVENT_ACTOR_COLORS: Record<string, string> = {
  ai: 'var(--blue)', dev: 'var(--green-dark)', client: 'var(--text)', system: 'var(--amber)',
}

type FilterId = 'all' | 'ai' | 'dev' | 'system'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'ai', label: 'Tagro AI' },
  { id: 'dev', label: 'Developer' },
  { id: 'system', label: 'System' },
]

export default function ActivityPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/activity/feed?limit=100', { credentials: 'include' })
      const data = res.ok ? await res.json().catch(() => null) : null
      const items = (data?.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.body,
        event_type: item.meaning || item.kind || item.source,
        actor_role: item.actor_role || 'system',
        created_at: item.created_at,
        projects: item.project_title ? { title: item.project_title } : null,
        impact: item.impact,
        risk: item.risk,
        source: item.source,
      }))
      setFeed(items)

      if ((data?.unclassified_signals ?? 0) > 0) {
        fetch('/api/activity/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ limit: 15 }),
        }).catch(() => null)
      }
    } catch {
      setFeed([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      await load()
      await supabase.rpc('mark_activity_read')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'all' ? feed : feed.filter(f => f.actor_role === filter)
  const filterActive = filter !== 'all'

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
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

  return (
    <MobileCodexListChrome
      className="act-page"
      title="Aktivität"
      legacyHeader={<MobilePageHeader title="Aktivität" />}
      mobileActions={(
        <>
          <button type="button" className="mcl-add-btn" aria-label="Mit Tagro" onClick={tagroActivity}>
            <Sparkle size={17} weight="fill" />
          </button>
          <div className="mcl-actions-group">
            <button
              type="button"
              className={`mcl-ctl${filterOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
              aria-label="Filter"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(v => !v)}
            >
              <FunnelSimple size={17} weight="regular" />
            </button>
            <button type="button" className="mcl-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
          {filterOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Filter</p>
                {FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    role="menuitem"
                    className={`mcl-filter-item${filter === f.id ? ' on' : ''}`}
                    onClick={() => { setFilter(f.id); setFilterOpen(false) }}
                  >
                    {f.id === 'all' ? `Alle (${feed.length})` : f.label}
                  </button>
                ))}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterOpen(false)} />
            </>
          )}
        </>
      )}
      dock={{
        onDragUp: tagroActivity,
        primary: {
          id: 'tagro',
          label: 'Aktivität besprechen...',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroActivity,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'compose',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroActivity,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={ACTIVITY_CSS}
    >
      <header className="act-dt-head">
        <h1>Aktivität</h1>
        <p>Operational Intelligence — Signale aus Slack, Issues und Team-Aktivität</p>
      </header>

      <div className="act-dt-filters">
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

      {loading ? (
        <div className="act-loading">
          <div className="act-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="act-empty">
          <Tray size={34} color="var(--text-muted)" />
          <h2>Noch keine Aktivitäten</h2>
          <p>Sobald Tasks erstellt, AI-Berichte generiert oder Developer aktiv werden, erscheint es hier.</p>
        </div>
      ) : (
        <div className="act-groups">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date} className="act-group">
              <p className="act-date">{date}</p>
              <div className="act-card">
                {items.map((item, i) => (
                  <div key={item.id} className={`act-row${i < items.length - 1 ? ' has-border' : ''}`}>
                    <div className="act-icon">
                      <EventIcon type={item.event_type} />
                    </div>
                    <div className="act-body">
                      <div className="act-row-top">
                        <p className="act-title">{item.title}</p>
                        <span className="act-time">
                          {new Date(item.created_at).toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="act-meta">
                        {item.actor_role && (
                          <span className="act-role" style={{ color: EVENT_ACTOR_COLORS[item.actor_role] || 'var(--text-muted)' }}>
                            {item.actor_role.toUpperCase()}
                          </span>
                        )}
                        {item.projects?.title && (
                          <span className="act-project">{item.projects.title}</span>
                        )}
                        {!item.read_at && <span className="act-unread" aria-label="Neu" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </MobileCodexListChrome>
  )
}

const ACTIVITY_CSS = `
  .act-dt-head { margin-bottom: 20px; }
  .act-dt-head h1 { margin: 0 0 6px; font-size: 22px; font-weight: 500; }
  .act-dt-head p { margin: 0; font-size: 14px; color: var(--text-secondary); }

  .act-dt-filters {
    display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .act-filter {
    padding: 7px 14px; border-radius: 12px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text-secondary);
    font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: all .15s;
  }
  .act-filter.on {
    background: var(--accent); color: var(--accent-text); border-color: transparent;
  }

  .act-loading { display: flex; justify-content: center; padding: 40px; }
  .act-spinner {
    width: 24px; height: 24px;
    border: 2px solid var(--border); border-top-color: var(--text);
    border-radius: 50%; animation: spin .8s linear infinite;
  }

  .act-empty {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    padding: 48px 24px; text-align: center;
  }
  .act-empty svg { margin-bottom: 16px; }
  .act-empty h2 { margin: 0 0 8px; font-size: 18px; font-weight: 500; }
  .act-empty p { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5; }

  .act-groups { display: flex; flex-direction: column; gap: 20px; }
  .act-date {
    margin: 0 0 10px; font-size: 12px; font-weight: 600;
    color: var(--text-muted); letter-spacing: .04em; text-transform: uppercase;
  }
  .act-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden;
    box-shadow: var(--shadow-xs, 0 1px 2px rgba(0,0,0,.04));
  }
  .act-row {
    display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px;
    transition: background .12s;
  }
  .act-row.has-border { border-bottom: 1px solid var(--border); }
  .act-row:hover { background: var(--bg); }
  .act-icon {
    width: 40px; height: 40px; border-radius: 11px;
    background: var(--surface-2); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .act-body { flex: 1; min-width: 0; }
  .act-row-top {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;
  }
  .act-title {
    margin: 0; font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.4;
  }
  .act-time {
    font-size: 12px; color: var(--text-muted); flex-shrink: 0; font-variant-numeric: tabular-nums;
  }
  .act-meta {
    display: flex; gap: 8px; align-items: center; margin-top: 5px; flex-wrap: wrap;
  }
  .act-role {
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px;
    background: var(--surface-2); letter-spacing: .04em;
  }
  .act-project { font-size: 12px; color: var(--text-muted); }
  .act-unread {
    width: 6px; height: 6px; border-radius: 50%; background: var(--blue); display: inline-block;
  }

  @media (max-width: 768px) {
    .act-dt-head,
    .act-dt-filters { display: none !important; }

    .act-date {
      font-size: 13px !important;
      font-weight: 500 !important;
      letter-spacing: -0.01em !important;
      text-transform: none !important;
      color: #90959F !important;
      margin-bottom: 8px !important;
    }
    .act-card {
      background: #FFFFFF !important;
      border: 1px solid rgba(0,0,0,.06) !important;
      border-radius: 14px !important;
      box-shadow: var(--mcl-white-elev) !important;
    }
    .act-row { padding: 16px !important; gap: 12px !important; }
    .act-row:hover { background: transparent !important; }
    .act-title {
      font-size: 16px !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
      line-height: 1.35 !important;
    }
    .act-time { font-size: 13px !important; }
    .act-project { font-size: 14px !important; }
    .act-icon { width: 42px !important; height: 42px !important; }
    .act-empty {
      background: #FFFFFF !important;
      border: 1px solid rgba(0,0,0,.06) !important;
      border-radius: 14px !important;
      box-shadow: var(--mcl-white-elev) !important;
      padding: 40px 20px !important;
    }
    .act-empty h2 { font-size: 20px !important; font-weight: 400 !important; }
    .act-empty p { font-size: 15px !important; }
    [data-theme="dark"] .act-card,
    [data-theme="classic-dark"] .act-card,
    [data-theme="dark"] .act-empty,
    [data-theme="classic-dark"] .act-empty {
      background: rgba(255,255,255,.06) !important;
      border-color: rgba(255,255,255,.1) !important;
    }
  }
`
