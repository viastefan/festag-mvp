/**
 * Decision Canvas — domain layer for Festag Overview.
 *
 * Law:
 * - Center shows exactly one focus
 * - One organic ink path at a time
 * - Accept writes through POST /api/decisions/:id/decide
 *
 * Important DB quirk:
 * `decisions.recommended_option` is often the **client label** (legacy),
 * while `decision_options.external_id` is `opt-1`. Matching must try
 * external_id · uuid · client_label · label.
 */

export type CanvasOption = {
  /** Value sent to /decide (external_id preferred, else row uuid) */
  id: string
  /** Raw decision_options.id when known */
  rowId?: string | null
  label: string
  hint: string | null
  recommended: boolean
}

export type CanvasExplainStep = {
  n: number
  label: string
}

export type CanvasDecisionFocus = {
  id: string
  title: string
  summary: string | null
  projectId: string | null
  projectTitle: string
  urgency: string | null
  dueDate: string | null
  responseType: string | null
  decisionType: string | null
  recommendedOptionId: string | null
  recommendationReason: string | null
  tagroReasoning: string | null
  options: CanvasOption[]
  explainSteps: CanvasExplainStep[]
  reasons: string[]
  needsSuggestion: boolean
}

export type DecisionCanvasTopic = {
  kind: 'decision' | 'project'
  id: string
  eyebrow: string
  question: string
  waitingLabel: string
  calmStatus: string
  options: CanvasOption[]
  recommendId: string | null
  recommendLabel: string
  reasons: string[]
  explainTitle: string
  explainSteps: CanvasExplainStep[]
  decisionId: string | null
  href: string | null
  responseType: string | null
  needsSuggestion: boolean
}

function norm(s: string | null | undefined): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function splitReasonText(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const text = raw.trim()

  const byBullet = text
    .split(/\n+|•|\u2022|(?:^|\s)[-–—]\s+|(?:^|\s)\*\s+/)
    .map((s) => s.replace(/^[\d]+[.)]\s*/, '').trim())
    .filter((s) => s.length > 8)
  if (byBullet.length >= 2) return byBullet.slice(0, 5)

  const bySentence = text
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])|(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 14)
  if (bySentence.length >= 2) return bySentence.slice(0, 4)

  if (text.length > 160) {
    const cut = text.slice(0, 140)
    const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '))
    return [last > 40 ? cut.slice(0, last + 1).trim() : `${cut.trim()}…`]
  }
  return [text]
}

function implicationsToReasons(implications: unknown): string[] {
  if (!implications || typeof implications !== 'object') return []
  const i = implications as Record<string, unknown>
  const out: string[] = []

  const risk = i.risk_delta
  if (risk === 'low') out.push('Geringes Risiko für den aktuellen Stand.')
  if (risk === 'medium') out.push('Moderates Risiko — überschaubar und reversibel.')
  if (risk === 'high') out.push('Höheres Risiko — aber klar begründet.')

  const scope = i.scope_delta
  if (scope === 'narrows') out.push('Verengt den Scope und hält das Projekt fokussiert.')
  if (scope === 'unchanged') out.push('Scope bleibt stabil.')
  if (scope === 'broadens') out.push('Erweitert den Scope bewusst.')

  const time = i.time_delta_days
  if (typeof time === 'number') {
    if (time < 0) out.push(`Spart etwa ${Math.abs(time)} Tage.`)
    if (time > 0) out.push(`Kostet etwa ${time} zusätzliche Tage.`)
  } else if (time === 'low') out.push('Schnelle Umsetzung möglich.')
  else if (time === 'high') out.push('Braucht mehr Zeit — aber mit klarer Begründung.')

  const cost = i.cost_delta
  if (typeof cost === 'number' && cost !== 0) {
    out.push(cost < 0 ? 'Reduziert die Kosten.' : 'Erhöht die Kosten bewusst.')
  } else if (cost === 'low') out.push('Geringer Kostenimpact.')

  return out.slice(0, 3)
}

