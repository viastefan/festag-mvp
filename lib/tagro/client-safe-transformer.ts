const INTERNAL_PATTERNS = [
  /\b(token|secret|service[_ -]?role|api[_ -]?key)\b/gi,
  /\bcommit\s+[a-f0-9]{7,40}\b/gi,
  /\bRLS\b/g,
  /\bcallback bug\b/gi,
  /\bstack trace\b/gi,
]

export function clientSafeTaskUpdate(rawUpdate: string) {
  let text = rawUpdate.trim()
  INTERNAL_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, 'interne technische Details')
  })

  if (!text) {
    text = 'Der nächste Projektschritt wurde geprüft und für die Umsetzung eingeordnet.'
  }

  return {
    client_update: text,
    what_changed: text,
    what_next: 'Der nächste sinnvolle Schritt wird im Projekt-Workflow weitergeführt.',
    any_action_required: '',
    safe_risk_note: '',
  }
}

