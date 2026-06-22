/** Portal onboarding tour — targets, copy, nav wiring. */

export type TourPlacement = 'left' | 'right' | 'top' | 'bottom'

export type WelcomeTourStep = {
  id: string
  target: string
  title: string
  description: string
  bullets?: string[]
  preferred: TourPlacement
  /** Navigate here before highlighting (sidebar steps work from any route). */
  route?: string
}

export const WELCOME_TOUR_INTRO = {
  kicker: 'Erster Einstieg',
  title: 'Willkommen bei Festag',
  body:
    'Festag ist deine Delivery Intelligence — kein Cockpit, kein Fachchinesisch. ' +
    'Du siehst verständlich, was passiert, triffst klare Entscheidungen, ' +
    'und dein Team arbeitet in bestehenden Tools weiter.',
}

/** Eight-step product tour — aligned with portal nav + Statusabfrage. */
export const WELCOME_TOUR_STEPS: WelcomeTourStep[] = [
  {
    id: 'statusabfrage',
    target: 'sidebar-status',
    title: 'Statusabfrage',
    description:
      'Dein Gesamtbericht für alle Projekte. Tagro übersetzt Signale aus dem Team in ruhige, client-ready Klarheit.',
    bullets: [
      'Scope und Zeitraum oben rechts wählen',
      'Bericht jederzeit neu schreiben oder aktualisieren',
    ],
    preferred: 'right',
    route: '/dashboard',
  },
  {
    id: 'gesamtbericht',
    target: 'tour-status-stage',
    title: 'Bericht lesen und anhören',
    description:
      'Der Bericht läuft wie ein Teleprompter — Satz für Satz. Unten hörst du ihn an oder öffnest Tagro zum Bearbeiten.',
    preferred: 'top',
    route: '/dashboard',
  },
  {
    id: 'inbox',
    target: 'sidebar-inbox',
    title: 'Posteingang',
    description:
      'Hier landen strukturierte Eingänge: neue Projektstände, Rechnungen, Freigaben und Entscheidungen, die auf dich warten.',
    preferred: 'right',
  },
  {
    id: 'projects',
    target: 'sidebar-projects',
    title: 'Projekte',
    description:
      'Jedes Projekt bündelt Status, Team, Entscheidungen, Risiken und Kommunikation — ohne generisches Task-Chaos.',
    bullets: [
      'Neues Projekt startest du über das Dock oder „Neues Projekt"',
      'Tagro bereitet Roadmap und Aufgaben vor',
    ],
    preferred: 'right',
  },
  {
    id: 'decisions',
    target: 'sidebar-decisions',
    title: 'Entscheidungen',
    description:
      'Fragen, bei denen du zwischen echten Optionen wählen musst — nicht nur fertige Arbeit abnicken.',
    bullets: [
      'Tagro formuliert Optionen und Begründung',
      'Deine Wahl steuert Scope, Priorität und Richtung',
    ],
    preferred: 'right',
  },
  {
    id: 'captures',
    target: 'sidebar-captures',
    title: 'Freigaben',
    description:
      'Live-Feedback auf der Staging-Seite. Du gehst die Seite durch — Tagro macht daraus klare Änderungen fürs Team.',
    preferred: 'right',
  },
  {
    id: 'deliverables',
    target: 'sidebar-deliverables',
    title: 'Lieferungen',
    description:
      'Fertige Arbeit vom Team prüfen: Design, Dokument, Release. Freigeben oder konkretes Feedback geben.',
    preferred: 'right',
  },
  {
    id: 'tagro',
    target: 'tour-tagro',
    title: 'Mit Tagro bearbeiten',
    description:
      'Tagro ist dein Project Interpreter — kein Chatbot-Spielplatz. Frag nach Stand, Risiken, Formulierungen oder nächsten Schritten.',
    bullets: [
      'Frag nach Stand, Risiken oder Formulierungen',
      'Tour jederzeit erneut unter Hilfe starten',
    ],
    preferred: 'top',
    route: '/dashboard',
  },
]

const NAV_TOUR_TARGETS: Record<string, string> = {
  '/tagro': 'sidebar-update',
  '/dashboard': 'sidebar-status',
  '/messages': 'sidebar-inbox',
  '/projects': 'sidebar-projects',
  '/decisions': 'sidebar-decisions',
  '/captures': 'sidebar-captures',
  '/deliverables': 'sidebar-deliverables',
  '/executive': 'sidebar-executive',
}

export function welcomeTourTargetForHref(href: string): string | undefined {
  return NAV_TOUR_TARGETS[href]
}
