'use client'

import type { ProofCapsule } from '@/lib/proof/types'

const KIND_HINT: Record<ProofCapsule['kind'], string> = {
  signal: 'Signal',
  decision: 'Entscheidung',
  issue: 'Issue',
  proof: 'Nachweis',
  activity: 'Aktivität',
  deliverable: 'Lieferung',
}

type Props = {
  items: ProofCapsule[]
  className?: string
  /** Compact chips under pulse / briefing. */
  compact?: boolean
}

export default function ProofCapsules({ items, className, compact }: Props) {
  const list = (items || []).slice(0, 3)
  if (!list.length) return null

  return (
    <>
      <style>{PROOF_CAPSULES_CSS}</style>
      <ul
        className={`proof-caps${compact ? ' proof-caps--compact' : ''}${className ? ` ${className}` : ''}`}
        aria-label="Nachweise"
      >
        {list.map(item => {
          const body = (
            <>
              <span className="proof-caps-kind">{KIND_HINT[item.kind]}</span>
              <span className="proof-caps-label">{item.label}</span>
            </>
          )
          if (item.href) {
            return (
              <li key={item.id}>
                <a className="proof-caps-chip" href={item.href} target="_blank" rel="noreferrer">
                  {body}
                </a>
              </li>
            )
          }
          return (
            <li key={item.id}>
              <span className="proof-caps-chip">{body}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

const PROOF_CAPSULES_CSS = `
.proof-caps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.proof-caps--compact { gap: 6px; }
.proof-caps-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #1e1e20;
  text-decoration: none;
  font-size: 12px;
  line-height: 1.35;
  letter-spacing: 0.01em;
}
.proof-caps--compact .proof-caps-chip {
  padding: 5px 9px;
  font-size: 11.5px;
}
.proof-caps-kind {
  flex-shrink: 0;
  color: #5c5c62;
  font-weight: 500;
}
.proof-caps-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
a.proof-caps-chip:hover {
  background: #fafafa;
  border-color: rgba(15, 23, 42, 0.12);
}
html[data-theme="dark"] .proof-caps-chip,
html[data-theme="classic-dark"] .proof-caps-chip {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(245, 245, 247, 0.92);
}
html[data-theme="dark"] .proof-caps-kind,
html[data-theme="classic-dark"] .proof-caps-kind {
  color: rgba(245, 245, 247, 0.58);
}
html[data-theme="dark"] a.proof-caps-chip:hover,
html[data-theme="classic-dark"] a.proof-caps-chip:hover {
  background: rgba(255, 255, 255, 0.1);
}
`
