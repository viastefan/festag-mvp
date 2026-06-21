'use client'

import Link from 'next/link'
import {
  Article, Package, Scales, Sparkle,
} from '@phosphor-icons/react'
import { openTagro } from '@/components/TagroOverlay'

type Props = {
  projectId: string
  projectTitle: string
}

export default function DevProjectTagroActions({ projectId, projectTitle }: Props) {
  return (
    <section className="dta-panel dev-surface">
      <p className="dta-kicker"><Sparkle size={13} weight="fill" /> Tagro</p>
      <h3 className="dta-title">Schnellaktionen</h3>
      <p className="dta-sub">Übersetze Arbeit in Klarheit — ohne den Kunden manuell zu briefen.</p>

      <div className="dta-grid">
        <button
          type="button"
          className="dta-btn primary"
          onClick={() => openTagro({
            contextType: 'project',
            id: projectId,
            title: projectTitle,
            projectId,
          })}
        >
          <Sparkle size={15} weight="fill" />
          <span>Mit Tagro besprechen</span>
        </button>

        <Link href={`/dev/updates?project=${projectId}`} className="dta-btn">
          <Article size={15} />
          <span>Status an Kunde</span>
        </Link>

        <button
          type="button"
          className="dta-btn"
          onClick={() => openTagro({
            contextType: 'decision',
            id: 'new',
            title: 'Neue Entscheidung',
            subtitle: projectTitle,
            projectId,
          })}
        >
          <Scales size={15} />
          <span>Entscheidung anfordern</span>
        </button>

        <Link href={`/dev/deliverables?project=${projectId}`} className="dta-btn">
          <Package size={15} />
          <span>Lieferung freigeben</span>
        </Link>
      </div>

      <style jsx>{`
        .dta-panel { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .dta-kicker {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .04em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .dta-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--text); }
        .dta-sub { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--text-muted); }
        .dta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .dta-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          min-height: 72px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface-2) 30%, transparent);
          color: var(--text);
          font: inherit;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background .12s, border-color .12s, transform .1s;
        }
        .dta-btn:hover { background: var(--surface-2); border-color: var(--border-strong); }
        .dta-btn:active { transform: scale(.98); }
        .dta-btn.primary {
          background: var(--btn-prim, #5b647d);
          border-color: transparent;
          color: var(--btn-prim-text, #fff);
        }
        .dta-btn.primary:hover { opacity: .92; }
        @media (max-width: 520px) {
          .dta-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  )
}
