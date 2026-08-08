'use client'

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

function Triad({ active }: { active?: boolean }) {
  return (
    <svg className="fos-triad" width={18} height={16} viewBox="0 0 18 16" aria-hidden>
      <circle cx="9" cy="3.2" r="2.1" className={active ? 'is-on' : ''} />
      <circle cx="3.4" cy="12.2" r="2.1" className={active ? 'is-on' : ''} />
      <circle cx="14.6" cy="12.2" r="2.1" className={active ? 'is-on' : ''} />
      <path
        d="M9 3.2 L3.4 12.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.85"
        opacity={active ? 0.55 : 0.28}
      />
      <path
        d="M9 3.2 L14.6 12.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.85"
        opacity={active ? 0.55 : 0.28}
      />
      {/* bottom edge left open */}
    </svg>
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
                    <span className="fos-option-mark" aria-hidden>
                      <Triad active={on || opt.recommended} />
                      <Triad active={false} />
                    </span>
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
