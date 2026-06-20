'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, Broadcast, Eye, Package, UploadSimple } from '@phosphor-icons/react'
import AssetsPanel from '@/components/AssetsPanel'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'

type Project = { id: string; title: string; color?: string | null }
type AssetRow = {
  id: string
  title: string
  kind: string
  status: string
  visibility: string
  project_id: string
  analysis_result?: { summary?: string; requires_client_approval?: boolean }
  created_at: string
}

export default function DevDeliverablesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    const res = await fetch(`/api/dev/deliverables${qs}`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      setProjects(data.projects ?? [])
      setAssets(data.assets ?? [])
      if (!projectId && data.projects?.[0]?.id) setProjectId(data.projects[0].id)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 960, margin: '0 auto' }}>
      <style>{CLIENT_DELIVERABLES_CSS}</style>

      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={22} /> Lieferungen
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
              Uploads werden von Tagro analysiert und erscheinen im Client Panel — wenn du sie freigibst.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dev/visibility" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--text)' }}>
              <Eye size={16} /> Kunden-Sicht
            </Link>
            <button type="button" onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              <ArrowsClockwise size={16} /> Aktualisieren
            </button>
          </div>
        </div>
      </header>

      {projects.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Projekt</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            style={{ minWidth: 240, height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px' }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {projectId && (
        <div style={{ marginBottom: 32, padding: 20, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadSimple size={16} /> Neues Deliverable hochladen
          </p>
          <AssetsPanel projectId={projectId} workspaceId={null} />
        </div>
      )}

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Letzte Lieferungen</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Lade…</p>
        ) : assets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Noch keine Assets — lade oben ein Deliverable hoch.</p>
        ) : (
          <div className="cd-list">
            {assets.map(a => (
              <article key={a.id} className="cd-card">
                <div className="cd-card-head">
                  <div>
                    <h3 className="cd-card-title">{a.title}</h3>
                    <p className="cd-card-meta">{a.kind} · {a.status} · {a.visibility}</p>
                  </div>
                  {a.analysis_result?.requires_client_approval && a.status !== 'approved' && (
                    <span className="cd-pill">Client-Freigabe</span>
                  )}
                </div>
                {a.analysis_result?.summary && <p className="cd-body">{a.analysis_result.summary}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
        <Broadcast size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
        Nach dem Upload analysiert Tagro automatisch und erzeugt einen Eintrag im{' '}
        <Link href="/dev/visibility">Kunden-Verlauf</Link>.
      </p>
    </div>
  )
}
