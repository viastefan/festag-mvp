/**
 * Project Health — the calm surface.
 *
 * Presentational on purpose: it takes an already-computed ProjectHealth so it
 * can render on the server and so the same panel works in the project rail,
 * the decision detail and the overview without three copies of the logic.
 *
 * Design law it obeys (see lib/health/language.ts):
 *  - one number, never a table of percentages
 *  - every line carries its reason
 *  - "not measurable" is stated, never rendered as 0 or as green
 */

import { BAND_WORD, describeHealth } from '@/lib/health/language'
import type { ProjectHealth } from '@/lib/health/types'

type Props = {
  health: ProjectHealth | null
  /** Rendered as the panel heading. */
  title?: string
  /** Hide the per-factor lines — used where space is tight. */
  compact?: boolean
  /**
   * `full` owns the verdict: score, band and headline.
   * `evidence` renders only the reasons, for places where Control Status
   * already states the verdict — showing a score there would recreate the
   * second health score lib/trust/control-status.ts exists to prevent.
   */
  variant?: 'full' | 'evidence'
}

export default function ProjectHealthPanel({
  health,
  title = 'Projekt-Health',
  compact = false,
  variant = 'full',
}: Props) {
  const surface = describeHealth(health)
  const band = health?.band ?? 'healthy'
  const owns = variant === 'full'

  return (
    <section
      className={`fph${owns ? '' : ' fph--evidence'}`}
      aria-label={title}
      data-band={surface.measurable ? band : 'unknown'}
    >
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PROJECT_HEALTH_STYLES }} />

      {owns ? (
        <>
          <header className="fph-head">
            <span className="fph-kicker">{title}</span>
            {surface.measurable && health?.score != null ? (
              <span className="fph-score" aria-label={`${health.score} von 100`}>
                {health.score}
              </span>
            ) : null}
          </header>

          {surface.measurable ? (
            <span className="fph-band">{BAND_WORD[band]}</span>
          ) : (
            <span className="fph-band fph-band--unknown">Noch keine Signale</span>
          )}

          <p className="fph-headline">{surface.headline}</p>
        </>
      ) : null}

      {surface.cause ? (
        <p className="fph-cause">
          <span className="fph-cause-key">Warum</span>
          <span className="fph-cause-label">{surface.cause.label}</span>
          <span className="fph-cause-why">{surface.cause.why}</span>
        </p>
      ) : null}

      {!compact && surface.lines.length > 0 ? (
        <ul className="fph-list">
          {surface.lines.map((line) => (
            <li key={line.id} className="fph-item" data-state={line.state}>
              <span className="fph-dot" aria-hidden />
              <span className="fph-item-body">
                <span className="fph-item-label">{line.label}</span>
                <span className="fph-item-why">{line.why}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {surface.caveat ? <p className="fph-caveat">{surface.caveat}</p> : null}
    </section>
  )
}

/* Kept free of quotes, apostrophes and ampersands on purpose: this tag is
   server-rendered, and React escapes those in a text child while the browser
   never decodes them back inside a raw-text element. It is rendered via
   dangerouslySetInnerHTML for the same reason. */
const PROJECT_HEALTH_STYLES = `
.fph {
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid rgba(15, 15, 18, 0.07);
  background: transparent;
}
/* Evidence mode sits inside another card that already owns the verdict, so it
   drops its own frame and padding. */
.fph--evidence {
  padding: 0;
  border: 0;
  border-radius: 0;
}
.fph--evidence .fph-cause { margin-top: 0; }
.fph--evidence .fph-list { margin-top: 12px; }
.fph-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.fph-kicker {
  font-size: 14px;
  letter-spacing: -0.005em;
  color: #8891a0;
}
.fph-score {
  font-size: 30px;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #1e1e20;
  font-variant-numeric: tabular-nums;
}
.fph-band {
  display: inline-block;
  margin-top: 6px;
  font-size: 13px;
  letter-spacing: -0.005em;
  color: #5c5c62;
}
.fph[data-band=watch] .fph-band { color: #C9932B; }
.fph[data-band=risk] .fph-band { color: #C43C3C; }
.fph[data-band=blocked] .fph-band { color: #C43C3C; }
.fph-band--unknown { color: #8891a0; }

.fph-headline {
  margin: 10px 0 0;
  font-size: 17px;
  line-height: 1.35;
  letter-spacing: -0.012em;
  color: #1e1e20;
}
.fph-cause {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.4;
  color: #5c5c62;
}
.fph-cause-key {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8891a0;
  margin-bottom: 3px;
}
.fph-cause-label {
  display: block;
  font-size: 15px;
  line-height: 1.35;
  color: #1e1e20;
}
.fph-cause-why {
  display: block;
  font-size: 14px;
  line-height: 1.4;
  color: #8891a0;
}
.fph-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.fph-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.fph-dot {
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: #B8B6B0;
  flex-shrink: 0;
}
.fph-item[data-state=good] .fph-dot { background: #2E9B52; }
.fph-item[data-state=soft] .fph-dot { background: #C9932B; }
.fph-item[data-state=weak] .fph-dot { background: #C43C3C; }
.fph-item[data-state=unknown] .fph-dot { background: #D8D6D0; }

.fph-item-body { display: flex; flex-direction: column; gap: 2px; }
.fph-item-label {
  font-size: 15px;
  line-height: 1.35;
  color: #1e1e20;
}
.fph-item-why {
  font-size: 14px;
  line-height: 1.4;
  color: #8891a0;
}
.fph-item[data-state=unknown] .fph-item-label { color: #8891a0; }

.fph-caveat {
  margin: 16px 0 0;
  padding-top: 12px;
  border-top: 1px solid rgba(15, 15, 18, 0.06);
  font-size: 14px;
  line-height: 1.45;
  color: #8891a0;
}
`
