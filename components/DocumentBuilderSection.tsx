'use client'

/**
 * DocumentBuilderSection — the Angebot/Vertrag/Rechnung builder (slice 1),
 * mounted at the top of the Dokumente page. Build a document from a template,
 * download it as PDF (print view); created documents list with status + PDF.
 * Branding = White-Label brand or Festag default.
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal, { ModalButton } from '@/components/Modal'
import { Plus, FileText, FilePdf, Receipt, Scroll, Sparkle } from '@phosphor-icons/react'
import {
  DOC_TEMPLATES, getDocTemplate, renderDocumentHtml, positionsTotal, eur,
  type DocKind, type DocPosition, type DocTemplate,
} from '@/lib/documents/templates'

type DocRow = {
  id: string; kind: DocKind; number_label: string; title: string; status: string
  total_cents: number | null; currency: string; created_at: string
  data: any; brand_snapshot: any
}
type ClientStub = { id: string; name: string }
type ProjectStub = { id: string; title: string }

const KIND_ICON: Record<DocKind, any> = { angebot: FileText, rechnung: Receipt, vertrag: Scroll }
const STATUS_LABEL: Record<string, string> = { draft: 'Entwurf', final: 'Erstellt', sent: 'Gesendet', paid: 'Bezahlt' }

function printDocument(doc: DocRow) {
  const html = renderDocumentHtml({ kind: doc.kind, numberLabel: doc.number_label, data: doc.data || {}, brand: doc.brand_snapshot || { name: 'Festag', color: '#5B647D' } })
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch {} }, 350)
}

export default function DocumentBuilderSection({
  tilesOnly = false,
  hideTiles = false,
  builderKind: controlledKind,
  onBuilderKindChange,
  onDocumentCreated,
}: {
  tilesOnly?: boolean
  hideTiles?: boolean
  builderKind?: DocKind | null
  onBuilderKindChange?: (kind: DocKind | null) => void
  onDocumentCreated?: (doc: DocRow) => void
} = {}) {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [wsId, setWsId] = useState<string | null>(null)
  const [docs, setDocs] = useState<DocRow[]>([])
  const [clients, setClients] = useState<ClientStub[]>([])
  const [projects, setProjects] = useState<ProjectStub[]>([])
  const [internalKind, setInternalKind] = useState<DocKind | null>(null)
  const builderKind = controlledKind !== undefined ? controlledKind : internalKind
  const setBuilderKind = (kind: DocKind | null) => {
    if (onBuilderKindChange) onBuilderKindChange(kind)
    else setInternalKind(kind)
  }

  async function loadDocs() {
    const res = await fetch('/api/documents', { credentials: 'include' })
    const data = await res.json().catch(() => null)
    setDocs((data?.documents ?? []) as DocRow[])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: ws } = await (supabase as any).from('workspaces')
        .select('id').eq('primary_owner_id', user.id).eq('is_personal', true).maybeSingle()
      if (cancelled) return
      const id = (ws as any)?.id ?? null
      setWsId(id)
      const [{ data: cl }, { data: pr }] = await Promise.all([
        id ? (supabase as any).from('agency_clients').select('id,name').eq('workspace_id', id) : Promise.resolve({ data: [] }),
        (supabase as any).from('projects').select('id,title').order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setClients((cl ?? []) as ClientStub[])
      setProjects((pr ?? []) as ProjectStub[])
      await loadDocs()
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  async function setStatus(id: string, status: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    await fetch(`/api/documents/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  return (
    <div className="dbs">
      <style>{CSS}</style>
      {!hideTiles && (
      <div className="dbs-new">
        {DOC_TEMPLATES.map(t => {
          const Icon = KIND_ICON[t.kind]
          return (
            <button key={t.kind} type="button" className="dbs-new-card" onClick={() => setBuilderKind(t.kind)} disabled={!wsId} title={!wsId ? 'Kein Workspace gefunden' : ''}>
              <span className="dbs-new-ico"><Icon size={17} weight="regular" /></span>
              <span className="dbs-new-title">{t.title}</span>
              <span className="dbs-new-plus"><Plus size={13} weight="bold" /></span>
            </button>
          )
        })}
      </div>
      )}

      {!tilesOnly && !loading && docs.length > 0 && (
        <div className="dbs-list">
          {docs.map(d => {
            const Icon = KIND_ICON[d.kind]
            return (
              <div key={d.id} className="dbs-row">
                <span className="dbs-row-ico"><Icon size={15} /></span>
                <span className="dbs-row-main">
                  <span className="dbs-row-title">{getDocTemplate(d.kind)?.title} · {d.number_label}</span>
                  <span className="dbs-row-sub">{d.data?.recipient_name || d.title || '—'} · {new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(d.created_at))}</span>
                </span>
                {d.total_cents != null && <span className="dbs-row-total">{eur(d.total_cents / 100)}</span>}
                <select className="dbs-row-status" value={d.status} onChange={e => setStatus(d.id, e.target.value)}>
                  {['final', 'sent', 'paid'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button type="button" className="dbs-row-pdf" onClick={() => printDocument(d)}><FilePdf size={13} /> PDF</button>
              </div>
            )
          })}
        </div>
      )}

      {builderKind && wsId && (
        <DocumentBuilder
          kind={builderKind}
          workspaceId={wsId}
          clients={clients}
          projects={projects}
          onClose={() => setBuilderKind(null)}
          onCreated={(doc) => { setBuilderKind(null); setDocs(prev => [doc, ...prev]); onDocumentCreated?.(doc); printDocument(doc) }}
        />
      )}
    </div>
  )
}

function DocumentBuilder({ kind, workspaceId, clients, projects, onClose, onCreated }: {
  kind: DocKind; workspaceId: string; clients: ClientStub[]; projects: ProjectStub[]
  onClose: () => void; onCreated: (doc: DocRow) => void
}) {
  const template = getDocTemplate(kind) as DocTemplate
  const [data, setData] = useState<Record<string, any>>({ positions: [{ description: '', qty: 1, unit_price: 0 }] })
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState('')
  const [drafting, setDrafting] = useState(false)

  async function draftWithTagro() {
    if (!brief.trim() || drafting) return
    setDrafting(true); setError('')
    try {
      const res = await fetch('/api/documents/draft', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, brief: brief.trim() }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.data && typeof j.data === 'object') {
        setData(prev => ({ ...prev, ...j.data }))
      }
    } finally { setDrafting(false) }
  }

  const positions: DocPosition[] = Array.isArray(data.positions) ? data.positions : []
  const total = positionsTotal(positions)

  function set(key: string, val: any) { setData(d => ({ ...d, [key]: val })) }
  function setPos(i: number, key: keyof DocPosition, val: any) {
    setData(d => ({ ...d, positions: positions.map((p, idx) => idx === i ? { ...p, [key]: val } : p) }))
  }
  function addPos() { setData(d => ({ ...d, positions: [...positions, { description: '', qty: 1, unit_price: 0 }] })) }
  function removePos(i: number) { setData(d => ({ ...d, positions: positions.filter((_, idx) => idx !== i) })) }

  async function save() {
    setError('')
    const missing = template.fields.find(f => f.required && f.type !== 'positions' && !String(data[f.key] ?? '').trim())
    if (missing) { setError(`Bitte „${missing.label}" ausfüllen.`); return }
    setSaving(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, workspace_id: workspaceId, client_id: clientId || null, project_id: projectId || null, data }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.document) { setError(j?.error || 'Konnte Dokument nicht erstellen.'); return }
      onCreated(j.document as DocRow)
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} size="form" title={`${template.title} erstellen`} subtitle="Fülle die Felder — das gebrandete PDF wird sofort erzeugt."
      footer={<>
        <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
        <ModalButton variant="primary" onClick={save} loading={saving}>Erstellen & PDF öffnen</ModalButton>
      </>}>
      <style>{BUILDER_CSS}</style>

      {/* Tagro assistant — describe the document, Tagro fills the fields. */}
      <div className="db-tagro">
        <div className="db-tagro-head"><Sparkle size={13} weight="fill" /> Mit Tagro ausfüllen</div>
        <textarea
          className="db-input db-tagro-input"
          placeholder={kind === 'rechnung'
            ? 'z. B. „Rechnung an Anna Kipp-Menke für eine Praxis-Website, 2500 €, zahlbar in 14 Tagen."'
            : kind === 'angebot'
              ? 'z. B. „Angebot an Anna Kipp-Menke: Praxis-Website mit 5 Seiten, 2500 €, gültig 30 Tage."'
              : 'z. B. „Dienstleistungsvertrag mit Anna Kipp-Menke über die Erstellung einer Praxis-Website, 2500 € pauschal."'}
          value={brief}
          onChange={e => setBrief(e.target.value)}
          rows={2}
        />
        <button type="button" className="db-tagro-btn" onClick={draftWithTagro} disabled={drafting || !brief.trim()}>
          {drafting ? 'Tagro füllt aus…' : 'Felder ausfüllen'}
        </button>
      </div>

      <div className="db-grid">
        <label className="db-field"><span>Kunde (optional)</span>
          <select className="db-input" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Kein Kunde —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="db-field"><span>Projekt (optional)</span>
          <select className="db-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">— Kein Projekt —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
      </div>

      {template.fields.map(f => {
        if (f.type === 'positions') {
          return (
            <div key={f.key} className="db-positions">
              <div className="db-pos-head"><span>Positionen</span><button type="button" className="db-add" onClick={addPos}><Plus size={12} weight="bold" /> Position</button></div>
              {positions.map((p, i) => (
                <div key={i} className="db-pos-row">
                  <input className="db-input db-pos-desc" placeholder="Beschreibung" value={p.description} onChange={e => setPos(i, 'description', e.target.value)} />
                  <input className="db-input db-pos-qty" type="number" min={0} placeholder="Menge" value={p.qty} onChange={e => setPos(i, 'qty', Number(e.target.value))} />
                  <input className="db-input db-pos-price" type="number" min={0} step="0.01" placeholder="€ / Einheit" value={p.unit_price} onChange={e => setPos(i, 'unit_price', Number(e.target.value))} />
                  <button type="button" className="db-pos-del" onClick={() => removePos(i)} aria-label="Entfernen">×</button>
                </div>
              ))}
              <div className="db-pos-total">Gesamt: <strong>{eur(total)}</strong></div>
            </div>
          )
        }
        return (
          <label key={f.key} className="db-field">
            <span>{f.label}{f.required && <i className="db-req"> *</i>}</span>
            {f.type === 'longtext'
              ? <textarea className="db-input db-area" value={data[f.key] ?? ''} placeholder={f.help || '…'} onChange={e => set(f.key, e.target.value)} rows={2} />
              : <input className="db-input" type={f.type === 'date' ? 'date' : 'text'} value={data[f.key] ?? ''} placeholder={f.help || '…'} onChange={e => set(f.key, e.target.value)} />}
          </label>
        )
      })}

      {error && <p className="db-error">{error}</p>}
    </Modal>
  )
}