function stepsFromHandoff(raw: unknown): CanvasExplainStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.slice(0, 6).map((step, i) => {
    if (typeof step === 'string') return { n: i + 1, label: step.trim() || `Schritt ${i + 1}` }
    if (step && typeof step === 'object') {
      const o = step as { title?: string; body?: string }
      const label = (o.title || o.body || '').trim()
      return { n: i + 1, label: label || `Schritt ${i + 1}` }
    }
    return { n: i + 1, label: `Schritt ${i + 1}` }
  })
}

export function defaultExplainSteps(
  decisionType: string | null,
  projectTitle: string,
): CanvasExplainStep[] {
  const t = (decisionType || '').toLowerCase()
  if (t === 'approval') {
    return [
      { n: 1, label: 'Kontext und Qualität prüfen' },
      { n: 2, label: 'Empfehlung bestätigen' },
      { n: 3, label: 'Umsetzung starten' },
    ]
  }
  if (t === 'direction' || t === 'scope' || t === 'tradeoff') {
    return [
      { n: 1, label: 'Richtung festlegen' },
      { n: 2, label: 'Abhängigkeiten angleichen' },
      { n: 3, label: projectTitle ? `Weiter in ${projectTitle}` : 'Nächste Schritte freigeben' },
    ]
  }
  if (t === 'budget' || t === 'payment') {
    return [
      { n: 1, label: 'Kosten und Nutzen prüfen' },
      { n: 2, label: 'Entscheidung bestätigen' },
      { n: 3, label: 'Umsetzung freigeben' },
    ]
  }
  return [
    { n: 1, label: 'Entscheidung treffen' },
    { n: 2, label: 'Team informieren' },
    { n: 3, label: 'Nächsten Schritt ausführen' },
  ]
}

function defaultReasons(recommendLabel: string, projectTitle: string): string[] {
  return [
    recommendLabel
      ? `„${recommendLabel}“ passt am besten zum aktuellen Stand.`
      : 'Die Empfehlung passt zum aktuellen Projektstand.',
    projectTitle ? `Bezogen auf ${projectTitle}.` : 'Keine kritischen Blocker erkannt.',
    'Du bestätigst — Festag führt den nächsten Schritt aus.',
  ]
}

/**
 * Match Tagro's recommendation against options.
 * recommended_option may be: external_id, uuid, client_label, or label.
 */
export function resolveRecommendedOption(
  options: Array<{
    id: string
    rowId?: string | null
    label: string
    recommended?: boolean
  }>,
  recommendedOptionRaw: string | null | undefined,
): (typeof options)[number] | null {
  if (!options.length) return null
  const byFlag = options.find((o) => o.recommended)
  if (byFlag) return byFlag

  const raw = String(recommendedOptionRaw || '').trim()
  if (!raw || raw === 'freeform') return options[0] || null

  const n = norm(raw)
  const hit =
    options.find((o) => norm(o.id) === n) ||
    options.find((o) => o.rowId && norm(o.rowId) === n) ||
    options.find((o) => norm(o.label) === n) ||
    options.find((o) => norm(o.label).includes(n) || n.includes(norm(o.label)))

  return hit || options[0] || null
}

export function buildQuestion(title: string, summary: string | null): string {
  const s = summary?.trim() || ''
  if (s.length > 12 && s.includes('?')) return s
  if (s.length > 24 && s.length <= 120 && !s.includes('\n')) {
    return s.endsWith('?') ? s : `${s.replace(/[.!]$/, '')}?`
  }
  const t = title.trim()
  if (!t) return 'Wie soll es weitergehen?'
  return t.endsWith('?') ? t : `${t}?`
}

type RawOptionInput = {
  id: string
  rowId?: string | null
  label: string
  hint?: string | null
  recommended?: boolean
  handoffSteps?: unknown
  implications?: unknown
}

