'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, FilePdf, Handshake, PaperPlaneTilt, PenNib, PencilSimple, Plus,
} from '@phosphor-icons/react'
import { FESTAG_PAGE_STYLES } from '@/components/app-shell/festag-page-styles'
import { createClient } from '@/lib/supabase/client'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'
import { createDocument, listDocuments } from '@/lib/documents/document-api'
import { defaultDocumentData } from '@/lib/documents/document-defaults'
import { fetchIssuer } from '@/lib/documents/issuer-api'
import { issuerSummaryLine, type InvoiceIssuer } from '@/lib/documents/issuer'
import { subscribeIssuerSync } from '@/lib/documents/issuer-sync'
import { DOC_TEMPLATES, type DocKind } from '@/lib/documents/templates'
import {
  buildDocumentsLead,
  DOC_TABS,
  filterDocumentItems,
  mergeDocumentItems,
  printAgencyDocument,
  STATUS_LABEL,
  KIND_LABEL,
  dateLabel,
  formatAmount,
  type AgencyDocRow,
  type DocTab,
  type DocumentListItem,
  type UploadDocRow,
} from '@/components/documents/documents-shared'

const KIND_ICON_LABEL: Record<DocKind, string> = { angebot: 'Angebot', rechnung: 'Rechnung', vertrag: 'Vertrag' }

function statusTone(status: string, kind: string): 'green' | 'blue' | 'amber' | undefined {
  if (status === 'paid' || status === 'signed' || status === 'accepted') return 'green'
  if (status === 'sent') return 'blue'
  if (kind === 'rechnung' && status === 'pending') return 'amber'
  return undefined
}

