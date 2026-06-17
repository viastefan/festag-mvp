'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDevOrAdmin } from '@/lib/role'
import DocumentBuilderSection from '@/components/DocumentBuilderSection'
import PageHeader from '@/components/ui/PageHeader'
import FilterPills from '@/components/ui/FilterPills'
import { openTagro } from '@/components/TagroOverlay'
import MobilePageHeader from '@/components/MobilePageHeader'
import MobileCodexListChrome from '@/components/mobile/MobileCodexListChrome'
import { ArrowsClockwise, FunnelSimple, PencilSimple, Plus, Sparkle } from '@phosphor-icons/react'

type TabId = 'all' | 'invoices' | 'contracts' | 'briefings' | 'deliverables'

const TAB_OPTIONS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'invoices', label: 'Rechnungen' },
  { id: 'contracts', label: 'Verträge' },
  { id: 'briefings', label: 'Briefings' },
  { id: 'deliverables', label: 'Lieferungen' },
]

function DocumentsEmptyState() {
  return (
    <div className="docs-empty">
      <span className="docs-empty-mark" aria-hidden>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <rect x="14" y="8" width="28" height="40" rx="4"
            stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.2" />
          <line x1="20" y1="20" x2="36" y2="20" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="20" y1="28" x2="36" y2="28" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="20" y1="36" x2="30" y2="36" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <h2>Noch keine Dokumente</h2>
      <p>Erstelle Angebot, Vertrag oder Rechnung über die Auswahl oben.</p>
    </div>
  )
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProj, setUploadProj] = useState('')
  const [uploadType, setUploadType] = useState('deliverable')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      setUserId(uid)
      const [{ data: docs }, { data: inv }, { data: prof }, { data: projs }] = await Promise.all([
        supabase.from('documents').select('*, projects(title)').or(`user_id.eq.${uid},uploaded_by.eq.${uid}`).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*, projects(title)').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('profiles').select('role').eq('id', uid).single(),
        supabase.from('projects').select('id,title').order('created_at', { ascending: false }),
      ])
      setDocuments((docs as any[]) ?? [])
      setInvoices((inv as any[]) ?? [])
      setUserRole((prof as any)?.role ?? 'client')
      setProjects((projs as any[]) ?? [])
      setLoading(false)
    })
  }, [])

  async function uploadFile(file: File) {
    if (!uploadProj) { alert('Bitte Projekt wählen.'); return }
    setUploading(true)
    const supabase = createClient()
    try {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const proj = projects.find(p => p.id === uploadProj)
      const { data: pj } = await supabase.from('projects').select('user_id').eq('id', uploadProj).single()
      const projectOwner = (pj as any)?.user_id
      const { data: ins, error: dbErr } = await supabase.from('documents').insert({
        user_id: projectOwner ?? userId,
        uploaded_by: userId,
        project_id: uploadProj,
        type: uploadType,
        title: file.name,
        url: publicUrl,
        size: file.size,
        mime: file.type,
      }).select().single()
      if (dbErr) throw dbErr
      if (ins) setDocuments(prev => [{ ...(ins as any), projects: { title: proj?.title } } as any, ...prev])
    } catch (e: any) {
      alert(`Upload fehlgeschlagen: ${e?.message ?? 'unbekannt'}`)
    }
    setUploading(false)
  }

  const typeLabel: Record<string, string> = {
    invoice: 'Rechnung', contract: 'Vertrag', briefing: 'Briefing', deliverable: 'Lieferung', other: 'Dokument',
  }

  const allItems = [
    ...invoices.map(i => ({ ...i, _type: 'invoice', _title: i.invoice_no || 'Rechnung' })),
    ...documents.map(d => ({ ...d, _type: d.type, _title: d.title || 'Dokument' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const shown = tab === 'all' ? allItems
    : tab === 'invoices' ? allItems.filter(x => x._type === 'invoice')
      : allItems.filter(x => x._type === tab.slice(0, -1))

  const filterActive = tab !== 'all'

  const tagroDocs = () => openTagro({
    contextType: 'document',
    id: 'list',
    title: 'Dokumente · Übersicht',
    subtitle: `${allItems.length} Dokument${allItems.length === 1 ? '' : 'e'}`,
  })

  const openUpload = () => fileRef.current?.click()

  return (
    <MobileCodexListChrome
      className="docs-page"
      title="Dokumente"
      legacyHeader={<MobilePageHeader title="Dokumente" />}
      mobileActions={(
        <>
          {isDevOrAdmin(userRole) ? (
            <button type="button" className="mcl-add-btn" aria-label="Datei hochladen" onClick={openUpload} disabled={uploading}>
              <Plus size={18} weight="bold" />
            </button>
          ) : (
            <button type="button" className="mcl-add-btn" aria-label="Mit Tagro" onClick={tagroDocs}>
              <Sparkle size={17} weight="fill" />
            </button>
          )}
          <div className="mcl-actions-group">
            <button
              type="button"
              className={`mcl-ctl${filterOpen ? ' on' : ''}${filterActive ? ' has-active' : ''}`}
              aria-label="Filter"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(v => !v)}
            >
              <FunnelSimple size={17} weight="regular" />
            </button>
            <button
              type="button"
              className="mcl-ctl"
              aria-label="Aktualisieren"
              onClick={() => window.location.reload()}
            >
              <ArrowsClockwise size={17} weight="regular" />
            </button>
          </div>
          {filterOpen && (
            <>
              <div className="mcl-filter-menu" role="menu">
                <p className="mcl-sheet-title">Kategorie</p>
                {TAB_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitem"
                    className={`mcl-filter-item${tab === opt.id ? ' on' : ''}`}
                    onClick={() => { setTab(opt.id); setFilterOpen(false) }}
                  >
                    {opt.label}
                    {opt.id === 'all' && ` (${allItems.length})`}
                    {opt.id === 'invoices' && ` (${invoices.length})`}
                  </button>
                ))}
              </div>
              <button type="button" className="mcl-sheet-backdrop" aria-label="Schließen" onClick={() => setFilterOpen(false)} />
            </>
          )}
        </>
      )}
      dock={{
        onDragUp: tagroDocs,
        primary: {
          id: 'tagro',
          label: 'Dokumente besprechen...',
          icon: <Sparkle size={14} weight="fill" />,
          onClick: tagroDocs,
          ariaLabel: 'Mit Tagro besprechen',
        },
        secondary: {
          id: 'compose',
          icon: <PencilSimple size={20} weight="bold" />,
          onClick: tagroDocs,
          ariaLabel: 'Mit Tagro bearbeiten',
        },
      }}
      extraCss={DOCS_CSS}
    >
      <PageHeader
        title="Dokumente"
        subtitle="Angebot, Vertrag & Rechnung erstellen — plus hochgeladene Dateien."
        actions={(
          <button type="button" className="docs-tagro-btn" onClick={tagroDocs}>
            Mit Tagro bearbeiten
          </button>
        )}
      />

      <div className="docs-builder-wrap">
        <DocumentBuilderSection />
      </div>

      {isDevOrAdmin(userRole) && (
        <div className="docs-upload-bar">
          <span className="docs-upload-label">UPLOAD</span>
          <select value={uploadProj} onChange={e => setUploadProj(e.target.value)} className="docs-upload-select">
            <option value="">Projekt wählen…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="docs-upload-select">
            <option value="deliverable">Lieferung</option>
            <option value="invoice">Rechnung</option>
            <option value="contract">Vertrag</option>
            <option value="briefing">Briefing</option>
            <option value="other">Sonstiges</option>
          </select>
          <input ref={fileRef} type="file" className="docs-file-input" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
          <button type="button" className="docs-upload-btn" onClick={openUpload} disabled={uploading || !uploadProj}>
            {uploading ? 'Lädt…' : '+ Datei hochladen'}
          </button>
          <p className="docs-upload-hint">Lieferungen erscheinen automatisch im Client-Account.</p>
        </div>
      )}

      <FilterPills
        value={tab}
        onChange={(v) => setTab(v as TabId)}
        options={[
          { id: 'all', label: `Alle (${allItems.length})` },
          { id: 'invoices', label: `Rechnungen (${invoices.length})` },
          { id: 'contracts', label: 'Verträge' },
          { id: 'briefings', label: 'Briefings' },
          { id: 'deliverables', label: 'Lieferungen' },
        ]}
      />

      {loading ? (
        <div className="docs-loading">
          <div className="docs-spinner" />
        </div>
      ) : shown.length === 0 ? (
        <DocumentsEmptyState />
      ) : (
        <div className="docs-list">
          {shown.map((item, i) => (
            <div key={item.id} className={`docs-row${i < shown.length - 1 ? ' has-border' : ''}`}>
              <div className="docs-row-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
              </div>
              <div className="docs-row-main">
                <p className="docs-row-title">{item._title}</p>
                <p className="docs-row-meta">
                  {typeLabel[item._type] ?? 'Dokument'} · {item.projects?.title ?? '—'} · {new Date(item.created_at).toLocaleDateString('de')}
                </p>
              </div>
              {item.amount && <span className="docs-row-amount">€{Number(item.amount).toLocaleString('de')}</span>}
              <span className={`docs-row-status${item.status === 'paid' ? ' is-paid' : ''}`}>
                {(item.status ?? 'pending').toUpperCase()}
              </span>
              {(item.file_url || item.pdf_url) && (
                <a href={item.file_url ?? item.pdf_url} target="_blank" rel="noopener" className="docs-row-dl">↓</a>
              )}
            </div>
          ))}
        </div>
      )}
    </MobileCodexListChrome>
  )
}