/** Normalize a rich overview decision into canvas-ready fields. */
export function enrichDecisionFocus(input: {
  id: string
  title: string
  summary?: string | null
  projectId?: string | null
  projectTitle?: string
  urgency?: string | null
  dueDate?: string | null
  responseType?: string | null
  decisionType?: string | null
  recommendedOptionId?: string | null
  recommendationReason?: string | null
  tagroReasoning?: string | null
  options?: RawOptionInput[]
}): CanvasDecisionFocus {
  const options: CanvasOption[] = (input.options || []).map((o) => ({
    id: o.id,
    rowId: o.rowId || null,
    label: o.label,
    hint: o.hint || null,
    recommended: Boolean(o.recommended),
  }))

  const recommended = resolveRecommendedOption(
    options.map((o, i) => ({
      ...o,
      recommended: o.recommended || Boolean(input.options?.[i]?.recommended),
    })),
    input.recommendedOptionId,
  )

  /* Mark the resolved recommendation on the option list */
  const marked = options.map((o) => ({
    ...o,
    recommended: Boolean(recommended && o.id === recommended.id),
  }))

  const recommendedOptionId = recommended?.id || null

  let reasons = splitReasonText(input.recommendationReason)
  if (reasons.length === 0) reasons = splitReasonText(input.tagroReasoning)

  const rawRec = (input.options || []).find((o) => o.id === recommendedOptionId)
  if (reasons.length < 2 && rawRec?.implications) {
    const fromImp = implicationsToReasons(rawRec.implications)
    reasons = [...reasons, ...fromImp].slice(0, 5)
  }
  if (reasons.length === 0) {
    reasons = defaultReasons(recommended?.label || '', input.projectTitle || '')
  }

  let explainSteps = stepsFromHandoff(rawRec?.handoffSteps)
  if (explainSteps.length === 0) {
    explainSteps = defaultExplainSteps(
      input.decisionType || null,
      input.projectTitle || '',
    )
  }

  const hasReasonText = Boolean(
    input.recommendationReason?.trim() || input.tagroReasoning?.trim(),
  )
  const hasTaggedOption = marked.some((o) => o.recommended)
  /* Empty options or missing Tagro recommendation → canvas should call /suggest */
  const needsSuggestion =
    marked.length === 0 ||
    !hasReasonText ||
    (!hasTaggedOption &&
      (!input.recommendedOptionId || input.recommendedOptionId === 'freeform'))

  return {
    id: input.id,
    title: input.title,
    summary: input.summary || null,
    projectId: input.projectId || null,
    projectTitle: input.projectTitle || 'Projekt',
    urgency: input.urgency || null,
    dueDate: input.dueDate || null,
    responseType: input.responseType || null,
    decisionType: input.decisionType || null,
    recommendedOptionId,
    recommendationReason: input.recommendationReason || null,
    tagroReasoning: input.tagroReasoning || null,
    options: marked,
    explainSteps,
    reasons,
    needsSuggestion,
  }
}

