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
import TagroPromptComposer from '@/components/TagroPromptComposer'
import TagroFieldAssist from '@/components/tagro/TagroFieldAssist'
import InvoiceIssuerModal from '@/components/documents/InvoiceIssuerModal'
import { Plus, FileText, FilePdf, Receipt, Scroll, PencilSimple } from '@phosphor-icons/react'
import { isIssuerReady, issuerAddressBlock, issuerSummaryLine, type InvoiceIssuer } from '@/lib/documents/issuer'
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
  const printHtml = html.replace(/url\('\/fonts\//g, `url('${window.location.origin}/fonts/`)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(printHtml)
  w.document.close()
  setTimeout(() => { try { w.focus(); w.print() } catch {} }, 350)
}

export default function DocumentBuilderSection({
  tilesOnly = false,
  hideTiles = false,
  builderKind: controlledKind,
  onBuilderKindChange,
  onDocumentCreated,
  onIssuerSaved,
  apiBase = '/api/documents',
  patchApiBase,
  workspaceId: workspaceIdProp,
  defaultProjectId = '',
  externalProjects,
  externalClients,
  requireProject = false,
}: {
  tilesOnly?: boolean
  hideTiles?: boolean
  builderKind?: DocKind | null
  onBuilderKindChange?: (kind: DocKind | null) => void
  onDocumentCreated?: (doc: DocRow) => void
  onIssuerSaved?: () => void
  apiBase?: string
  patchApiBase?: string
  workspaceId?: string | null
  defaultProjectId?: string
  externalProjects?: ProjectStub[]
  externalClients?: ClientStub[]
  requireProject?: boolean
} = {}) {
  const patchBase = patchApiBase || apiBase
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
    const res = await fetch(apiBase, { credentials: 'include' })
    const data = await res.json().catch(() => null)
    setDocs((data?.documents ?? []) as DocRow[])
  }

  useEffect(() => {
    if (externalProjects) setProjects(externalProjects)
    if (externalClients) setClients(externalClients)
  }, [externalProjects, externalClients])

  useEffect(() => {
    if (workspaceIdProp) setWsId(workspaceIdProp)
  }, [workspaceIdProp])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      if (workspaceIdProp) {
        if (!externalProjects) {
          const { data: pr } = await (supabase as any).from('projects')
            .select('id,title').order('created_at', { ascending: false })
          if (!cancelled) setProjects((pr ?? []) as ProjectStub[])
        }
        if (!externalClients && workspaceIdProp) {
          const { data: cl } = await (supabase as any).from('agency_clients')
            .select('id,name').eq('workspace_id', workspaceIdProp)
          if (!cancelled) setClients((cl ?? []) as ClientStub[])
        }
        if (!tilesOnly) await loadDocs()
        if (!cancelled) setLoading(false)
        return
      }

      const { data: ws } = await (supabase as any).from('workspaces')
        .select('id').eq('primary_owner_id', user.id).eq('is_personal', true).maybeSingle()
      if (cancelled) return
      const id = (ws as any)?.id ?? null
      setWsId(id)
      if (!externalProjects || !externalClients) {
        const [{ data: cl }, { data: pr }] = await Promise.all([
          id ? (supabase as any).from('agency_clients').select('id,name').eq('workspace_id', id) : Promise.resolve({ data: [] }),
          externalProjects ? Promise.resolve({ data: externalProjects }) : (supabase as any).from('projects').select('id,title').order('created_at', { ascending: false }),
        ])
        if (cancelled) return
        if (!externalProjects) setProjects((pr ?? []) as ProjectStub[])
        if (!externalClients) setClients((cl ?? []) as ClientStub[])
      }
      if (!tilesOnly) await loadDocs()
      setLoading(false)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, apiBase, workspaceIdProp, externalProjects, externalClients])

  async function setStatus(id: string, status: string) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    await fetch(`${patchBase}/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
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
          apiBase={apiBase}
          defaultProjectId={defaultProjectId}
          requireProject={requireProject}
          onClose={() => setBuilderKind(null)}
          onCreated={(doc) => { setBuilderKind(null); setDocs(prev => [doc, ...prev]); onDocumentCreated?.(doc); printDocument(doc) }}
          onIssuerSaved={onIssuerSaved}
        />
      )}
    </div>
  )
}

