'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all'|'invoices'|'contracts'|'briefings'>('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      const uid = data.session.user.id
      const [{ data: docs }, { data: inv }] = await Promise.all([
        supabase.from('documents').select('*, projects(title)').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*, projects(title)').eq('user_id', uid).order('created_at', { ascending: false }),
      ])
      setDocuments(docs ?? [])
      setInvoices(inv ?? [])
      setLoading(false)
    })
  }, [])

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
    <div>
      <div className="animate-fade-up" style={{ marginBottom: 22 }}>
        <h1 style={{ marginBottom: 4 }}>Dokumente</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Rechnungen, Verträge und Briefings</p>
      </div>

      <div className="animate-fade-up-1" style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {([
          { k: 'all',       l: `Alle (${allItems.length})` },
          { k: 'invoices',  l: `Rechnungen (${invoices.length})` },
          { k: 'contracts', l: 'Verträge' },
          { k: 'briefings', l: 'Briefings' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className="tap-scale" style={{ padding: '7px 14px', borderRadius: 20, border: '1px solid var(--border)', background: tab === t.k ? 'var(--text)' : 'var(--surface)', color: tab === t.k ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--text)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : shown.length === 0 ? (
        <div className="animate-fade-up-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>
          </div>
          <h2 style={{ marginBottom: 8 }}>Noch keine Dokumente</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 380 }}>
            Sobald dein Projekt aktiv wird, findest du hier Rechnungen, Briefings und Verträge.
          </p>
        </div>
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
