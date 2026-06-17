'use client'

import { DotsThreeVertical } from '@phosphor-icons/react'

export type DecisionItem = {
  id: string
  title: string
  project: string
  category: string
  recommendation: string
  impact: string
  timeNeeded: string
  priority: string
  primaryAction: string
  secondaryActions: [string, string]
  highlighted?: boolean
}

export default function DecisionRow({ item }: { item: DecisionItem }) {
  return (
    <>
      <div
        className={`decision-row${item.highlighted ? ' is-highlighted' : ''}`}
        data-decision-id={item.id}
      >
        <div className="decision-col decision-col-title">
          <div className="decision-title-block">
            <p className="decision-title">{item.title}</p>
            <p className="decision-project">{item.project}</p>
          </div>
          <div className="decision-tag">
            <span className="decision-tag-dot" />
            <span>{item.category}</span>
          </div>
        </div>

        <div className="decision-col decision-col-body">
          <div className="decision-block">
            <p className="decision-label">Tagro empfiehlt..</p>
            <p className="decision-copy">{item.recommendation}</p>
          </div>
          <div className="decision-block">
            <p className="decision-label">Auswirkung</p>
            <p className="decision-copy">{item.impact}</p>
          </div>
        </div>

        <div className="decision-col decision-col-meta">
          <div className="decision-block">
            <p className="decision-label">Benötigte Zeit</p>
            <p className="decision-copy">{item.timeNeeded}</p>
          </div>
          <div className="decision-block">
            <p className="decision-label">Priorität</p>
            <div className="decision-priority">
              <span>{item.priority}</span>
            </div>
          </div>
        </div>

        <div className="decision-col decision-col-actions">
          <button type="button" className="decision-menu" aria-label="Menü">
            <DotsThreeVertical size={16} weight="bold" />
          </button>
          <button type="button" className="decision-btn decision-btn-primary">
            {item.primaryAction}
          </button>
          <button type="button" className="decision-btn decision-btn-secondary">
            {item.secondaryActions[0]}
          </button>
          <button type="button" className="decision-btn decision-btn-secondary">
            {item.secondaryActions[1]}
          </button>
        </div>
      </div>
      <div className="decision-divider" />
    </>
  )
}
