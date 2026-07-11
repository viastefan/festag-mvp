'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Eye,
  FloppyDisk,
  Handshake,
  PaperPlaneTilt,
  PenNib,
  Plus,
  Receipt,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import InvoiceIssuerModal from '@/components/documents/InvoiceIssuerModal'
import InvoiceWysiwygEditor from '@/components/documents/InvoiceWysiwygEditor'
import DocumentSendModal from '@/components/documents/DocumentSendModal'
import TagroFieldAssist from '@/components/tagro/TagroFieldAssist'
import Modal from '@/components/Modal'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'
import { STATUS_LABEL, printAgencyDocument } from '@/components/documents/documents-shared'
import { fetchDocument, patchDocument } from '@/lib/documents/document-api'
import { issuerAddressBlock, EMPTY_ISSUER, type InvoiceIssuer } from '@/lib/documents/issuer'
import {
  eur,
  getDocTemplate,
  positionsTotal,
  renderDocumentHtml,
  type DocKind,
  type DocPosition,
  type DocTemplate,
} from '@/lib/documents/templates'

type AgencyDoc = {
  id: string
  kind: DocKind
  number_label: string
  title: string
  status: string
  workspace_id: string
  client_id?: string | null
  project_id?: string | null
  data?: Record<string, unknown>
  brand_snapshot?: Record<string, unknown>
  total_cents?: number | null
}

type ClientStub = {
  id: string
  name: string
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
}
type ProjectStub = { id: string; title: string; client_id?: string | null }

const KIND_TITLE: Record<DocKind, string> = {
  rechnung: 'Rechnung',
  angebot: 'Angebot',
  vertrag: 'Vertrag',
}

