'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Lightning, Warning } from '@phosphor-icons/react'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import { STATUS_EXECUTIVE_CSS } from '@/components/status/status-executive-styles'
import { openTagro } from '@/components/TagroOverlay'
import type { ClientActivityItem } from '@/lib/client/client-activity'

type Project = {
  id: string
  title: string
  status: string
  color?: string | null
}

type Task = {
  id: string
  title: string
  status: string
  project_id: string
}

type AttentionItem = {
  id: string
  title: string
  subtitle: string
  href: string
}

type KpiCard = {
  id: string
  label: string
  value: string | number
  trend?: string
  trendDir?: 'up' | 'down' | 'neutral'
  chart: 'bars' | 'line' | 'donut' | 'spark'
  chartData: number[]
}

function MiniChart({ type, data, color = '#5B647D' }: { type: KpiCard['chart']; data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  const w = 100
  const h = 36

  if (type === 'bars') {
    const barW = w / data.length - 2
    return (
      <svg className="st-ex-kpi-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        {data.map((v, i) => {
          const bh = (v / max) * (h - 4)
          return (
            <rect
              key={i}
              x={i * (barW + 2) + 1}
              y={h - bh}
              width={barW}
              height={bh}
              rx={2}
              fill={color}
              opacity={0.35 + (v / max) * 0.65}
            />
          )
        })}
      </svg>
    )
  }

  if (type === 'line' || type === 'spark') {
    const pts = data.map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w
      const y = h - 4 - (v / max) * (h - 8)
      return `${x},${y}`
    }).join(' ')
    return (
      <svg className="st-ex-kpi-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
          opacity={0.9}
        />
        {type === 'spark' && (
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        )}
        {type === 'spark' && (
          <polygon
            fill="url(#sparkFill)"
            points={`0,${h} ${pts} ${w},${h}`}
          />
        )}
      </svg>
    )
  }

  const total = data.reduce((a, b) => a + b, 0) || 1
  const pct = data[0] / total
  const r = 14
  const cx = 18
  const cy = 18
  const circ = 2 * Math.PI * r
  return (
    <svg className="st-ex-kpi-chart" viewBox="0 0 36 36" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="color-mix(in srgb, var(--border) 60%, transparent)" strokeWidth="4" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${circ * pct} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </svg>
  )
}

function projectHealth(p: Project, tasks: Task[]): 'green' | 'amber' | 'red' {
  const projTasks = tasks.filter(t => t.project_id === p.id)
  const blocked = projTasks.some(t => t.status === 'blocked')
  const waiting = projTasks.some(t => t.status === 'waiting')
  if (blocked) return 'red'
  if (waiting) return 'amber'
  return 'green'
}

function projectProgress(p: Project, tasks: Task[]): number {
  const projTasks = tasks.filter(t => t.project_id === p.id)
  if (!projTasks.length) {
    const s = (p.status || '').toLowerCase()
    if (s === 'done') return 100
    if (s === 'testing') return 85
    if (s === 'active') return 62
    if (s === 'planning') return 28
    return 12
  }
  const done = projTasks.filter(t => t.status === 'done').length
  return Math.round((done / projTasks.length) * 100)
}

const HEALTH_LABEL: Record<string, string> = {
  green: 'Im Plan',
  amber: 'Achtung',
  red: 'Risiko',
}

const PHASE: Record<string, string> = {
  intake: 'Intake',
  planning: 'Planung',
  active: 'In Arbeit',
  testing: 'Testing',
  done: 'Abgeschlossen',
}

type Props = {
  greeting: string
  subline?: string
  projects: Project[]
  tasks: Task[]
  executiveSummary?: string
  openDecisionsCount: number
  riskCount: number
  deliveriesThisWeek: number
  activity: ClientActivityItem[]
  attentionItems?: AttentionItem[]
  onBriefing?: () => void
  loading?: boolean
}

