'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowsClockwise, Broadcast, Eye, Package } from '@phosphor-icons/react'
import { CLIENT_DELIVERABLES_CSS } from '@/components/client/client-deliverables-styles'
import { DEV_MOBILE_PAGE_CSS } from '@/components/dev/dev-mobile-page-styles'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import { DEMO_DEV_VISIBILITY, shouldUseDemoFallback } from '@/lib/demo/portal-preview'
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
  const [isDemo, setIsDemo] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/dev/visibility', { credentials: 'include' })
    const json = await res.json()
    if (res.ok) {
      setData(json)
      setIsDemo((json.rows?.length ?? 0) === 0 && shouldUseDemoFallback())
      if ((json.rows?.length ?? 0) === 0 && shouldUseDemoFallback()) setData(DEMO_DEV_VISIBILITY)
    } else if (shouldUseDemoFallback(res.status)) {
      setData(DEMO_DEV_VISIBILITY)
      setIsDemo(true)
      setError(null)
    } else {
      setError(json.error || 'Feed konnte nicht geladen werden.')
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="dmp-page dev-page">
      <style>{CLIENT_DELIVERABLES_CSS}{DEV_MOBILE_PAGE_CSS}</style>

      <header className="dmp-head">
        <p className="dmp-kicker">Dev Panel</p>
        <h1 className="dmp-title">
          <Eye size={22} weight="regular" />
          Kunden-Sichtbarkeit
        </h1>
        <p className="dmp-lead">
          Was Tagro aus deiner Arbeit für den Client übersetzt — jede Aktion soll Verständnis schaffen, nicht Rauschen.
        </p>
        <div className="dmp-vis-head-actions" style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Link href="/dev/deliverables" className="dmp-btn dmp-btn-ghost" style={{ textDecoration: 'none' }}>
            <Package size={16} /> Lieferungen
          </Link>
          <button type="button" className="dmp-btn dmp-btn-ghost dmp-btn-icon" aria-label="Neu laden" onClick={() => void load()}>
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </header>

      <nav className="dev-mobile-quick" aria-label="Schnellzugriff">
        <Link href="/dev/deliverables"><Package size={13} /> Lieferungen</Link>
        <Link href="/dev/briefing">Briefing</Link>
        <Link href="/dev/captures">Captures</Link>
        <button type="button" onClick={() => void load()}>Aktualisieren</button>
      </nav>

      {isDemo && <DemoPreviewBanner note="Beispiel-Signale — zeigt, wie Tagro Dev-Aktionen für den Client übersetzt." />}

      {data && (
        <div className="dmp-vis-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Signale gesamt', value: data.stats.total },
            { label: 'Client-sichtbar', value: data.stats.client_visible },
            { label: 'Letzte 7 Tage', value: data.stats.signals_7d },
            { label: 'Lieferungen offen', value: data.stats.pending_deliverables },
          ].map(m => (
            <div key={m.label} className="dmp-card cd-card" style={{ marginBottom: 0, padding: 14 }}>
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

      <p className="dmp-tip" style={{ marginTop: 28 }}>
        <Broadcast size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Golden Rule: Keine Aktion verschwindet — alles fließt über Tagro in den Client-Verlauf.</span>
      </p>
    </div>
  )
}
