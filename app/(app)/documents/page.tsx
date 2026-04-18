'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Doc = { id: string; type: string; title: string; description: string|null; file_url: string|null; amount: number|null; status: string; created_at: string }

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = '/login'; return }
      supabase.from('documents').select('*').eq('user_id', data.session.user.id).order('created_at', { ascending: false }).then(({ data: d }) => {
        setDocs(d ?? [])
        setLoading(false)
      })
    })
  }, [])

  const typeConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    invoice:     { label: 'Rechnung',    color: '#D97706', bg: '#FEF3C7', icon: '€' },
    briefing:    { label: 'Briefing',    color: '#1E40AF', bg: '#DBEAFE', icon: '◫' },
    contract:    { label: 'Vertrag',     color: '#065F46', bg: '#D1FAE5', icon: '§' },
    deliverable: { label: 'Lieferung',   color: '#6D28D9', bg: '#EDE9FE', icon: '✓' },
    other:       { label: 'Dokument',    color: '#6B7280', bg: '#F3F4F6', icon: '◻' },
  }

  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter)
  const counts = {
    all: docs.length,
    invoice: docs.filter(d => d.type === 'invoice').length,
    briefing: docs.filter(d => d.type === 'briefing').length,
    contract: docs.filter(d => d.type === 'contract').length,
    deliverable: docs.filter(d => d.type === 'deliverable').length,
  }

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>Dokumente</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rechnungen · Briefings · Verträge · Lieferungen</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Alle' },
          { key: 'invoice', label: 'Rechnungen' },
          { key: 'briefing', label: 'Briefings' },
          { key: 'contract', label: 'Verträge' },
          { key: 'deliverable', label: 'Lieferungen' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
            background: filter === f.key ? 'var(--accent-light)' : 'var(--surface)',
            color: filter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 12, fontWeight: filter === f.key ? 600 : 400,
          }}>
            {f.label} ({(counts as any)[f.key] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Lädt…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--text-muted)' }}>◫</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Noch keine Dokumente</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rechnungen und Lieferungen erscheinen hier automatisch.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(d => {
            const cfg = typeConfig[d.type] ?? typeConfig.other
            return (
              <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 7px', borderRadius: 5, letterSpacing: '0.04em' }}>
                      {cfg.label.toUpperCase()}
                    </span>
                  </div>
                  {d.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{d.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {d.amount && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>€{Number(d.amount).toLocaleString('de')}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString('de')}</span>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener" style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                      Download ↓
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
