'use client'

/**
 * /dev/updates — Developer-Reports & Status-Updates.
 *
 * Drei Dinge an einem Ort (festag_dev_panel.md → Reports):
 *   1. Offene Risiken — blockierte Tasks, die Aufmerksamkeit brauchen.
 *   2. Von Tagro erzeugt — automatisch angelegte Tasks, die noch auf
 *      Annahme warten (created_by_tagro).
 *   3. Updates — der Developer schreibt Roh-Text; Tagro erzeugt daraus
 *      später die client-safe Statusberichte. Hier nur die Roh-Eingabe.
 *
 * Risiken + Tagro-Tasks kommen aus EINER tasks-Query (assigned_to = me),
 * gebucketet über devFlowFromLegacy — dieselbe Statuslogik wie überall.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Sparkle, WarningCircle } from '@phosphor-icons/react'
import { devFlowFromLegacy, type DevFlow } from '@/lib/tasks/work-types'

type Update = {
  id: string
  project_id: string | null
  task_id: string | null
  update_text: string
  status: string | null
  blocker: boolean
  blocker_description: string | null
  github_refs_json: any
  created_at: string
}

type ProjectLite = { id: string; title: string }

type TaskLite = {
  id: string
  title: string
  dev_status: string | null
  status: string | null
  priority: string | null
  project_id: string | null
  created_by_tagro: boolean | null
  created_at: string | null
  updated_at: string | null
  projects?: { title: string | null } | null
}

function priorityLabel(p?: string | null) {
  if (p === 'critical') return 'Kritisch'
  if (p === 'high') return 'Hoch'
  if (p === 'low') return 'Niedrig'
  return 'Mittel'
}

export default function DevUpdatesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [updates, setUpdates] = useState<Update[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [loading, setLoading] = useState(true)

  const [text, setText] = useState('')
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<'in_progress' | 'done' | 'blocked'>('in_progress')
  const [blocker, setBlocker] = useState(false)
  const [blockerDesc, setBlockerDesc] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const uid = user.id
    const [{ data: u }, { data: pa }, { data: tk }] = await Promise.all([
      supabase
        .from('developer_updates')
        .select('id,project_id,task_id,update_text,status,blocker,blocker_description,github_refs_json,created_at')
        .eq('developer_id', uid).order('created_at', { ascending: false }).limit(40),
      supabase
        .from('project_assignments')
        .select('project_id,projects(id,title)')
        .eq('user_id', uid).eq('active', true),
      (supabase as any)
        .from('tasks')
        .select('id,title,dev_status,status,priority,project_id,created_by_tagro,created_at,updated_at,projects(title)')
        .eq('assigned_to', uid)
        .order('updated_at', { ascending: false })
        .limit(200),
    ])
    setUpdates(((u as Update[] | null) ?? []))
    const ps = ((pa as any[] | null) ?? []).map(row => row.projects).filter(Boolean) as ProjectLite[]
    setProjects(ps)
    setTasks(((tk as TaskLite[] | null) ?? []))
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Bucket the dev's tasks once — risks + freshly-generated work.
  const { risks, tagroNew } = useMemo(() => {
    const risks: TaskLite[] = []
    const tagroNew: TaskLite[] = []
    for (const t of tasks) {
      const flow: DevFlow = devFlowFromLegacy(t.status, t.dev_status)
      if (flow === 'blocked') risks.push(t)
      if (t.created_by_tagro && (flow === 'new' || flow === 'assigned')) tagroNew.push(t)
    }
    return { risks, tagroNew: tagroNew.slice(0, 6) }
  }, [tasks])

  async function post() {
    setError('')
    if (!text.trim()) { setError('Bitte einen kurzen Update-Text schreiben.'); return }
    setPosting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        developer_id: user!.id,
        project_id: projectId || null,
        update_text: text.trim(),
        status,
        blocker: blocker || status === 'blocked',
        blocker_description: blocker || status === 'blocked' ? (blockerDesc.trim() || null) : null,
      }
      const { data, error: insErr } = await supabase.from('developer_updates').insert(payload).select('*').single()
      if (insErr) { setError(insErr.message); return }
      if (data) setUpdates(prev => [data as Update, ...prev])
      setText(''); setBlockerDesc(''); setBlocker(false); setStatus('in_progress')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="dev-page">
      <header className="dev-page-header">
        <div>
          <p className="dev-eyebrow">DEV · Updates</p>
          <h1>Updates</h1>
          <p className="meta">
            Offene Risiken, von Tagro angelegte Arbeit und deine technischen Updates — an einer Stelle.
          </p>
        </div>
      </header>

      {/* Signals: risks + auto-generated work */}
      <div className="u-signals">
        <section className={`u-card${risks.length > 0 ? ' alert' : ''}`}>
          <div className="u-card-head">
            <span className="u-card-title"><WarningCircle size={13} /> Offene Risiken</span>
            <span className="u-count">{risks.length}</span>
          </div>
          {loading ? (
            <p className="u-muted">Lade…</p>
          ) : risks.length === 0 ? (
            <p className="u-muted">Keine blockierten Tasks. Wenn etwas hängt, melde es unten als Blocker.</p>
          ) : (
            <ul className="u-list">
              {risks.slice(0, 6).map(t => (
                <li key={t.id}>
                  <Link href={`/dev/tasks?id=${t.id}`}>
                    <span className="u-li-title">{t.title}</span>
                    <span className="u-li-meta">{t.projects?.title || 'kein Projekt'} · {priorityLabel(t.priority)}</span>
                    <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
              {risks.length > 6 && <li className="u-more">+{risks.length - 6} weitere blockiert</li>}
            </ul>
          )}
        </section>

        <section className="u-card">
          <div className="u-card-head">
            <span className="u-card-title"><Sparkle size={13} /> Von Tagro erzeugt</span>
            <span className="u-count">{tagroNew.length}</span>
          </div>
          {loading ? (
            <p className="u-muted">Lade…</p>
          ) : tagroNew.length === 0 ? (
            <p className="u-muted">Keine neuen automatisch angelegten Tasks. Tagro erzeugt sie aus Statusberichten und Entscheidungen.</p>
          ) : (
            <ul className="u-list">
              {tagroNew.map(t => (
                <li key={t.id}>
                  <Link href={`/dev/tasks?id=${t.id}`}>
                    <span className="u-li-title">{t.title}</span>
                    <span className="u-li-meta">{t.projects?.title || 'kein Projekt'} · neu zugewiesen</span>
                    <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Composer */}
      <p className="dev-section-title">Update schreiben</p>
      <div className="dev-surface" style={{ padding: 14, marginBottom: 22 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder="Was wurde erledigt, was läuft, was blockiert?"
          style={{
            width: '100%', background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, padding: '9px 11px', fontSize: 13.5, color: 'var(--text)',
            fontFamily: 'inherit', resize: 'vertical', outline: 'none', minHeight: 70,
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, alignItems: 'center' }}>
          <select
            value={projectId} onChange={e => setProjectId(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, color: 'var(--text)' }}
          >
            <option value="">— Projekt —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select
            value={status} onChange={e => setStatus(e.target.value as any)}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, color: 'var(--text)' }}
          >
            <option value="in_progress">In Arbeit</option>
            <option value="done">Erledigt</option>
            <option value="blocked">Blockiert</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={blocker} onChange={e => setBlocker(e.target.checked)} /> Blocker?
          </label>
          {blocker && (
            <input
              value={blockerDesc} onChange={e => setBlockerDesc(e.target.value)}
              placeholder="Worauf wartet die Arbeit?"
              style={{ flex: 1, minWidth: 200, background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 10px', fontSize: 12.5, color: 'var(--text)' }}
            />
          )}
          <button className="dev-primary-btn" onClick={post} disabled={posting} style={{ marginLeft: 'auto' }}>
            {posting ? 'Sende…' : 'Update posten'}
          </button>
        </div>
        {error && <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>{error}</p>}
      </div>

      {/* Feed */}
      <p className="dev-section-title">Verlauf</p>
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Lade Updates…</p>
      ) : updates.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Noch keine Updates. Schreib den ersten weiter oben.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {updates.map(u => {
            const proj = projects.find(p => p.id === u.project_id)
            const statusLabel = u.status === 'done' ? 'Erledigt' : u.status === 'blocked' ? 'Blockiert' : 'In Arbeit'
            return (
              <li key={u.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span className="dev-chip">{statusLabel}</span>
                  {proj && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {proj.title}</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{u.update_text}</p>
                {u.blocker_description && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--accent)' }}>
                    Blocker: {u.blocker_description}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 18 }}>
        <Link href="/dev" style={{ color: 'inherit' }}>← zurück zur Übersicht</Link>
      </p>

      <style jsx>{`
        .u-signals {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;
        }
        .u-card {
          border: 1px solid var(--border); border-radius: 12px;
          background: var(--surface); padding: 13px 14px; min-height: 96px;
        }
        .u-card.alert { border-color: color-mix(in srgb, var(--red) 38%, var(--border)); }
        .u-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .u-card-title {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: var(--text-secondary);
        }
        .u-card.alert .u-card-title { color: var(--red); }
        .u-card.alert .u-card-title :global(svg) { color: var(--red); }
        .u-count {
          min-width: 20px; height: 18px; padding: 0 6px; border-radius: 6px;
          display: inline-flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--surface-2) 70%, transparent);
          color: var(--text-secondary); font-size: 11px; font-weight: 600;
        }
        .u-card.alert .u-count { background: color-mix(in srgb, var(--red) 16%, transparent); color: var(--red); }
        .u-muted { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.5; }
        .u-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
        .u-list li :global(a) {
          display: flex; align-items: center; gap: 8px; padding: 6px 7px; border-radius: 8px;
          text-decoration: none; color: var(--text); transition: background .12s ease;
        }
        .u-list li :global(a:hover) { background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
        .u-li-title { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1 1 auto; min-width: 0; }
        .u-li-meta { font-size: 11px; color: var(--text-muted); flex: 0 0 auto; white-space: nowrap; }
        .u-list li :global(a svg) { color: var(--text-muted); flex: 0 0 auto; }
        .u-more { font-size: 11px; color: var(--text-muted); padding: 4px 7px; }

        @media (max-width: 760px) {
          .u-signals { grid-template-columns: 1fr; }
          .u-li-meta { display: none; }
        }
      `}</style>
    </div>
  )
}
