'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, Eye, Package, PaperPlaneTilt, UploadSimple } from '@phosphor-icons/react'
import AssetsPanel from '@/components/AssetsPanel'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { shouldUseDemoFallback } from '@/lib/demo/portal-preview'

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

const DEMO_PROJECTS: Project[] = [
  { id: 'demo-premium-relaunch', title: 'Premium Relaunch', color: '#6366f1' },
  { id: 'demo-festag-platform', title: 'Festag Platform', color: '#0ea5e9' },
]
const DEMO_ASSETS: AssetRow[] = [
  {
    id: 'demo-asset-1', title: 'Homepage Video V3', kind: 'video', status: 'analyzed',
    visibility: 'client_visible', project_id: 'demo-premium-relaunch', created_at: new Date().toISOString(),
    analysis_result: { summary: 'Tagro: Klarere Botschaft in den ersten 3 Sekunden — Client-Freigabe empfohlen.', requires_client_approval: true },
  },
  {
    id: 'demo-asset-2', title: 'Login-Flow Prototype', kind: 'design', status: 'approved',
    visibility: 'client_visible', project_id: 'demo-festag-platform', created_at: new Date().toISOString(),
    analysis_result: { summary: 'Client hat freigegeben — Umsetzung läuft.', requires_client_approval: false },
  },
]

function statusChip(status: string) {
  if (status === 'approved') return 'is-green'
  if (status === 'analyzed') return 'is-warning'
  return ''
}

export default function DevDeliverablesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
    const res = await fetch(`/api/dev/deliverables${qs}`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      setProjects(data.projects ?? [])
      setAssets(data.assets ?? [])
      if (!projectId && data.projects?.[0]?.id) setProjectId(data.projects[0].id)
      setIsDemo(false)
    } else if (shouldUseDemoFallback(res.status)) {
      setProjects(DEMO_PROJECTS)
      setAssets(DEMO_ASSETS)
      setProjectId(DEMO_PROJECTS[0].id)
      setIsDemo(true)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function publishToClient(asset: AssetRow) {
    if (isDemo) { setToast('Beispielansicht — nach Anmeldung verfügbar.'); return }
    setBusyId(asset.id)
    setToast(null)
    try {
      const res = await fetch('/api/dev/deliverables/publish', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: asset.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Senden fehlgeschlagen')
      setToast(data.clientNotified
        ? 'An Client gesendet — sichtbar in Lieferungen & Kunden-Sicht.'
        : 'Signal erstellt — Client-Benachrichtigung ausstehend.')
    } catch (e: any) {
      setToast(e?.message || 'Senden fehlgeschlagen')
    } finally { setBusyId(null) }
  }

  return (
    <div className="dev-page">
      <header className="dv-head">
        <h1 className="dv-title">Lieferungen</h1>
        <div className="dv-head-actions">
          <Link href="/dev/visibility" className="dv-btn">
            <Eye size={13} /> Kunden-Sicht
          </Link>
          <button type="button" className="dv-btn" onClick={() => void load()} aria-label="Aktualisieren">
            <ArrowsClockwise size={13} />
          </button>
        </div>
      </header>

      {isDemo && <DemoPreviewBanner note="Beispiel-Lieferungen — Uploads erscheinen nach Anmeldung im Client Panel." />}

      {toast && (
        <div style={{ margin: '0 0 var(--dv-2, 16px)', padding: '10px 14px', borderRadius: 'var(--dv-r-sm, 8px)', background: 'var(--dv-surface)', fontSize: 13, color: 'var(--dv-text-2)' }}>
          {toast}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 'var(--dv-3, 24px)' }}>
          <label className="dv-label">Projekt</label>
          <select className="dv-select" value={projectId} onChange={e => setProjectId(e.target.value)} style={{ minWidth: 240 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      )}

      {projectId && !isDemo && (
        <div style={{ margin: '0 0 var(--dv-4, 32px)', padding: 'var(--dv-2, 16px)', borderRadius: 'var(--dv-r, 12px)', border: '1px solid var(--dv-line)', background: 'var(--dv-surface)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--dv-text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadSimple size={14} /> Neues Deliverable hochladen
          </p>
          <AssetsPanel projectId={projectId} workspaceId={null} />
        </div>
      )}

      <div className="dv-section">
        <div className="dv-section-head">
          <h2 className="dv-section-title">Letzte Lieferungen</h2>
          <span className="dv-section-trail">
            <span className="dv-section-meta">{assets.length} Assets</span>
          </span>
        </div>
        <div className="dv-list">
          {loading ? (
            <div className="dv-empty"><p>Lade Lieferungen…</p></div>
          ) : assets.length === 0 ? (
            <div className="dv-empty"><p>Noch keine Assets — lade oben ein Deliverable hoch.</p></div>
          ) : assets.map(a => (
            <div key={a.id} className="dv-list-row" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dv-2, 16px)' }}>
                <span className="dv-row-lead"><Package size={15} /></span>
                <span className="dv-row-body">
                  <span className="dv-row-title">{a.title}</span>
                  <span className="dv-row-meta">{a.kind}, {a.visibility === 'client_visible' ? 'Client sieht' : 'Intern'}</span>
                </span>
                <span className="dv-row-trail">
                  <span className={`dv-chip ${statusChip(a.status)}`}>{a.status}</span>
                </span>
              </div>
              {a.analysis_result?.summary && (
                <p style={{ margin: 0, paddingLeft: 36, fontSize: 12.5, lineHeight: 1.55, color: 'var(--dv-text-2)' }}>
                  {a.analysis_result.summary}
                </p>
              )}
              {(a.status === 'analyzed' || a.analysis_result?.summary) && (
                <div style={{ paddingLeft: 36, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="dv-btn is-sm"
                    disabled={busyId === a.id}
                    onClick={() => void publishToClient(a)}
                  >
                    <PaperPlaneTilt size={12} weight="fill" />
                    {busyId === a.id ? 'Sende…' : 'An Client senden'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