export function buildDecisionCanvasTopic(input: {
  workspaceName: string
  activeProjects: number
  pendingDecisions: number
  calmLine: string | null
  focus: CanvasDecisionFocus | null
}): DecisionCanvasTopic | null {
  if (input.activeProjects === 0) {
    return {
      kind: 'project',
      id: 'first-project',
      eyebrow: 'Nächster Schritt',
      question: 'Bereit für dein erstes Projekt?',
      waitingLabel: 'Erstes Projekt wartet',
      calmStatus: `In ${input.workspaceName} läuft noch alles ruhig.`,
      options: [
        {
          id: 'start',
          label: 'Jetzt starten',
          hint: 'Tagro strukturiert Name und nächste Schritte.',
          recommended: true,
        },
        {
          id: 'later',
          label: 'Später',
          hint: 'Der Workspace bleibt ruhig.',
          recommended: false,
        },
      ],
      recommendId: 'start',
      recommendLabel: 'Jetzt starten',
      reasons: [
        'Tagro strukturiert Aufgaben aus deiner Idee.',
        'Ein Workspace — keine zweite App.',
        'Einladungen und Freigaben folgen von selbst.',
      ],
      explainTitle: 'So geht es weiter',
      explainSteps: [
        { n: 1, label: 'Projekt benennen' },
        { n: 2, label: 'Tagro strukturiert Aufgaben' },
        { n: 3, label: 'Team einladen' },
      ],
      decisionId: null,
      href: null,
      responseType: null,
      needsSuggestion: false,
    }
  }

  if (!input.focus || input.pendingDecisions <= 0) return null

  const focus = input.focus
  let options = focus.options
  if (options.length === 0) {
    const binary = focus.responseType === 'binary'
    options = binary
      ? [
          { id: 'yes', label: 'Ja', hint: 'Zustimmen und fortfahren.', recommended: true },
          { id: 'no', label: 'Nein', hint: 'Ablehnen und Feedback geben.', recommended: false },
        ]
      : [
          {
            id: 'approve',
            label: 'Übernehmen',
            hint: 'Tagro führt den nächsten Schritt aus.',
            recommended: true,
          },
          {
            id: 'changes',
            label: 'Anpassen',
            hint: 'Du behältst die Kontrolle.',
            recommended: false,
          },
        ]
  }

  const recommend =
    resolveRecommendedOption(options, focus.recommendedOptionId) || options[0]

  return {
    kind: 'decision',
    id: focus.id,
    eyebrow: 'Entscheidung',
    question: buildQuestion(focus.title, focus.summary),
    waitingLabel:
      input.pendingDecisions === 1
        ? 'Eine Entscheidung wartet'
        : `${input.pendingDecisions} Entscheidungen warten`,
    calmStatus: (input.calmLine && input.calmLine.trim()) || 'Alles läuft ruhig.',
    options: options.map((o) => ({
      ...o,
      recommended: Boolean(recommend && o.id === recommend.id),
    })),
    recommendId: recommend?.id || null,
    recommendLabel: recommend?.label || 'Empfehlung',
    reasons:
      focus.reasons.length > 0
        ? focus.reasons
        : defaultReasons(recommend?.label || '', focus.projectTitle),
    explainTitle: focus.projectTitle || 'Umsetzung',
    explainSteps:
      focus.explainSteps.length > 0
        ? focus.explainSteps
        : defaultExplainSteps(focus.decisionType, focus.projectTitle),
    decisionId: focus.id,
    href: `/decisions/${focus.id}`,
    responseType: focus.responseType,
    needsSuggestion: focus.needsSuggestion,
  }
}