const CSS = `
  .dbs { margin-bottom: 18px; }
  /* Borderless Linear-style tiles: soft surface tint, no outline; hover lifts
     the tint subtly. Three calm options on the open page surface. */
  .dbs-new { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:18px; }
  .dbs-new-card {
    display:flex; align-items:center; gap:11px;
    padding:13px 15px;
    border:0; border-radius:12px;
    background: rgba(255,255,255,0.04);
    color:var(--text); cursor:pointer; font:inherit;
    transition: background .14s;
  }
  .dbs-new-card:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
  .dbs-new-card:disabled { opacity:.45; cursor:not-allowed; }
  .dbs-new-ico { width:32px; height:32px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; background:var(--surface-2); color:var(--text-secondary); flex-shrink:0; }
  .dbs-new-title { font-size:13.5px; font-weight:500; flex:1; }
  .dbs-new-plus { color:var(--text-muted); }
  .dbs-list { display:flex; flex-direction:column; gap:6px; }
  .dbs-row { display:grid; grid-template-columns:32px 1fr auto auto auto; align-items:center; gap:12px; padding:10px 14px; border:1px solid var(--border); border-radius:10px; background:var(--surface); }
  .dbs-row-ico { width:32px; height:32px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; background:var(--surface-2); color:var(--text-secondary); }
  .dbs-row-main { display:flex; flex-direction:column; min-width:0; }
  .dbs-row-title { font-size:13px; font-weight:500; color:var(--text); }
  .dbs-row-sub { font-size:11.5px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .dbs-row-total { font-size:13px; font-weight:500; color:var(--text); font-variant-numeric:tabular-nums; }
  .dbs-row-status { height:30px; border:1px solid var(--border); border-radius:8px; background:var(--bg); color:var(--text); font:inherit; font-size:12px; padding:0 8px; }
  .dbs-row-pdf { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 14px; border:1px solid var(--border); border-radius:32px; background:var(--surface-2); color:var(--text); font:inherit; font-size:12px; font-weight:500; cursor:pointer; }
  .dbs-row-pdf:hover { background:var(--border); }
  @media (max-width:760px) { .dbs-new { grid-template-columns:1fr; } .dbs-row { grid-template-columns:28px 1fr auto; } .dbs-row-status, .dbs-row-total { display:none; } }
`

