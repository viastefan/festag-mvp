/**
 * How one decision actually turned out — inline, in the reading flow.
 *
 * Deliberately not a card with a score: /decisions/[id] is single-column and
 * editorial by law ("one decision, at full length"), and the project verdict
 * belongs to Control Status. This note only answers a narrower question —
 * what happened *after* this particular call was made.
 *
 * The wording comes from the Learning Engine (lib/intelligence/scoring.ts →
 * decision_outcomes.summary), so the product says the same thing here as it
 * does everywhere else.
 */

export type DecisionOutcomeRow = {
  outcome_score: number | null
  acceptance: 'accepted' | 'modified' | 'dev_override' | 'rejected'
  category: string | null
  summary: string | null
  reverted: boolean
  revisions: number
  bugs: number
  delay_days: number | null
}

type Props = {
  outcome: DecisionOutcomeRow | null
  /** True once the decision has reached a terminal state. */
  resolved: boolean
}

const ACCEPTANCE_LINE: Record<DecisionOutcomeRow['acceptance'], string> = {
  accepted: 'Die Empfehlung wurde unverändert übernommen.',
  modified: 'Die Empfehlung wurde übernommen, aber angepasst.',
  dev_override: 'Die Entwicklung hat die Wahl während der Umsetzung ersetzt.',
  rejected: 'Die Empfehlung wurde abgelehnt.',
}

const n = (c: number, one: string, many: string) => `${c} ${c === 1 ? one : many}`

export default function DecisionOutcomeNote({ outcome, resolved }: Props) {
  // Nothing to say yet — an open decision has no outcome, and inventing one
  // would be exactly the meaningless verdict the constitution forbids.
  if (!resolved) return null

  const facts: string[] = []
  if (outcome) {
    if (outcome.reverted) facts.push('Wurde später durch eine andere Entscheidung ersetzt.')
    if (outcome.revisions > 0) facts.push(`${n(outcome.revisions, 'Korrekturschleife', 'Korrekturschleifen')} gingen darauf zurück.`)
    if (outcome.bugs > 0) facts.push(`${n(outcome.bugs, 'Fehler', 'Fehler')} lassen sich darauf zurückführen.`)
    if (typeof outcome.delay_days === 'number' && outcome.delay_days > 0) {
      facts.push(`Die abhängige Arbeit verzögerte sich um ${n(outcome.delay_days, 'Tag', 'Tage')}.`)
    }
  }

  return (
    <section className="dco" aria-label="Wie diese Entscheidung ausging">
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DECISION_OUTCOME_CSS }} />

      <p className="dco-kicker">Wie diese Entscheidung ausging</p>

      {outcome ? (
        <>
          <p className="dco-lead">{ACCEPTANCE_LINE[outcome.acceptance]}</p>

          {facts.length > 0 ? (
            <ul className="dco-facts">
              {facts.map((f) => (
                <li key={f} className="dco-fact">{f}</li>
              ))}
            </ul>
          ) : (
            <p className="dco-clean">Bisher ohne Nacharbeit, Fehler oder Verzug.</p>
          )}

          {outcome.summary ? <p className="dco-learned">{outcome.summary}</p> : null}
        </>
      ) : (
        <p className="dco-lead dco-lead--pending">
          Noch nicht ausgewertet — Festag misst die Folgen, sobald die abhängige
          Arbeit läuft.
        </p>
      )}
    </section>
  )
}

/* Rendered via dangerouslySetInnerHTML, never as a text child: this tag is
   server-rendered, and React escapes quotes and apostrophes in a text child
   while <style> is a raw-text element that never decodes them back — which
   breaks hydration for the whole page. That is also why quotes below are safe. */
const DECISION_OUTCOME_CSS = `
.dco {
  margin: 28px 0 0;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid rgba(15, 15, 18, 0.08);
  background: rgba(15, 15, 18, 0.015);
}
.dco-kicker {
  margin: 0 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8891a0;
}
.dco-lead {
  margin: 0;
  font-size: 17px;
  line-height: 1.4;
  letter-spacing: -0.012em;
  color: #1e1e20;
}
.dco-lead--pending { color: #5c5c62; font-size: 15px; }
.dco-facts {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dco-fact {
  font-size: 15px;
  line-height: 1.45;
  color: #5c5c62;
  padding-left: 16px;
  position: relative;
}
.dco-fact::before {
  content: "";
  position: absolute;
  left: 0;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #B8B6B0;
}
.dco-clean {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.45;
  color: #5c5c62;
}
.dco-learned {
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid rgba(15, 15, 18, 0.06);
  font-size: 14px;
  line-height: 1.45;
  color: #8891a0;
}
`