function DocumentBuilder({ kind, workspaceId, clients, projects, apiBase, defaultProjectId, requireProject, onClose, onCreated, onIssuerSaved }: {
  kind: DocKind; workspaceId: string; clients: ClientStub[]; projects: ProjectStub[]
  apiBase: string; defaultProjectId?: string; requireProject?: boolean
  onClose: () => void; onCreated: (doc: DocRow) => void; onIssuerSaved?: () => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const template = getDocTemplate(kind) as DocTemplate
  const [data, setData] = useState<Record<string, any>>({
    date: new Date().toISOString().slice(0, 10),
    positions: [{ description: '', qty: 1, unit_price: 0 }],
  })
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null)
  const [issuerModal, setIssuerModal] = useState(false)
  const [issuerChecked, setIssuerChecked] = useState(false)

  useEffect(() => {
    if (kind !== 'rechnung') return
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/documents/issuer', { credentials: 'include' })
      const j = await res.json().catch(() => ({}))
      if (cancelled) return
      if (j?.issuer) setIssuer(j.issuer as InvoiceIssuer)
      setIssuerChecked(true)
    })()
    return () => { cancelled = true }
  }, [kind])

  async function draftWithTagro(briefText?: string) {
    const text = (briefText ?? brief).trim()
    if (!text || drafting) return
    setBrief(text)
    setDrafting(true)
    setError('')
    try {
      const res = await fetch('/api/documents/draft', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, brief: text }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.data && typeof j.data === 'object') {
        setData(prev => ({ ...prev, ...j.data }))
      } else if (j?.error) {
        setError('Tagro konnte die Felder nicht ausfüllen. Probiere es einzeln über die Tagro-Buttons an den Feldern.')
      }
    } finally { setDrafting(false) }
  }

  const tagroDocTitle = template.title

  const positions: DocPosition[] = Array.isArray(data.positions) ? data.positions : []
  const total = positionsTotal(positions)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const { data: proj } = await (supabase as any)
        .from('projects')
        .select('title,client_id,agency_clients(name,primary_contact_name,primary_contact_email,primary_contact_phone)')
        .eq('id', projectId)
        .maybeSingle()
      if (cancelled || !proj) return
      const client = (proj as any).agency_clients
      setData((prev) => ({
        ...prev,
        recipient_name: prev.recipient_name || client?.primary_contact_name || client?.name || '',
        recipient_contact: prev.recipient_contact || [client?.primary_contact_email, client?.primary_contact_phone].filter(Boolean).join(', '),
        payment_reference: prev.payment_reference || client?.name || (proj as any).title || '',
      }))
      if ((proj as any).client_id) setClientId((proj as any).client_id)
    })()
    return () => { cancelled = true }
  }, [projectId, supabase])

  function set(key: string, val: any) { setData(d => ({ ...d, [key]: val })) }
  function setPos(i: number, key: keyof DocPosition, val: any) {
    setData(d => ({ ...d, positions: positions.map((p, idx) => idx === i ? { ...p, [key]: val } : p) }))
  }
  function addPos() { setData(d => ({ ...d, positions: [...positions, { description: '', qty: 1, unit_price: 0 }] })) }
  function removePos(i: number) {
    if (positions.length <= 1) return
    setData(d => ({ ...d, positions: positions.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setError('')
    if (requireProject && !projectId) { setError('Bitte ein Projekt wählen.'); return }
    const missing = template.fields.find(f => f.required && f.type !== 'positions' && !String(data[f.key] ?? '').trim())
    if (missing) { setError(`Bitte „${missing.label}" ausfüllen.`); return }
    setSaving(true)
    try {
      const payload = { ...data }
      if (kind === 'rechnung' && !String(payload.tax_note ?? '').trim()) delete payload.tax_note
      if (!Array.isArray(payload.positions) || payload.positions.length === 0) {
        payload.positions = [{ description: '', qty: 1, unit_price: 0 }]
      }
      const res = await fetch(apiBase, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, workspace_id: workspaceId, client_id: clientId || null, project_id: projectId || null, data: payload }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.document) {
        const err = String(j?.error || '')
        setError(err === 'unauthenticated'
          ? 'Nicht angemeldet. Bitte Seite neu laden oder erneut anmelden.'
          : (err || 'Konnte Dokument nicht erstellen.'))
        return
      }
      onCreated(j.document as DocRow)
    } finally { setSaving(false) }
  }

  const recipientFields = template.fields.filter((f) => ['recipient_name', 'recipient_address', 'recipient_contact'].includes(f.key))
  const invoiceMetaFields = template.fields.filter((f) => ['date', 'due_terms', 'due_date', 'service_period'].includes(f.key))
  const paymentFields = template.fields.filter((f) => ['payment_reference', 'payment_terms', 'tax_note'].includes(f.key))
  const groupedKeys = new Set([
    'positions',
    ...recipientFields.map((f) => f.key),
    ...invoiceMetaFields.map((f) => f.key),
    ...paymentFields.map((f) => f.key),
  ])
  const otherFields = template.fields.filter((f) => !groupedKeys.has(f.key))

  function renderField(f: (typeof template.fields)[number]) {
    if (f.type === 'date') {
      return (
        <label key={f.key} className="db-field">
          <span>{f.label}{f.required && <i className="db-req"> *</i>}</span>
          <input className="db-input" type="date" value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
        </label>
      )
    }
    return (
      <TagroFieldAssist
        key={f.key}
        label={f.label}
        fieldLabel={f.label}
        documentKind={tagroDocTitle}
        projectId={projectId}
        required={f.required}
        multiline={f.type === 'longtext'}
        placeholder={f.help || '…'}
        value={String(data[f.key] ?? '')}
        onChange={(v) => set(f.key, v)}
      />
    )
  }

  function renderPositions() {
    return (
      <div className="db-positions">
        <div className="db-pos-head"><span>Positionen</span><button type="button" className="db-add" onClick={addPos}><Plus size={12} weight="bold" /> Position</button></div>
        {positions.map((p, i) => (
          <div key={i} className="db-pos-row">
            <TagroFieldAssist
              hideLabel
              className="tfa-pos"
              label="Beschreibung"
              fieldLabel="Positionsbeschreibung"
              documentKind={tagroDocTitle}
              projectId={projectId}
              value={p.description}
              onChange={(v) => setPos(i, 'description', v)}
              placeholder="Beschreibung"
              inputClassName="db-input db-pos-desc"
            />
            <input className="db-input db-pos-qty" type="number" min={0} placeholder="Menge" value={p.qty} onChange={e => setPos(i, 'qty', Number(e.target.value))} />
            <input className="db-input db-pos-price" type="number" min={0} step="0.01" placeholder="€ / Einheit" value={p.unit_price} onChange={e => setPos(i, 'unit_price', Number(e.target.value))} />
            <button type="button" className="db-pos-del" onClick={() => removePos(i)} aria-label="Entfernen">×</button>
          </div>
        ))}
        <div className="db-pos-total">Gesamt: <strong>{eur(total)}</strong></div>
      </div>
    )
  }

  const issuerLine = issuerSummaryLine(issuer)

  return (
    <>
    <Modal open onClose={onClose} size="form" title={`${template.title} erstellen`} subtitle="Fülle die Felder — das gebrandete PDF wird sofort erzeugt."
      footer={<>
        <ModalButton variant="secondary" onClick={onClose}>Abbrechen</ModalButton>
        <ModalButton variant="primary" onClick={save} loading={saving}>Erstellen & PDF öffnen</ModalButton>
      </>}>
      <style>{BUILDER_CSS}</style>

      <div className="db-tagro">
        <p className="db-tagro-lead">Beschreibe das Dokument — Tagro füllt alle Felder. An jedem Feld kannst du Texte einzeln verbessern.</p>
        <TagroPromptComposer
          className="db-tagro-composer"
          showPlus={false}
          showModeSelect={false}
          clearOnSubmit={false}
          placeholder={kind === 'rechnung'
            ? 'z. B. Rechnung an Anna Kipp-Menke, Meilenstein Website, 400 €, fällig mit Vertragsunterzeichnung.'
            : kind === 'angebot'
              ? 'z. B. Angebot an Anna Kipp-Menke: Praxis-Website mit 5 Seiten, 2500 €, gültig 30 Tage.'
              : 'z. B. Dienstleistungsvertrag mit Anna Kipp-Menke über die Erstellung einer Praxis-Website, 2500 € pauschal.'}
          value={brief}
          onChange={setBrief}
          loading={drafting}
          disabled={drafting}
          statusMessage={drafting ? 'Tagro füllt die Felder…' : ''}
          onSubmit={(text) => draftWithTagro(text)}
        />
      </div>

      {kind === 'rechnung' && issuerChecked && (
        <div className="db-issuer">
          <div className="db-issuer-copy">
            <p className="db-issuer-title">{issuer?.name?.trim() || 'Rechnungssteller'}</p>
            <p className="db-issuer-sub">
              {issuerLine || issuerAddressBlock(issuer || {}) || 'Einmalig hinterlegen — erscheint auf jeder Rechnung.'}
            </p>
            {issuer && !isIssuerReady(issuer) && (
              <p className="db-issuer-note">Adresse und Bank kannst du jederzeit ergänzen.</p>
            )}
          </div>
          <button type="button" className="db-issuer-btn" onClick={() => setIssuerModal(true)}>
            <PencilSimple size={14} weight="regular" />
            Bearbeiten
          </button>
        </div>
      )}

      <div className="db-grid">
        <label className="db-field"><span>Kunde (optional)</span>
          <select className="db-input" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Kein Kunde —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="db-field"><span>Projekt{requireProject ? <i className="db-req"> *</i> : ' (optional)'}</span>
          <select className="db-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">{requireProject ? '— Projekt wählen —' : '— Kein Projekt —'}</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
      </div>

      {kind === 'rechnung' ? (
        <>
          {recipientFields.length > 0 && (
            <section className="db-section">
              <h3 className="db-section-title">Empfänger</h3>
              {recipientFields.map(renderField)}
            </section>
          )}
          {invoiceMetaFields.length > 0 && (
            <section className="db-section">
              <h3 className="db-section-title">Rechnung</h3>
              <div className="db-section-grid">{invoiceMetaFields.map(renderField)}</div>
            </section>
          )}
          <section className="db-section">
            <h3 className="db-section-title">Leistungen</h3>
            {renderPositions()}
          </section>
          {paymentFields.length > 0 && (
            <section className="db-section">
              <h3 className="db-section-title">Zahlung</h3>
              {paymentFields.map(renderField)}
            </section>
          )}
        </>
      ) : (
        template.fields.map(f => {
          if (f.type === 'positions') return <div key={f.key}>{renderPositions()}</div>
          return renderField(f)
        })
      )}

      {otherFields.length > 0 && otherFields.map(renderField)}

      {error && <p className="db-error">{error}</p>}
    </Modal>

    {kind === 'rechnung' && (
      <InvoiceIssuerModal
        open={issuerModal}
        onClose={() => setIssuerModal(false)}
        variant="settings"
        onSaved={(next) => {
          setIssuer(next)
          onIssuerSaved?.()
        }}
      />
    )}
    </>
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

  .db-tagro { margin:0 0 16px; padding:0 0 14px; border-bottom:1px solid var(--fp-divider, var(--border)); }
  .db-tagro-lead { margin:0 0 10px; font-size:13px; line-height:1.45; color:var(--fp-muted, var(--text-muted)); }
  .db-tagro-composer .tagro-composer-bar {
    border-radius: 20px;
    background: var(--fp-pill, var(--surface-2));
    border: 1px solid var(--fp-divider, var(--border));
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
  .db-tagro-composer .tagro-composer-input {
    font-size: 14px;
    font-weight: 500;
    height: auto;
    min-height: 28px;
    max-height: 120px;
  }
  .db-tagro-composer .tagro-composer-send {
    width: 34px;
    height: 34px;
  }
  .db-tagro-composer .tagro-composer-status {
    margin: 8px 4px 0;
    font-size: 12px;
  }

  .db-issuer {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 16px;
    padding: 14px 16px;
    border-radius: 12px;
    background: #f5f5f7;
    color: #1d1d1f;
  }
  html[data-theme="dark"] .db-issuer,
  html[data-theme="classic-dark"] .db-issuer {
    background: rgba(255,255,255,0.06);
    color: var(--fp-text, #f5f5f7);
  }
  .db-issuer-copy { min-width: 0; flex: 1; }
  .db-issuer-title { margin: 0 0 3px; font-size: 14.5px; font-weight: 500; }
  .db-issuer-sub { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--fp-soft, #6e6e73); }
  .db-issuer-note { margin: 6px 0 0; font-size: 12px; color: var(--fp-muted, #86868b); }
  .db-issuer-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    height: 32px;
    padding: 0 14px;
    border: 0;
    border-radius: 32px;
    background: rgba(0,0,0,0.06);
    color: inherit;
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
  }
  html[data-theme="dark"] .db-issuer-btn,
  html[data-theme="classic-dark"] .db-issuer-btn { background: rgba(255,255,255,0.1); }
  .db-issuer-btn:hover { background: rgba(0,0,0,0.1); }

  .db-section { margin: 0 0 14px; }
  .db-section-title {
    margin: 0 0 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--fp-text, var(--text));
  }
  .db-section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
  @media (max-width: 560px) { .db-section-grid { grid-template-columns: 1fr; } }

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
  .db-pos-row { display:grid; grid-template-columns:1fr 64px 96px 24px; gap:12px; margin-bottom:4px; align-items:end; }
  .db-pos-row .tfa-pos { position: relative; }
  .db-pos-del { width:24px; height:32px; border:0; background:transparent; color:var(--fp-muted, var(--text-muted)); font-size:18px; cursor:pointer; }
  .db-pos-del:hover { color:var(--fp-text, var(--text)); }
  .db-pos-total { text-align:right; font-size:13px; color:var(--fp-soft, var(--text-secondary)); margin-top:6px; }
  .db-error { margin:6px 0 0; font-size:12.5px; color:#c0362e; }
  @media (max-width:560px) { .db-grid { grid-template-columns:1fr; gap:0; } .db-pos-row { grid-template-columns:1fr 52px 78px 22px; gap:8px; } }
`
