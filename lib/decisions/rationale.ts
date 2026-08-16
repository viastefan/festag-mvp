// ─────────────────────────────────────────────────────────────────────────────
// Why Tagro says what it says.
//
// The engine records everything needed to justify itself — decision_type,
// reversibility, authority, effective_due_source, urgency_score, the linked
// work, the auto-resolve strategy — and the orchestration spec makes it a rule
// that none of it is a black box (§1.4 "always explain", §4 "no black-box
// urgency"). Until now the UI showed the conclusion and swallowed the grounds.
//
// This module turns those columns into plain German sentences. It never
// invents a reason: every block is derived from a stored value, and anything
// the engine did not record simply does not appear.
// ─────────────────────────────────────────────────────────────────────────────

import type { AffectedWork } from '@/lib/decisions/affected'
import type { Decision } from '@/components/decisions/decisions-shared'
import { fmtDueIn } from '@/components/decisions/decisions-shared'
import { confidencePercent, silenceLine } from '@/lib/decisions/center'

export type RationaleBlock = {
  /** Short label — the question this block answers. */
  label: string
  /** The answer, as a full sentence. */
  body: string
  /** Optional supporting lines (linked tasks, classification chips). */
  detail?: string[]
}

const TYPE_MEANING: Record<string, string> = {
  scope: 'Sie verändert, was gebaut wird',
  budget: 'Sie verändert die Kosten',
  direction: 'Sie legt eine gestalterische Richtung fest',
  approval: 'Sie gibt bereits geplante Arbeit frei',
  risk_response: 'Sie reagiert auf ein erkanntes Risiko',
  tradeoff: 'Sie wägt zwei brauchbare Wege gegeneinander ab',
  clarification: 'Sie klärt eine offene Frage',
  escalation: 'Sie wurde nach oben gereicht',
  legal: 'Sie hat rechtliche Folgen',
  payment: 'Sie betrifft Zahlungen',
  contract: 'Sie betrifft einen Vertrag',
  data_protection: 'Sie betrifft personenbezogene Daten',
}

const AUTHORITY_MEANING: Record<string, string> = {
  client: 'Du entscheidest.',
  owner: 'Der Projektverantwortliche entscheidet.',
  client_and_owner: 'Du oder der Projektverantwortliche — wer zuerst antwortet.',
  tagro_default: 'Tagros Empfehlung gilt, solange niemand widerspricht.',
}

/** "Warum ist das überhaupt eine Entscheidung?" */
function whyDecision(d: Decision, work?: AffectedWork): RationaleBlock | null {
  const parts: string[] = []

  const meaning = d.decision_type ? TYPE_MEANING[d.decision_type] : null
  if (meaning) parts.push(`${meaning}.`)

  const blocks = work?.blocks.length ?? 0
  if (blocks > 0) {
    parts.push(
      `${blocks === 1 ? 'Eine Aufgabe kann' : `${blocks} Aufgaben können`} erst weiterlaufen, wenn sie beantwortet ist.`,
    )
  }

  const reasoning = d.tagro_reasoning?.trim()
  if (reasoning && reasoning !== d.tagro_recommendation_reason?.trim()) {
    parts.unshift(reasoning.endsWith('.') ? reasoning : `${reasoning}.`)
  }

  if (parts.length === 0) return null
  return {
    label: 'Warum das eine Entscheidung ist',
    body: parts.join(' '),
    detail: work && work.blocks.length > 0
      ? work.blocks.map(t => t.title)
      : undefined,
  }
}

/** "Warum genau diese Empfehlung?" */
function whyRecommendation(d: Decision, recommendationLabel?: string | null): RationaleBlock | null {
  const reason = d.tagro_recommendation_reason?.trim()
  const confidence = confidencePercent(d)

  if (!reason && !recommendationLabel) {
    return {
      label: 'Warum keine Empfehlung',
      body: 'Tagro hat hier bewusst keine Empfehlung ausgesprochen — die Optionen sind '
        + 'ähnlich geeignet, oder die Grundlage reicht nicht aus. Diese Wahl braucht dein Urteil.',
    }
  }
  if (!reason) return null

  const detail: string[] = []
  if (confidence !== null) {
    detail.push(
      confidence >= 80 ? `Tagro ist sich sicher (${confidence} %).`
      : confidence >= 55 ? `Tagro hält das für die bessere Wahl, ohne Gewissheit (${confidence} %).`
      : `Tagro ist unsicher (${confidence} %) — sieh dir die Alternativen an.`,
    )
  }

  return {
    label: recommendationLabel ? `Warum ${recommendationLabel}` : 'Warum diese Empfehlung',
    body: reason.endsWith('.') ? reason : `${reason}.`,
    detail: detail.length > 0 ? detail : undefined,
  }
}

/**
 * "Warum diese Frist?" — the engine derives due_at and records which input won,
 * so the deadline can always name its own cause instead of appearing as a date.
 */
