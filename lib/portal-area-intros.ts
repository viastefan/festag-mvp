import type { Icon } from '@phosphor-icons/react'
import { Package, Scales, SealCheck } from '@phosphor-icons/react'

export type PortalAreaId = 'decisions' | 'captures' | 'deliverables'

export type PortalAreaIntroContent = {
  id: PortalAreaId
  title: string
  kicker: string
  body: string
  bullets: string[]
  Icon: Icon
  storageKey: string
  compare: Array<{ area: string; text: string }>
}

export const PORTAL_AREA_INTROS: Record<PortalAreaId, PortalAreaIntroContent> = {
  decisions: {
    id: 'decisions',
    title: 'Entscheidungen',
    kicker: 'Deine Wahl steuert das Projekt',
    body: 'Hier landen Fragen, bei denen du zwischen echten Optionen wählen musst — nicht nur fertige Arbeit abnicken.',
    Icon: Scales,
    storageKey: 'festag.areaIntro.decisions.v1',
    bullets: [
      'Tagro formuliert die Frage verständlich mit Optionen und Begründung.',
      'Du entscheidest — das Team setzt danach um.',
      'Typisch: Scope, Priorität, Anbieter, Richtung (A oder B).',
    ],
    compare: [
      { area: 'Freigaben', text: 'Feedback zur live Seite — noch keine fertige Lieferung.' },
      { area: 'Lieferungen', text: 'Fertiges Asset vom Team prüfen und freigeben.' },
    ],
  },
  captures: {
    id: 'captures',
    title: 'Freigaben',
    kicker: 'Live-Feedback auf der Staging-Seite',
    body: 'Du siehst die Seite, nimmst Feedback auf — Tagro macht daraus klare Änderungen fürs Entwickler-Team.',
    Icon: SealCheck,
    storageKey: 'festag.areaIntro.captures.v1',
    bullets: [
      'Sprechen oder tippen, während du die Seite durchgehst.',
      'Tagro strukturiert dein Feedback in umsetzbare Änderungen.',
      'Du prüfst und sendest — dann arbeitet das Team daran.',
    ],
    compare: [
      { area: 'Entscheidungen', text: 'Du wählst zwischen Optionen (z. B. A oder B).' },
      { area: 'Lieferungen', text: 'Fertige Datei oder Design vom Team abnehmen.' },
    ],
  },
  deliverables: {
    id: 'deliverables',
    title: 'Lieferungen',
    kicker: 'Fertige Arbeit vom Team',
    body: 'Hier prüfst du, was das Team geliefert hat — Design, Dokument, Release. Freigeben oder Änderung anfragen.',
    Icon: Package,
    storageKey: 'festag.areaIntro.deliverables.v1',
    bullets: [
      'Klare Zusammenfassung pro Lieferung — ohne Rohdaten-Chaos.',
      'Freigeben, wenn es passt — oder konkretes Feedback geben.',
      'Der Projektverlauf bleibt für dich nachvollziehbar.',
    ],
    compare: [
      { area: 'Freigaben', text: 'Rohes Live-Feedback zur Seite, Tagro strukturiert es.' },
      { area: 'Entscheidungen', text: 'Strategische Wahl zwischen Optionen.' },
    ],
  },
}

export function portalAreaIntroSeen(area: PortalAreaId): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(PORTAL_AREA_INTROS[area].storageKey) === '1'
  } catch {
    return true
  }
}

export function markPortalAreaIntroSeen(area: PortalAreaId) {
  try {
    localStorage.setItem(PORTAL_AREA_INTROS[area].storageKey, '1')
  } catch { /* ignore */ }
}
