'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Broadcast, Eye, Package, Sparkle } from '@phosphor-icons/react'
import DemoPreviewBanner from '@/components/ui/DemoPreviewBanner'
import {
  DEMO_DEV_VISIBILITY,
  shouldUseDemoFallback,
} from '@/lib/demo/portal-preview'
import type { DevVisibilityOverview } from '@/lib/dev/visibility-feed'

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Dev Panel ↔ Client visibility bridge — shows what Tagro translated for the client.
 */
export default function DevClientConnectionPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<DevVisibilityOverview | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dev/visibility?limit=5', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      if ((json.rows?.length ?? 0) > 0) {
        setData(json)
        setIsDemo(false)
      } else if (shouldUseDemoFallback()) {
        setData(DEMO_DEV_VISIBILITY)
        setIsDemo(true)
      } else {
        setData(json)
        setIsDemo(false)
      }
    } else if (shouldUseDemoFallback(res.status)) {
      setData(DEMO_DEV_VISIBILITY)
      setIsDemo(true)
    } else {
      setData(null)
      setIsDemo(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const rows = (data?.rows ?? []).slice(0, compact ? 3 : 5)
  const stats = data?.stats

  return (
    <section className="dcc-panel">
      <div className="dcc-head">
        <div>
          <p className="dcc-kicker">
            <Broadcast size={14} /> Client ↔ Developer
          </p>
          <h2 className="dcc-title">Was der Client sieht</h2>
          <p className="dcc-sub">
            Deine Aktion → Tagro übersetzt → Timeline & Lieferungen im Client Panel
          </p>
        </div>
        <div className="dcc-actions">
          <Link href="/dev/visibility" className="dev-secondary-btn link-btn">
            <Eye size={13} /> Kunden-Sicht
          </Link>
          <Link href="/dev/deliverables" className="dev-secondary-btn link-btn">
            <Package size={13} /> Lieferungen
          </Link>
        </div>
      </div>

      {isDemo && <DemoPreviewBanner note="Beispiel-Signale — zeigt den Tagro-Übersetzungs-Flow im Dev Panel." />}

      {stats && (
        <div className="dcc-metrics">
          <div><strong>{stats.client_visible}</strong><span>Client-sichtbar</span></div>
          <div><strong>{stats.signals_7d}</strong><span>7 Tage</span></div>
          <div><strong>{stats.pending_deliverables}</strong><span>Freigabe offen</span></div>
        </div>
      )}

      <div className="dcc-flow" aria-hidden>
        <span>Dev-Aktion</span>
        <ArrowRight size={12} />
        <span><Sparkle size={12} weight="fill" /> Tagro</span>
        <ArrowRight size={12} />
        <span>Client sieht</span>
      </div>

      {loading ? (
        <p className="dcc-empty">Lade Kunden-Signale…</p>
      ) : rows.length === 0 ? (
        <p className="dcc-empty">
          Noch keine Client-Signale — Tasks abschließen, Lieferungen hochladen oder ein Update senden.
        </p>
      ) : (
        <ul className="dcc-list">
          {rows.map(row => (
            <li key={row.id} className="dcc-row">
              <div className="dcc-row-top">
                <span className={`dcc-badge${row.client_visible ? ' on' : ''}`}>
                  {row.client_visible ? 'Client sieht' : 'Nur Team'}
                </span>
                <time>{fmtWhen(row.created_at)}</time>
              </div>
              <p className="dcc-row-title">{row.project_title} — {row.type}</p>
              <p className="dcc-row-body">
                {row.client_translation || row.internal_summary || row.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .dcc-panel {
          margin-bottom: 22px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 92%, var(--surface-2));
        }
        .dcc-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .dcc-kicker {
          margin: 0 0 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: var(--accent);
        }
        .dcc-title { margin: 0; font-size: 16px; font-weight: 500; color: var(--text); }
        .dcc-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--text-muted); max-width: 480px; }
        .dcc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .link-btn { text-decoration: none; }
        .dcc-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }
        .dcc-metrics div {
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--surface-2);
        }
        .dcc-metrics strong { display: block; font-size: 18px; font-weight: 500; color: var(--text); }
        .dcc-metrics span { font-size: 11px; color: var(--text-muted); }
        .dcc-flow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          padding: 8px 10px;
          border-radius: 8px;
          background: color-mix(in srgb, var(--accent) 6%, transparent);
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        .dcc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .dcc-row {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .dcc-row-top { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .dcc-row-top time { font-size: 10.5px; color: var(--text-muted); }
        .dcc-badge {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .dcc-badge.on { color: var(--green-dark, var(--accent)); }
        .dcc-row-title { margin: 0; font-size: 13px; font-weight: 500; color: var(--text); }
        .dcc-row-body { margin: 4px 0 0; font-size: 12px; line-height: 1.45; color: var(--text-secondary); }
        .dcc-empty { margin: 0; font-size: 12.5px; color: var(--text-muted); }
      `}</style>
    </section>
  )
}
