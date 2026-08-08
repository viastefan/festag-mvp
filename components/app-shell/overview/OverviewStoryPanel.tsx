'use client'

import { Sparkle } from '@phosphor-icons/react'
import type { DecisionCanvasTopic } from '@/lib/overview/decision-canvas'

type Props = {
  topic: DecisionCanvasTopic
  selected: string | null
  onSelect: (id: string) => void
  showDecision: boolean
  showRecommend: boolean
  onOpenRecommend?: () => void
  onExplain?: () => void
  onAccept: () => void
  busy: boolean
  error: string | null
  acceptLabel?: string
  layout?: 'stack' | 'rail'
}

export default function OverviewStoryPanel({
  topic,
  selected,
  onSelect,
  showDecision,
  showRecommend,
  onOpenRecommend,
  onExplain,
  onAccept,
  busy,
  error,
  acceptLabel = 'Empfehlung übernehmen',
  layout = 'stack',
}: Props) {
  const rootClass = layout === 'rail' ? 'osp-rail' : 'osp-stack'

  return (
    <div className={rootClass}>
      {showDecision ? (
        <article className="fos-panel is-decision" data-ffl-bridge-target>
          <p className="fos-panel-label">Entscheidung</p>
          <h2 className="fos-panel-title">{topic.question}</h2>
          {topic.options.length >= 2 ? (
            <div className="fos-options" role="radiogroup" aria-label="Optionen">
              {topic.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === opt.id}
                  className={[
                    'fos-option',
                    selected === opt.id ? 'is-on' : '',
                    opt.recommended ? 'is-rec' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelect(opt.id)}
                >
                  <span className="fos-option-label">{opt.label}</span>
                  {opt.hint ? (
                    <span className="fos-option-hint">{opt.hint}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          {!showRecommend && onOpenRecommend ? (
            <button type="button" className="fos-text-action" onClick={onOpenRecommend}>
              Empfehlung ansehen
            </button>
          ) : null}
        </article>
      ) : null}

      {showRecommend ? (
        <article className="fos-panel is-tagro" data-ffl-bridge-target>
          <div className="fos-tagro-head">
            <Sparkle size={15} weight="fill" aria-hidden />
            <span>Tagro</span>
          </div>
          <p className="fos-tagro-pick">{topic.recommendLabel}</p>
          <p className="fos-tagro-why">Warum</p>
          <ul className="fos-tagro-reasons">
            {topic.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {error ? (
            <p className="fos-tagro-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="fos-btn-primary"
            disabled={busy}
            onClick={onAccept}
          >
            {busy ? 'Wird übernommen…' : acceptLabel}
          </button>
          {onExplain ? (
            <button type="button" className="fos-text-action" onClick={onExplain}>
              Erklären
            </button>
          ) : null}
        </article>
      ) : null}
    </div>
  )
}
