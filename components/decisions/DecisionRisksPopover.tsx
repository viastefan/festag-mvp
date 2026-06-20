'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck, Warning, WarningCircle } from '@phosphor-icons/react'
import TagroLogo from '@/components/TagroLogo'
import { openTagro } from '@/components/TagroOverlay'
import type { DecisionRiskSignal } from '@/lib/decisions/risks'

type Props = {
  risks: DecisionRiskSignal[]
  onClose: () => void
  openCount: number
}

function SeverityIcon({ severity }: { severity: DecisionRiskSignal['severity'] }) {
  if (severity === 'critical') return <WarningCircle size={13} weight="fill" />
  if (severity === 'high') return <Warning size={13} weight="fill" />
  return <ShieldCheck size={13} weight="regular" />
}

function riskCountLabel(count: number): string {
  if (count === 0) return 'Keine aktiven Risiken'
  if (count === 1) return '1 Risiko'
  return `${count} Risiken`
}

export default function DecisionRisksPopover({ risks, onClose, openCount }: Props) {
  const router = useRouter()

  function openDecision(id: string) {
    onClose()
    // Let the parent commit sheet/backdrop closed before navigation so the
    // list route is not cached with an invisible overlay still active.
    window.requestAnimationFrame(() => {
      router.push(`/decisions/${id}`)
    })
  }

  const headline = riskCountLabel(risks.length)

  const emptyLine = openCount === 0
    ? 'Aktuell liegen keine offenen Entscheidungen vor.'
    : 'Keine Entscheidungen mit erhöhter Dringlichkeit oder naher Frist.'

  return (
    <div className="dec-risks-popover" role="dialog" aria-label="Entscheidungsrisiken">
      <header className="dec-risks-popover-head">
        <div className="dec-risks-popover-title-wrap">
          <h2 className="dec-risks-popover-title">{headline}</h2>
          {openCount > 0 && (
            <p className="dec-risks-popover-sub">{openCount} offen</p>
          )}
        </div>
      </header>

      <div className="dec-risks-popover-body">
        {risks.length === 0 ? (
          <p className="dec-risks-empty">{emptyLine}</p>
        ) : (
          <ul className="dec-risks-list">
            {risks.map(risk => (
              <li key={risk.id}>
                <button
                  type="button"
                  className={`dec-risks-item dec-risks-item--${risk.severity}`}
                  onClick={() => openDecision(risk.decisionId)}
                >
                  <span className={`dec-risks-sev dec-risks-sev--${risk.severity}`} aria-hidden>
                    <SeverityIcon severity={risk.severity} />
                  </span>
                  <span className="dec-risks-item-copy">
                    <strong className="dec-risks-item-title">{risk.title}</strong>
                    <span className="dec-risks-item-meta">
                      {risk.reason}
                      {risk.dueLabel ? ` · ${risk.dueLabel}` : ''}
                    </span>
                    {risk.projectTitle && (
                      <span className="dec-risks-project">{risk.projectTitle}</span>
                    )}
                    {risk.detail && (
                      <span className="dec-risks-detail">{risk.detail}</span>
                    )}
                  </span>
                  <ArrowRight size={13} weight="regular" className="dec-risks-chevron" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="dec-risks-popover-foot">
        <button
          type="button"
          className="dec-risks-tagro-btn"
          onClick={() => {
            onClose()
            openTagro({
              contextType: 'decision',
              id: 'risks',
              title: 'Entscheidungen · Risiken',
              subtitle: risks.length
                ? `${riskCountLabel(risks.length)} · ${openCount} offen`
                : `${openCount} offen`,
            })
          }}
        >
          <TagroLogo size={16} />
          Mit Tagro besprechen
        </button>
      </footer>
    </div>
  )
}
