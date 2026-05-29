'use client'

/**
 * /dev/updates — Tägliche Developer-Status-Updates.
 *
 * Liest und schreibt aus `developer_updates`. Tagro nutzt diese
 * Einträge später, um daraus die client-safe Statusberichte zu
 * erzeugen — der Developer selbst schreibt aber nur Roh-Text.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

export default function DevUpdatesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [updates, setUpdates] = useState<Update[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loading, setLoading] = useState(true)

  const [text, setText] = useState('')
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState<'in_progress' | 'done' | 'blocked'>('in_progress')
  const [blocker, setBlocker] = useState(false)
  const [blockerDesc, setBlockerDesc] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const session = { user }
      const [{ data: u }, { data: pa }] = await Promise.all([
        supabase
          .from('developer_updates')
          .select('id,project_id,task_id,update_text,status,blocker,blocker_description,github_refs_json,created_at')
          .eq('developer_id', session.user.id).order('created_at', { ascending: false }).limit(40),
        supabase
          .from('project_assignments')
          .select('project_id,projects(id,title)')
          .eq('user_id', session.user.id).eq('active', true),
      ])
      if (cancelled) return
      setUpdates(((u as Update[] | null) ?? []))
      const ps = ((pa as any[] | null) ?? [])
        .map(row => row.projects).filter(Boolean) as ProjectLite[]
      setProjects(ps)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [supabase])

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
            Write a short technical update. Tagro will convert it into a clear project status when needed.
          </p>
        </div>
      </header>

      {/* Composer */}
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
    </div>
  )
}
