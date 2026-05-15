'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProjectSnapshot = {
  id: string
  title: string
  status: string | null
}

type ActivityItem = {
  id: string
  title: string
  event_type?: string | null
  actor_role?: string | null
  created_at: string
}

const PHASE: Record<string, { label: string; tone: string }> = {
  intake: { label: 'Intake', tone: 'var(--text-muted)' },
  planning: { label: 'Planung', tone: '#F59E0B' },
  active: { label: 'Aktiv', tone: 'var(--green)' },
  testing: { label: 'Testing', tone: 'var(--text-secondary)' },
  done: { label: 'Geliefert', tone: 'var(--green-dark)' },
}

function Icon({ name, size = 15 }: { name: 'project' | 'task' | 'message' | 'activity' | 'billing' | 'document' | 'ai' | 'arrow'; size?: number }) {
  const paths: Record<typeof name, string[]> = {
    project: ['M3 3h18v18H3z', 'M3 9h18', 'M9 21V9'],
    task: ['M9 11l3 3L22 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
    message: ['M21 12c0 4.4-4 8-9 8-1.4 0-2.8-.3-4-.8L3 21l1.8-5C4.3 15 4 13.5 4 12c0-4.4 4-8 9-8s9 3.6 9 8z'],
    activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
    billing: ['M2 5h20v14H2z', 'M2 10h20'],
    document: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'],
    ai: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M5.6 5.6l2.8 2.8', 'M15.6 15.6l2.8 2.8', 'M18.4 5.6l-2.8 2.8', 'M8.4 15.6l-2.8 2.8'],
    arrow: ['M9 6l6 6-6 6'],
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

export default function SettingsRightPanel() {
  const [stats, setStats] = useState({ projects: 0, tasks: 0, messages: 0, done: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [projects, setProjects] = useState<ProjectSnapshot[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const [{ data: projs }, { data: acts }] = await Promise.all([
        sb.from('projects').select('id,title,status').order('created_at', { ascending: false }).limit(4),
        sb.from('activity_feed').select('id,title,event_type,actor_role,created_at').order('created_at', { ascending: false }).limit(5),
      ])
      const ids = projs?.map((p) => p.id) ?? []
      let taskCount = 0
      let messageCount = 0
      let doneCount = 0
      if (ids.length) {
        const [{ count: tasks }, { count: messages }, { count: done }] = await Promise.all([
          sb.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', ids),
          sb.from('messages').select('id', { count: 'exact', head: true }).in('project_id', ids),
          sb.from('tasks').select('id', { count: 'exact', head: true }).in('project_id', ids).eq('status', 'done'),
        ])
        taskCount = tasks ?? 0
        messageCount = messages ?? 0
        doneCount = done ?? 0
      }
      setStats({ projects: projs?.length ?? 0, tasks: taskCount, messages: messageCount, done: doneCount })
      setProjects(projs ?? [])
      setActivity(acts ?? [])
    })
  }, [])

  const progress = stats.tasks ? Math.round((stats.done / stats.tasks) * 100) : 0
  const signalCount = Math.max(1, stats.projects + stats.messages)

  return (
    <aside className="settings-insight-rail" aria-label="Workspace Signale">
      <style>{`
        .settings-insight-rail { display:flex; flex-direction:column; gap:14px; }
        .rail-panel { border:1px solid color-mix(in srgb, var(--border) 62%, transparent); background:color-mix(in srgb, var(--surface) 82%, transparent); border-radius:18px; padding:16px; box-shadow:0 18px 48px rgba(0,0,0,.045); backdrop-filter:blur(22px) saturate(150%); -webkit-backdrop-filter:blur(22px) saturate(150%); }
        .rail-kicker { margin:0 0 10px; color:var(--text-muted); font-size:10px; font-weight:780; letter-spacing:.11em; text-transform:uppercase; }
        .rail-title { margin:0; color:var(--text); font-size:17px; font-weight:790; letter-spacing:-.035em; line-height:1.16; }
        .rail-copy { margin:6px 0 0; color:var(--text-muted); font-size:12px; line-height:1.55; }
        .rail-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:14px; }
        .rail-stat { min-height:72px; border-radius:14px; border:1px solid color-mix(in srgb, var(--border) 54%, transparent); background:color-mix(in srgb, var(--card) 66%, transparent); padding:12px; display:flex; flex-direction:column; justify-content:space-between; }
        .rail-stat span { color:var(--text-muted); font-size:10.5px; font-weight:720; }
        .rail-stat strong { color:var(--text); font-size:22px; line-height:1; letter-spacing:-.045em; }
        .rail-progress { height:3px; background:color-mix(in srgb, var(--border) 70%, transparent); border-radius:999px; overflow:hidden; margin-top:12px; }
        .rail-progress > span { display:block; height:100%; border-radius:inherit; background:var(--text); transition:width .6s cubic-bezier(.16,1,.3,1); }
        .rail-list { display:flex; flex-direction:column; gap:2px; }
        .rail-row { display:flex; align-items:center; gap:10px; min-height:38px; color:var(--text-secondary); border-radius:12px; padding:0 8px; transition:background .16s cubic-bezier(.16,1,.3,1), color .16s cubic-bezier(.16,1,.3,1); }
        .rail-row:hover { background:color-mix(in srgb, var(--surface-2) 82%, transparent); color:var(--text); }
        .rail-row-main { min-width:0; flex:1; }
        .rail-row-title { margin:0; color:inherit; font-size:12.5px; font-weight:670; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rail-row-meta { margin:1px 0 0; color:var(--text-muted); font-size:10.5px; font-weight:620; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .rail-dot { width:7px; height:7px; border-radius:999px; flex-shrink:0; background:var(--text-muted); opacity:.7; }
        .rail-action { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:40px; border-radius:13px; padding:0 10px; color:var(--text-secondary); text-decoration:none; transition:background .16s, color .16s; }
        .rail-action:hover { background:var(--surface-2); color:var(--text); }
      `}</style>

      <section className="rail-panel">
        <p className="rail-kicker">Workspace Signals</p>
        <h2 className="rail-title">Administration ohne Lärm.</h2>
        <p className="rail-copy">Diese Einstellungen steuern Profil, Workspace, Zugriff, Voice Reports und die externe Tool-Schicht im Client Panel.</p>
        <div className="rail-stats">
          {[
            ['Projekte', stats.projects],
            ['Tasks', stats.tasks],
            ['Erledigt', stats.done],
            ['Signale', signalCount],
          ].map(([label, value]) => (
            <div key={label} className="rail-stat">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="rail-progress" aria-label={`Gesamtfortschritt ${progress} Prozent`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="rail-copy" style={{ marginTop: 8 }}>Gesamtfortschritt · {progress}%</p>
      </section>

      <section className="rail-panel">
        <p className="rail-kicker">Setup Fokus</p>
        <div className="rail-list">
          {[
            ['Workspace Daten prüfen', 'Name, Typ und Unternehmenskontext'],
            ['Voice manuell lassen', 'Kein Autoplay, kein Always Listening'],
            ['Rollen vorbereiten', 'Developer nur projektbasiert freigeben'],
          ].map(([title, meta], index) => (
            <div key={title} className="rail-row">
              <span className="rail-dot" style={{ background: index === 0 ? 'var(--green)' : 'var(--text-muted)' }} />
              <div className="rail-row-main">
                <p className="rail-row-title">{title}</p>
                <p className="rail-row-meta">{meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {projects.length > 0 && (
        <section className="rail-panel">
          <p className="rail-kicker">Aktive Projekte</p>
          <div className="rail-list">
            {projects.map((project) => {
              const phase = PHASE[project.status || ''] ?? { label: project.status || 'Offen', tone: 'var(--text-muted)' }
              return (
                <Link key={project.id} href={`/project/${project.id}`} className="rail-row" style={{ textDecoration: 'none' }}>
                  <span className="rail-dot" style={{ background: phase.tone }} />
                  <div className="rail-row-main">
                    <p className="rail-row-title">{project.title}</p>
                    <p className="rail-row-meta">{phase.label}</p>
                  </div>
                  <Icon name="arrow" size={12} />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="rail-panel">
        <p className="rail-kicker">Letzte Aktivität</p>
        <div className="rail-list">
          {activity.length === 0 ? (
            <p className="rail-copy" style={{ margin: 0 }}>Noch keine Aktivitäten. Sobald Tagro, Projekte oder Teams arbeiten, erscheinen hier die wichtigsten Signale.</p>
          ) : activity.map((item) => (
            <div key={item.id} className="rail-row">
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><Icon name="activity" size={14} /></span>
              <div className="rail-row-main">
                <p className="rail-row-title">{item.title}</p>
                <p className="rail-row-meta">
                  {new Date(item.created_at).toLocaleDateString('de', { day: '2-digit', month: 'short' })}
                  {item.actor_role ? ` · ${item.actor_role}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-panel">
        <p className="rail-kicker">Schnellzugriff</p>
        <div className="rail-list">
          {[
            ['Dashboard', '/dashboard', 'project' as const],
            ['Projektbriefings', '/reports', 'ai' as const],
            ['Activity Feed', '/activity', 'activity' as const],
            ['Billing', '/billing', 'billing' as const],
            ['Dokumente', '/documents', 'document' as const],
          ].map(([label, href, icon]) => (
            <Link key={href} href={href} className="rail-action">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <Icon name={icon} />
                <span style={{ fontSize: 12.5, fontWeight: 680 }}>{label}</span>
              </span>
              <Icon name="arrow" size={12} />
            </Link>
          ))}
        </div>
      </section>
    </aside>
  )
}
