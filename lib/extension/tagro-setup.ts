import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'

export const TAGRO_FEATURES = [
  {
    id: 'writing',
    title: 'Schreibhilfe überall',
    copy: 'Text markieren oder ein Feld fokussieren — Tagro macht E-Mails und Notizen klarer, professioneller oder kürzer.',
    sites: 'Gmail, LinkedIn, Notion, Formulare',
  },
  {
    id: 'capture',
    title: 'Live-Feedback auf Vorschauen',
    copy: 'Staging-URL öffnen, Element markieren, Feedback per Stimme oder Text — direkt ins Festag-Projekt.',
    sites: 'Projekt-Staging, Client-Previews',
  },
  {
    id: 'style',
    title: 'Dein Schreibstil',
    copy: 'Tagro lernt aus übernommenen Vorschlägen, nicht aus abgebrochenen Entwürfen.',
    sites: 'Automatisch im Hintergrund',
  },
] as const

export type TagroChecklistItem = {
  id: string
  label: string
  detail: string
  done: boolean
  action?: { label: string; href: string }
}

export const TAGRO_TROUBLESHOOTING = [
  {
    id: 'not-detected',
    question: 'Festag erkennt Tagro nicht',
    answer:
      'Extension in chrome://extensions neu laden, dann festag.app mit F5 neu laden. „Erneut prüfen“ in den Einstellungen klicken.',
  },
  {
    id: 'connect',
    question: 'Popup zeigt „Mit Festag verbinden“',
    answer:
      'Im selben Chrome-Profil bei festag.app anmelden. Popup schließen und erneut öffnen.',
  },
  {
    id: 'chip-missing',
    question: 'Tagro erscheint nicht auf anderen Seiten',
    answer:
      'Im Popup „Nur ausgewählte Seiten“ deaktivieren. Testseite mit F5 neu laden, dann Text markieren oder Feld fokussieren.',
  },
  {
    id: 'ai-unavailable',
    question: '„Tagro-KI gerade nicht verfügbar“',
    answer:
      'KI-Backend prüfen — in den Einstellungen sollte „KI-Backend bereit“ stehen. Bei anhaltenden Fehlern Support kontaktieren.',
  },
  {
    id: '401',
    question: '401 oder nicht angemeldet',
    answer:
      'Gleiches Chrome-Profil wie festag.app nutzen. Extension in chrome://extensions einmal neu laden.',
  },
] as const

export { isExtensionVersionCurrent } from '@/lib/extension/tagro-health-logic'

export function compareExtensionVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
