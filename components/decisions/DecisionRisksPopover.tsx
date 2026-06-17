'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Lightning, ShieldCheck, Warning, WarningCircle } from '@phosphor-icons/react'
import { openTagro } from '@/components/TagroOverlay'
import type { DecisionRiskSignal } from '@/lib/decisions/risks'

type Props = {
  risks: DecisionRiskSignal[]
  onClose: () => void
  openCount: number
}

function SeverityIcon({ severity }: { severity: DecisionRiskSignal['severity'] }) {
  if (severity === 'critical') return <WarningCircle size={15} weight="fill" />
  if (severity === 'high') return <Warning size={15} weight="fill" />
  return <ShieldCheck size={15} weight="regular" />
}

export default function DecisionRisksPopover({ risks, onClose, openCount }: Props) {
  const router = useRouter()

  function openDecision(id: string) {
    onClose()
    router.push(`/decisions/${id}`)
  }

  return (
    <div className="dec-risks-popover" role="dialog" aria-label="Entscheidungsrisiken">
      <div className="dec-risks-popover-glass" aria-hidden />
      <header className="dec-risks-popover-head">
        <div className="dec-risks-popover-title-wrap">
          <span className="dec-risks-popover-icon" aria-hidden>
            <Lightning size={16} weight="fill" />
          </span>
          <div>
            <p className="dec-risks-popover-kicker">Tagro Risiko-Radar</p>
            <h2 className="dec-risks-popover-title">
              {risks.length === 0
                ? 'Alles ruhig'
                : `${risks.length} Risiko${risks.length === 1 ? '' : 'en'} aktiv`}
            </h2>
          </div>
        </div>
        {openCount > 0 && (
          <span className="dec-risks-popover-meta">{openCount} offen</span>
        )}
      </header>

      <div className="dec-risks-popover-body">
        {risks.length === 0 ? (
          <div className="dec-risks-empty">
            <p>Keine akuten Risiken bei deinen offenen Entscheidungen.</p>
            <small>Tagro überwacht Dringlichkeit, Fristen und Eskalationen automatisch.</small>
          </div>
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
                    <span className="dec-risks-item-top">
                      <strong>{risk.title}</strong>
                      <span className={`dec-risks-pill dec-risks-pill--${risk.severity}`}>
                        {risk.reason}
                      </span>
                    </span>
                    {risk.projectTitle && (
                      <span className="dec-risks-project">{risk.projectTitle}</span>
                    )}
                    {risk.detail && (
                      <span className="dec-risks-detail">{risk.detail}</span>
                    )}
                    {risk.dueLabel && (
                      <span className="dec-risks-due">{risk.dueLabel}</span>
                    )}
                  </span>
                  <ArrowRight size={14} weight="bold" className="dec-risks-chevron" aria-hidden />
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
                ? `${risks.length} Risiko${risks.length === 1 ? '' : 'en'} · ${openCount} offen`
                : `${openCount} offen`,
            })
          }}
        >
          <Lightning size={14} weight="fill" />
          Mit Tagro besprechen
        </button>
      </footer>
    </div>
  )
}
