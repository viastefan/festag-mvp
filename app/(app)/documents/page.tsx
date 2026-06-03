'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDevOrAdmin } from '@/lib/role'
import DocumentBuilderSection from '@/components/DocumentBuilderSection'
import PageHeader from '@/components/ui/PageHeader'
import FilterPills from '@/components/ui/FilterPills'

function DocumentsEmptyState() {
  return (
    <div className="docs-empty">
      <style>{`
        .docs-empty {
          min-height:430px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          padding:64px 24px;
          color:var(--text);
        }
        /* Linear-style minimal empty mark — fine stroked SVG, no boxy illustration. */
        .docs-empty-mark {
          width:56px; height:56px; margin:0 0 22px;
          display:inline-flex; align-items:center; justify-content:center;
          color: var(--text-muted);
        }
        .docs-empty h2 {
          margin:0 0 12px;
          color:var(--text);
          font-size:22px;
          line-height:1.2;
          font-weight:500;
          letter-spacing:0;
        }
        .docs-empty p {
          max-width:430px;
          margin:0;
          color:var(--text-secondary);
          font-size:15px;
          line-height:1.55;
          font-weight:500;
          letter-spacing:0;
        }
      `}</style>
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
  const [tab, setTab] = useState<'all'|'invoices'|'contracts'|'briefings'|'deliverables'>('all')
  const [userRole, setUserRole] = useState<string>('')
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

  return (
    <div className="fui-page">
      <PageHeader title="Dokumente" subtitle="Angebot, Vertrag & Rechnung erstellen — plus hochgeladene Dateien." />

      <div className="fui-body">
      {/* Document builder (Angebot / Vertrag / Rechnung from templates) */}
      <DocumentBuilderSection />

      {/* Upload bar (dev/admin only) */}
      {isDevOrAdmin(userRole) && (
        <div className="animate-fade-up-1" style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'.07em' }}>UPLOAD</span>
          <select value={uploadProj} onChange={e => setUploadProj(e.target.value)} style={{ padding:'8px 11px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:12.5, color:'var(--text)', fontFamily:'inherit', flex:'1 1 180px' }}>
            <option value="">Projekt wählen…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={uploadType} onChange={e => setUploadType(e.target.value)} style={{ padding:'8px 11px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, fontSize:12.5, color:'var(--text)', fontFamily:'inherit' }}>
            <option value="deliverable">Lieferung</option>
            <option value="invoice">Rechnung</option>
            <option value="contract">Vertrag</option>
            <option value="briefing">Briefing</option>
            <option value="other">Sonstiges</option>
          </select>
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}/>
          <button onClick={() => fileRef.current?.click()} disabled={uploading || !uploadProj}
            style={{ padding:'9px 16px', background:uploadProj && !uploading ? 'var(--btn-prim)' : 'var(--surface-2)', color:uploadProj && !uploading ? 'var(--btn-prim-text)' : 'var(--text-muted)', border:'none', borderRadius:9, fontSize:12.5, fontWeight:700, cursor:uploadProj && !uploading ? 'pointer' : 'default', fontFamily:'inherit' }}>
            {uploading ? 'Lädt…' : '+ Datei hochladen'}
          </button>
          <p style={{ fontSize:11, color:'var(--text-muted)', margin:0, flexBasis:'100%' }}>
            Lieferungen erscheinen automatisch im Client-Account.
          </p>
        </div>
      )}

      </div>

      <FilterPills
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { id: 'all', label: `Alle (${allItems.length})` },
          { id: 'invoices', label: `Rechnungen (${invoices.length})` },
          { id: 'contracts', label: 'Verträge' },
          { id: 'briefings', label: 'Briefings' },
          { id: 'deliverables', label: 'Lieferungen' },
        ]}
      />

      <div className="fui-body">
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : shown.length === 0 ? (
        <DocumentsEmptyState />
      ) : (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {shown.map((item, i) => (
            <div key={item.id} style={{ padding: '14px 20px', borderBottom: i < shown.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{item._title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {typeLabel[item._type] ?? 'Dokument'} · {item.projects?.title ?? '—'} · {new Date(item.created_at).toLocaleDateString('de')}
                </p>
              </div>
              {item.amount && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>€{Number(item.amount).toLocaleString('de')}</span>}
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: item.status === 'paid' ? 'var(--green-dark)' : 'var(--text-muted)', background: item.status === 'paid' ? 'var(--green-bg)' : 'var(--surface-2)', flexShrink: 0 }}>
                {(item.status ?? 'pending').toUpperCase()}
              </span>
              {(item.file_url || item.pdf_url) && (
                <a href={item.file_url ?? item.pdf_url} target="_blank" rel="noopener" style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', flexShrink: 0 }}>↓</a>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
