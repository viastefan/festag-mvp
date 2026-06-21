import type { DocKind } from '@/lib/documents/templates'

export const TEMPLATE_BLURBS: Record<DocKind, string> = {
  angebot: 'Positionen, Gültigkeit, gebrandetes PDF',
  rechnung: 'Leistungszeitraum, IBAN, Zahlungsziel',
  vertrag: 'Leistungsumfang, Vergütung, Laufzeit',
}

export const TEMPLATE_ACTION: Record<DocKind, string> = {
  angebot: 'Angebot erstellen',
  rechnung: 'Rechnung erstellen',
  vertrag: 'Vertrag erstellen',
}
