import type { TagroAction, TagroActionId, TagroSubjectKind } from '@/lib/tagro/experience/types'

/**
 * The Tagro action catalog.
 *
 * Every action is a contextual verb the user can apply to whatever they are
 * looking at. The toolbar shows the `primary` ones; the rest live behind
 * "Mehr". Nothing here opens a chat — actions run in place.
 */

const TEXT: TagroSubjectKind[] = ['text', 'note', 'document', 'report']

export const TAGRO_ACTIONS: TagroAction[] = [
  // ── Text ─────────────────────────────────────────────────────────────────
  {
    id: 'text.improve',
    label: 'Verbessern',
    kinds: TEXT,
    mode: 'replace',
    primary: true,
    needsContent: true,
    instruction:
      'Verbessere den Text: klarer, präziser, besser lesbar. Behalte Sprache, Bedeutung, Fakten und Format exakt bei. Erfinde nichts dazu.',
  },
  {
    id: 'text.rewrite',
    label: 'Umschreiben',
    kinds: TEXT,
    mode: 'replace',
    primary: true,
    needsContent: true,
    instruction:
      'Formuliere den Text neu mit anderer Satzstruktur und Wortwahl. Gleiche Aussage, gleiche Sprache, gleiche Länge (±20 %).',
  },
  {
    id: 'text.explain',
    label: 'Erklären',
    kinds: [...TEXT, 'task', 'decision', 'issue', 'file', 'design'],
    mode: 'answer',
    primary: true,
    instruction:
      'Erkläre knapp, worum es hier geht und warum es relevant ist. Maximal drei Sätze. Keine Wiederholung des Originaltexts.',
  },
  {
    id: 'text.shorten',
    label: 'Kürzen',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction: 'Kürze den Text deutlich, ohne eine einzige Information zu verlieren. Gleiche Sprache.',
  },
  {
    id: 'text.expand',
    label: 'Ausführlicher',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction:
      'Führe den Text weiter aus: konkreter, mit den nötigen Details. Keine erfundenen Fakten, keine Floskeln.',
  },
  {
    id: 'text.simplify',
    label: 'Vereinfachen',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction: 'Vereinfache den Text so, dass ihn eine fachfremde Person sofort versteht. Keine Fachbegriffe ohne Erklärung.',
  },
  {
    id: 'text.summarize',
    label: 'Zusammenfassen',
    kinds: [...TEXT, 'meeting', 'file', 'project'],
    mode: 'answer',
    needsContent: true,
    instruction: 'Fasse das Wesentliche in maximal fünf Stichpunkten zusammen. Nur was tatsächlich dasteht.',
  },
  {
    id: 'text.translate',
    label: 'Übersetzen',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction:
      'Übersetze den Text: Deutsch → Englisch, jede andere Sprache → Deutsch. Fachbegriffe und Eigennamen bleiben unverändert.',
  },
  {
    id: 'text.professional',
    label: 'Professioneller Ton',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction: 'Schreibe den Text in einem professionellen, sachlichen Ton. Nicht steif, nicht werblich.',
  },
  {
    id: 'text.friendly',
    label: 'Freundlicher Ton',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction: 'Schreibe den Text freundlich und zugewandt, ohne unprofessionell zu wirken.',
  },
  {
    id: 'text.executive',
    label: 'Executive Summary',
    kinds: [...TEXT, 'project', 'meeting', 'report'],
    mode: 'compose',
    instruction:
      'Schreibe eine Executive Summary für Entscheider: Lage, Auswirkung, Empfehlung, nächster Schritt. Maximal 120 Wörter.',
  },
  {
    id: 'text.grammar',
    label: 'Grammatik korrigieren',
    kinds: TEXT,
    mode: 'replace',
    needsContent: true,
    instruction:
      'Korrigiere ausschließlich Rechtschreibung, Grammatik und Zeichensetzung. Ändere Stil, Wortwahl und Struktur nicht.',
  },
  {
    id: 'text.action-items',
    label: 'Action Items ableiten',
    kinds: [...TEXT, 'meeting'],
    mode: 'answer',
    instruction:
      'Leite konkrete Action Items ab. Pro Zeile: Aufgabe, verantwortliche Person (falls genannt), Frist (falls genannt). Keine Erfindungen.',
  },

  // ── Task ─────────────────────────────────────────────────────────────────
  {
    id: 'task.subtasks',
    label: 'In Teilaufgaben zerlegen',
    kinds: ['task', 'issue'],
    mode: 'answer',
    primary: true,
    instruction:
      'Zerlege die Aufgabe in umsetzbare Teilaufgaben in sinnvoller Reihenfolge. Pro Teilaufgabe eine Zeile, jeweils ein klares Ergebnis.',
  },
  {
    id: 'task.estimate',
    label: 'Aufwand schätzen',
    kinds: ['task', 'issue', 'project'],
    mode: 'answer',
    primary: true,
    instruction:
      'Schätze den Aufwand auf Basis vergleichbarer Arbeit in diesem Workspace. Nenne Spanne, Annahmen und den größten Unsicherheitsfaktor.',
  },
  {
    id: 'task.dependencies',
    label: 'Abhängigkeiten finden',
    kinds: ['task', 'issue', 'project'],
    mode: 'answer',
    instruction: 'Nenne, was vorher fertig sein muss und was auf diese Aufgabe wartet. Nur aus dem vorliegenden Kontext.',
  },
  {
    id: 'task.priority',
    label: 'Priorität vorschlagen',
    kinds: ['task', 'issue'],
    mode: 'answer',
    instruction: 'Schlage eine Priorität vor und begründe sie in einem Satz anhand von Frist, Blockern und Auswirkung.',
  },
  {
    id: 'task.plan',
    label: 'Umsetzungsplan',
    kinds: ['task', 'issue', 'project'],
    mode: 'compose',
    instruction: 'Erstelle einen Umsetzungsplan: Schritte, Reihenfolge, benötigte Zuarbeit, Definition of Done.',
  },
  {
    id: 'task.acceptance',
    label: 'Abnahmekriterien prüfen',
    kinds: ['task', 'issue'],
    mode: 'answer',
    instruction:
      'Prüfe die Abnahmekriterien auf Lücken, Widersprüche und nicht prüfbare Formulierungen. Nenne konkrete Korrekturen.',
  },
  {
    id: 'task.risks',
    label: 'Risiken erkennen',
    kinds: ['task', 'issue', 'project', 'decision'],
    mode: 'answer',
    instruction: 'Nenne die konkreten Risiken mit jeweils einem Satz Auswirkung und einem Satz Gegenmaßnahme.',
  },

  // ── Files ────────────────────────────────────────────────────────────────
  {
    id: 'file.summarize',
    label: 'Zusammenfassen',
    kinds: ['file'],
    mode: 'answer',
    primary: true,
    instruction: 'Fasse zusammen, was diese Datei enthält und wofür sie im Projekt gebraucht wird.',
  },
  {
    id: 'file.compare',
    label: 'Vergleichen',
    kinds: ['file'],
    mode: 'answer',
    instruction: 'Vergleiche die ausgewählten Dateien: Unterschiede, Überschneidungen, welche die aktuelle ist.',
  },
  {
    id: 'file.rename',
    label: 'Benennung vorschlagen',
    kinds: ['file'],
    mode: 'replace',
    instruction: 'Schlage einen präzisen Dateinamen nach der im Workspace üblichen Konvention vor. Nur den Namen ausgeben.',
  },
  {
    id: 'file.categorize',
    label: 'Einordnen',
    kinds: ['file'],
    mode: 'answer',
    instruction: 'Ordne die Datei einer Kategorie und einem Projektbereich zu und begründe das in einem Satz.',
  },
  {
    id: 'file.document',
    label: 'Dokumentation erzeugen',
    kinds: ['file'],
    mode: 'compose',
    instruction: 'Erzeuge eine kurze Dokumentation: Zweck, Inhalt, Verwendung, Zuständigkeit.',
  },
  {
    id: 'file.duplicates',
    label: 'Dubletten finden',
    kinds: ['file'],
    mode: 'answer',
    instruction: 'Prüfe im vorliegenden Kontext auf Dubletten oder ältere Versionen derselben Datei.',
  },

  // ── Meetings ─────────────────────────────────────────────────────────────
  {
    id: 'meeting.summary',
    label: 'Zusammenfassen',
    kinds: ['meeting'],
    mode: 'answer',
    primary: true,
    instruction: 'Fasse das Meeting zusammen: Anlass, Kernpunkte, Ergebnis. Maximal fünf Zeilen.',
  },
  {
    id: 'meeting.decisions',
    label: 'Entscheidungen extrahieren',
    kinds: ['meeting'],
    mode: 'answer',
    primary: true,
    instruction: 'Liste ausschließlich getroffene Entscheidungen mit jeweils Entscheider und Begründung.',
  },
  {
    id: 'meeting.tasks',
    label: 'Aufgaben extrahieren',
    kinds: ['meeting'],
    mode: 'answer',
    instruction: 'Liste die entstandenen Aufgaben mit Verantwortlichem und Frist, sofern genannt.',
  },
  {
    id: 'meeting.blockers',
    label: 'Blocker erkennen',
    kinds: ['meeting'],
    mode: 'answer',
    instruction: 'Nenne genannte oder implizite Blocker und wer sie auflösen kann.',
  },
  {
    id: 'meeting.followup',
    label: 'Follow-up schreiben',
    kinds: ['meeting'],
    mode: 'compose',
    instruction:
      'Schreibe eine Follow-up-Nachricht an die Teilnehmenden: Ergebnis, Aufgaben, nächste Schritte. Ton wie im Workspace üblich.',
  },
  {
    id: 'meeting.status',
    label: 'Statusbericht erzeugen',
    kinds: ['meeting', 'project'],
    mode: 'compose',
    instruction: 'Erzeuge einen kundentauglichen Statusbericht: Fortschritt, Entscheidungen, Risiken, nächste Schritte.',
  },

  // ── Images ───────────────────────────────────────────────────────────────
  {
    id: 'image.describe',
    label: 'Beschreiben',
    kinds: ['image'],
    mode: 'answer',
    primary: true,
    instruction: 'Beschreibe sachlich, was zu sehen ist und wofür es im Projekt steht.',
  },
  {
    id: 'image.alt',
    label: 'Alt-Text erzeugen',
    kinds: ['image'],
    mode: 'replace',
    instruction: 'Schreibe einen präzisen Alt-Text in einem Satz. Nur den Alt-Text ausgeben.',
  },
  {
    id: 'image.analyze',
    label: 'Analysieren',
    kinds: ['image'],
    mode: 'answer',
    instruction: 'Analysiere Aufbau, Aussage und Schwachstellen.',
  },
  {
    id: 'image.ui',
    label: 'UI-Verbesserungen',
    kinds: ['image', 'design'],
    mode: 'answer',
    instruction: 'Nenne konkrete UI-Verbesserungen, jeweils mit Begründung. Keine allgemeinen Design-Ratschläge.',
  },
  {
    id: 'image.inconsistencies',
    label: 'Inkonsistenzen finden',
    kinds: ['image', 'design'],
    mode: 'answer',
    instruction: 'Finde Abweichungen von Abstand, Typografie, Farbe und Komponentenlogik.',
  },

  // ── Design ───────────────────────────────────────────────────────────────
  {
    id: 'design.ux',
    label: 'UX prüfen',
    kinds: ['design'],
    mode: 'answer',
    primary: true,
    instruction: 'Prüfe den Nutzerfluss: Verständlichkeit, Anzahl Schritte, Fehlerfälle, fehlende Zustände.',
  },
  {
    id: 'design.a11y',
    label: 'Barrierefreiheit prüfen',
    kinds: ['design'],
    mode: 'answer',
    primary: true,
    instruction: 'Prüfe Kontrast, Zielgrößen, Fokusreihenfolge, Beschriftungen und Tastaturbedienung.',
  },
  {
    id: 'design.hierarchy',
    label: 'Hierarchie prüfen',
    kinds: ['design'],
    mode: 'answer',
    instruction: 'Prüfe die visuelle Hierarchie: Wohin geht der Blick zuerst, was konkurriert, was fehlt.',
  },
  {
    id: 'design.typography',
    label: 'Typografie prüfen',
    kinds: ['design'],
    mode: 'answer',
    instruction: 'Prüfe Schriftgrößen, Zeilenhöhen, Laufweite und Zeilenlängen gegen das Festag-System.',
  },
  {
    id: 'design.spacing',
    label: 'Abstände prüfen',
    kinds: ['design'],
    mode: 'answer',
    instruction: 'Prüfe Abstände und Rhythmus auf Konsistenz mit dem Raster.',
  },
  {
    id: 'design.color',
    label: 'Farben prüfen',
    kinds: ['design'],
    mode: 'answer',
    instruction: 'Prüfe die Farbverwendung auf Systemtreue, Kontrast und Bedeutungsklarheit.',
  },
  {
    id: 'design.implementation',
    label: 'Umsetzung vorschlagen',
    kinds: ['design'],
    mode: 'compose',
    instruction: 'Schlage die technische Umsetzung vor: Komponenten, Zustände, Tokens, Aufwand.',
  },

  // ── Project / page level ─────────────────────────────────────────────────
  {
    id: 'project.next',
    label: 'Was ist als Nächstes dran?',
    kinds: ['project', 'page', 'task', 'decision', 'report'],
    mode: 'answer',
    primary: true,
    instruction:
      'Nenne die nächste sinnvolle Handlung für genau diese Person auf genau diesem Stand. Konkret, begründet, eine Empfehlung — keine Liste von Optionen.',
  },
  {
    id: 'project.status',
    label: 'Stand erklären',
    kinds: ['project', 'page'],
    mode: 'answer',
    instruction: 'Erkläre den aktuellen Stand: was läuft, was hängt, was ist entschieden, was ist offen.',
  },
  {
    id: 'project.risks',
    label: 'Risiken',
    kinds: ['project', 'page'],
    mode: 'answer',
    instruction: 'Nenne die Risiken mit Auswirkung und Gegenmaßnahme, sortiert nach Dringlichkeit.',
  },
]

const BY_ID = new Map<TagroActionId, TagroAction>(TAGRO_ACTIONS.map(a => [a.id, a]))

export function getTagroAction(id: TagroActionId): TagroAction | undefined {
  return BY_ID.get(id)
}

/** Actions offered for a subject kind, primaries first. */
export function actionsForKind(kind: TagroSubjectKind, hasContent: boolean): TagroAction[] {
  return TAGRO_ACTIONS.filter(a => a.kinds.includes(kind)).filter(a => hasContent || !a.needsContent)
}

export function splitPrimary(actions: TagroAction[], limit = 4): { primary: TagroAction[]; more: TagroAction[] } {
  const primary: TagroAction[] = []
  const more: TagroAction[] = []
  for (const a of actions) {
    if (a.primary && primary.length < limit) primary.push(a)
    else more.push(a)
  }
  // Backfill so the toolbar never looks empty on kinds without enough primaries.
  while (primary.length < Math.min(limit, actions.length) && more.length) {
    primary.push(more.shift() as TagroAction)
  }
  return { primary, more }
}
