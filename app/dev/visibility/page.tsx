'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, Broadcast, Eye, Package } from '@phosphor-icons/react'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import type { DevVisibilityOverview } from '@/lib/dev/visibility-feed'

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function DevVisibilityPage() {
  const [data, setData] = useState<DevVisibilityOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/dev/visibility', { credentials: 'include' })
    const json = await res.json()
    if (res.ok) setData(json)
    else setError(json.error || 'Feed konnte nicht geladen werden.')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div style={{ padding: '24px 28px 48px', maxWidth: 960, margin: '0 auto' }}>
      <style>{CLIENT_DELIVERABLES_CSS}</style>

      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={22} /> Kunden-Sichtbarkeit
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)', maxWidth: 520 }}>
            Was Tagro aus deiner Arbeit für den Client übersetzt — jede Aktion soll Verständnis schaffen, nicht Rauschen.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dev/deliverables" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, textDecoration: 'none', color: 'var(--text)' }}>
            <Package size={16} /> Lieferungen
          </Link>
          <button type="button" onClick={() => void load()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </header>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Signale gesamt', value: data.stats.total },
            { label: 'Client-sichtbar', value: data.stats.client_visible },
            { label: 'Letzte 7 Tage', value: data.stats.signals_7d },
            { label: 'Lieferungen offen', value: data.stats.pending_deliverables },
          ].map(m => (
            <div key={m.label} className="cd-card" style={{ padding: 14 }}>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 500 }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--text-muted)' }}>Lade Kunden-Feed…</p>}

      {!loading && data && (
        <div className="cd-timeline">
          {data.rows.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              Noch keine Signale — Tasks abschließen, Lieferungen hochladen oder Updates an den Client senden.
            </p>
          ) : data.rows.map(row => (
            <div key={row.id} className="cd-tl-row">
              <time className="cd-tl-time">{fmtWhen(row.created_at)}</time>
              <div>
                <span className="cd-tl-kind">
                  {row.client_visible ? 'Client sieht' : 'Nur Team'} · {row.type}
                </span>
                <p className="cd-tl-title">{row.project_title || 'Projekt'} — {row.source}</p>
                <p className="cd-tl-body">
                  {row.client_translation || row.internal_summary || row.content || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 28, fontSize: 13, color: 'var(--text-muted)' }}>
        <Broadcast size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
        Golden Rule: Keine Aktion verschwindet — alles fließt über Tagro in den Client-Verlauf.
      </p>
    </div>
  )
}