export default function DocumentEditor({ documentId }: { documentId: string }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<AgencyDoc | null>(null)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [clients, setClients] = useState<ClientStub[]>([])
  const [projects, setProjects] = useState<ProjectStub[]>([])
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null)
  const [issuerOpen, setIssuerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const dataRef = useRef(data)
  const clientIdRef = useRef(clientId)
  const projectIdRef = useRef(projectId)
  dataRef.current = data
  clientIdRef.current = clientId
  projectIdRef.current = projectId

  const template = doc ? getDocTemplate(doc.kind) as DocTemplate : null
  const positions: DocPosition[] = Array.isArray(data.positions) ? data.positions as DocPosition[] : []
  const total = positionsTotal(positions)
  const locked = doc?.status === 'sent' || doc?.status === 'paid'
  const isNewDraft = doc?.status === 'draft'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { res, json: j } = await fetchDocument(documentId)
      if (!res.ok || !j?.document) {
        setError(j?.error || 'Dokument nicht gefunden.')
        return
      }
      const row = j.document as AgencyDoc
      setDoc(row)
      setData(row.data || {})
      setClientId(row.client_id || '')
      setProjectId(row.project_id || '')
      if (j.issuer) setIssuer(j.issuer as InvoiceIssuer)
      if (Array.isArray(j.clients)) setClients(j.clients as ClientStub[])
      if (Array.isArray(j.projects)) setProjects(j.projects as ProjectStub[])
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const { data: proj } = await supabase
        .from('projects')
        .select('title,client_id,agency_clients(name,primary_contact_name,primary_contact_email,primary_contact_phone)')
        .eq('id', projectId)
        .maybeSingle()
      if (cancelled || !proj) return
      const client = (proj as any).agency_clients
      setData((prev) => ({
        ...prev,
        recipient_name: prev.recipient_name || client?.primary_contact_name || client?.name || '',
        recipient_email: prev.recipient_email || client?.primary_contact_email || '',
        recipient_contact: prev.recipient_contact || [client?.primary_contact_email, client?.primary_contact_phone].filter(Boolean).join(', '),
        payment_reference: prev.payment_reference || client?.name || (proj as any).title || '',
      }))
      if ((proj as any).client_id) setClientId((proj as any).client_id)
    })()
    return () => { cancelled = true }
  }, [projectId, supabase])

  function setField(key: string, val: unknown) {
    setData((d) => ({ ...d, [key]: val }))
  }

  function setPos(i: number, key: keyof DocPosition, val: unknown) {
    setData((d) => {
      const list = Array.isArray(d.positions) ? (d.positions as DocPosition[]) : []
      return {
        ...d,
        positions: list.map((p, idx) => (idx === i ? { ...p, [key]: val } : p)),
      }
    })
  }

  function addPos() {
    setData((d) => {
      const list = Array.isArray(d.positions) ? (d.positions as DocPosition[]) : []
      return {
        ...d,
        positions: [...list, { description: '', qty: 1, unit_price: 0 }],
      }
    })
  }

  function removePos(i: number) {
    setData((d) => {
      const list = Array.isArray(d.positions) ? (d.positions as DocPosition[]) : []
      if (list.length <= 1) return d
      return { ...d, positions: list.filter((_, idx) => idx !== i) }
    })
  }

  function documentTitleFromData(kind: DocKind, payload: Record<string, unknown>, fallback: string) {
    if (kind === 'rechnung') {
      const title = String(payload.service_period ?? '').trim()
      if (title) return title
    }
    if (kind === 'vertrag') {
      const title = String(payload.scope ?? payload.title ?? payload.subject ?? '').trim()
      if (title) return title.slice(0, 80)
    }
    if (kind === 'angebot') {
      const intro = String(payload.intro ?? payload.title ?? payload.subject ?? '').trim()
      if (intro) return intro.replace(/\s+/g, ' ').slice(0, 80)
      const positions = Array.isArray(payload.positions) ? payload.positions as DocPosition[] : []
      const first = String(positions[0]?.description ?? '').trim()
      if (first) return first.slice(0, 80)
    }
    return fallback
  }

  async function persist(
    patch: Record<string, unknown> = {},
    opts: { content?: boolean } = {},
  ) {
    setSaving(true)
    setError('')
    setSavedFlash(false)
    try {
      const includeContent = opts.content !== false && !locked
      const latestData = dataRef.current
      const latestClientId = clientIdRef.current
      const latestProjectId = projectIdRef.current
      const body = includeContent
        ? {
            data: latestData,
            client_id: latestClientId || null,
            project_id: latestProjectId || null,
            title: doc
              ? documentTitleFromData(doc.kind, latestData, doc.title || KIND_TITLE[doc.kind])
              : undefined,
            ...patch,
          }
        : { ...patch }
      const { res, json: j } = await patchDocument(documentId, body)
      if (!res.ok || !j?.document) {
        setError(j?.error || 'Speichern fehlgeschlagen.')
        return null
      }
      const next = j.document as AgencyDoc
      setDoc(next)
      // Keep the editor's local payload if the API returns empty/partial data.
      if (next.data && typeof next.data === 'object' && Object.keys(next.data).length > 0) {
        setData((prev) => ({ ...prev, ...next.data }))
      }
      if (includeContent) {
        setSavedFlash(true)
        window.setTimeout(() => setSavedFlash(false), 2200)
      }
      return next
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    const saved = await persist({ status: 'draft' })
    if (!saved) return
  }

  async function saveAndClose() {
    if (locked) {
      router.push('/documents')
      return
    }
    const status = doc?.status === 'draft' ? 'final' : doc?.status
    const saved = await persist({ status })
    if (saved) router.push('/documents')
  }

  async function finalize() {
    const saved = await persist({ status: doc?.status === 'draft' ? 'final' : (doc?.status || 'final') })
    if (saved) setSendOpen(true)
  }

  async function sendDocument(opts: { projectId: string; recipientEmail: string }) {
    const nextProjectId = opts.projectId || projectIdRef.current
    if (!nextProjectId) {
      setError('Bitte zuerst ein Projekt zuordnen.')
      return
    }
    if (opts.recipientEmail.trim()) {
      setData((prev) => ({ ...prev, recipient_email: opts.recipientEmail.trim() }))
      dataRef.current = { ...dataRef.current, recipient_email: opts.recipientEmail.trim() }
    }
    setProjectId(nextProjectId)
    projectIdRef.current = nextProjectId
    const saved = await persist({
      status: 'sent',
      project_id: nextProjectId,
    })
    if (saved) {
      setSendOpen(false)
      router.push('/documents')
    }
  }

  async function markPaid() {
    const saved = await persist({ status: 'paid' }, { content: false })
    if (saved) router.push('/documents')
  }

  async function markSigned() {
    setSaving(true)
    try {
      const { res, json: j } = await patchDocument(documentId, { mark_signed: true })
      if (res.ok && j?.document) router.push('/documents')
      else setError(j?.error || 'Konnte nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  async function markAccepted() {
    setSaving(true)
    try {
      const { res, json: j } = await patchDocument(documentId, { mark_accepted: true })
      if (res.ok && j?.document) router.push('/documents')
      else setError(j?.error || 'Konnte nicht speichern.')
    } finally {
      setSaving(false)
    }
  }

  function liveBrand() {
    if (issuer?.name?.trim()) {
      return {
        name: issuer.name.trim(),
        color: String(doc?.brand_snapshot?.color || '#111111'),
        address: issuerAddressBlock(issuer) || null,
        email: issuer.email || null,
        phone: issuer.phone || null,
        vat_id: issuer.vatId || issuer.taxNumber || null,
        iban: issuer.iban || null,
        bic: issuer.bic || null,
        bank_name: issuer.bankName || null,
        footer: issuer.bankName || null,
        initials: issuer.name.trim().slice(0, 2).toUpperCase(),
      }
    }
    return (doc?.brand_snapshot as any) || { name: 'Rechnungssteller', color: '#111111' }
  }

  function openPreview() {
    if (!doc) return
    const html = renderDocumentHtml({
      kind: doc.kind,
      numberLabel: doc.number_label,
      data: dataRef.current,
      brand: liveBrand(),
    })
    const withFonts = html.replace(/url\('\/fonts\//g, `url('${window.location.origin}/fonts/`)
    setPreviewHtml(withFonts)
    setPreviewOpen(true)
  }

  function openPdf() {
    if (!doc) return
    printAgencyDocument({
      kind: doc.kind,
      number_label: doc.number_label,
      data: dataRef.current,
      brand_snapshot: liveBrand(),
    })
  }

  function onClientChange(id: string) {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (!client) return
    setData((prev) => ({
      ...prev,
      recipient_name: client.primary_contact_name || client.name,
      recipient_email: client.primary_contact_email || String(prev.recipient_email || ''),
      recipient_contact: [client.primary_contact_email, client.primary_contact_phone].filter(Boolean).join(', '),
    }))
  }

  if (loading) {
    return (
      <div className="doc-ed doc-ed--loading">
        <style>{DOCUMENT_EDITOR_CSS}</style>
        <header className="doc-ed-top">
          <div className="doc-ed-top-left">
            <div className="doc-ed-skel doc-ed-skel-back" />
            <div className="doc-ed-skel doc-ed-skel-title" />
          </div>
        </header>
        <div className="doc-ed-body doc-ed-body--loading">
          <div className="doc-ed-skel doc-ed-skel-sheet" />
        </div>
      </div>
    )
  }

  if (!doc || !template) {
    return (
      <div className="doc-ed">
        <style>{DOCUMENT_EDITOR_CSS}</style>
        <div className="doc-ed-body">
          <p className="doc-ed-error">{error || 'Dokument nicht gefunden.'}</p>
          <button type="button" className="doc-ed-btn" onClick={() => router.push('/documents')}>Zurück</button>
        </div>
      </div>
    )
  }

  const isInvoiceWysiwyg = doc.kind === 'rechnung'
  const pageTitle = isNewDraft ? `Neue ${KIND_TITLE[doc.kind]}.` : `${KIND_TITLE[doc.kind]} ${doc.number_label}`
  const pageLead = locked
    ? 'Dieses Dokument ist gesperrt und kann nicht mehr bearbeitet werden.'
    : isInvoiceWysiwyg
      ? 'Direkt im Dokument bearbeiten — Speichern hält Empfänger, Positionen und Konditionen fest.'
      : doc.kind === 'vertrag'
        ? 'Parteien und Konditionen ausfüllen, speichern, als PDF prüfen und zur Unterschrift senden.'
        : 'Absender kommt aus deinem Account. Empfänger und Positionen kannst du pro Angebot anpassen.'

  const issuerPartyLabel = doc.kind === 'angebot' ? 'Absender' : doc.kind === 'vertrag' ? 'Auftragnehmer' : 'Rechnungssteller'
  const issuerHint =
    doc.kind === 'angebot'
      ? 'Absender-Daten kommen aus deinem Account. Empfänger und Positionen kannst du pro Angebot anpassen.'
      : doc.kind === 'vertrag'
        ? 'Auftragnehmer-Daten kommen aus deinem Account. Parteien und Leistungsumfang trägst du hier ein.'
        : 'Rechnungssteller-Daten kommen aus deinem Account. Empfänger und Positionen kannst du pro Dokument anpassen.'

  const statusChip = (() => {
    if (doc.kind === 'vertrag' && data.signed_at) return STATUS_LABEL.signed
    if (doc.kind === 'angebot' && data.accepted_at) return STATUS_LABEL.accepted
    return STATUS_LABEL[doc.status] || doc.status
  })()

  const primaryAction = (() => {
    if (doc.kind === 'rechnung' && doc.status === 'sent') {
      return { label: 'Zahlung erfassen', icon: Receipt, onClick: markPaid }
    }
    if (doc.kind === 'vertrag' && doc.status === 'sent' && !data.signed_at) {
      return { label: 'Als unterschrieben markieren', icon: PenNib, onClick: markSigned }
    }
    if (doc.kind === 'angebot' && doc.status === 'sent' && !data.accepted_at) {
      return { label: 'Als angenommen markieren', icon: Handshake, onClick: markAccepted }
    }
    if (doc.status === 'final') {
      return {
        label: 'Senden',
        icon: PaperPlaneTilt,
        onClick: async () => {
          const saved = await persist({ status: 'final' })
          if (saved) setSendOpen(true)
        },
      }
    }
    if (doc.status === 'draft') {
      return { label: 'Fertigstellen & senden', icon: PaperPlaneTilt, onClick: finalize }
    }
    return null
  })()

  const issuerLines = [
    issuerAddressBlock(issuer || EMPTY_ISSUER),
    [issuer?.email, issuer?.phone].filter(Boolean).join(', '),
    issuer?.vatId ? `Steuernummer (USt-IdNr.): ${issuer.vatId}` : '',
  ].filter(Boolean).join('\n')

  const recipientFields = template.fields.filter((f) =>
    ['recipient_name', 'recipient_address', 'recipient_email', 'recipient_contact'].includes(f.key))
  const metaFields = template.fields.filter((f) =>
    ['date', 'due_terms', 'due_date', 'service_period', 'valid_until'].includes(f.key))
  const paymentFields = template.fields.filter((f) =>
    ['payment_reference', 'payment_terms', 'tax_note'].includes(f.key))
  const reservedKeys = new Set([
    'positions',
    ...recipientFields.map((f) => f.key),
    ...metaFields.map((f) => f.key),
    ...paymentFields.map((f) => f.key),
  ])
  const bodyFields = template.fields.filter((f) => !reservedKeys.has(f.key))

  const brandName = String(doc.brand_snapshot?.name || 'Festag')

  return (
    <div className={`doc-ed dec-os${isInvoiceWysiwyg ? ' doc-ed--wysiwyg' : ''}`}>
      <style>{DOCUMENT_EDITOR_CSS}</style>

      <header className="doc-ed-top dec-page-head">
        <div className="doc-ed-top-left dec-page-head-copy">
          <button type="button" className="doc-ed-back" aria-label="Zurück" onClick={() => router.push('/documents')}>
            <ArrowLeft size={16} weight="regular" />
          </button>
          <div className="doc-ed-title-wrap">
            <h1 className="doc-ed-title dec-page-title festag-page-title">
              <span className="dec-dt">{pageTitle}</span>
            </h1>
            <p className="doc-ed-sub dec-page-lead-line festag-page-lead-line">{pageLead}</p>
            <div className="doc-ed-meta-chips">
              <span className="doc-ed-status">{statusChip}</span>
              <span className="doc-ed-status doc-ed-status--quiet">{doc.number_label}</span>
              {saving ? <span className="doc-ed-saving">Speichert…</span> : null}
              {!saving && savedFlash ? <span className="doc-ed-saving doc-ed-saved">Gespeichert</span> : null}
            </div>
          </div>
        </div>
        <div className="doc-ed-top-actions doc-ed-top-actions--dt dec-page-actions">
          <button type="button" className="dec-head-tool" onClick={openPreview} disabled={saving} aria-label="Vorschau" title="Vorschau">
            <Eye size={15} weight="regular" />
          </button>
          {!locked && (
            <button type="button" className="dec-head-tool" onClick={() => { void saveDraft() }} disabled={saving} aria-label="Speichern" title="Speichern">
              <FloppyDisk size={15} weight="regular" />
            </button>
          )}
          <button type="button" className="doc-ed-btn doc-ed-btn-quiet" onClick={() => { void saveAndClose() }} disabled={saving}>
            {locked ? 'Schließen' : 'Speichern & schließen'}
          </button>
          {primaryAction && (
            <button type="button" className="doc-ed-btn primary" onClick={() => { void primaryAction.onClick() }} disabled={saving}>
              <primaryAction.icon size={15} weight="regular" />
              {primaryAction.label}
            </button>
          )}
        </div>
        <div className="doc-ed-top-actions doc-ed-top-actions--m">
          <CodexMobileActionPill
            onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            onMenu={() => setNavOpen(true)}
          />
        </div>
      </header>

      <div className="doc-ed-body">
        {!isInvoiceWysiwyg && (
          <p className="doc-ed-hint">
            {issuerHint}
          </p>
        )}

        {isInvoiceWysiwyg ? (
          <InvoiceWysiwygEditor
            numberLabel={doc.number_label}
            data={data}
            positions={positions}
            total={total}
            locked={locked}
            issuer={issuer}
            brandName={brandName}
            clients={clients}
            projects={projects}
            clientId={clientId}
            projectId={projectId}
            onClientChange={onClientChange}
            onProjectChange={setProjectId}
            onField={setField}
            onPos={setPos}
            onAddPos={addPos}
            onRemovePos={removePos}
            onEditIssuer={() => setIssuerOpen(true)}
          />
        ) : (
        <div className="doc-ed-sheet">
          <div className="doc-ed-sheet-inner">
            <div className="doc-ed-head-grid">
              {(doc.kind === 'rechnung' || doc.kind === 'angebot' || doc.kind === 'vertrag') && (
                <div className="doc-ed-issuer">
                  <p className="doc-ed-issuer-label">{issuerPartyLabel}</p>
                  <p className="doc-ed-issuer-name">{issuer?.name?.trim() || String(doc.brand_snapshot?.name || issuerPartyLabel)}</p>
                  <p className="doc-ed-issuer-lines">{issuerLines || 'Noch keine Angaben hinterlegt.'}</p>
                  <button type="button" className="doc-ed-issuer-edit" onClick={() => setIssuerOpen(true)}>
                    {issuerPartyLabel} bearbeiten
                  </button>
                </div>
              )}

              <div className="doc-ed-meta">
                <div className="doc-ed-meta-row">
                  <span className="doc-ed-meta-label">Nummer</span>
                  <span className="doc-ed-meta-value">{doc.number_label}</span>
                </div>
                {metaFields.map((f) => (
                  f.type === 'date' ? (
                    <label key={f.key} className="doc-ed-meta-row">
                      <span className="doc-ed-meta-label">{f.label}</span>
                      <input
                        className="doc-ed-input"
                        type="date"
                        disabled={locked}
                        value={String(data[f.key] ?? '')}
                        onChange={(e) => setField(f.key, e.target.value)}
                      />
                    </label>
                  ) : (
                    <label key={f.key} className="doc-ed-meta-row">
                      <span className="doc-ed-meta-label">{f.label}</span>
                      <input
                        className="doc-ed-input"
                        disabled={locked}
                        value={String(data[f.key] ?? '')}
                        onChange={(e) => setField(f.key, e.target.value)}
                        placeholder={f.help || '…'}
                      />
                    </label>
                  )
                ))}
              </div>
            </div>

            <section className="doc-ed-section">
              <h2 className="doc-ed-section-title">Kunde</h2>
              <div className="doc-ed-grid-2">
                <label className="doc-ed-field">
                  <span>Kunde</span>
                  <select className="doc-ed-input" disabled={locked} value={clientId} onChange={(e) => onClientChange(e.target.value)}>
                    <option value="">— Kunde wählen —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="doc-ed-field">
                  <span>Projekt</span>
                  <select className="doc-ed-input" disabled={locked} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">— Projekt wählen —</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="doc-ed-grid-2" style={{ marginTop: 12 }}>
                {recipientFields.map((f) => (
                  <TagroFieldAssist
                    key={f.key}
                    label={f.label}
                    fieldLabel={f.label}
                    documentKind={template.title}
                    projectId={projectId}
                    multiline={f.type === 'longtext'}
                    placeholder={f.help || '…'}
                    value={String(data[f.key] ?? '')}
                    onChange={(v) => setField(f.key, v)}
                    inputClassName="doc-ed-input"
                  />
                ))}
              </div>
            </section>

            {template.hasTotal && (
              <section className="doc-ed-section">
                <div className="doc-ed-pos-head">
                  <h2 className="doc-ed-section-title" style={{ margin: 0 }}>Positionen</h2>
                  {!locked && (
                    <button type="button" className="doc-ed-btn" onClick={addPos}>
                      <Plus size={13} weight="bold" />
                      Position
                    </button>
                  )}
                </div>
                <table className="doc-ed-pos-table">
                  <thead>
                    <tr>
                      <th>Beschreibung</th>
                      <th className="num">Menge</th>
                      <th className="price">Preis</th>
                      <th className="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p, i) => (
                      <tr key={i}>
                        <td>
                          <TagroFieldAssist
                            hideLabel
                            label="Beschreibung"
                            fieldLabel="Positionsbeschreibung"
                            documentKind={template.title}
                            projectId={projectId}
                            value={p.description}
                            onChange={(v) => setPos(i, 'description', v)}
                            placeholder="Leistung beschreiben"
                            inputClassName="doc-ed-input"
                          />
                        </td>
                        <td className="num">
                          <input className="doc-ed-input" type="number" min={0} disabled={locked} value={p.qty} onChange={(e) => setPos(i, 'qty', Number(e.target.value))} />
                        </td>
                        <td className="price">
                          <input className="doc-ed-input" type="number" min={0} step="0.01" disabled={locked} value={p.unit_price} onChange={(e) => setPos(i, 'unit_price', Number(e.target.value))} />
                        </td>
                        <td className="actions">
                          {!locked && positions.length > 1 && (
                            <button type="button" className="doc-ed-pos-del" onClick={() => removePos(i)} aria-label="Entfernen">×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="doc-ed-pos-total">
                  <span>Gesamtbetrag</span>
                  <strong>{eur(total)}</strong>
                </div>
              </section>
            )}

            {paymentFields.length > 0 && (
              <section className="doc-ed-section">
                <h2 className="doc-ed-section-title">Zahlung</h2>
                <div className="doc-ed-grid-2">
                  {paymentFields.map((f) => (
                    <TagroFieldAssist
                      key={f.key}
                      label={f.label}
                      fieldLabel={f.label}
                      documentKind={template.title}
                      projectId={projectId}
                      multiline={f.type === 'longtext'}
                      placeholder={f.help || '…'}
                      value={String(data[f.key] ?? '')}
                      onChange={(v) => setField(f.key, v)}
                      inputClassName="doc-ed-input"
                    />
                  ))}
                </div>
              </section>
            )}

            {bodyFields.map((f) => (
              <section key={f.key} className="doc-ed-section">
                <TagroFieldAssist
                  label={f.label}
                  fieldLabel={f.label}
                  documentKind={template.title}
                  projectId={projectId}
                  required={f.required}
                  multiline={f.type === 'longtext'}
                  placeholder={f.help || '…'}
                  value={String(data[f.key] ?? '')}
                  onChange={(v) => setField(f.key, v)}
                  inputClassName={`doc-ed-input${f.type === 'longtext' ? ' doc-ed-area' : ''}`}
                />
              </section>
            ))}

            {error && <p className="doc-ed-error">{error}</p>}
          </div>
        </div>
        )}

        {isInvoiceWysiwyg && error && <p className="doc-ed-error">{error}</p>}
      </div>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />
      <MobilePageDock
        onDragUp={openPreview}
        primary={{
          id: 'save',
          label: locked ? 'Schließen' : 'Speichern',
          icon: <FloppyDisk size={16} weight="regular" />,
          ariaLabel: locked ? 'Schließen' : 'Speichern',
          disabled: saving,
          onClick: () => { void (locked ? saveAndClose() : saveDraft()) },
        }}
        secondary={{
          id: 'primary',
          label: primaryAction?.label || 'Vorschau',
          icon: primaryAction ? <primaryAction.icon size={16} weight="regular" /> : <Eye size={16} weight="regular" />,
          ariaLabel: primaryAction?.label || 'Vorschau',
          disabled: saving,
          onClick: () => {
            if (primaryAction) void primaryAction.onClick()
            else openPreview()
          },
        }}
      />

      <InvoiceIssuerModal
        open={issuerOpen}
        onClose={() => setIssuerOpen(false)}
        title={issuerPartyLabel}
        subtitle={
          doc.kind === 'angebot'
            ? 'Diese Angaben erscheinen als Absender auf deinen Angeboten.'
            : doc.kind === 'vertrag'
              ? 'Diese Angaben erscheinen als Auftragnehmer auf deinen Verträgen.'
              : undefined
        }
        onSaved={(next) => {
          setIssuer(next)
        }}
      />

      <DocumentSendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        recipientName={String(data.recipient_name || '')}
        recipientEmail={String(data.recipient_email || '')}
        documentLabel={`${KIND_TITLE[doc.kind]} ${doc.number_label}`}
        projectId={projectId}
        projects={projects}
        sending={saving}
        error={error}
        onSend={sendDocument}
      />

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} size="xl" title="Vorschau" noPadding
        footer={(
          <>
            <button type="button" className="doc-ed-btn" onClick={() => setPreviewOpen(false)}>Schließen</button>
            <button type="button" className="doc-ed-btn primary" onClick={openPdf}>PDF drucken</button>
          </>
        )}>
        <iframe className="doc-ed-preview-frame" title="Dokumentvorschau" srcDoc={previewHtml} />
      </Modal>
    </div>
  )
}