export default function StatusExecutiveOverview({
  greeting,
  subline,
  projects,
  tasks,
  executiveSummary,
  openDecisionsCount,
  riskCount,
  deliveriesThisWeek,
  activity,
  attentionItems,
  onBriefing,
  loading,
}: Props) {
  const [navOpen, setNavOpen] = useState(false)

  const activeProjects = useMemo(
    () => projects.filter(p => {
      const s = (p.status || '').toLowerCase()
      return s !== 'done' && s !== 'archived'
    }),
    [projects],
  )

  const onTrack = useMemo(
    () => activeProjects.filter(p => projectHealth(p, tasks) === 'green').length,
    [activeProjects, tasks],
  )

  const teamCapacity = useMemo(() => {
    const open = tasks.filter(t => t.status !== 'done').length
    const cap = Math.max(open, 8)
    return Math.min(100, Math.round((1 - open / (cap * 1.4)) * 100))
  }, [tasks])

  const summary = executiveSummary?.trim() || (
    activeProjects.length
      ? `${onTrack} ${onTrack === 1 ? 'Projekt entwickelt' : 'Projekte entwickeln'} sich normal. ` +
        `${Math.max(0, activeProjects.length - onTrack)} ${activeProjects.length - onTrack === 1 ? 'Projekt braucht' : 'Projekte brauchen'} Aufmerksamkeit. ` +
        `${openDecisionsCount} strategische ${openDecisionsCount === 1 ? 'Entscheidung wartet' : 'Entscheidungen warten'}.`
      : 'Starte dein erstes Projekt, damit Tagro dir einen klaren Überblick geben kann.'
  )

  const hasPortfolio = activeProjects.length > 0 || projects.length > 0

  const kpis: KpiCard[] = [
    {
      id: 'active',
      label: 'Aktive Projekte',
      value: activeProjects.length,
      trend: hasPortfolio ? 'Aktuell' : undefined,
      chart: 'bars',
      chartData: hasPortfolio
        ? [Math.max(1, activeProjects.length - 1), activeProjects.length, activeProjects.length, activeProjects.length, activeProjects.length, activeProjects.length]
        : [0, 0, 0, 0, 0, 0],
    },
    {
      id: 'track',
      label: 'Im Plan',
      value: onTrack,
      trend: hasPortfolio ? `${Math.round((onTrack / Math.max(activeProjects.length, 1)) * 100)}%` : undefined,
      chart: 'donut',
      chartData: [onTrack, Math.max(0, activeProjects.length - onTrack)],
    },
    {
      id: 'decisions',
      label: 'Entscheidungen offen',
      value: openDecisionsCount,
      trend: openDecisionsCount > 0 ? 'Handeln' : hasPortfolio ? 'Ruhig' : undefined,
      chart: 'spark',
      chartData: [openDecisionsCount, openDecisionsCount, openDecisionsCount, openDecisionsCount, openDecisionsCount, openDecisionsCount],
    },
    {
      id: 'risks',
      label: 'Risiken erkannt',
      value: riskCount,
      trend: riskCount > 0 ? 'Kritisch' : hasPortfolio ? 'Keine' : undefined,
      trendDir: riskCount > 0 ? 'down' : 'neutral',
      chart: 'line',
      chartData: [riskCount, riskCount, riskCount, riskCount, riskCount, riskCount],
    },
    {
      id: 'deliveries',
      label: 'Lieferungen diese Woche',
      value: deliveriesThisWeek,
      trend: deliveriesThisWeek > 0 ? 'Diese Woche' : undefined,
      chart: 'bars',
      chartData: [deliveriesThisWeek, deliveriesThisWeek, deliveriesThisWeek, deliveriesThisWeek, deliveriesThisWeek, deliveriesThisWeek],
    },
    {
      id: 'capacity',
      label: 'Team-Kapazität',
      value: hasPortfolio ? `${teamCapacity}%` : '—',
      trend: hasPortfolio ? (teamCapacity > 70 ? 'Gut' : 'Eng') : undefined,
      chart: 'donut',
      chartData: [teamCapacity, 100 - teamCapacity],
    },
  ]

  const defaultAttention: AttentionItem[] = useMemo(() => {
    if (attentionItems !== undefined) return attentionItems
    const items: AttentionItem[] = []
    if (openDecisionsCount > 0) {
      items.push({
        id: 'dec',
        title: 'Entscheidung wartet auf dich',
        subtitle: `${openDecisionsCount} offene ${openDecisionsCount === 1 ? 'Entscheidung' : 'Entscheidungen'} in deiner Queue`,
        href: '/decisions',
      })
    }
    if (riskCount > 0) {
      const blocked = tasks.find(t => t.status === 'blocked')
      items.push({
        id: 'risk',
        title: blocked?.title || 'Timeline-Risiko erkannt',
        subtitle: 'Tagro empfiehlt sofortige Klärung mit dem Team',
        href: blocked ? `/project/${blocked.project_id}` : '/projects',
      })
    }
    return items.slice(0, 3)
  }, [attentionItems, openDecisionsCount, riskCount, tasks])

  const timeline = useMemo(() => {
    if (activity.length) {
      return activity.slice(0, 5).map(a => {
        let time = ''
        try {
          const d = new Date(a.created_at)
          const diff = Date.now() - d.getTime()
          if (diff < 86400000) time = 'Heute'
          else if (diff < 172800000) time = 'Gestern'
          else time = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(d)
        } catch { time = '' }
        return {
          id: a.id,
          title: a.title || a.body?.slice(0, 80) || 'Aktualisierung',
          time,
        }
      })
    }
    return []
  }, [activity])

  return (
    <div className="st-ex">
      <style>{STATUS_EXECUTIVE_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="st-ex-mobile-head">
        <div>
          <h1 className="st-ex-greeting" style={{ fontSize: 29, margin: 0 }}>{greeting}</h1>
          <p className="st-ex-sub" style={{ marginTop: 6, fontSize: 13 }}>{subline || 'Das passiert heute in deiner Produktion.'}</p>
        </div>
        <CodexMobileActionPill
          onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          onMenu={() => setNavOpen(true)}
        />
      </div>

      <header className="st-ex-head">
        <div>
          <h1 className="st-ex-greeting">{greeting}</h1>
          <p className="st-ex-sub">{subline || 'Das passiert heute in deiner Produktion.'}</p>
        </div>
        <div className="st-ex-head-actions">
          <button type="button" className="st-ex-pill" onClick={() => openTagro({ contextType: 'status_report', id: 'dashboard', title: 'Status, Heute' })}>
            Tagro fragen
          </button>
          {onBriefing && (
            <button type="button" className="st-ex-pill st-ex-pill--dark" onClick={onBriefing}>
              Briefing anhören
            </button>
          )}
        </div>
      </header>

      <div className="st-ex-kpis" aria-label="Kennzahlen">
        {kpis.map(k => (
          <article key={k.id} className="st-ex-kpi">
            <p className="st-ex-kpi-label">{k.label}</p>
            <p className="st-ex-kpi-value">{loading ? '—' : k.value}</p>
            <MiniChart type={k.chart} data={k.chartData} />
            {k.trend && (
              <span className={`st-ex-kpi-trend${k.trendDir === 'up' ? ' up' : k.trendDir === 'down' ? ' down' : ''}`}>
                {k.trend}
              </span>
            )}
          </article>
        ))}
      </div>

      <section className="st-ex-section" aria-labelledby="st-ex-summary">
        <div className="st-ex-section-head">
          <h2 id="st-ex-summary" className="st-ex-section-title">Zusammenfassung</h2>
        </div>
        <div className="st-ex-summary">
          <p>{summary}</p>
          <div className="st-ex-summary-meta">
            <span className="st-ex-tagro-dot" aria-hidden />
            Generiert von Tagro
          </div>
        </div>
      </section>

      <section className="st-ex-section" aria-labelledby="st-ex-projects">
        <div className="st-ex-section-head">
          <h2 id="st-ex-projects" className="st-ex-section-title">Projektübersicht</h2>
          <Link href="/projects" className="st-ex-section-link">Alle Projekte</Link>
        </div>
        <div className="st-ex-projects">
          {(activeProjects.length ? activeProjects : projects).slice(0, 4).map(p => {
            const health = projectHealth(p, tasks)
            const progress = projectProgress(p, tasks)
            const phase = PHASE[p.status] ?? 'Intake'
            return (
              <Link key={p.id} href={`/project/${p.id}`} className="st-ex-project">
                <div className="st-ex-project-top">
                  <h3 className="st-ex-project-title">{p.title}</h3>
                  <span className={`st-ex-health st-ex-health--${health}`}>{HEALTH_LABEL[health]}</span>
                </div>
                <p className="st-ex-project-meta">
                  {phase}, nächster Meilenstein in {health === 'green' ? '5 Tagen' : health === 'amber' ? '2 Tagen' : 'überfällig'}
                </p>
                <div className="st-ex-progress" aria-label={`${progress}% Fortschritt`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
              </Link>
            )
          })}
          {!projects.length && !loading && (
            <Link href="/projects" className="st-ex-project">
              <h3 className="st-ex-project-title">Erstes Projekt starten</h3>
              <p className="st-ex-project-meta">Festag wird deine Delivery Intelligence aufbauen.</p>
            </Link>
          )}
        </div>
      </section>

      <section className="st-ex-section" aria-labelledby="st-ex-attention">
        <div className="st-ex-section-head">
          <h2 id="st-ex-attention" className="st-ex-section-title">Erfordert Aufmerksamkeit</h2>
          <Link href="/decisions" className="st-ex-section-link">Entscheidungen</Link>
        </div>
        {defaultAttention.length > 0 ? (
          <div className="st-ex-attention">
            {defaultAttention.map(item => (
              <Link key={item.id} href={item.href} className="st-ex-attention-item">
                <span className="st-ex-attention-ico">
                  {item.id === 'risk' ? <Warning size={18} weight="fill" /> : <Lightning size={18} weight="fill" />}
                </span>
                <span className="st-ex-attention-copy">
                  <p className="st-ex-attention-title">{item.title}</p>
                  <p className="st-ex-attention-sub">{item.subtitle}</p>
                </span>
                <ArrowRight size={16} weight="regular" style={{ flexShrink: 0, opacity: 0.4 }} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="st-ex-empty">Aktuell nichts Kritisches. Tagro meldet sich, sobald Handlungsbedarf besteht.</p>
        )}
      </section>

      <section className="st-ex-section" aria-labelledby="st-ex-activity">
        <div className="st-ex-section-head">
          <h2 id="st-ex-activity" className="st-ex-section-title">Letzte Aktivität</h2>
          <Link href="/activity" className="st-ex-section-link">Alle anzeigen</Link>
        </div>
        {timeline.length > 0 ? (
          <div className="st-ex-timeline">
            {timeline.map(item => (
              <div key={item.id} className="st-ex-tl-item">
                <span className="st-ex-tl-dot" aria-hidden />
                <p className="st-ex-tl-title">{item.title}</p>
                <p className="st-ex-tl-time">{item.time}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="st-ex-empty">Noch keine Aktivität sichtbar. Sobald dein Team liefert, erscheint sie hier.</p>
        )}
      </section>
    </div>
  )
}
