/**
 * Pure Client ↔ Feature heuristics (safe for client + server bundles).
 * Persistence lives in lib/tagro/feature-proposal.ts.
 */

import { clampPriority, type Priority } from '@/lib/tagro/rules'

export type FeatureWorkItem = {
  title: string
  description: string
  priority: Priority
}

export type FeatureProposal = {
  kind: string
  feature_title: string
  client_summary: string
  action_label: string
  action_hint: string
  scope_note: string
  work_items: FeatureWorkItem[]
  needs_decision: true
  confidence_score: number
}

const FEATURE_PATTERNS: Array<{
  kind: string
  re: RegExp
  title: string
  action: string
  summary: string
  scope: string
  work: Array<[string, string, Priority?]>
}> = [
  {
    kind: 'blog',
    re: /\b(blog|beitr[aä]ge?|artikel|news\s*bereich|magazin)\b/i,
    title: 'Blog für die Website',
    action: 'Blog hinzufügen',
    summary:
      'Ein Blog eignet sich gut, um regelmäßig Inhalte zu veröffentlichen und die Auffindbarkeit deiner Website zu verbessern. Ich habe daraus einen neuen Feature-Vorschlag erstellt.',
    scope: 'Neues Feature mit möglicher Anpassung von Umfang und Aufwand.',
    work: [
      ['Datenbankmodell Blog', 'Schema für Beiträge, Autoren und Metadaten anlegen.', 'high'],
      ['Blogübersicht', 'Listenansicht aller Beiträge mit Pagination.', 'high'],
      ['Detailseite', 'Einzelne Blogbeiträge mit SEO-Metadaten rendern.', 'high'],
      ['Kategorien', 'Kategorien und Filter für Beiträge.', 'medium'],
      ['SEO', 'Titel, Beschreibung und Open-Graph für Beiträge.', 'medium'],
      ['Adminbereich', 'Beiträge anlegen, bearbeiten und veröffentlichen.', 'high'],
      ['Migration', 'Datenbank-Migration für das Blog-Modell.', 'high'],
      ['Tests', 'Abdeckung für Listen-, Detail- und Admin-Flow.', 'medium'],
    ],
  },
  {
    kind: 'search',
    re: /\b(suche|search|suchfunktion|finden)\b/i,
    title: 'Suchfunktion',
    action: 'Suche hinzufügen',
    summary:
      'Eine gezielte Suche hilft Besuchern, schneller das Richtige zu finden. Ich habe daraus einen Feature-Vorschlag erstellt.',
    scope: 'Neues Feature — Scope und Indexierung sollten klar begrenzt werden.',
    work: [
      ['Suchoberfläche', 'Eingabe und Ergebnisliste im Produkt-UI.', 'high'],
      ['Filter', 'Sinnvolle Filter für die Suchergebnisse.', 'medium'],
      ['Indexierung', 'Suchindex und Aktualisierung bei Änderungen.', 'high'],
      ['Tests', 'Such- und Filterfälle absichern.', 'medium'],
    ],
  },
  {
    kind: 'payments',
    re: /\b(zahlung|payment|checkout|stripe|paypal|kasse)\b/i,
    title: 'Zahlungen',
    action: 'Zahlungen hinzufügen',
    summary:
      'Ein klarer Zahlungsweg macht den Kaufprozess vertrauenswürdig. Ich habe daraus einen Feature-Vorschlag erstellt.',
    scope: 'Scope- und Anbieter-Entscheidung nötig — Kosten und Compliance prüfen.',
    work: [
      ['Zahlungsanbieter anbinden', 'Provider-Integration und Webhooks.', 'high'],
      ['Checkout-Flow', 'Ruhiger Kaufabschluss für den Kunden.', 'high'],
      ['Bestätigungen', 'Erfolgs- und Fehlerzustände client-safe.', 'medium'],
      ['Tests', 'Zahlungspfade und Fehlerfälle prüfen.', 'high'],
    ],
  },
  {
    kind: 'push',
    re: /\b(push|benachrichtigung|notification|app\s*benachricht)\b/i,
    title: 'Push-Benachrichtigungen',
    action: 'Push hinzufügen',
    summary:
      'Push-Benachrichtigungen halten Nutzer über wichtige Ereignisse auf dem Laufenden. Ich habe daraus einen Erweiterungsvorschlag erstellt.',
    scope: 'Add-on mit Einfluss auf App-Setup und Datenschutzhinweise.',
    work: [
      ['Push-Infrastruktur', 'Token-Registrierung und Versandpfad.', 'high'],
      ['Benachrichtigungsarten', 'Welche Ereignisse Trigger auslösen.', 'medium'],
      ['Einstellungen', 'Nutzer können Benachrichtigungen steuern.', 'medium'],
      ['Tests', 'Opt-in und Zustellung prüfen.', 'medium'],
    ],
  },
]

const IDEA_HINT =
  /\b(hätte\s+gerne|möchte|brauch|wünschen?|zusätzlich|neu(?:e[snr])?|feature|erweitern|hinzufügen|einbauen|integrier)\b/i

export function looksLikeFeatureIdea(text: string): boolean {
  const t = text.trim()
  if (t.length < 10) return false
  if (FEATURE_PATTERNS.some((p) => p.re.test(t))) return true
  return IDEA_HINT.test(t) && /\b(website|seite|app|shop|portal|dashboard|login|konto)\b/i.test(t)
}

export function buildFeatureProposal(clientText: string): FeatureProposal {
  const text = clientText.trim()
  const match = FEATURE_PATTERNS.find((p) => p.re.test(text))

  if (match) {
    return {
      kind: match.kind,
      feature_title: match.title,
      client_summary: match.summary,
      action_label: match.action,
      action_hint: match.scope,
      scope_note: match.scope,
      work_items: match.work.map(([title, description, priority]) => ({
        title,
        description,
        priority: clampPriority(priority, 'medium'),
      })),
      needs_decision: true,
      confidence_score: 0.82,
    }
  }

  const short =
    text
      .replace(/^(ich\s+)?(hätte\s+gerne|möchte|brauche)\s+/i, '')
      .split(/[.!?]/)[0]
      ?.trim()
      .slice(0, 72) || 'Neues Feature'

  const title = short.charAt(0).toUpperCase() + short.slice(1)
  return {
    kind: 'generic',
    feature_title: title,
    client_summary:
      'Das klingt nach einer sinnvollen Erweiterung. Ich habe daraus einen Feature-Vorschlag erstellt — du entscheidest, ob wir ihn ins Projekt aufnehmen.',
    action_label: `${title.slice(0, 40)} hinzufügen`,
    action_hint: 'Neues Feature — Umfang und Aufwand können sich ändern.',
    scope_note: 'Neues Feature mit möglicher Anpassung von Umfang und Aufwand.',
    work_items: [
      {
        title: `Anforderungen: ${title}`,
        description: `Client-Wunsch strukturieren und Acceptance Criteria festhalten.\n\nOriginal: ${text}`,
        priority: 'high',
      },
      {
        title: `Umsetzung: ${title}`,
        description: 'Feature laut abgestimmtem Scope umsetzen.',
        priority: 'high',
      },
      {
        title: `Tests: ${title}`,
        description: 'Kernpfade und Randfälle absichern.',
        priority: 'medium',
      },
    ],
    needs_decision: true,
    confidence_score: 0.68,
  }
}