function whyDeadline(d: Decision, work?: AffectedWork): RationaleBlock | null {
  const due = d.due_at || d.due_date
  if (!due) {
    return {
      label: 'Warum keine Frist',
      body: 'Nichts im Projekt wartet auf diese Antwort und es gibt keinen äußeren Termin. '
        + 'Sie liegt hier, bis du Zeit hast — Tagro drängt nicht.',
    }
  }

  const when = fmtDueIn(due)
  const blocks = work?.blocks.length ?? 0

  let cause: string
  switch (d.effective_due_source) {
    case 'deadline_hard':
      cause = 'Es gibt einen festen äußeren Termin — Vertrag, Launch oder Frist.'
      break
    case 'blocking_horizon':
      cause = blocks > 0
        ? `Die blockierte Arbeit soll dann starten (${blocks === 1 ? '1 Aufgabe' : `${blocks} Aufgaben`}).`
        : 'Geplante Arbeit soll dann starten.'
      break
    case 'deliberation_floor':
      cause = 'Das ist die Bedenkzeit, die dir für diese Art Entscheidung zusteht — nicht früher.'
      break
    case 'type_default':
      cause = 'Kein äußerer Termin und nichts Blockiertes — das ist der übliche Rahmen für diese Art Entscheidung.'
      break
    default:
      cause = 'Die Frist stammt aus der Projektplanung.'
  }

  return {
    label: 'Warum diese Frist',
    body: `Fällig ${when}. ${cause}`,
  }
}

/** "Wie schwer wiegt das?" — the Bezos door, said without the jargon. */
function whyWeight(d: Decision): RationaleBlock | null {
  if (d.reversibility === 'one_way_door') {
    return {
      label: 'Warum das schwer wiegt',
      body: 'Diese Entscheidung lässt sich später nur mit Aufwand zurücknehmen. '
        + 'Deshalb gibt Tagro sie nie automatisch frei und übernimmt sie auch nicht bei Schweigen.',
    }
  }
  if (d.reversibility === 'two_way_door') {
    return {
      label: 'Warum du sie schnell treffen kannst',
      body: 'Diese Entscheidung ist später ohne großen Aufwand änderbar. '
        + 'Lieber jetzt entscheiden und weiterarbeiten, als lange abwägen.',
    }
  }
  return null
}

/** "Wer darf das entscheiden?" */
function whoDecides(d: Decision): RationaleBlock | null {
  const meaning = d.authority ? AUTHORITY_MEANING[d.authority] : null
  if (!meaning) return null
  return { label: 'Wer entscheidet', body: meaning }
}

/** "Was passiert, wenn ich nichts tue?" */
function onSilence(d: Decision): RationaleBlock | null {
  const line = silenceLine(d)
  if (!line) return null
  return { label: 'Wenn du nichts tust', body: line }
}

/** How a Tagro-authored answer came about, for already-decided rows. */
function howTagroDecided(d: Decision): RationaleBlock | null {
  if (!d.tagro_delegation_reason) return null
  const body = d.tagro_delegation_reason === 'auto_resolved_after_deadline'
    ? 'Die Frist lief ab, ohne dass jemand geantwortet hat. Weil die Entscheidung umkehrbar ist '
      + 'und keine rechtlichen, vertraglichen oder Zahlungsfolgen hat, hat Tagro die Empfehlung übernommen.'
    : d.tagro_delegation_reason === 'client_delegated'
      ? 'Du hast Tagro gebeten, diese Entscheidung zu übernehmen. Tagro hat die eigene Empfehlung gewählt.'
      : 'Tagro hat diese Entscheidung im Rahmen der Projektrichtlinie übernommen.'
  return { label: 'Wie Tagro entschieden hat', body }
}

/**
 * The full grounds, in reading order: what it is → why this answer → what it
 * costs → who decides → what silence does. Empty blocks fall away.
 */
export function buildRationale(
  d: Decision,
  opts: { work?: AffectedWork; recommendationLabel?: string | null } = {},
): RationaleBlock[] {
  return [
    howTagroDecided(d),
    whyDecision(d, opts.work),
    whyRecommendation(d, opts.recommendationLabel),
    whyDeadline(d, opts.work),
    whyWeight(d),
    whoDecides(d),
    onSilence(d),
  ].filter((b): b is RationaleBlock => b !== null)
}

/** One-line teaser for the row — the shortest honest "why". */
export function rationaleTeaser(d: Decision, work?: AffectedWork): string | null {
  const blocks = work?.blocks.length ?? 0
  if (blocks > 0) {
    return `${blocks === 1 ? 'Eine Aufgabe wartet' : `${blocks} Aufgaben warten`} auf diese Antwort`
  }
  if (d.effective_due_source === 'deadline_hard') return 'Es gibt einen festen äußeren Termin'
  if (d.reversibility === 'one_way_door') return 'Später nur mit Aufwand änderbar'
  if (d.decision_type && TYPE_MEANING[d.decision_type]) return TYPE_MEANING[d.decision_type]
  return null
}
