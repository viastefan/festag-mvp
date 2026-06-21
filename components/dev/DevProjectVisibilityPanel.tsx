'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Broadcast, Eye, Sparkle } from '@phosphor-icons/react'
import type { DevVisibilityOverview } from '@/lib/dev/visibility-feed'

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/** Project-scoped slice of the dev ↔ client visibility bridge. */
export default function DevProjectVisibilityPanel({
  projectId,
  projectTitle,
}: {
  projectId: string
  projectTitle?: string | null
}) {
  const [rows, setRows] = useState<DevVisibilityOverview['rows']>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dev/visibility?limit=20', { credentials: 'include' })
    if (res.ok) {
      const json = await res.json()
      const scoped = ((json.rows ?? []) as DevVisibilityOverview['rows'])
        .filter(r => r.project_id === projectId)
        .slice(0, 4)
      setRows(scoped)
    } else {
      setRows([])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  return (
    <section className="dpv-panel dev-surface">
      <div className="dpv-head">
        <p className="dpv-kicker"><Broadcast size={13} /> Client-Sicht</p>
        <h3 className="dpv-title">Was der Kunde sieht</h3>
        <p className="dpv-sub">
          Deine Aktionen, übersetzt durch Tagro, landen in der Kundenansicht
          {projectTitle ? ` für „${projectTitle}"` : ''}.
        </p>
      </div>

      <div className="dpv-flow" aria-hidden>
        <span>Dev</span>
        <ArrowRight size={11} />
        <span><Sparkle size={11} weight="fill" /> Tagro</span>
        <ArrowRight size={11} />
        <span>Kunde</span>
      </div>

      {loading ? (
        <p className="dpv-empty">Lade Signale…</p>
      ) : rows.length === 0 ? (
        <p className="dpv-empty">
          Noch keine client-sichtbaren Signale für dieses Projekt. Schreibe ein Update oder schließe einen Task ab.
        </p>
      ) : (
        <ul className="dpv-list">
          {rows.map(row => (
            <li key={row.id} className="dpv-row">
              <div className="dpv-row-top">
                <span className={`dpv-badge${row.client_visible ? ' on' : ''}`}>
                  {row.client_visible ? 'Sichtbar' : 'Intern'}
                </span>
                <time>{fmtWhen(row.created_at)}</time>
              </div>
              <p className="dpv-row-body">
                {row.client_translation || row.content || row.internal_summary || '—'}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="dpv-foot">
        <Link href={`/project/${projectId}`} className="dev-secondary-btn link-btn">
          <Eye size={13} /> Kunden-Ansicht
        </Link>
        <Link href="/dev/visibility" className="dev-secondary-btn link-btn">
          Alle Signale <ArrowRight size={12} />
        </Link>
      </div>

      <style jsx>{`
        .dpv-panel { padding: 15px; display: flex; flex-direction: column; gap: 12px; }
        .dpv-kicker {
          margin: 0 0 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .dpv-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); }
        .dpv-sub { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
        .dpv-flow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
          font-size: 11px;
          color: var(--text-secondary);
        }
        .dpv-empty { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--text-muted); }
        .dpv-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .dpv-row {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 11px;
          background: color-mix(in srgb, var(--surface-2) 40%, transparent);
        }
        .dpv-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 5px;
        }
        .dpv-row-top time { font-size: 10.5px; color: var(--text-muted); }
        .dpv-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text-muted);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 1px 6px;
        }
        .dpv-badge.on {
          color: var(--green, #22c55e);
          border-color: color-mix(in srgb, var(--green, #22c55e) 40%, transparent);
        }
        .dpv-row-body { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text); }
        .dpv-foot { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
      `}</style>
    </section>
  )
}
