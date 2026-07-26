'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowsClockwise, FilePdf, PaperPlaneTilt, Receipt } from '@phosphor-icons/react'
import DocumentBuilderSection from '@/components/DocumentBuilderSection'
import DocumentTemplatePicker from '@/components/documents/DocumentTemplatePicker'
import { printAgencyDocument } from '@/components/documents/documents-shared'
import type { DocKind } from '@/lib/documents/templates'
import { eur } from '@/lib/documents/templates'

type DevProject = { id: string; title: string; workspace_id?: string | null }
type DocRow = {
  id: string
  kind: string
  number_label: string
  title: string
  status: string
  total_cents: number | null
  created_at: string
  data?: Record<string, unknown> | null
  brand_snapshot?: Record<string, unknown> | null
  projects?: { title?: string } | null
}

const STATUS: Record<string, string> = { final: 'Erstellt', sent: 'Gesendet', paid: 'Bezahlt' }

export default function DevDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<DevProject[]>([])
  const [docs, setDocs] = useState<DocRow[]>([])
  const [projectId, setProjectId] = useState('')
  const [builderKind, setBuilderKind] = useState<DocKind | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const workspaceId = useMemo(
    () => projects.find((p) => p.id === projectId)?.workspace_id ?? projects[0]?.workspace_id ?? null,
    [projects, projectId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
      const res = await fetch(`/api/dev/documents${qs}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      const nextProjects = (data.projects ?? []) as DevProject[]
      setProjects(nextProjects)
      setDocs((data.documents ?? []) as DocRow[])
      if (!projectId && nextProjects[0]?.id) setProjectId(nextProjects[0].id)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function patchDoc(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/dev/documents/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="dev-docs">
      <style>{CSS}</style>

      <header className="dev-docs-head">
        <div>
          <h1 className="dev-docs-title">Dokumente</h1>
          <p className="dev-docs-lead">
            Rechnungen, Angebote und Verträge für deine Projekte — PDF speichern oder ans Kunden-Panel senden.
          </p>
        </div>
        <button type="button" className="dev-docs-refresh" onClick={() => void load()} aria-label="Aktualisieren">
          <ArrowsClockwise size={16} />
        </button>
      </header>

      {projects.length > 0 && (
        <label className="dev-docs-project">
          <span>Projekt</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
      )}

      {workspaceId && (
        <DocumentTemplatePicker
          onSelect={setBuilderKind}
        />
      )}

      {loading && docs.length === 0 ? (
        <p className="dev-docs-empty">Lade Dokumente…</p>
      ) : docs.length === 0 ? (
        <p className="dev-docs-empty">Noch keine Dokumente für dieses Projekt.</p>
      ) : (
        <div className="dev-docs-list">
          {docs.map((doc) => (
            <div key={doc.id} className="dev-docs-row">
              <span className="dev-docs-ico"><Receipt size={16} /></span>
              <span className="dev-docs-main">
                <strong>{doc.number_label}</strong>
                <small>{doc.projects?.title || doc.title}</small>
              </span>
              {doc.total_cents != null && <span className="dev-docs-amt">{eur(doc.total_cents / 100)}</span>}
              <span className="dev-docs-status">{STATUS[doc.status] || doc.status}</span>
              <div className="dev-docs-actions">
                <button type="button" onClick={() => printAgencyDocument(doc)} disabled={busyId === doc.id}>
                  <FilePdf size={14} /> PDF
                </button>
                {doc.status === 'final' && (
                  <button type="button" onClick={() => void patchDoc(doc.id, { status: 'sent' })} disabled={busyId === doc.id}>
                    <PaperPlaneTilt size={14} /> Senden
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {builderKind && workspaceId && (
        <DocumentBuilderSection
          hideTiles
          tilesOnly
          apiBase="/api/dev/documents"
          patchApiBase="/api/dev/documents"
          workspaceId={workspaceId}
          defaultProjectId={projectId}
          externalProjects={projects.map((p) => ({ id: p.id, title: p.title }))}
          requireProject
          builderKind={builderKind}
          onBuilderKindChange={setBuilderKind}
          onDocumentCreated={() => void load()}
        />
      )}
    </div>
  )
}

const CSS = `
  .dev-docs { max-width: 920px; margin: 0 auto; padding: 24px 20px 48px; }
  .dev-docs-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  .dev-docs-title { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .dev-docs-lead { margin: 6px 0 0; font-size: 13.5px; color: var(--text-muted); max-width: 52ch; }
  .dev-docs-refresh { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; color: var(--text-secondary); }
  .dev-docs-project { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; max-width: 360px; }
  .dev-docs-project span { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .dev-docs-project select { height: 36px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); padding: 0 12px; font: inherit; }
  .dev-docs-empty { color: var(--text-muted); font-size: 13.5px; margin: 24px 0; }
  .dev-docs-list { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
  .dev-docs-row { display: grid; grid-template-columns: 36px 1fr auto auto auto; gap: 12px; align-items: center; padding: 12px 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
  .dev-docs-ico { width: 36px; height: 36px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-2); color: var(--text-secondary); }
  .dev-docs-main { display: flex; flex-direction: column; min-width: 0; }
  .dev-docs-main strong { font-size: 13.5px; }
  .dev-docs-main small { font-size: 11.5px; color: var(--text-muted); }
  .dev-docs-amt { font-size: 13px; font-variant-numeric: tabular-nums; }
  .dev-docs-status { font-size: 12px; color: var(--text-secondary); }
  .dev-docs-actions { display: flex; gap: 6px; }
  .dev-docs-actions button { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 12px; border-radius: 32px; border: 1px solid var(--border); background: var(--surface-2); font: inherit; font-size: 12px; cursor: pointer; }
  .dev-docs-actions button:disabled { opacity: 0.5; }
  @media (max-width: 720px) {
    .dev-docs-row { grid-template-columns: 32px 1fr; }
    .dev-docs-amt, .dev-docs-status { display: none; }
    .dev-docs-actions { grid-column: 1 / -1; }
  }
`
