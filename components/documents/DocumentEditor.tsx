'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CaretLeft,
  Eye,
  FloppyDisk,
  Handshake,
  Moon,
  PaperPlaneTilt,
  PenNib,
  Plus,
  Receipt,
  Sun,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import InvoiceIssuerModal from '@/components/documents/InvoiceIssuerModal'
import InvoiceWysiwygEditor from '@/components/documents/InvoiceWysiwygEditor'
import DocumentSendModal from '@/components/documents/DocumentSendModal'
import TagroFieldAssist from '@/components/tagro/TagroFieldAssist'
import DocumentTagroComposeBar from '@/components/documents/DocumentTagroComposeBar'
import Modal from '@/components/Modal'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import CodexMobileActionPill from '@/components/mobile/CodexMobileActionPill'
import { DOCUMENT_EDITOR_CSS } from '@/components/documents/document-editor-styles'
import { printAgencyDocument } from '@/components/documents/documents-shared'
import { fetchDocument, patchDocument } from '@/lib/documents/document-api'
import { issuerAddressBlock, issuerDisplayName, issuerLegalLines, EMPTY_ISSUER, type InvoiceIssuer } from '@/lib/documents/issuer'
import { patchIssuer } from '@/lib/documents/issuer-api'
import {
  eur,
  getDocTemplate,
  positionsTotal,
  renderDocumentHtml,
  type DocKind,
  type DocPosition,
  type DocTemplate,
} from '@/lib/documents/templates'
import { resolveSheetTheme, sheetThemeClass } from '@/lib/documents/sheet-theme'

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
  const [tagroFilledFields, setTagroFilledFields] = useState<Set<string>>(() => new Set())
  const [numberDraft, setNumberDraft] = useState('')
  const [appTheme, setAppTheme] = useState<string | null>(null)

  const editorRootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const tagroFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const issuerSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dataRef = useRef(data)
  const clientIdRef = useRef(clientId)
  const projectIdRef = useRef(projectId)
  dataRef.current = data
  clientIdRef.current = clientId
  projectIdRef.current = projectId

  useEffect(() => {
    const root = document.documentElement
    const read = () => setAppTheme(root.getAttribute('data-theme'))
    read()
    const obs = new MutationObserver(read)
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (doc?.number_label) setNumberDraft(doc.number_label)
  }, [doc?.number_label])

  const template = doc ? getDocTemplate(doc.kind) as DocTemplate : null
  const positions: DocPosition[] = Array.isArray(data.positions) ? data.positions as DocPosition[] : []
  const total = positionsTotal(positions)
  const locked = doc?.status === 'sent' || doc?.status === 'paid'

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
    const root = editorRootRef.current
    if (!root) return

    const mq = window.matchMedia('(max-width: 768px)')
    let raf = 0
    let faded = false

    const syncFade = () => {
      raf = 0
      const scroller = mq.matches ? shellRef.current : scrollBodyRef.current
      if (!scroller) return
      const next = scroller.scrollTop > 8
      if (next === faded) return
      faded = next
      root.dataset.docScrollFaded = next ? 'true' : 'false'
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(syncFade)
    }

    let activeScroller: HTMLElement | null = null
    const bindScroller = () => {
      if (activeScroller) activeScroller.removeEventListener('scroll', onScroll)
      activeScroller = mq.matches ? shellRef.current : scrollBodyRef.current
      activeScroller?.addEventListener('scroll', onScroll, { passive: true })
      syncFade()
    }

    bindScroller()
    mq.addEventListener('change', bindScroller)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      if (activeScroller) activeScroller.removeEventListener('scroll', onScroll)
      mq.removeEventListener('change', bindScroller)
      delete root.dataset.docScrollFaded
    }
  }, [loading, doc?.id])

  useEffect(() => () => {
    if (tagroFlashRef.current) clearTimeout(tagroFlashRef.current)
    if (issuerSaveRef.current) clearTimeout(issuerSaveRef.current)
  }, [])

  const scheduleIssuerSave = useCallback((next: InvoiceIssuer) => {
    if (issuerSaveRef.current) clearTimeout(issuerSaveRef.current)
    issuerSaveRef.current = setTimeout(() => {
      void patchIssuer(next).then(({ res }) => {
        if (!res.ok) setError('Rechnungssteller konnte nicht gespeichert werden.')
      })
    }, 650)
  }, [])

  const setIssuerField = useCallback((key: keyof InvoiceIssuer, val: string) => {
    setIssuer((prev) => {
      const next = { ...(prev || EMPTY_ISSUER), [key]: val }
      scheduleIssuerSave(next)
      return next
    })
  }, [scheduleIssuerSave])

  const applyTagroDraft = useCallback(async (filled: Record<string, unknown>, filledKeys: string[]) => {
    setData((current) => {
      const next = { ...current, ...filled }
      if (Array.isArray(filled.positions)) {
        next.positions = filled.positions
      }
      return next
    })
    setTagroFilledFields(new Set(filledKeys))
    if (tagroFlashRef.current) clearTimeout(tagroFlashRef.current)
    tagroFlashRef.current = setTimeout(() => setTagroFilledFields(new Set()), 5200)
  }, [])

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

  async function commitNumberLabel() {
    if (!doc || locked) return
    const trimmed = numberDraft.trim()
    if (!trimmed || trimmed === doc.number_label) return
    setSaving(true)
    setError('')
    try {
      const { res, json: j } = await patchDocument(documentId, { number_label: trimmed })
      if (!res.ok || !j?.document) {
        setError(j?.error || 'Nummer konnte nicht gespeichert werden.')
        setNumberDraft(doc.number_label)
        return
      }
      setDoc(j.document as AgencyDoc)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2200)
    } finally {
      setSaving(false)
    }
  }

  async function toggleSheetTheme() {
    if (!doc || locked) return
    const current = resolveSheetTheme(data.sheet_theme, appTheme)
    const nextTheme = current === 'light' ? 'dark' : 'light'
    const merged = { ...dataRef.current, sheet_theme: nextTheme }
    setData(merged)
    dataRef.current = merged
    await persist({ status: doc.status === 'draft' ? 'draft' : doc.status })
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
      const displayName = issuerDisplayName(issuer)
      return {
        name: displayName,
        color: String(doc?.brand_snapshot?.color || '#111111'),
        address: issuerAddressBlock(issuer) || null,
        email: issuer.email || null,
        phone: issuer.phone || null,
        vat_id: issuer.vatId || null,
        tax_number: issuer.taxNumber || null,
        iban: issuer.iban || null,
        bic: issuer.bic || null,
        bank_name: issuer.bankName || null,
        footer: issuer.bankName || null,
        initials: displayName.slice(0, 2).toUpperCase(),
        legal_form: issuer.legalForm || null,
        website: issuer.website || null,
        managing_director: issuer.managingDirector || null,
        register_info: issuer.registerInfo || null,
        account_holder: issuer.accountHolder || null,
        default_tax_note: issuer.defaultTaxNote || null,
        default_payment_terms: issuer.defaultPaymentTerms || null,
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
      <div className="doc-ed doc-ed-os dec-os doc-ed--loading">
        <style>{DOCUMENT_EDITOR_CSS}</style>
        <div className="dec-m-shell doc-ed-shell">
          <div className="dec-static-top">
            <header className="dec-page-head doc-ed-page-head">
              <div className="dec-page-head-copy dec-m-title">
                <div className="doc-ed-skel doc-ed-skel-kicker" />
                <div className="doc-ed-skel doc-ed-skel-title" />
                <div className="doc-ed-skel doc-ed-skel-lead" />
              </div>
            </header>
          </div>
          <div className="dec-scroll-body doc-ed-body doc-ed-body--loading">
            <div className="doc-ed-skel doc-ed-skel-sheet" />
          </div>
        </div>
      </div>
    )
  }

  if (!doc || !template) {
    return (
      <div className="doc-ed doc-ed-os dec-os">
        <style>{DOCUMENT_EDITOR_CSS}</style>
        <div className="dec-m-shell doc-ed-shell">
          <div className="dec-static-top">
            <header className="dec-page-head doc-ed-page-head">
              <div className="dec-page-head-copy dec-m-title">
                <button type="button" className="doc-ed-back dec-dt" onClick={() => router.push('/documents')}>
                  <CaretLeft size={14} weight="regular" aria-hidden />
                  Dokumente
                </button>
                <h1 className="dec-page-title festag-page-title">
                  <span className="dec-dt">Dokument</span>
                  <span className="dec-m-t">Dokument</span>
                </h1>
              </div>
            </header>
          </div>
          <div className="dec-scroll-body doc-ed-body">
            <p className="doc-ed-error">{error || 'Dokument nicht gefunden.'}</p>
            <button type="button" className="doc-ed-cta ghost" onClick={() => router.push('/documents')}>Zurück</button>
          </div>
        </div>
      </div>
    )
  }

  const isInvoiceWysiwyg = doc.kind === 'rechnung'
  const sheetTheme = resolveSheetTheme(data.sheet_theme, appTheme)
  const sheetClass = sheetThemeClass(sheetTheme)

  const issuerPartyLabel = doc.kind === 'angebot' ? 'Absender' : doc.kind === 'vertrag' ? 'Auftragnehmer' : 'Rechnungssteller'

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
    ...issuerLegalLines(issuer || EMPTY_ISSUER),
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

  const headerNumberInput = (
    <input
      className="doc-ed-head-number"
      value={numberDraft}
      disabled={locked}
      aria-label={`${KIND_TITLE[doc.kind]}nummer`}
      onChange={(e) => setNumberDraft(e.target.value)}
      onBlur={() => { void commitNumberLabel() }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void commitNumberLabel()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )

  const headerActions = primaryAction ? (
    <>
      {(saving || savedFlash) && (
        <span className="doc-ed-save-hint dec-dt" aria-live="polite">
          {saving ? 'Speichert…' : 'Gespeichert.'}
        </span>
      )}
      <div className="dec-page-actions-group">
        {!locked && (
          <button
            type="button"
            className="dec-head-tool"
            onClick={() => { void toggleSheetTheme() }}
            disabled={saving}
            aria-label={sheetTheme === 'dark' ? 'Helles Dokument' : 'Dunkles Dokument'}
            title={sheetTheme === 'dark' ? 'Helles Dokument' : 'Dunkles Dokument'}
          >
            {sheetTheme === 'dark' ? <Sun size={15} weight="regular" /> : <Moon size={15} weight="regular" />}
          </button>
        )}
        <button type="button" className="dec-head-tool" onClick={openPreview} disabled={saving} aria-label="Vorschau" title="Vorschau">
          <Eye size={15} weight="regular" />
        </button>
        {!locked && (
          <button type="button" className="dec-head-tool" onClick={() => { void saveDraft() }} disabled={saving} aria-label="Speichern" title="Speichern">
            <FloppyDisk size={15} weight="regular" />
          </button>
        )}
      </div>
      <button type="button" className="doc-ed-cta ghost" onClick={() => { void saveAndClose() }} disabled={saving}>
        {locked ? 'Schließen' : 'Speichern & schließen'}
      </button>
      <button type="button" className="doc-ed-cta" onClick={() => { void primaryAction.onClick() }} disabled={saving}>
        <primaryAction.icon size={15} weight="regular" />
        {primaryAction.label}
      </button>
    </>
  ) : (
    <>
      {(saving || savedFlash) && (
        <span className="doc-ed-save-hint dec-dt" aria-live="polite">
          {saving ? 'Speichert…' : 'Gespeichert.'}
        </span>
      )}
      <div className="dec-page-actions-group">
        {!locked && (
          <button
            type="button"
            className="dec-head-tool"
            onClick={() => { void toggleSheetTheme() }}
            disabled={saving}
            aria-label={sheetTheme === 'dark' ? 'Helles Dokument' : 'Dunkles Dokument'}
            title={sheetTheme === 'dark' ? 'Helles Dokument' : 'Dunkles Dokument'}
          >
            {sheetTheme === 'dark' ? <Sun size={15} weight="regular" /> : <Moon size={15} weight="regular" />}
          </button>
        )}
        <button type="button" className="dec-head-tool" onClick={openPreview} disabled={saving} aria-label="Vorschau" title="Vorschau">
          <Eye size={15} weight="regular" />
        </button>
        {!locked && (
          <button type="button" className="dec-head-tool" onClick={() => { void saveDraft() }} disabled={saving} aria-label="Speichern" title="Speichern">
            <FloppyDisk size={15} weight="regular" />
          </button>
        )}
      </div>
      <button type="button" className="doc-ed-cta ghost" onClick={() => { void saveAndClose() }} disabled={saving}>
        {locked ? 'Schließen' : 'Speichern & schließen'}
      </button>
    </>
  )

  return (
    <div
      ref={editorRootRef}
      className={`doc-ed doc-ed-os dec-os doc-ed-page${isInvoiceWysiwyg ? ' doc-ed--wysiwyg' : ''}`}
      data-doc-sheet-theme={sheetTheme}
    >
      <style>{DOCUMENT_EDITOR_CSS}</style>

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell doc-ed-shell" ref={shellRef}>
        <div className="dec-static-top">
          <div className="dec-legacy-mph">
            <MobilePageHeader
              title={numberDraft || doc.number_label}
              menuItems={[
                { id: 'back', label: 'Zurück zu Dokumente', onClick: () => router.push('/documents') },
                { id: 'preview', label: 'Vorschau', onClick: openPreview },
                ...(!locked ? [{ id: 'save', label: 'Speichern', onClick: () => { void saveDraft() } }] : []),
              ]}
            />
          </div>
          <button type="button" className="doc-ed-back dec-dt" onClick={() => router.push('/documents')}>
            <CaretLeft size={14} weight="regular" aria-hidden />
            Dokumente
          </button>
          <header className="dec-page-head doc-ed-page-head">
            <div className="dec-page-head-copy dec-m-title">
              <h1 className="dec-page-title festag-page-title doc-ed-head-title">
                {headerNumberInput}
              </h1>
            </div>
            <div className="dec-m-head-actions">
              <CodexMobileActionPill
                onSearch={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                onMenu={() => setNavOpen(true)}
              />
            </div>
            <div className="dec-page-actions dec-dt doc-ed-page-actions">
              {headerActions}
            </div>
          </header>
        </div>

      <div className="dec-scroll-body doc-ed-body" ref={scrollBodyRef}>
        {isInvoiceWysiwyg ? (
          <InvoiceWysiwygEditor
            numberDraft={numberDraft}
            sheetClass={sheetClass}
            data={data}
            positions={positions}
            locked={locked}
            issuer={issuer}
            brandName={brandName}
            clients={clients}
            projects={projects}
            clientId={clientId}
            projectId={projectId}
            tagroFilledFields={tagroFilledFields}
            onNumberChange={setNumberDraft}
            onNumberCommit={() => { void commitNumberLabel() }}
            onClientChange={onClientChange}
            onProjectChange={setProjectId}
            onField={setField}
            onPos={setPos}
            onAddPos={addPos}
            onRemovePos={removePos}
            onIssuerField={setIssuerField}
            onEditIssuer={() => setIssuerOpen(true)}
          />
        ) : (
        <div className={`doc-ed-sheet ${sheetClass}`}>
          <div className="doc-ed-sheet-inner">
            <div className="doc-ed-head-grid">
              {(doc.kind === 'rechnung' || doc.kind === 'angebot' || doc.kind === 'vertrag') && (
                <div className="doc-ed-issuer">
                  <p className="doc-ed-issuer-label">{issuerPartyLabel}</p>
                  <p className="doc-ed-issuer-name">{issuer ? issuerDisplayName(issuer) : String(doc.brand_snapshot?.name || issuerPartyLabel)}</p>
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
                    inlineOnly
                    label={f.label}
                    fieldLabel={f.label}
                    documentKind={template.title}
                    projectId={projectId}
                    multiline={f.type === 'longtext'}
                    placeholder={f.help || '…'}
                    value={String(data[f.key] ?? '')}
                    onChange={(v) => setField(f.key, v)}
                    inputClassName="doc-ed-input"
                    tagroFilled={tagroFilledFields.has(f.key)}
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
                            inlineOnly
                            label="Beschreibung"
                            fieldLabel="Positionsbeschreibung"
                            documentKind={template.title}
                            projectId={projectId}
                            value={p.description}
                            onChange={(v) => setPos(i, 'description', v)}
                            placeholder="Leistung beschreiben"
                            inputClassName="doc-ed-input"
                            tagroFilled={tagroFilledFields.has('positions')}
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
                      inlineOnly
                      label={f.label}
                      fieldLabel={f.label}
                      documentKind={template.title}
                      projectId={projectId}
                      multiline={f.type === 'longtext'}
                      placeholder={f.help || '…'}
                      value={String(data[f.key] ?? '')}
                      onChange={(v) => setField(f.key, v)}
                      inputClassName="doc-ed-input"
                      tagroFilled={tagroFilledFields.has(f.key)}
                    />
                  ))}
                </div>
              </section>
            )}

            {bodyFields.map((f) => (
              <section key={f.key} className="doc-ed-section">
                <TagroFieldAssist
                  inlineOnly
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
                  tagroFilled={tagroFilledFields.has(f.key)}
                />
              </section>
            ))}

            {error && <p className="doc-ed-error">{error}</p>}
          </div>
        </div>
        )}

        {isInvoiceWysiwyg && error && <p className="doc-ed-error">{error}</p>}
      </div>

      {!locked && (
        <DocumentTagroComposeBar
          kind={doc.kind}
          disabled={saving}
          onApply={applyTagroDraft}
        />
      )}
      </div>

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
        initialIssuer={issuer}
        initialReady={Boolean(issuer?.name?.trim() && issuer?.iban?.trim())}
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
            <button type="button" className="doc-ed-cta ghost" onClick={() => setPreviewOpen(false)}>Schließen</button>
            <button type="button" className="doc-ed-cta" onClick={openPdf}>PDF drucken</button>
          </>
        )}>
        <iframe className="doc-ed-preview-frame" title="Dokumentvorschau" srcDoc={previewHtml} />
      </Modal>
    </div>
  )
}