export async function ensureCanvasSuggestion(decisionId: string): Promise<{
  ok: boolean
  recommendedOption: string | null
  reasoning: string | null
}> {
  try {
    const res = await fetch(`/api/decisions/${decisionId}/suggest`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return { ok: false, recommendedOption: null, reasoning: null }
    const json = await res.json().catch(() => null)
    return {
      ok: true,
      recommendedOption:
        typeof json?.recommended_option === 'string' ? json.recommended_option : null,
      reasoning: typeof json?.reasoning === 'string' ? json.reasoning : null,
    }
  } catch {
    return { ok: false, recommendedOption: null, reasoning: null }
  }
}

export async function acceptDecisionRecommendation(input: {
  decisionId: string
  optionId: string
  responseType?: string | null
  rationale?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const responseType = input.responseType || 'single_choice'
  const optionId = input.optionId
  let body: Record<string, unknown>

  if (responseType === 'binary') {
    const v = optionId.toLowerCase()
    const binary =
      v === 'yes' ||
      v === 'ja' ||
      v === 'approve' ||
      v === 'freigeben' ||
      v === 'opt-1'
        ? 'yes'
        : v === 'no' || v === 'nein' || v === 'opt-2'
          ? 'no'
          : null
    body = binary
      ? {
          response_value: { binary_value: binary },
          selected_option: binary,
          rationale: input.rationale || undefined,
        }
      : {
          response_value: { selected_option_id: optionId },
          selected_option: optionId,
          rationale: input.rationale || undefined,
        }
  } else {
    body = {
      response_value: { selected_option_id: optionId },
      selected_option: optionId,
      rationale: input.rationale || 'Empfehlung über Decision Canvas übernommen.',
    }
  }

  try {
    const res = await fetch(`/api/decisions/${input.decisionId}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      return { ok: false, error: json?.error || 'decide_failed' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  medium: 2,
  low: 3,
}

/** Rank open decisions for the canvas focus (urgency → due → newest). */
export function rankDecisionsForCanvas<T extends { urgency?: string | null; dueDate?: string | null; due_date?: string | null; created_at?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ua = URGENCY_RANK[String(a.urgency || 'normal').toLowerCase()] ?? 2
    const ub = URGENCY_RANK[String(b.urgency || 'normal').toLowerCase()] ?? 2
    if (ua !== ub) return ua - ub
    const da = a.dueDate || a.due_date || null
    const db = b.dueDate || b.due_date || null
    if (da && db) return String(da).localeCompare(String(db))
    if (da) return -1
    if (db) return 1
    return String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
}

/** Map a DB decision row + option rows into overview decision payload fields. */
export function mapDecisionRowToOverview(input: {
  decision: Record<string, unknown>
  optionRows: Array<Record<string, unknown>>
  projectTitle: string
}) {
  const d = input.decision
  const fromTable = input.optionRows.map((o) => {
    const externalId =
      typeof o.external_id === 'string' && o.external_id.trim()
        ? o.external_id.trim()
        : null
    const rowId = String(o.id)
    return {
      id: externalId || rowId,
      rowId,
      label: String(o.client_label || o.label || 'Option'),
      hint:
        typeof o.description === 'string' && o.description.trim()
          ? o.description.trim()
          : null,
      recommended: Boolean(o.recommended_by_tagro),
      handoffSteps: (o.implications_json as any)?.external_handoff?.steps,
      implications: o.implications_json,
    }
  })

  let options: Array<{
    id: string
    rowId: string | null
    label: string
    hint: string | null
    recommended: boolean
    handoffSteps?: unknown
    implications?: unknown
  }> = fromTable
  if (options.length === 0 && Array.isArray(d.options_json)) {
    options = (d.options_json as any[])
      .filter((o) => o && (o.id || o.label))
      .map((o) => ({
        id: String(o.id || o.label),
        rowId: null,
        label: String(o.label || o.id || 'Option'),
        hint: typeof o.hint === 'string' ? o.hint : null,
        recommended: String(o.id) === String(d.recommended_option),
        handoffSteps: undefined,
        implications: undefined,
      }))
  }

  return enrichDecisionFocus({
    id: String(d.id),
    title: String(d.client_title || d.title || 'Entscheidung'),
    summary: typeof d.client_summary === 'string' ? d.client_summary : null,
    projectId: (d.project_id as string) || null,
    projectTitle: input.projectTitle,
    urgency: typeof d.urgency === 'string' ? d.urgency : null,
    dueDate: (d.due_date as string) || null,
    responseType: typeof d.response_type === 'string' ? d.response_type : null,
    decisionType: typeof d.decision_type === 'string' ? d.decision_type : null,
    recommendedOptionId:
      typeof d.recommended_option === 'string' ? d.recommended_option : null,
    recommendationReason:
      typeof d.tagro_recommendation_reason === 'string'
        ? d.tagro_recommendation_reason
        : typeof d.impact_summary === 'string'
          ? d.impact_summary
          : null,
    tagroReasoning: typeof d.tagro_reasoning === 'string' ? d.tagro_reasoning : null,
    options,
  })
}
