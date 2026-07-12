'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowsClockwise,
  FunnelSimple,
  PencilSimple,
  Receipt,
  Sparkle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import DocumentTemplatePicker from '@/components/documents/DocumentTemplatePicker'
import DocumentCardRow from '@/components/documents/DocumentCardRow'
import DocumentsEmptyState from '@/components/documents/DocumentsEmptyState'
import InvoiceIssuerModal from '@/components/documents/InvoiceIssuerModal'
import { createDocument, listDocuments } from '@/lib/documents/document-api'
import { defaultDocumentData } from '@/lib/documents/document-defaults'
import { fetchIssuer } from '@/lib/documents/issuer-api'
import { issuerSummaryLine, type InvoiceIssuer } from '@/lib/documents/issuer'
import { DOCUMENTS_CSS } from '@/components/documents/documents-styles'
import type { DocKind } from '@/lib/documents/templates'
import {
  buildDocumentsLead,
  DOC_TABS,
  filterDocumentItems,
  mergeDocumentItems,
  printAgencyDocument,
  type AgencyDocRow,
  type DocTab,
  type DocumentListItem,
  type UploadDocRow,
} from '@/components/documents/documents-shared'
import { openTagro } from '@/components/TagroOverlay'

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)
  const pageRootRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const staticTopRef = useRef<HTMLDivElement>(null)

  const [listReady, setListReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [wsMode, setWsMode] = useState<PortalWorkspaceMode>('delivery')
  const [tab, setTab] = useState<DocTab>('all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [agencyDocs, setAgencyDocs] = useState<AgencyDocRow[]>([])
  const [uploads, setUploads] = useState<UploadDocRow[]>([])
  const [legacyInvoices, setLegacyInvoices] = useState<UploadDocRow[]>([])
  const [wsReady, setWsReady] = useState(false)
  const [wsId, setWsId] = useState<string | null>(null)
  const [issuerOpen, setIssuerOpen] = useState(false)
  const [issuerOnboardingPending, setIssuerOnboardingPending] = useState(false)
  const [issuer, setIssuer] = useState<InvoiceIssuer | null>(null)
  const [issuerReady, setIssuerReady] = useState(false)
  const [invoiceCount, setInvoiceCount] = useState(0)
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
    } catch {
      /* legacy tables optional */
    }
  }, [supabase])

  const loadIssuer = useCallback(async () => {
    try {
      const { json: j } = await fetchIssuer()
      if (j?.issuer) setIssuer(j.issuer as InvoiceIssuer)
      setIssuerReady(Boolean(j?.ready))
      setInvoiceCount(Number(j?.invoiceCount ?? 0))
      if (Number(j?.invoiceCount ?? 0) === 0 && !j?.ready) {
        try {
          if (!sessionStorage.getItem('festag-issuer-onboard-dismissed')) {
            setIssuerOnboardingPending(true)
          }
        } catch {
          setIssuerOnboardingPending(true)
        }
      } else {
        setIssuerOnboardingPending(false)
      }
    } catch {
      /* optional */
    }
  }, [])

  const load = useCallback(async () => {
    setListReady(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: personal } = await supabase
        .from('workspaces')
        .select('id, mode')
        .eq('primary_owner_id', user.id)
        .eq('is_personal', true)
        .maybeSingle()

      let ws = personal
      if (!ws) {
        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, mode')
          .eq('primary_owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        ws = owned
      }

      const mode = (ws as { mode?: string } | null)?.mode
      if (mode === 'team' || mode === 'agency' || mode === 'delivery') {
        setWsMode(mode)
      }
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
    } catch {
      /* keep partial state */
    } finally {
      setListReady(true)
    }
  }, [supabase, loadLegacyDocs, loadIssuer])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!wsReady || !issuerOnboardingPending || issuerOpen) return
    setIssuerOpen(true)
  }, [wsReady, issuerOnboardingPending, issuerOpen])

  useEffect(() => {
    function closeMenus(event: PointerEvent) {
      const target = event.target as Node
      if (filterWrapRef.current?.contains(target) || mobileFilterWrapRef.current?.contains(target)) return
      setFilterMenuOpen(false)
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setFilterMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeMenus)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenus)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  const allItems = useMemo(
    () => mergeDocumentItems(agencyDocs, uploads, legacyInvoices),
    [agencyDocs, uploads, legacyInvoices],
  )
  const shown = useMemo(() => filterDocumentItems(allItems, tab), [allItems, tab])

  const counts = useMemo(() => ({
    total: allItems.length,
    openInvoices: allItems.filter((i) => i.kind === 'rechnung' && i.status !== 'paid').length,
    pendingContracts: allItems.filter((i) => i.kind === 'vertrag' && !i.signedAt && i.status !== 'paid').length,
    openOffers: allItems.filter((i) => i.kind === 'angebot' && i.status === 'sent' && !i.acceptedAt).length,
  }), [allItems])

  const pageLead = buildDocumentsLead(counts)
  const filterActive = tab !== 'all'

  useEffect(() => {
    const root = pageRootRef.current
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
  }, [wsReady])

  async function handleCreate(kind: DocKind) {
    if (!wsId || creating) return
    setCreating(kind)
    setCreateError('')
    try {
      const { res, json } = await createDocument({
        kind,
        workspace_id: wsId,
        status: 'draft',
        data: defaultDocumentData(kind),
      })
      if (res.ok && json?.document?.id) {
        router.push(`/documents/${json.document.id}`)
        return
      }
      setCreateError(json?.error || 'Entwurf konnte nicht erstellt werden.')
    } catch {
      setCreateError('Entwurf konnte nicht erstellt werden.')
    } finally {
      setCreating(null)
    }
  }

  function tagroHandler() {
    openTagro({
      contextType: 'document',
      id: 'list',
      title: 'Dokumente, Übersicht',
      subtitle: pageLead,
    })
  }

  async function patchAgencyDocument(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.document) {
        setAgencyDocs((current) => current.map((doc) => doc.id === id ? data.document : doc))
      }
    } finally {
      setBusyId(null)
    }
  }

  function handleOpenDocument(item: DocumentListItem) {
    if (item.source !== 'agency') return
    router.push(`/documents/${item.id}`)
  }

  function handleOpenPdf(item: DocumentListItem) {
    if (item.source !== 'agency') return
    printAgencyDocument(item.raw as AgencyDocRow)
  }

  const issuerSummary = issuerSummaryLine(issuer)

  function renderFilterMenu() {
    return (
      <div className="dec-filter-menu" role="menu">
        <p className="dec-filter-menu-label dec-dt">Kategorie</p>
        {DOC_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`dec-filter-menu-item${tab === item.id ? ' on' : ''}`}
            onClick={() => { setTab(item.id); setFilterMenuOpen(false) }}
          >
            <span>{item.label}</span>
            {tab === item.id && <span className="dec-filter-check">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="dec-os doc-os-page" ref={pageRootRef}>
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DOCUMENTS_CSS }} />

      {filterMenuOpen && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell" ref={shellRef}>
        <div className="dec-static-top doc-static-top" ref={staticTopRef}>
          <PortalPageHeader
            title="Dokumente."
            lead={listReady
              ? (canCreateDocs ? pageLead : 'Projekt-Uploads und empfangene Dateien.')
              : ''}
            onMenu={() => setNavOpen(true)}
            mobileMenuItems={[
              { id: 'refresh', label: 'Aktualisieren', onClick: () => void load() },
              { id: 'tagro', label: 'Mit Tagro besprechen', onClick: tagroHandler },
            ]}
            actions={(
              <>
                <div className="dec-page-actions-group">
                  <div className="dec-filter-wrap" ref={filterWrapRef}>
                    <button
                      type="button"
                      className={`dec-head-tool${filterMenuOpen || filterActive ? ' on' : ''}`}
                      aria-label="Filter"
                      aria-expanded={filterMenuOpen}
                      onClick={() => setFilterMenuOpen((v) => !v)}
                    >
                      <FunnelSimple size={15} weight="regular" />
                    </button>
                    {filterMenuOpen && renderFilterMenu()}
                  </div>
                </div>
                <button type="button" className="dec-head-tool" aria-label="Aktualisieren" onClick={() => void load()}>
                  <ArrowsClockwise size={15} weight="regular" />
                </button>
              </>
            )}
          />

          {canCreateDocs && (
            <>
              <DocumentTemplatePicker
                disabled={!wsReady}
                creating={creating}
                onSelect={(kind) => void handleCreate(kind)}
              />
              {createError ? <p className="doc-create-error">{createError}</p> : null}
            </>
          )}

          <div className="doc-filters dec-dt">
            {DOC_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`doc-filter${tab === item.id ? ' on' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
                {item.id === 'all' ? ` (${allItems.length})` : ''}
              </button>
            ))}
          </div>

          <div className="dec-m-actions">
            <div className="dec-m-actions-group">
              <div className="dec-filter-wrap" ref={mobileFilterWrapRef}>
                <button
                  type="button"
                  className={`dec-m-ctl${filterMenuOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
                  aria-label="Filter"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen((v) => !v)}
                >
                  <FunnelSimple size={17} weight="regular" />
                </button>
                {filterMenuOpen && renderFilterMenu()}
              </div>
              <button type="button" className="dec-m-ctl" aria-label="Aktualisieren" onClick={() => void load()}>
                <ArrowsClockwise size={17} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        <div className="dec-scroll-body" ref={scrollBodyRef}>
          {canCreateDocs && (
            <section className="doc-issuer-card dec-dt" aria-label="Rechnungssteller">
              <div className="doc-issuer-copy">
                <h2 className="doc-issuer-title">Rechnungssteller</h2>
                <p className="doc-issuer-lead">
                  {issuer?.name?.trim() || 'Noch keine Angaben'}
                  {issuerSummary ? `, ${issuerSummary}` : ''}
                </p>
                {!issuerReady && (
                  <p className="doc-issuer-note">
                    Name, Adresse und Bank einmalig hinterlegen — erscheint auf jeder Rechnung.
                  </p>
                )}
                <Link href="/settings/documents" className="doc-issuer-settings-link">
                  In Einstellungen verwalten
                </Link>
              </div>
              <button type="button" className="doc-issuer-btn" onClick={() => setIssuerOpen(true)}>
                <PencilSimple size={15} weight="regular" />
                {issuerReady ? 'Bearbeiten' : 'Angaben ergänzen'}
              </button>
            </section>
          )}

          {canCreateDocs && (
            <p className="doc-inbox-hint dec-dt">
              Gesendete Angebote, Rechnungen und Verträge erscheinen beim Empfänger unter{' '}
              <Link href="/benachrichtigungen">Benachrichtigungen</Link>
              {isAgencyMode ? ' (Kunde)' : ''}.
              Ohne Senden kannst du jederzeit über PDF den Druckdialog nutzen.
            </p>
          )}

          {!listReady ? null : shown.length === 0 ? (
            <DocumentsEmptyState
              filtered={allItems.length > 0}
              canCreate={canCreateDocs}
              onCreateAngebot={() => void handleCreate('angebot')}
              onCreateRechnung={() => void handleCreate('rechnung')}
            />
          ) : (
            shown.map((item, index) => (
              <DocumentCardRow
                key={`${item.source}-${item.id}`}
                item={item}
                isLast={index === shown.length - 1}
                agencyMode={canCreateDocs}
                busy={busyId === item.id}
                onOpen={item.source === 'agency' ? handleOpenDocument : undefined}
                onOpenPdf={item.source === 'agency' ? handleOpenPdf : undefined}
                onSend={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { status: 'sent' }) : undefined}
                onMarkPaid={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { status: 'paid' }) : undefined}
                onMarkSigned={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { mark_signed: true }) : undefined}
                onMarkAccepted={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { mark_accepted: true }) : undefined}
              />
            ))
          )}
        </div>
      </div>

      <InvoiceIssuerModal
        open={issuerOpen}
        onClose={() => {
          setIssuerOpen(false)
          setIssuerOnboardingPending(false)
        }}
        variant={invoiceCount === 0 && !issuerReady ? 'onboarding' : 'settings'}
        initialIssuer={issuer}
        initialReady={issuerReady}
        onSaved={(next, ready) => {
          setIssuer(next)
          setIssuerReady(ready)
        }}
      />

      <div className="dec-fab-desktop">
        <TagroContentFab
          context={{
            contextType: 'document',
            id: 'list',
            title: 'Dokumente, Übersicht',
            subtitle: pageLead,
          }}
        />
      </div>

      <MobilePageDock
        onDragUp={canCreateDocs ? () => void handleCreate('rechnung') : tagroHandler}
        primary={canCreateDocs ? {
          id: 'invoice',
          label: 'Rechnung erstellen',
          icon: <Receipt size={14} weight="regular" />,
          onClick: () => void handleCreate('rechnung'),
          ariaLabel: 'Rechnung erstellen',
        } : {
          id: 'tagro',
          label: 'Dokumente besprechen…',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro besprechen',
        }}
        secondary={{
          id: 'tagro',
          icon: <Sparkle size={20} weight="fill" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro besprechen',
        }}
      />
    </div>
  )
}