/* Festag form language: no input boxes. Notepad-style — labels are quiet, the
   value is written directly on the surface with only a hairline underline that
   warms on focus. Calm, modern, minimal. Action buttons are 32px pills. */
const BUILDER_CSS = `
  .festag-modal-body .db-tagro,
  .festag-modal-body .db-field,
  .festag-modal-body .db-input,
  .festag-modal-body .db-positions { --text: var(--fp-text); --text-muted: var(--fp-muted); --text-secondary: var(--fp-soft); --border: var(--fp-divider); --surface-2: var(--fp-pill); }

  .db-tagro { margin:0 0 14px; padding:0 0 12px; border-bottom:1px solid var(--fp-divider, var(--border)); }
  .db-tagro-head { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; color:var(--fp-text, var(--text)); margin-bottom:6px; opacity:.85; }
  .db-tagro-input { width:100%; border:0; background:transparent; color:var(--fp-text, var(--text)); font-family:inherit; font-size:14px; line-height:1.5; resize:vertical; min-height:40px; padding:2px 0; }
  .db-tagro-input:focus { outline:none; }
  .db-tagro-input::placeholder { color:var(--fp-muted, var(--text-muted)); }
  .db-tagro-btn { margin-top:6px; height:32px; padding:0 16px; border-radius:32px; border:0; background:var(--btn-prim); color:var(--btn-prim-text); font:inherit; font-size:12.5px; font-weight:500; cursor:pointer; }
  .db-tagro-btn:disabled { opacity:.45; cursor:not-allowed; }

  .db-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; margin-bottom:2px; }
  .db-field { display:flex; flex-direction:column; gap:2px; margin-bottom:10px; }
  .db-field > span { font-size:11px; font-weight:500; letter-spacing:.02em; color:var(--fp-muted, var(--text-muted)); }
  .db-req { color:#c0362e; font-style:normal; }
  .db-input {
    width:100%; border:0; border-bottom:1px solid var(--fp-divider, var(--border));
    background:transparent; color:var(--fp-text, var(--text)); font-family:inherit; font-size:14.5px;
    padding:5px 0; border-radius:0;
  }
  .db-input:focus { outline:none; border-bottom-color:color-mix(in srgb, var(--fp-text, var(--text)) 45%, var(--fp-divider, var(--border))); }
  .db-input::placeholder { color:var(--fp-muted, var(--text-muted)); }
  select.db-input { cursor:pointer; }
  .db-area { line-height:1.5; resize:vertical; min-height:40px; }

  .db-positions { margin:2px 0 8px; }
  .db-pos-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; font-size:11px; font-weight:500; letter-spacing:.02em; color:var(--fp-muted, var(--text-muted)); }
  .db-add { display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 12px; border:0; border-radius:32px; background:var(--fp-pill, var(--surface-2)); color:var(--fp-text, var(--text)); font:inherit; font-size:12px; font-weight:500; cursor:pointer; }
  .db-add:hover { background:var(--fp-hover, var(--border)); }
  .db-pos-row { display:grid; grid-template-columns:1fr 64px 96px 24px; gap:12px; margin-bottom:0; align-items:center; }
  .db-pos-del { width:24px; height:32px; border:0; background:transparent; color:var(--fp-muted, var(--text-muted)); font-size:18px; cursor:pointer; }
  .db-pos-del:hover { color:var(--fp-text, var(--text)); }
  .db-pos-total { text-align:right; font-size:13px; color:var(--fp-soft, var(--text-secondary)); margin-top:6px; }
  .db-error { margin:6px 0 0; font-size:12.5px; color:#c0362e; }
  @media (max-width:560px) { .db-grid { grid-template-columns:1fr; gap:0; } .db-pos-row { grid-template-columns:1fr 52px 78px 22px; gap:8px; } }
`
