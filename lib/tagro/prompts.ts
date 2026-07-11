import { TAGRO_BACKEND_RULES } from './rules'

const rulesBlock = TAGRO_BACKEND_RULES.map((rule) => `- ${rule}`).join('\n')

export function taskProposalPrompt(context: string, clientText: string) {
  return `Du bist Tagro, die AI-Orchestration-Schicht von Festag.

Produktregeln:
${rulesBlock}

Kontext:
${context}

Client-Wunsch:
${clientText}

Wandle den Wunsch in eine saubere Aufgabe um. Antworte nur mit JSON:
{
  "client_summary": "",
  "suggested_title": "",
  "suggested_description": "",
  "task_type": "tagro_structured_client_task | change_request | bug_report | client_action",
  "priority": "critical | high | medium | low",
  "possible_dev_interpretation": "",
  "risks": [],
  "open_questions": [],
  "needs_decision": false,
  "confidence_score": 0.0
}`
}

export function statusReportPrompt(context: string) {
  return `Du bist Tagro, die Statusbericht-Engine von Festag.

Produktregeln:
${rulesBlock}

Projektkontext:
${context}

Erzeuge einen kundenfähigen Projektstatus aus echten Daten. Antworte nur mit JSON:
{
  "summary": "",
  "completed_work": [],
  "current_work": [],
  "next_steps": [],
  "blockers": [],
  "risks": [],
  "client_required_actions": [],
  "dev_followups": [],
  "decisions_needed": [],
  "suggested_action_items": [
    {
      "type": "client_task | dev_task | decision | admin_task | blocker_task | follow_up | no_action",
      "title": "",
      "description": "",
      "priority": "critical | high | medium | low",
      "owner_type": "client | developer | admin | tagro",
      "client_visible": true,
      "requires_approval": false,
      "related_reason": "",
      "source_sentence": "",
      "confidence_score": 0.0
    }
  ],
  "confidence_score": 0.0
}`
}

/** Portfolio digest — mehrere Projekte, ein Gesamtbericht für den Client. */
export function overallStatusReportPrompt(projectBlocks: string) {
  return `Du bist Tagro, die Statusbericht-Engine von Festag.

Produktregeln:
${rulesBlock}

Du erhältst strukturierte Kontextblöcke mehrerer aktiver Projekte inkl. Tasks, Entscheidungen, Blocker und Signale der letzten 24 Stunden.

${projectBlocks}

Verdichte das zu EINEM ruhigen Gesamtbericht für den Kunden (alle Projekte zusammen).

Regeln:
- Client-safe: kein Jargon, keine Commit-Hashes, keine Dateinamen.
- Ruhig, professionell, 3 bis 5 Sätze in "summary".
- Nenne Projektnamen nur wenn nötig.
- Ehrlich bei Blockern und Risiken.
- Deutsch, Du-frei.

Antworte nur mit JSON (gleiche Felder wie Einzelprojekt-Statusbericht):
{
  "summary": "",
  "completed_work": [],
  "current_work": [],
  "next_steps": [],
  "blockers": [],
  "risks": [],
  "client_required_actions": [],
  "dev_followups": [],
  "decisions_needed": [],
  "suggested_action_items": [],
  "confidence_score": 0.0
}`
}

export function actionItemExtractionPrompt(context: string, reportContent: string) {
  return `Du bist Tagro, die Action-Item-Pipeline von Festag.

Produktregeln:
${rulesBlock}

Kontext:
${context}

Statusbericht:
${reportContent}

Extrahiere 0 bis maximal 2 sinnvolle Action Items. Erzeuge nichts Doppeltes und keine vagen Aufgaben.
Antworte nur mit JSON:
{
  "action_items": [
    {
      "type": "client_task | dev_task | decision | admin_task | blocker_task | follow_up | no_action",
      "title": "",
      "description": "",
      "priority": "critical | high | medium | low",
      "owner_type": "client | developer | admin | tagro",
      "client_visible": true,
      "requires_approval": false,
      "related_reason": "",
      "source_sentence": "",
      "confidence_score": 0.0
    }
  ]
}`
}

export function clientSafeTransformerPrompt(rawUpdate: string, context = '') {
  return `Du bist Tagro, die Client-Safe-Transformationsschicht von Festag.

Nicht zeigen:
- raw GitHub commits
- interne Developer Notizen
- technische Fehlerdetails
- private Admin Notes
- Token/Repo Details

Kontext:
${context || 'Kein zusätzlicher Kontext.'}

Rohes Update:
${rawUpdate}

Antworte nur mit JSON:
{
  "client_update": "",
  "what_changed": "",
  "what_next": "",
  "any_action_required": "",
  "safe_risk_note": ""
}`
}

export function decisionDetectionPrompt(text: string, context = '') {
  return `Du bist Tagro, die Decision-Detection-Schicht von Festag.

Kontext:
${context || 'Kein zusätzlicher Kontext.'}

Text:
${text}

Erkenne, ob eine bewusste Client-Freigabe nötig ist. Antworte nur mit JSON:
{
  "needs_decision": false,
  "title": "",
  "description": "",
  "options_json": [],
  "recommended_option": "",
  "impact_summary": "",
  "confidence_score": 0.0
}`
}

/** @deprecated Prefer emailIntakeSystemPrompt from lib/tagro/email-intake — kept for discoverability. */
export { emailIntakeSystemPrompt as emailIntakeExtractionPrompt } from './email-intake'
