'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Lightning, Plus, Users, Buildings, UserCircle } from '@phosphor-icons/react'
import DevMatchAnimation from '@/components/DevMatchAnimation'
import DevNewProjectModal from '@/components/DevNewProjectModal'

type ProjectRow = {
  id: string
  title: string
  description: string | null
  scope_summary: string | null
  color: string | null
  status: string | null
  project_type: string | null
  created_at: string
  assigned_count: number
  workspace_name: string | null
  client_name: string | null
}

type Pools = {
  available: ProjectRow[]
  mine: ProjectRow[]
}

type AcceptedView = {
  project: { id: string; title: string }
  dev: { id: string; name: string; avatar: string | null }
}

function statusLabel(status?: string | null) {
  const v = String(status || '').toLowerCase()
  if (v === 'intake') return 'Backlog'
  if (v === 'planning') return 'In Planung'
  if (v === 'active') return 'Aktiv'
  if (v === 'testing') return 'Testing'
  if (v === 'done') return 'Fertig'
  return v ? v : 'Backlog'
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} Std`
  const d = Math.floor(h / 24)
  return `${d} Tag${d === 1 ? '' : 'e'}`
}

export default function DevProjectsPage() {
  const [pools, setPools] = useState<Pools>({ available: [], mine: [] })
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string>('')
  const [accepted, setAccepted] = useState<AcceptedView | null>(null)
  const [animPhase, setAnimPhase] = useState<'scanning' | 'matched' | 'assigned'>('scanning')
  const [error, setError] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/projects/available', { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Konnte Projekte nicht laden.')
        return
      }
      const data = await res.json()
      setPools({ available: data.available || [], mine: data.mine || [] })
      setError('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function joinProject(projectId: string) {
    if (joining) return
    setJoining(projectId)
    setError('')
    try {
      const res = await fetch('/api/dev/projects/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Eintragen fehlgeschlagen.')
        return
      }
      setAccepted({ project: data.project, dev: data.dev })
      setAnimPhase('scanning')
      // Beat: scanning → matched (line draws) → assigned, then refresh.
      setTimeout(() => setAnimPhase('matched'), 350)
      setTimeout(() => setAnimPhase('assigned'), 1700)
      setTimeout(() => {
        setAccepted(null)
        load()
      }, 2800)
    } finally {
      setJoining('')
    }
  }

  return (
    <div className="dev-page">
      <header className="dev-page-header compact">
        <div>
          <p className="dev-eyebrow">Project Pool</p>
          <h1>Verfügbare Projekte.</h1>
          <p className="meta">
            {pools.available.length} offen · {pools.mine.length} aktiv bei dir
          </p>
        </div>
        <div className="dp-head-actions">
          <button className="dev-secondary-btn" onClick={load} disabled={loading}>
            {loading ? 'Lade…' : 'Aktualisieren'}
          </button>
          <button className="dev-primary-btn" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> Neues Projekt
          </button>
        </div>
      </header>

      {error && <p className="dp-error">{error}</p>}

      <section className="dp-section">
        <header className="dp-section-head">
          <h2>Verfügbar</h2>
          <span className="dev-chip"><Lightning size={12} /> Eintragen = sofort angenommen</span>
        </header>

        {loading && !pools.available.length ? (
          <p className="dp-empty">Lade Projekte…</p>
        ) : pools.available.length === 0 ? (
          <p className="dp-empty">Keine offenen Projekte. Sobald Clients neue Projekte anlegen, erscheinen sie hier.</p>
        ) : (
          <div className="dp-grid">
            {pools.available.map(p => (
              <article key={p.id} className="dp-card" style={{ borderTop: `2px solid ${p.color || '#5B647D'}` }}>
                <header>
                  <span className="dp-status">
                    <span className="dp-dot" style={{ background: p.color || '#5B647D' }} />
                    {statusLabel(p.status)}
                  </span>
                  <span className="dp-time">{timeAgo(p.created_at)}</span>
                </header>
                <h3>{p.title || 'Unbenanntes Projekt'}</h3>
                {(p.workspace_name || p.client_name) && (
                  <p className="dp-org">
                    {p.workspace_name && <span className="dp-org-ws"><Buildings size={11} /> {p.workspace_name}</span>}
                    {p.client_name && <span className="dp-org-client"><UserCircle size={11} /> {p.client_name}</span>}
                  </p>
                )}
                <p className="dp-desc">
                  {p.scope_summary || p.description || 'Keine Beschreibung — Veyra klassifiziert beim Eintragen.'}
                </p>
                <footer>
                  <span className="dp-count">
                    <Users size={12} /> {p.assigned_count} {p.assigned_count === 1 ? 'Dev' : 'Devs'} dabei
                  </span>
                  <button
                    className="dp-cta"
                    onClick={() => joinProject(p.id)}
                    disabled={joining === p.id}
                  >
                    {joining === p.id ? 'Trage ein…' : <>Eintragen <ArrowRight size={13} /></>}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dp-section">
        <header className="dp-section-head">
          <h2>Bei dir aktiv</h2>
        </header>
        {pools.mine.length === 0 ? (
          <div className="dp-empty dp-empty-cta">
            <span>Noch keine Projekte übernommen. Leg dein erstes Projekt an und lade einen Kunden ein.</span>
            <button className="dev-primary-btn" onClick={() => setNewOpen(true)}><Plus size={14} /> Neues Projekt</button>
          </div>
        ) : (
          <div className="dp-grid">
            {pools.mine.map(p => (
              <Link href={`/dev/projects/${p.id}`} key={p.id} className="dp-card mine" style={{ borderTop: `2px solid ${p.color || '#5B647D'}` }}>
                <header>
                  <span className="dp-status">
                    <CheckCircle size={12} weight="fill" /> Angenommen
                  </span>
                  <span className="dp-time">{timeAgo(p.created_at)}</span>
                </header>
                <h3>{p.title || 'Unbenanntes Projekt'}</h3>
                {(p.workspace_name || p.client_name) && (
                  <p className="dp-org">
                    {p.workspace_name && <span className="dp-org-ws"><Buildings size={11} /> {p.workspace_name}</span>}
                    {p.client_name && <span className="dp-org-client"><UserCircle size={11} /> {p.client_name}</span>}
                  </p>
                )}
                <p className="dp-desc">
                  {p.scope_summary || p.description || 'Keine Beschreibung.'}
                </p>
                <footer>
                  <span className="dp-count">
                    <Users size={12} /> {p.assigned_count} {p.assigned_count === 1 ? 'Dev' : 'Devs'}
                  </span>
                  <span className="dp-arrow">Öffnen <ArrowRight size={13} /></span>
                </footer>
              </Link>
            ))}
          </div>
        )}
      </section>

      {accepted && (
        <div className="dp-accept-overlay" role="status" aria-live="polite">
          <div className="dp-accept-card">
            <p className="dp-accept-kicker">Match · live</p>
            <h2>Du bist auf „{accepted.project.title}".</h2>
            <DevMatchAnimation
              mode="internal"
              matched={{ id: accepted.dev.id, name: accepted.dev.name, avatar: accepted.dev.avatar ?? undefined }}
              status={animPhase}
            />
            <p className="dp-accept-sub">
              Veyra hat dich dem Projekt zugewiesen. Der Client sieht dich jetzt klein auf seiner Projektseite.
            </p>
          </div>
        </div>
      )}

      <DevNewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => load()}
      />

      <style jsx>{`
        .compact { margin-bottom: 18px; }
        .dp-head-actions { display: flex; align-items: center; gap: 8px; }
        .dp-empty-cta { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .dp-empty-cta .dev-primary-btn { flex-shrink: 0; }
        .dp-error {
          margin: 0 0 14px; color: var(--red);
          font-size: 13px; font-weight: 500;
        }
        /* Workspace · client line — which workspace and client a project
           belongs to (the workspace model; dev sees it across boundaries). */
        .dp-org {
          display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px;
          margin: 0 0 8px; font-size: 11.5px; color: var(--text-muted);
        }
        .dp-org-ws, .dp-org-client { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
        .dp-org :global(svg) { flex-shrink: 0; opacity: .8; }

        .dp-section { margin-bottom: 28px; }
        .dp-section-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; margin-bottom: 12px;
        }
        .dp-section-head h2 {
          margin: 0; font-size: 15px; font-weight: 500;
          letter-spacing: -.005em; color: var(--text);
        }
        .dp-empty {
          padding: 28px;
          border: 1px dashed var(--border);
          border-radius: 16px;
          color: var(--text-muted);
          font-size: 13px;
          background: color-mix(in srgb, var(--surface) 50%, transparent);
        }
        .dp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
          gap: 12px;
        }
        .dp-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          display: flex; flex-direction: column; gap: 8px;
          text-decoration: none; color: var(--text);
          transition: border-color .15s, transform .15s, box-shadow .15s;
        }
        .dp-card:hover {
          border-color: var(--border-strong);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px -12px var(--glow);
        }
        .dp-card header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px;
        }
        .dp-card h3 {
          margin: 2px 0 0;
          font-size: 15px; font-weight: 500;
          letter-spacing: -.005em; color: var(--text);
          line-height: 1.3;
        }
        .dp-status {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 500;
          letter-spacing: .04em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .dp-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
        .dp-time {
          font-size: 11px; color: var(--text-muted); font-weight: 500;
          letter-spacing: .01em;
        }
        .dp-desc {
          margin: 0;
          font-size: 12.5px; line-height: 1.5;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dp-card footer {
          margin-top: auto;
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding-top: 6px;
        }
        .dp-count {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; color: var(--text-muted);
          font-weight: 500;
        }
        .dp-cta {
          height: 28px; padding: 0 12px;
          border-radius: 999px;
          background: var(--btn-prim); color: var(--btn-prim-text);
          border: 0;
          display: inline-flex; align-items: center; gap: 5px;
          font: inherit; font-size: 12px; font-weight: 500;
          letter-spacing: .015em; cursor: pointer;
          transition: opacity .12s, transform .12s;
        }
        .dp-cta:hover:not(:disabled) { opacity: .92; }
        .dp-cta:active:not(:disabled) { transform: scale(.97); }
        .dp-cta:disabled { opacity: .55; cursor: not-allowed; }
        .dp-arrow {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; color: var(--text-muted); font-weight: 500;
        }
        .dp-card.mine:hover .dp-arrow { color: var(--text); }

        .dp-accept-overlay {
          position: fixed; inset: 0; z-index: 1100;
          background: rgba(8,10,14,.55);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: dpFade .14s ease both;
        }
        .dp-accept-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 28px 26px 22px;
          width: min(540px, calc(100vw - 32px));
          box-shadow: 0 28px 72px -20px rgba(0,0,0,.4);
          animation: dpPop .3s cubic-bezier(.16,1,.3,1) both;
          text-align: center;
        }
        .dp-accept-kicker {
          margin: 0; font-size: 11px; font-weight: 500;
          letter-spacing: .14em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .dp-accept-card h2 {
          margin: 8px 0 14px;
          font-size: 21px; font-weight: 500;
          letter-spacing: -.005em;
          color: var(--text);
        }
        .dp-accept-sub {
          margin: 6px 0 0;
          font-size: 13px; color: var(--text-secondary);
          line-height: 1.55; font-weight: 500;
        }
        @keyframes dpFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dpPop {
          from { opacity: 0; transform: translateY(12px) scale(.98) }
          to { opacity: 1; transform: none }
        }
      `}</style>
    </div>
  )
}
