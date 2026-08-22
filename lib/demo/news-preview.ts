/**
 * Local UI preview payload for the News start page — no auth / no API.
 * Uses the same flag as Overview: `?preview=1` or `NEXT_PUBLIC_FESTAG_DEMO=1`.
 *
 * Es sind erfundene Meldungen, aber echte Zustände: offene Entscheidung,
 * offenes Risiko, wartende Abnahme, erledigte Lieferung, stiller Bericht.
 * Wer die Seite hiermit ansieht, sieht jede Form, die sie annehmen kann.
 */

import type { NewsPayload } from '@/lib/news/types'

export { isOverviewPreview as isNewsPreview } from '@/lib/demo/overview-preview'

const H = 3_600_000

export const DEMO_NEWS_PAYLOAD: NewsPayload = {
  reader: { name: 'Stefan' },
  generatedAt: new Date().toISOString(),
  projects: [
    { id: 'p1', title: 'Festag Web', color: null },
    { id: 'p2', title: 'Tagro Voice', color: null },
  ],
  digest: {
    line: '2 Entscheidungen · 1 Risiko warten auf dich.',
    openCount: 4,
    freshCount: 0,
  },
  stories: [
    {
      id: 'd1', category: 'decision', weight: 'lead', open: true, rank: 98,
      headline: 'Zahlungsanbieter für den Checkout festlegen',
      body: 'Tagro empfiehlt Stripe — schnellere Anbindung, aber höhere Gebühren pro Transaktion.',
      projectId: 'p1', projectTitle: 'Festag Web',
      at: new Date(Date.now() - 2 * H).toISOString(),
      href: '/decisions', action: { label: 'Entscheiden', href: '/decisions' },
    },
    {
      id: 'r1', category: 'risk', weight: 'major', open: true, rank: 96,
      headline: 'Der Import der Altdaten verzögert die Testphase um drei Tage',
      body: 'Zwei Felder fehlen im Export des Vorgängersystems.',
      projectId: 'p1', projectTitle: 'Festag Web',
      at: new Date(Date.now() - 5 * H).toISOString(),
      href: '/issues', action: { label: 'Ansehen', href: '/issues' },
    },
    {
      id: 'd2', category: 'decision', weight: 'normal', open: true, rank: 90,
      headline: 'Soll die Sprachaufnahme auch offline funktionieren?',
      body: 'Betrifft den Umfang der zweiten Phase.',
      projectId: 'p2', projectTitle: 'Tagro Voice',
      at: new Date(Date.now() - 9 * H).toISOString(),
      href: '/decisions', action: { label: 'Entscheiden', href: '/decisions' },
    },
    {
      id: 't1', category: 'delivery', weight: 'major', open: true, rank: 92,
      headline: 'Das neue Login wartet auf deine Abnahme',
      body: 'Von Tagro geprüft, bereit zum Durchklicken.',
      projectId: 'p1', projectTitle: 'Festag Web',
      at: new Date(Date.now() - 26 * H).toISOString(),
      href: '/overview/tasks', action: { label: 'Abnehmen', href: '/overview/tasks' },
    },
    {
      id: 't2', category: 'delivery', weight: 'normal', open: false, rank: 55,
      headline: 'Die Projektübersicht lädt jetzt in unter einer Sekunde',
      body: null,
      projectId: 'p1', projectTitle: 'Festag Web',
      at: new Date(Date.now() - 30 * H).toISOString(),
      href: '/overview/tasks', action: null,
    },
    {
      id: 'rep1', category: 'report', weight: 'quiet', open: false, rank: 30,
      headline: 'Wochenbericht: 12 Aufgaben erledigt, eine Entscheidung offen',
      body: 'Tagro hat den Stand der Woche zusammengefasst.',
      projectId: 'p2', projectTitle: 'Tagro Voice',
      at: new Date(Date.now() - 52 * H).toISOString(),
      href: '/reports', action: null,
    },
    {
      id: 'tm1', category: 'team', weight: 'quiet', open: false, rank: 25,
      headline: 'Lena arbeitet ab sofort an Tagro Voice mit',
      body: null,
      projectId: 'p2', projectTitle: 'Tagro Voice',
      at: new Date(Date.now() - 76 * H).toISOString(),
      href: '/teams', action: null,
    },
  ],
}