function displayStatus(item: DocumentListItem): string {
  if (item.signedAt) return 'signed'
  if (item.acceptedAt) return 'accepted'
  return item.status
}

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [listReady, setListReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [wsMode, setWsMode] = useState<PortalWorkspaceMode>('delivery')
  const [tab, setTab] = useState<DocTab>('all')
  const [agencyDocs, setAgencyDocs] = useState<AgencyDocRow[]>([])
  const [uploads, setUploads] = useState<UploadDocRow[]>([])
  const [legacyInvoices, setLegacyInvoices] = useState<UploadDocRow[]>([])
  const [wsReady, setWsReady] = useState(false)
  const [wsId, setWsId] = useState<string | null>(null)
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null)
  const [issuerReady, setIssuerReady] = useState(false)
  const [creating, setCreating] = useState<DocKind | null>(null)
  const [createError, setCreateError] = useState('')

  const isAgencyMode = wsMode === 'agency'
  const canCreateDocs = wsReady

  const loadLegacyDocs = useCallback(async (userId: string) => {
    try {
      const [{ data: inv }, { data: files }] = await Promise.all([
        supabase.from('invoices').select('*, projects(title)').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('documents').select('*, projects(title)').or(`user_id.eq.${userId},uploaded_by.eq.${userId}`).order('created_at', { ascending: false }),
      ])
      setLegacyInvoices(((inv as UploadDocRow[]) ?? []).map((row) => ({ ...row, type: 'invoice' })))
      setUploads((files as UploadDocRow[]) ?? [])
    } catch { /* legacy tables optional */ }
  }, [supabase])

  const loadIssuer = useCallback(async () => {
    try {
      const { res, json: j } = await fetchIssuer()
      if (!res.ok) return
      if (j?.issuer) setIssuer(j.issuer as InvoiceIssuer)
      setIssuerReady(Boolean(j?.ready))
    } catch { /* optional */ }
  }, [])

  const load = useCallback(async () => {
    setListReady(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: personal } = await supabase
        .from('workspaces').select('id, mode')
        .eq('primary_owner_id', user.id).eq('is_personal', true).maybeSingle()

      let ws = personal
      if (!ws) {
        const { data: owned } = await supabase
          .from('workspaces').select('id, mode')
          .eq('primary_owner_id', user.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
        ws = owned
      }

      const mode = (ws as { mode?: string } | null)?.mode
      if (mode === 'team' || mode === 'agency' || mode === 'delivery') setWsMode(mode)
      setWsReady(Boolean(ws))
      setWsId((ws as { id?: string } | null)?.id ?? null)

      const docsResult = await listDocuments()
      if (docsResult?.res.ok) {
        setAgencyDocs((docsResult.json?.documents ?? []) as AgencyDocRow[])
      } else {
        setAgencyDocs([])
        if (docsResult?.json?.error) setCreateError(String(docsResult.json.error))
      }

      await loadLegacyDocs(user.id)
      if (ws) await loadIssuer()
    } catch { /* keep partial state */ } finally {
      setListReady(true)
    }
  }, [supabase, loadLegacyDocs, loadIssuer])

  useEffect(() => { void load() }, [load])
  useEffect(() => subscribeIssuerSync(({ issuer: next, ready }) => { setIssuer(next); setIssuerReady(ready) }), [])

  const allItems = useMemo(() => mergeDocumentItems(agencyDocs, uploads, legacyInvoices), [agencyDocs, uploads, legacyInvoices])
  const shown = useMemo(() => filterDocumentItems(allItems, tab), [allItems, tab])
  const counts = useMemo(() => ({
    total: allItems.length,
    openInvoices: allItems.filter((i) => i.kind === 'rechnung' && i.status !== 'paid').length,
    pendingContracts: allItems.filter((i) => i.kind === 'vertrag' && !i.signedAt && i.status !== 'paid').length,
    openOffers: allItems.filter((i) => i.kind === 'angebot' && i.status === 'sent' && !i.acceptedAt).length,
  }), [allItems])
  const pageLead = buildDocumentsLead(counts)
  const issuerSummary = issuerSummaryLine(issuer)

  async function handleCreate(kind: DocKind) {
    if (!wsId || creating) return
    setCreating(kind)
    setCreateError('')
    try {
      const { res, json } = await createDocument({ kind, workspace_id: wsId, status: 'draft', data: defaultDocumentData(kind) })
      if (res.ok && json?.document?.id) { router.push(`/documents/${json.document.id}`); return }
      setCreateError(json?.error || 'Entwurf konnte nicht erstellt werden.')
    } catch {
      setCreateError('Entwurf konnte nicht erstellt werden.')
    } finally {
      setCreating(null)
    }
  }

  async function patchAgencyDocument(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.document) {
        setAgencyDocs((current) => current.map((doc) => doc.id === id ? data.document : doc))
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fps">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FESTAG_PAGE_STYLES }} />

      <header className="fps-head">
        <h1 className="fps-title">Dokumente</h1>
        <p className="fps-stat-line">{pageLead}</p>
      </header>

      {canCreateDocs ? (
        <div className="fps-filters" role="group" aria-label="Neues Dokument">
          {DOC_TEMPLATES.map((tpl) => (
            <button
              key={tpl.kind}
              type="button"
              className="fps-filter"
              disabled={Boolean(creating)}
              onClick={() => void handleCreate(tpl.kind)}
            >
              <Plus size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />
              {creating === tpl.kind ? 'Wird erstellt…' : KIND_ICON_LABEL[tpl.kind] || tpl.title}
            </button>
          ))}
        </div>
      ) : null}
      {createError ? <p className="fps-stat-line" style={{ color: 'var(--fps-red)', marginTop: -12, marginBottom: 16 }}>{createError}</p> : null}

      {canCreateDocs ? (
        <p className="fps-stat-line" style={{ marginBottom: 20 }}>
          Rechnungssteller: <strong>{issuer?.name?.trim() || 'noch keine Angaben'}</strong>
          {issuerSummary ? `, ${issuerSummary}` : ''}
          {' — '}
          <Link href="/settings/documents">{issuerReady ? 'bearbeiten' : 'Angaben ergänzen'}</Link>
        </p>
      ) : null}

      <div className="fps-filters">
        {DOC_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`fps-filter${tab === item.id ? ' is-on' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}{item.id === 'all' ? ` (${allItems.length})` : ''}
          </button>
        ))}
      </div>

      {!listReady ? (
        <p className="fps-empty">Lade Dokumente…</p>
      ) : shown.length === 0 ? (
        <div className="fps-list">
          <p className="fps-empty">
            {allItems.length > 0 ? 'Keine Dokumente in dieser Kategorie.' : 'Noch keine Dokumente — leg dein erstes Angebot oder deine erste Rechnung an.'}
          </p>
        </div>
      ) : (
        <div className="fps-list">
          {shown.map((item) => {
            const statusKey = displayStatus(item)
            const canOpen = isAgencyMode && item.source === 'agency'
            const canSend = isAgencyMode && item.source === 'agency' && item.status === 'final'
            const canMarkPaid = isAgencyMode && item.kind === 'rechnung' && item.status === 'sent'
            const canMarkSigned = isAgencyMode && item.kind === 'vertrag' && item.status === 'sent' && !item.signedAt
            const canMarkAccepted = isAgencyMode && item.kind === 'angebot' && item.status === 'sent' && !item.acceptedAt
            const showPdf = item.source === 'agency' || Boolean(item.downloadUrl)
            const needsAttention = canSend || canMarkPaid || canMarkSigned || canMarkAccepted
            const tone = statusTone(statusKey, item.kind)
            const busy = busyId === item.id

            return (
              <div key={`${item.source}-${item.id}`} className="fps-row" style={{ flexWrap: 'wrap', rowGap: 10 }}>
                <div className="fps-row-body">
                  <span className={`fps-mark${needsAttention ? ' is-attn is-blue' : ''}`} aria-hidden>
                    {needsAttention ? <span className="fps-mark-dot" /> : <Check size={10} weight="bold" />}
                  </span>
                  <span className="fps-row-copy">
                    <span className="fps-row-title">
                      {item.numberLabel ? `${KIND_LABEL[item.kind] || item.kind}, ${item.numberLabel}` : item.title}
                    </span>
                    <span className="fps-row-sub">
                      {[item.recipient, item.projectTitle].filter(Boolean).join(', ') || dateLabel(item.createdAt)}
                    </span>
                  </span>
                </div>
                <div className="fps-row-right">
                  {formatAmount(item.amountCents) ? (
                    <span className="fps-row-meta">{formatAmount(item.amountCents)}</span>
                  ) : null}
                  <span className={`fps-row-tag${tone ? ` is-${tone}` : ''}`}>{STATUS_LABEL[statusKey] || item.status}</span>
                </div>
                {(canOpen || showPdf || canSend || canMarkPaid || canMarkSigned || canMarkAccepted) ? (
                  <div className="fps-filters" style={{ width: '100%', marginBottom: 0 }}>
                    {canOpen ? (
                      <button type="button" className="fps-filter" disabled={busy} onClick={() => router.push(`/documents/${item.id}`)}>
                        <PencilSimple size={12} weight="regular" style={{ marginRight: 5, verticalAlign: -1 }} />Öffnen
                      </button>
                    ) : null}
                    {showPdf ? (
                      item.source === 'agency' ? (
                        <button type="button" className="fps-filter" disabled={busy} onClick={() => printAgencyDocument(item.raw as AgencyDocRow)}>
                          <FilePdf size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />PDF
                        </button>
                      ) : item.downloadUrl ? (
                        <a className="fps-filter" href={item.downloadUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <FilePdf size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />PDF
                        </a>
                      ) : null
                    ) : null}
                    {canSend ? (
                      <button type="button" className="fps-filter" disabled={busy} onClick={() => void patchAgencyDocument(item.id, { status: 'sent' })}>
                        <PaperPlaneTilt size={12} weight="regular" style={{ marginRight: 5, verticalAlign: -1 }} />Senden
                      </button>
                    ) : null}
                    {canMarkPaid ? (
                      <button type="button" className="fps-filter" disabled={busy} onClick={() => void patchAgencyDocument(item.id, { status: 'paid' })}>
                        <Check size={12} weight="bold" style={{ marginRight: 5, verticalAlign: -1 }} />Bezahlt
                      </button>
                    ) : null}
                    {canMarkSigned ? (
                      <button type="button" className="fps-filter" disabled={busy} onClick={() => void patchAgencyDocument(item.id, { mark_signed: true })}>
                        <PenNib size={12} weight="fill" style={{ marginRight: 5, verticalAlign: -1 }} />Unterschrieben
                      </button>
                    ) : null}
                    {canMarkAccepted ? (
                      <button type="button" className="fps-filter" disabled={busy} onClick={() => void patchAgencyDocument(item.id, { mark_accepted: true })}>
                        <Handshake size={12} weight="regular" style={{ marginRight: 5, verticalAlign: -1 }} />Angenommen
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
