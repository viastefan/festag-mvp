'use client'

/**
 * /dev — DEV Portal Overview.
 *
 * Datenquellen:
 *   - Supabase Auth-Session als primärer Pfad
 *     → liest `project_assignments` (echte Zuweisungen)
 *     → fällt zurück auf assigned-via `tasks.assigned_to` für Backward-Compat
 *   - Falls keine Supabase-Session, aber legacy PIN-Pool-Session vorliegt,
 *     wird die alte assigned_dev-Logik weiter unterstützt — bis alle
 *     Pool-Devs eigene Accounts haben.
 *
 * UI bewusst ruhig (Linear-Stil): kleiner Eyebrow, kleine Headline,
 * 4 KPIs, dann zwei knappe Sektionen. Keine riesigen Hero-Headlines.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getStoredDevSession, devDisplayName, type DevSession } from '@/lib/dev-session'
import { ArrowRight, CheckCircle, GitBranch, Lightning, WarningCircle, Sparkle } from '@phosphor-icons/react'

type Task = {
  id: string
  title: string
  status?: string | null
  priority?: string | null
  project_id?: string | null
  updated_at?: string | null
  projects?: { title?: string | null; status?: string | null; color?: string | null } | null
}

type Project = {
  id: string
  title: string
  status?: string | null
  description?: string | null
  color?: string | null
}

function normalizeStatus(status?: string | null) {
  const v = String(status || 'todo').toLowerCase()
  if (['done', 'completed', 'delivered'].includes(v)) return 'done'
  if (['ready_review', 'ready_for_review', 'review', 'in_review'].includes(v)) return 'review'
  if (['blocked', 'waiting', 'needs_decision'].includes(v)) return 'blocked'
  if (['doing', 'active', 'in_progress'].includes(v)) return 'active'
  return 'open'
}
function statusLabel(s?: string | null) {
  const v = normalizeStatus(s)
  return v === 'done' ? 'Erledigt' : v === 'review' ? 'Review' : v === 'blocked' ? 'Blockiert' : v === 'active' ? 'In Arbeit' : 'Geplant'
}
function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high')     return 'Hoch'
  if (p === 'low')      return 'Niedrig'
  return 'Mittel'
}

export default function DevOverviewPage() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId]   = useState<string | null>(null)
  const [name, setName]       = useState<string>('')
  const [tasks, setTasks]     = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [recentCommits, setRecentCommits] = useState<number>(0)
  const [recentPRs, setRecentPRs] = useState<number>(0)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Supabase first
      const { data: { session } } = await supabase.auth.getSession()
      let uid: string | null = null
      let display = ''
      if (session) {
        uid = session.user.id
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name,full_name,github_username,email')
          .eq('id', uid).maybeSingle()
        display = (prof as any)?.full_name || (prof as any)?.first_name || (prof as any)?.github_username || session.user.email || 'Developer'
      } else {
        const pool: DevSession | null = getStoredDevSession()
        if (pool) {
          uid = pool.user_id
          display = devDisplayName(pool)
        }
      }
      if (cancelled) return
      if (!uid) { setLoading(false); return }
      setUserId(uid)
      setName(display)

      // Project assignments (new model)
      const { data: pa } = await supabase
        .from('project_assignments')
        .select('project_id,projects(id,title,status,description,color)')
        .eq('user_id', uid).eq('active', true)
      const assignedProjects = ((pa as any[] | null) ?? [])
        .map(row => row.projects).filter(Boolean) as Project[]

      // Fallback: legacy assigned_dev model when no assignments exist
      let projList = assignedProjects
      if (projList.length === 0) {
        const { data: legacy } = await supabase
          .from('projects')
          .select('id,title,status,description,color')
          .eq('assigned_dev', uid)
          .order('created_at', { ascending: false }).limit(10)
        projList = ((legacy as Project[] | null) ?? [])
      }
      if (cancelled) return
      setProjects(projList)

      // Tasks: any task on assigned projects + any task directly assigned_to me
      const projIds = projList.map(p => p.id)
      const taskQ = supabase
        .from('tasks')
        .select('id,title,status,priority,project_id,updated_at,projects(title,status,color)')
        .or(
          projIds.length > 0
            ? `assigned_to.eq.${uid},project_id.in.(${projIds.join(',')})`
            : `assigned_to.eq.${uid}`,
        )
        .order('updated_at', { ascending: false }).limit(40)
      const { data: tRows } = await taskQ
      if (!cancelled) setTasks((tRows as Task[] | null) ?? [])

      // GitHub activity overview (best-effort)
      try {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
        const [{ count: cCount }, { count: prCount }, { data: lastCommit }] = await Promise.all([
          (supabase as any).from('github_commits').select('*', { count: 'exact', head: true }).gte('committed_at', since),
          (supabase as any).from('github_pull_requests').select('*', { count: 'exact', head: true }).gte('updated_at_github', since),
          (supabase as any).from('github_commits').select('committed_at').order('committed_at', { ascending: false }).limit(1).maybeSingle(),
        ])
        if (!cancelled) {
          setRecentCommits(cCount ?? 0)
          setRecentPRs(prCount ?? 0)
          setLastSync((lastCommit as any)?.committed_at ?? null)
        }
      } catch { /* tables may not exist yet — silently skip */ }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

  const metrics = useMemo(() => {
    const active  = tasks.filter(t => normalizeStatus(t.status) === 'active').length
    const review  = tasks.filter(t => normalizeStatus(t.status) === 'review').length
    const blocked = tasks.filter(t => normalizeStatus(t.status) === 'blocked').length
    const open    = tasks.filter(t => !['done','review'].includes(normalizeStatus(t.status))).length
    return { active, review, blocked, open }
  }, [tasks])

  const focusTasks = tasks.filter(t => !['done'].includes(normalizeStatus(t.status))).slice(0, 6)
  const activeProjects = projects.slice(0, 4)

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">DEV · Overview</p>
          <h1>Heute, {name ? name.split(' ')[0] : 'Developer'}.</h1>
          <p className="meta">
            {loading
              ? 'Lade deinen Arbeitsbereich…'
              : `${metrics.open} offene Tasks · ${metrics.review} in Review · ${metrics.blocked} blockiert`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dev/plan" className="dev-secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Sparkle size={13} /> Start today's plan
          </Link>
          <Link href="/dev/github" className="dev-secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <GitBranch size={13} /> Sync GitHub
          </Link>
          <Link href="/dev/updates" className="dev-primary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Lightning size={13} /> Update senden
          </Link>
        </div>
      </header>

      {/* KPI strip */}
      <div className="dev-kpi-grid">
        <div className="dev-surface dev-kpi">
          <strong>{metrics.open}</strong>
          <span>Offene Tasks</span>
        </div>
        <div className="dev-surface dev-kpi">
          <strong>{metrics.review}</strong>
          <span>Ready for Review</span>
        </div>
        <div className="dev-surface dev-kpi">
          <strong>{recentCommits}</strong>
          <span>Commits · 7 Tage</span>
        </div>
        <div className="dev-surface dev-kpi">
          <strong>{recentPRs}</strong>
          <span>PR-Aktivität · 7 Tage</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 22 }}>
        {/* Focus tasks */}
        <section>
          <p className="dev-section-title">Heutiger Fokus</p>
          <div className="dev-surface" style={{ overflow: 'hidden' }}>
            {focusTasks.length === 0 ? (
              <p style={{ margin: 0, padding: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Keine offenen Tasks. {projects.length === 0 ? 'Du bist aktuell keinem Projekt zugeordnet.' : 'Alles abgearbeitet.'}
              </p>
            ) : (
              focusTasks.map((task, i) => (
                <Link
                  key={task.id}
                  href={`/dev/tasks?id=${task.id}`}
                  className="dev-row"
                  style={{
                    textDecoration: 'none', color: 'inherit',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    borderRadius: 0,
                    gridTemplateColumns: '8px minmax(0,1fr) 100px 90px 14px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.projects?.color ?? 'var(--accent)' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>{task.projects?.title ?? 'kein Projekt'}</p>
                  </div>
                  <span className="dev-chip">{statusLabel(task.status)}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{priorityLabel(task.priority)}</span>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Right rail */}
        <aside>
          <p className="dev-section-title">Aktive Projekte</p>
          <div className="dev-surface" style={{ overflow: 'hidden', marginBottom: 18 }}>
            {activeProjects.length === 0 ? (
              <p style={{ margin: 0, padding: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>
                Noch keine Zuweisung. Ein Project Owner muss dich einem Projekt zuordnen.
              </p>
            ) : (
              activeProjects.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/dev/jobs?id=${p.id}`}
                  className="dev-row"
                  style={{
                    textDecoration: 'none', color: 'inherit',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                    borderRadius: 0,
                    gridTemplateColumns: '8px minmax(0,1fr) 14px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color ?? 'var(--accent)' }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>{p.status ?? 'aktiv'}</p>
                  </div>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))
            )}
          </div>

          <p className="dev-section-title">Tagro-Sync</p>
          <div className="dev-surface" style={{ padding: 14 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {lastSync
                ? `Letzter GitHub-Sync: ${new Date(lastSync).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : 'Noch keine GitHub-Aktivität synchronisiert.'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Link href="/dev/github" className="dev-secondary-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={12} /> GitHub
              </Link>
              <Link href="/dev/updates" className="dev-secondary-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={12} /> Tagesupdate
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @media (max-width: 980px) {
          div[style*='grid-template-columns: minmax(0,1.4fr) minmax(0,1fr)'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
