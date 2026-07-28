/**
 * Attach open Decision Engine cards to briefing sentences.
 * Prefers keyword overlap; falls back to the sentence that mentions Entscheidungen,
 * else the last sentence.
 */

import type { StatusSentenceAction } from '@/components/status/StatusSentenceActionCard'

export type BriefingDecisionLite = {
  id: string
  title: string
  client_title?: string | null
  client_summary?: string | null
  description?: string | null
  response_type?: string | null
  recommended_option?: string | null
  options_json?: { id: string; label: string }[] | null
  status?: string
  decision_type?: string | null
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
}

export function decisionToSentenceAction(d: BriefingDecisionLite): StatusSentenceAction {
  const title = (d.client_title || d.title || 'Entscheidung').trim()
  const hint = (d.client_summary || d.description || '').trim().slice(0, 140) || null
  const rec = d.recommended_option
  const opts = Array.isArray(d.options_json) ? d.options_json : []
  const recOpt = opts.find(o => o.id === rec) || opts[0]
  const altOpt = opts.find(o => o.id !== recOpt?.id)
  const isBinary = d.response_type === 'binary'
  const isFeature =
    d.decision_type === 'scope' ||
    /hinzufügen|feature|erweiter/i.test(title) ||
    /feature-vorschlag|umfang|aufwand/i.test(hint || '')

  if (isFeature) {
    return {
      id: d.id,
      title,
      hint,
      primaryLabel: title,
      secondaryLabel: 'Mehr erfahren',
      laterLabel: 'Später',
      responseType: 'binary',
      recommendedOptionId: recOpt?.id || rec || 'opt-yes',
      variant: 'feature',
    }
  }

  return {
    id: d.id,
    title,
    hint,
    primaryLabel: isBinary ? 'Übernehmen' : (recOpt?.label || 'Übernehmen'),
    secondaryLabel: isBinary ? 'Ablehnen' : (altOpt?.label || 'Ablehnen'),
    laterLabel: 'Später',
    responseType: (d.response_type as StatusSentenceAction['responseType']) || 'single_choice',
    recommendedOptionId: recOpt?.id || rec || null,
    variant: 'decision',
  }
}

/** Map each action to a sentence index (max one card per sentence preferred). */
export function mapActionsToSentences(
  sentences: string[],
  actions: StatusSentenceAction[],
): Record<number, StatusSentenceAction[]> {
  const out: Record<number, StatusSentenceAction[]> = {}
  if (!sentences.length || !actions.length) return out

  const decisionIdx = sentences.findIndex(s =>
    /entscheid|risiko|blocker|freigabe|empfehl|feature|blog|erweiter/i.test(s),
  )
  const fallback = decisionIdx >= 0 ? decisionIdx : sentences.length - 1

  for (const action of actions) {
    const tokens = tokenize(action.title + ' ' + (action.hint || ''))
    let best = fallback
    let bestScore = 0
    sentences.forEach((s, i) => {
      const st = new Set(tokenize(s))
      let score = 0
      for (const t of tokens) if (st.has(t)) score += 1
      if (/entscheid|risiko|blocker/i.test(s)) score += 2
      if (score > bestScore) {
        bestScore = score
        best = i
      }
    })
    if (!out[best]) out[best] = []
    // Cap 2 cards per sentence to keep the lyric stage calm.
    if (out[best].length < 2) out[best].push(action)
  }
  return out
}

/** Localhost / empty-state demo so the Decision Engine surface is always visible. */
export function demoBriefingDecisionActions(): StatusSentenceAction[] {
  return [
    {
      id: 'demo-briefing-blog',
      title: 'Blog hinzufügen',
      hint: 'Neues Feature — Umfang und Aufwand können sich ändern.',
      primaryLabel: 'Blog hinzufügen',
      secondaryLabel: 'Mehr erfahren',
      laterLabel: 'Später',
      localOnly: true,
      responseType: 'binary',
      variant: 'feature',
    },
    {
      id: 'demo-briefing-stripe',
      title: 'Wir empfehlen Stripe für Zahlungen.',
      hint: 'Passt zu Budget und Zeitplan dieses Sprints.',
      primaryLabel: 'Übernehmen',
      secondaryLabel: 'Ablehnen',
      laterLabel: 'Später',
      localOnly: true,
      responseType: 'binary',
      variant: 'decision',
    },
  ]
}