const DOCS_CSS = `
  .docs-tagro-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 30px; padding: 0 14px; border-radius: 32px;
    background: #5B647D; color: #fff; border: 0;
    font: inherit; font-size: 12.5px; font-weight: 500;
    letter-spacing: .012em; cursor: pointer;
  }
  .docs-builder-wrap { margin-bottom: 14px; }
  .docs-upload-bar {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 12px 16px; margin-bottom: 14px;
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
  }
  .docs-upload-label { font-size: 11px; font-weight: 800; color: var(--text-muted); letter-spacing: .07em; }
  .docs-upload-select {
    padding: 8px 11px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; font-size: 12.5px; color: var(--text); font-family: inherit; flex: 1 1 180px;
  }
  .docs-file-input { display: none; }
  .docs-upload-btn {
    padding: 9px 16px; background: var(--btn-prim); color: var(--btn-prim-text);
    border: none; border-radius: 9px; font-size: 12.5px; font-weight: 700;
    cursor: pointer; font-family: inherit;
  }
  .docs-upload-btn:disabled { background: var(--surface-2); color: var(--text-muted); cursor: default; }
  .docs-upload-hint { font-size: 11px; color: var(--text-muted); margin: 0; flex-basis: 100%; }

  .docs-loading { display: flex; justify-content: center; padding: 48px; }
  .docs-spinner {
    width: 24px; height: 24px;
    border: 2px solid var(--border); border-top-color: var(--text);
    border-radius: 50%; animation: spin .8s linear infinite;
  }

  .docs-empty {
    min-height: 320px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 48px 24px; color: var(--text);
  }
  .docs-empty-mark {
    width: 56px; height: 56px; margin: 0 0 22px;
    display: inline-flex; align-items: center; justify-content: center;
    color: var(--text-muted);
  }
  .docs-empty h2 {
    margin: 0 0 12px; color: var(--text);
    font-size: 22px; line-height: 1.2; font-weight: 500;
  }
  .docs-empty p {
    max-width: 430px; margin: 0; color: var(--text-secondary);
    font-size: 15px; line-height: 1.55; font-weight: 500;
  }

  .docs-list {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg, 14px); overflow: hidden;
  }
  .docs-row {
    padding: 14px 20px; display: flex; gap: 14px; align-items: center;
  }
  .docs-row.has-border { border-bottom: 1px solid var(--border); }
  .docs-row-icon {
    width: 38px; height: 38px; border-radius: 9px; background: var(--surface-2);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    color: var(--text-secondary);
  }
  .docs-row-main { flex: 1; min-width: 0; }
  .docs-row-title { font-size: 13px; font-weight: 600; color: var(--text); margin: 0; }
  .docs-row-meta { font-size: 11px; color: var(--text-muted); margin: 2px 0 0; }
  .docs-row-amount { font-size: 14px; font-weight: 700; color: var(--text); flex-shrink: 0; }
  .docs-row-status {
    padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;
    color: var(--text-muted); background: var(--surface-2); flex-shrink: 0;
  }
  .docs-row-status.is-paid { color: var(--green-dark); background: var(--green-bg); }
  .docs-row-dl {
    padding: 6px 12px; background: var(--surface-2); border: 1px solid var(--border);
    border-radius: var(--r-sm, 8px); font-size: 12px; font-weight: 600;
    color: var(--text); flex-shrink: 0; text-decoration: none;
  }

  @media (max-width: 768px) {
    .docs-page .fui-top,
    .docs-page .fui-bar { display: none !important; }
    .docs-page .docs-upload-bar { display: none !important; }
    .docs-page .docs-builder-wrap { margin-bottom: 8px; }

    .docs-list {
      background: transparent !important;
      border: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
    }
    .docs-row {
      background: #FFFFFF !important;
      border: 1px solid rgba(0,0,0,.06) !important;
      border-radius: 14px !important;
      box-shadow: var(--mcl-white-elev) !important;
      padding: 16px !important;
    }
    .docs-row.has-border { border-bottom: 1px solid rgba(0,0,0,.06) !important; }
    .docs-row-title {
      font-size: 16px !important;
      font-weight: 400 !important;
      letter-spacing: -0.01em !important;
    }
    .docs-row-meta { font-size: 14px !important; margin-top: 4px !important; }
    .docs-empty {
      background: #FFFFFF !important;
      border: 1px solid rgba(0,0,0,.06) !important;
      border-radius: 14px !important;
      box-shadow: var(--mcl-white-elev) !important;
      min-height: 280px !important;
    }
    .docs-empty h2 { font-size: 20px !important; font-weight: 400 !important; }
    [data-theme="dark"] .docs-row,
    [data-theme="classic-dark"] .docs-row,
    [data-theme="dark"] .docs-empty,
    [data-theme="classic-dark"] .docs-empty {
      background: rgba(255,255,255,.06) !important;
      border-color: rgba(255,255,255,.1) !important;
    }
  }
`
