'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDevOrAdmin } from '@/lib/role'
import DocumentBuilderSection from '@/components/DocumentBuilderSection'

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
        .docs-empty-art {
          position:relative;
          width:230px;
          height:150px;
          margin:0 0 30px;
          transform:translateX(4px);
        }
        .docs-empty-sheet {
          position:absolute;
          inset:auto;
          border:1px solid color-mix(in srgb, var(--border) 78%, transparent);
          border-radius:16px;
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--card) 96%, var(--surface) 4%), color-mix(in srgb, var(--surface) 86%, var(--card) 14%));
          box-shadow:0 18px 50px -34px rgba(15,23,42,.42);
          overflow:hidden;
        }
        .docs-empty-sheet.back {
          width:174px;
          height:106px;
          left:30px;
          top:0;
          opacity:.46;
          transform:rotate(-4deg);
        }
        .docs-empty-sheet.mid {
          width:190px;
          height:118px;
          left:18px;
          top:14px;
          opacity:.72;
          transform:rotate(3deg);
        }
        .docs-empty-sheet.front {
          width:212px;
          height:128px;
          left:0;
          top:22px;
          transform:rotate(-1deg);
        }
        .docs-empty-sheet.front::before {
          content:"";
          position:absolute;
          left:0;
          right:0;
          top:0;
          height:34px;
          background:linear-gradient(90deg, rgba(106,115,140,.18), rgba(106,115,140,.04));
          border-bottom:1px solid color-mix(in srgb, var(--border) 55%, transparent);
        }
        .docs-empty-line {
          position:absolute;
          left:22px;
          height:6px;
          border-radius:999px;
          background:color-mix(in srgb, var(--text-secondary) 44%, transparent);
        }
        .docs-empty-line.a { top:52px; width:118px; }
        .docs-empty-line.b { top:70px; width:154px; opacity:.68; }
        .docs-empty-line.c { top:88px; width:94px; opacity:.46; }
        .docs-empty-total {
          position:absolute;
          right:18px;
          bottom:18px;
          width:48px;
          height:20px;
          border-radius:999px;
          background:rgba(106,115,140,.13);
          border:1px solid rgba(106,115,140,.20);
        }
        [data-theme="dark"] .docs-empty-sheet,
        [data-theme="classic-dark"] .docs-empty-sheet {
          box-shadow:0 18px 50px -30px rgba(0,0,0,.66);
        }
        .docs-empty-kicker {
          margin:0 0 10px;
          color:var(--text-muted);
          font-size:11px;
          font-weight:600;
          letter-spacing:.12em;
          text-transform:uppercase;
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
      <div className="docs-empty-art" aria-hidden="true">
        <span className="docs-empty-sheet back" />
        <span className="docs-empty-sheet mid" />
        <span className="docs-empty-sheet front">
          <span className="docs-empty-line a" />
          <span className="docs-empty-line b" />
          <span className="docs-empty-line c" />
          <span className="docs-empty-total" />
        </span>
      </div>
      <p className="docs-empty-kicker">Dokumente</p>
      <h2>Noch keine Dokumente</h2>
      <p>Sobald dein Projekt aktiv wird, findest du hier Rechnungen, Briefings und Verträge.</p>
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
    <div className="page-content">
      <div className="page-header">
        <h1>Dokumente</h1>
        <p>Angebot, Vertrag &amp; Rechnung erstellen — plus hochgeladene Dateien</p>
      </div>

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

      <div className="animate-fade-up-1" style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {([
          { k: 'all',       l: `Alle (${allItems.length})` },
          { k: 'invoices',  l: `Rechnungen (${invoices.length})` },
          { k: 'contracts', l: 'Verträge' },
          { k: 'briefings', l: 'Briefings' },
          { k: 'deliverables', l: 'Lieferungen' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="tap-scale" style={{ padding: '7px 14px', borderRadius: 12, border: '1px solid var(--border)', background: tab === t.k ? 'var(--accent)' : 'var(--surface)', color: tab === t.k ? 'var(--accent-text)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.l}</button>
        ))}
      </div>

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
  )
}
