export type BriefingIntelligenceRules = {
  masterPrompt: string
  emphasizeRisks: boolean
  clientReadyTone: boolean
  updatedAt: string
}

const STORAGE_KEY = 'festag-briefing-intelligence-rules'

export const DEFAULT_BRIEFING_MASTER_PROMPT =
  'Schreibe klar und ruhig für Projektleitung und Kunden. Führe mit dem Wichtigsten an, nenne Risiken nur wenn sie handlungsrelevant sind, und schließe mit den nächsten sinnvollen Schritten.'

export function getBriefingIntelligenceRules(): BriefingIntelligenceRules {
  if (typeof window === 'undefined') {
    return {
      masterPrompt: DEFAULT_BRIEFING_MASTER_PROMPT,
      emphasizeRisks: true,
      clientReadyTone: true,
      updatedAt: '',
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        masterPrompt: DEFAULT_BRIEFING_MASTER_PROMPT,
        emphasizeRisks: true,
        clientReadyTone: true,
        updatedAt: '',
      }
    }
    const parsed = JSON.parse(raw) as Partial<BriefingIntelligenceRules>
    return {
      masterPrompt: (parsed.masterPrompt ?? DEFAULT_BRIEFING_MASTER_PROMPT).trim(),
      emphasizeRisks: parsed.emphasizeRisks !== false,
      clientReadyTone: parsed.clientReadyTone !== false,
      updatedAt: parsed.updatedAt ?? '',
    }
  } catch {
    return {
      masterPrompt: DEFAULT_BRIEFING_MASTER_PROMPT,
      emphasizeRisks: true,
      clientReadyTone: true,
      updatedAt: '',
    }
  }
}

export function saveBriefingIntelligenceRules(rules: Omit<BriefingIntelligenceRules, 'updatedAt'>): BriefingIntelligenceRules {
  const next: BriefingIntelligenceRules = {
    ...rules,
    masterPrompt: rules.masterPrompt.trim() || DEFAULT_BRIEFING_MASTER_PROMPT,
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('festag-briefing-intelligence-change'))
    } catch { /* noop */ }
  }
  return next
}
