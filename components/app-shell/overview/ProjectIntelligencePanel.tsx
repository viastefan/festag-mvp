'use client'

/**
 * Project Intelligence — the calm surface of Tagro's Learning Engine.
 *
 * Design rule: never show analytics. One number, one sentence, at most three
 * concrete facts, and what Tagro took away. No credits, no tokens, no
 * "efficiency score".
 */

import { Sparkle } from '@phosphor-icons/react'
import type { OverviewPayload } from '@/components/app-shell/WorkspaceOverviewLive'

type Props = {
  intelligence: NonNullable<OverviewPayload['intelligence']>
}

export default function ProjectIntelligencePanel({ intelligence }: Props) {
  const { score, headline, highlights, learned } = intelligence
  const hasScore = score > 0

  return (
    <section className="fas-pi" aria-label="Project Intelligence">
      <style>{PROJECT_INTELLIGENCE_STYLES}</style>

      <header className="fas-pi-head">
        <span className="fas-pi-kicker">Project Intelligence</span>
        {hasScore ? (
          <span className="fas-pi-score" aria-label={`${score} von 100`}>
            {score}
            <span className="fas-pi-score-unit">%</span>
          </span>
        ) : null}
      </header>

      <p className="fas-pi-headline">{headline}</p>

      {highlights.length > 0 ? (
        <ul className="fas-pi-list">
          {highlights.map((h) => (
            <li key={h} className="fas-pi-item">
              <span className="fas-pi-dot" aria-hidden />
              {h}
            </li>
          ))}
        </ul>
      ) : null}

      {learned ? (
        <p className="fas-pi-learned">
          <Sparkle size={14} weight="fill" aria-hidden />
          {learned}
        </p>
      ) : null}
    </section>
  )
}

const PROJECT_INTELLIGENCE_STYLES = `
.fas-pi {
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid rgba(15, 15, 18, 0.07);
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.fas-pi-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.fas-pi-kicker {
  font-size: 14px;
  letter-spacing: -0.005em;
  color: #8891a0;
}
.fas-pi-score {
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #1e1e20;
  font-variant-numeric: tabular-nums;
}
.fas-pi-score-unit { font-size: 17px; color: #8891a0; margin-left: 2px; }
.fas-pi-headline {
  margin: 0;
  font-size: 17px;
  line-height: 1.35;
  letter-spacing: -0.012em;
  color: #1e1e20;
}
.fas-pi-list {
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.fas-pi-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  line-height: 1.4;
  color: #5c5c62;
}
.fas-pi-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2E9B52;
  flex-shrink: 0;
}
.fas-pi-learned {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 16px 0 0;
  padding-top: 13px;
  border-top: 1px solid rgba(15, 15, 18, 0.07);
  font-size: 15px;
  line-height: 1.45;
  color: #8891a0;
}
.fas-pi-learned svg { color: #C9932B; flex-shrink: 0; margin-top: 2px; }

html[data-theme="dark"] .fas-pi,
html[data-theme="classic-dark"] .fas-pi {
  background: rgba(26, 26, 30, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
}
html[data-theme="dark"] .fas-pi-score,
html[data-theme="dark"] .fas-pi-headline,
html[data-theme="classic-dark"] .fas-pi-score,
html[data-theme="classic-dark"] .fas-pi-headline { color: #F5F4F1; }
`.trim()
