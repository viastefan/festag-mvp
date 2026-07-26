'use client'

import type { TagroOkmDisplayFact } from '@/lib/tagro/okm-context'

type Props = {
  facts: TagroOkmDisplayFact[]
  className?: string
}

/** Calm, collapsed disclosure of workspace patterns Tagro used. */
export default function TagroOkmPatterns({ facts, className }: Props) {
  const list = (facts || []).slice(0, 4)
  if (!list.length) return null

  return (
    <details className={`tokm${className ? ` ${className}` : ''}`}>
      <summary className="tokm-summary">
        Workspace-Muster berücksichtigt ({list.length})
      </summary>
      <ul className="tokm-list" aria-label="Workspace-Muster">
        {list.map(f => (
          <li key={f.id} className="tokm-item">
            <span className="tokm-domain">{f.domain}</span>
            <span className="tokm-claim">{f.claim}</span>
            <span className="tokm-conf">{f.confidenceLabel}</span>
          </li>
        ))}
      </ul>
      <style jsx>{`
        .tokm {
          margin: 10px 0 4px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid rgba(15, 23, 42, 0.06);
          padding: 8px 12px;
        }
        .tokm-summary {
          cursor: pointer;
          list-style: none;
          font-size: 12.5px;
          font-weight: 500;
          color: #5c5c62;
          letter-spacing: 0.01em;
        }
        .tokm-summary::-webkit-details-marker { display: none; }
        .tokm-list {
          list-style: none;
          margin: 10px 0 2px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tokm-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tokm-domain {
          font-size: 11px;
          font-weight: 500;
          color: #5c5c62;
        }
        .tokm-claim {
          font-size: 13px;
          line-height: 1.4;
          color: #1e1e20;
        }
        .tokm-conf {
          font-size: 11px;
          color: #8a8a90;
        }
        :global(html[data-theme="dark"]) .tokm,
        :global(html[data-theme="classic-dark"]) .tokm {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
        }
        :global(html[data-theme="dark"]) .tokm-summary,
        :global(html[data-theme="classic-dark"]) .tokm-summary,
        :global(html[data-theme="dark"]) .tokm-domain,
        :global(html[data-theme="classic-dark"]) .tokm-domain,
        :global(html[data-theme="dark"]) .tokm-conf,
        :global(html[data-theme="classic-dark"]) .tokm-conf {
          color: rgba(245, 245, 247, 0.58);
        }
        :global(html[data-theme="dark"]) .tokm-claim,
        :global(html[data-theme="classic-dark"]) .tokm-claim {
          color: rgba(245, 245, 247, 0.9);
        }
      `}</style>
    </details>
  )
}
