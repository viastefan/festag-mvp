'use client'

import { Check } from '@phosphor-icons/react'
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

/* Same mark language as the overview list: a check reads as chosen, a dot as
   Tagro's pending pick, nothing at all as a quiet, unpicked option. */
function OptionMark({ on, recommended }: { on: boolean; recommended: boolean }) {
  return (
    <span className={`ffl-node-mark${on ? ' is-check' : recommended ? ' is-attn is-green' : ' is-idle'}`} aria-hidden>
      {on ? <Check size={10} weight="bold" /> : recommended ? <span className="ffl-node-dot" /> : null}
    </span>
  )
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
  const pick = selected
    ? topic.options.find((o) => o.id === selected)?.label || topic.recommendLabel
    : topic.recommendLabel

  return (
    <div className={rootClass}>
      {showDecision ? (
        <article className="fos-panel is-decision" data-ffl-bridge-target>
          <h2 className="fos-panel-title">{topic.question}</h2>
          {topic.options.length >= 2 ? (
            <div className="fos-options" role="radiogroup" aria-label="Optionen">
              {topic.options.map((opt) => {
                const on = selected === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={[
                      'fos-option',
                      on ? 'is-on' : '',
                      opt.recommended ? 'is-rec' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelect(opt.id)}
                  >
                    <OptionMark on={on} recommended={!!opt.recommended} />
                    <span className="fos-option-copy">
                      <span className="fos-option-label">{opt.label}</span>
                      {opt.hint ? (
                        <span className="fos-option-hint">{opt.hint}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
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
          <p className="fos-tagro-lead">
            Tagro empfiehlt <em>{pick}</em>.
          </p>
          {topic.reasons.length > 0 ? (
            <ul className="fos-tagro-reasons">
              {topic.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
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
