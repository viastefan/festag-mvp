'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowsClockwise,
  FunnelSimple,
  PencilSimple,
  Sparkle,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import type { PortalWorkspaceMode } from '@/lib/portal-nav'
import PortalPageHeader from '@/components/portal/PortalPageHeader'
import MobilePageDock from '@/components/mobile/MobilePageDock'
import MobileNavSheet from '@/components/mobile/MobileNavSheet'
import TagroContentFab from '@/components/TagroContentFab'
import DocumentBuilderSection from '@/components/DocumentBuilderSection'
import DocumentTemplatePicker from '@/components/documents/DocumentTemplatePicker'
import DocumentCardRow from '@/components/documents/DocumentCardRow'
import DocumentsEmptyIllustration from '@/components/documents/DocumentsEmptyIllustration'
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
  const supabase = useMemo(() => createClient(), [])
  const filterWrapRef = useRef<HTMLDivElement>(null)
  const mobileFilterWrapRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [wsMode, setWsMode] = useState<PortalWorkspaceMode>('delivery')
  const [tab, setTab] = useState<DocTab>('all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [agencyDocs, setAgencyDocs] = useState<AgencyDocRow[]>([])
  const [uploads, setUploads] = useState<UploadDocRow[]>([])
  const [legacyInvoices, setLegacyInvoices] = useState<UploadDocRow[]>([])
  const [builderKind, setBuilderKind] = useState<DocKind | null>(null)
  const [wsReady, setWsReady] = useState(false)

  const isAgencyMode = wsMode === 'agency'
  const canCreateDocs = wsReady

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: ws } = await supabase
        .from('workspaces')
        .select('mode')
        .eq('primary_owner_id', user.id)
        .eq('is_personal', true)
        .maybeSingle()

      const mode = (ws as { mode?: string } | null)?.mode
      if (mode === 'team' || mode === 'agency' || mode === 'delivery') {
        setWsMode(mode)
      }
      setWsReady(Boolean(ws))

      const [{ data: docs }, { data: inv }, { data: files }] = await Promise.all([
        fetch('/api/documents', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ documents: [] })),
        supabase.from('invoices').select('*, projects(title)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('documents').select('*, projects(title)').or(`user_id.eq.${user.id},uploaded_by.eq.${user.id}`).order('created_at', { ascending: false }),
      ])

      setAgencyDocs((docs?.documents ?? []) as AgencyDocRow[])
      setLegacyInvoices(((inv.data as UploadDocRow[]) ?? []).map((row) => ({ ...row, type: 'invoice' })))
      setUploads((files.data as UploadDocRow[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { void load() }, [load])

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
  }), [allItems])

  const pageLead = buildDocumentsLead(counts)
  const filterActive = tab !== 'all'

  const tagroHandler = () => openTagro({
    contextType: 'document',
    id: 'list',
    title: 'Dokumente, Übersicht',
    subtitle: pageLead,
  })

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

  function handleOpenPdf(item: DocumentListItem) {
    if (item.source !== 'agency') return
    printAgencyDocument(item.raw as AgencyDocRow)
  }

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
    <div className="dec-os">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DOCUMENTS_CSS }} />

      {filterMenuOpen && (
        <button type="button" className="dec-m-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterMenuOpen(false)} />
      )}

      <MobileNavSheet open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="dec-m-shell">
        <div className="dec-static-top">
          <PortalPageHeader
            title="Dokumente."
            lead={canCreateDocs
              ? 'Angebote, Verträge und Rechnungen erstellen, als PDF speichern oder ans Kunden- bzw. Dev-Panel senden.'
              : 'Projekt-Uploads und empfangene Dateien.'}
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
            <DocumentTemplatePicker
              disabled={!wsReady}
              onSelect={setBuilderKind}
            />
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

        <div className="dec-scroll-body">
          {canCreateDocs && (
            <p className="doc-inbox-hint dec-dt">
              Gesendete Rechnungen und Verträge erscheinen beim Empfänger unter{' '}
              <Link href="/benachrichtigungen">Benachrichtigungen</Link>
              {isAgencyMode ? ' (Kunde)' : ''}.
              Ohne Senden kannst du jederzeit über PDF den Druckdialog nutzen.
            </p>
          )}

          {loading && shown.length === 0 ? (
            <p className="dec-empty">Lade Dokumente…</p>
          ) : shown.length === 0 ? (
            <div className="dec-empty doc-empty">
              <DocumentsEmptyIllustration />
              <p>{allItems.length === 0 ? 'Noch keine Dokumente.' : 'Keine Dokumente in dieser Ansicht.'}</p>
              <small>
                {canCreateDocs
                  ? 'Erstelle oben ein Angebot, einen Vertrag oder eine Rechnung — oder lade Projekt-Dateien hoch.'
                  : 'Melde dich an, um Dokumente zu erstellen.'}
              </small>
            </div>
          ) : (
            shown.map((item, index) => (
              <DocumentCardRow
                key={`${item.source}-${item.id}`}
                item={item}
                isLast={index === shown.length - 1}
                agencyMode={canCreateDocs}
                busy={busyId === item.id}
                onOpenPdf={item.source === 'agency' ? handleOpenPdf : undefined}
                onSend={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { status: 'sent' }) : undefined}
                onMarkPaid={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { status: 'paid' }) : undefined}
                onMarkSigned={canCreateDocs ? (row) => void patchAgencyDocument(row.id, { mark_signed: true }) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {canCreateDocs && (
        <DocumentBuilderSection
          hideTiles
          tilesOnly
          builderKind={builderKind}
          onBuilderKindChange={setBuilderKind}
          onDocumentCreated={() => void load()}
        />
      )}

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
        onDragUp={tagroHandler}
        primary={{
          id: 'tagro',
          label: 'Dokumente besprechen…',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro besprechen',
        }}
        secondary={{
          id: 'compose',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroHandler,
          ariaLabel: 'Mit Tagro bearbeiten',
        }}
      />
    </div>
  )
}
