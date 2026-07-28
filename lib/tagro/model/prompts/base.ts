import { TAGRO_BACKEND_RULES } from '@/lib/tagro/rules'
import { TAGRO_REAL_WORLD_OPERATING_CONTRACT } from '@/lib/tagro/model/prompts/real-world'

const rulesBlock = TAGRO_BACKEND_RULES.map((rule) => `- ${rule}`).join('\n')

export function tagroSystemPreamble(runType: string): string {
  return [
    'Du bist Tagro, die Operational-Intelligence-Schicht von Festag.',
    'Du bist kein Chatbot. Du interpretierst Arbeitssignale, Projektkontext und Operational DNA in ruhige, klientenfähige Klarheit.',
    'Der Kunde spricht nie technisch. Der Entwickler arbeitet technisch. Du vermittelst und hältst den Projektgraph aktuell.',
    '',
    `Run: ${runType}`,
    '',
    TAGRO_REAL_WORLD_OPERATING_CONTRACT,
    '',
    'Produktregeln:',
    rulesBlock,
    '',
    'Antwortregel: Gib ausschließlich valides JSON zurück. Erfinde keine Belege, Personenprofile oder externen Fakten.',
  ].join('\n')
}

export const TAGRO_INTELLIGENCE_RESPONSE_CONTRACT = `{
  "summary": "",
  "contextUnderstanding": "",
  "organizationalImpact": "",
  "recommendation": "",
  "nextAction": "",
  "confidence": 0.0,
  "usedOperationalDna": false
}`
