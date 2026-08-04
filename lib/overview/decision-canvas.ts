/**
 * Decision Canvas — domain layer for Festag Overview.
 *
 * Law (Architecture v4.1+):
 * - Center shows exactly one focus
 * - One organic ink path at a time
 * - Recommendation sheet is secondary
 * - Explain grows from the path
 * - Accept writes through POST /api/decisions/:id/decide
 */

export type CanvasOption = {
  id: string
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
}

export type CanvasProjectFocus = {
  kind: 'project'
  workspaceName: string
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
  /** Real decision id for /decide — null for first-project */
  decisionId: string | null
  href: string | null
}

function splitReasonText(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  const text = raw.trim()
  const byBullet = text
    .split(/\n+|•|\u2022|(?:^|\s)[-–—]\s+/)
    .map((s) => s.replace(/^[\d]+[.)]\s*/, '').trim())
    .filter((s) => s.length > 8)
  if (byBullet.length >= 2) return byBullet.slice(0, 5)
  const bySentence = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
  if (bySentence.length >= 2) return bySentence.slice(0, 4)
  return [text]
}

function stepsFromHandoff(opt: CanvasOption & { handoffSteps?: unknown }): CanvasExplainStep[] {
  const raw = opt.handoffSteps
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.slice(0, 6).map((step, i) => {
    if (typeof step === 'string') return { n: i + 1, label: step.trim() }
    if (step && typeof step === 'object') {
      const o = step as { title?: string; body?: string }
      const label = (o.title || o.body || '').trim()
      return { n: i + 1, label: label || `Schritt ${i + 1}` }
    }
    return { n: i + 1, label: `Schritt ${i + 1}` }
  })
}

function defaultExplainSteps(decisionType: string | null, projectTitle: string): CanvasExplainStep[] {
  const t = (decisionType || '').toLowerCase()
  if (t === 'approval') {
    return [
      { n: 1, label: 'Kontext und Qualität prüfen' },
      { n: 2, label: 'Empfehlung bestätigen' },
      { n: 3, label: 'Umsetzung starten' },
    ]
  }
  if (t === 'direction' || t === 'scope') {
    return [
      { n: 1, label: 'Richtung festlegen' },
      { n: 2, label: 'Abhängigkeiten angleichen' },
      { n: 3, label: projectTitle ? `Weiter in ${projectTitle}` : 'Nächste Schritte freigeben' },
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
  options?: Array<{
    id: string
    label: string
    hint?: string | null
    recommended?: boolean
    handoffSteps?: unknown
  }>
}): CanvasDecisionFocus {
  const options: CanvasOption[] = (input.options || []).map((o) => ({
    id: o.id,
    label: o.label,
    hint: o.hint || null,
    recommended: Boolean(o.recommended),
  }))

  const recommended =
    options.find((o) => o.recommended) ||
    options.find((o) => o.id === input.recommendedOptionId) ||
    options[0] ||
    null

  const recommendedOptionId =
    recommended?.id || input.recommendedOptionId || null

  let reasons = splitReasonText(input.recommendationReason)
  if (reasons.length === 0) reasons = splitReasonText(input.tagroReasoning)
  if (reasons.length === 0) {
    reasons = defaultReasons(recommended?.label || '', input.projectTitle || '')
  }

  const handoffOpt = (input.options || []).find((o) => o.id === recommendedOptionId)
  let explainSteps = handoffOpt
    ? stepsFromHandoff({
        id: handoffOpt.id,
        label: handoffOpt.label,
        hint: null,
        recommended: true,
        handoffSteps: handoffOpt.handoffSteps,
      })
    : []
  if (explainSteps.length === 0) {
    explainSteps = defaultExplainSteps(
      input.decisionType || null,
      input.projectTitle || '',
    )
  }

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
    options,
    explainSteps,
    reasons,
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
    }
  }

  if (!input.focus || input.pendingDecisions <= 0) return null

  const focus = input.focus
  let options = focus.options
  if (options.length === 0) {
    options = [
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
    options.find((o) => o.id === focus.recommendedOptionId) ||
    options.find((o) => o.recommended) ||
    options[0]

  const question =
    focus.summary && focus.summary.trim().length > 12 && focus.summary.includes('?')
      ? focus.summary.trim()
      : focus.title.endsWith('?')
        ? focus.title
        : `${focus.title}?`

  const waitingLabel =
    input.pendingDecisions === 1
      ? 'Eine Entscheidung wartet'
      : `${input.pendingDecisions} Entscheidungen warten`

  const calmStatus =
    (input.calmLine && input.calmLine.trim()) ||
    'Alles läuft ruhig.'

  return {
    kind: 'decision',
    id: focus.id,
    eyebrow: 'Entscheidung',
    question,
    waitingLabel,
    calmStatus,
    options,
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
  }
}

export async function acceptDecisionRecommendation(input: {
  decisionId: string
  optionId: string
  responseType?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const responseType = input.responseType || 'single_choice'
  let body: Record<string, unknown>

  if (responseType === 'binary') {
    const v = input.optionId.toLowerCase()
    const binary =
      v === 'yes' || v === 'ja' || v === 'approve' || v === 'freigeben'
        ? 'yes'
        : v === 'no' || v === 'nein'
          ? 'no'
          : null
    body = binary
      ? { response_value: { binary_value: binary } }
      : { response_value: { selected_option_id: input.optionId } }
  } else {
    body = { response_value: { selected_option_id: input.optionId } }
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
