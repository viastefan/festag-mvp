/**
 * Welcher Kontext gilt hier gerade?
 *
 * Der Notausgang zu Tagro darf nicht bei null anfangen. Wer auf der
 * Aufgabenseite fragt, fragt zu Aufgaben — das muss der Nutzer nicht erst
 * hinschreiben. Diese Auflösung ist bewusst grob: sie erkennt die Fläche und,
 * wo die Route sie hergibt, das konkrete Objekt. Alles Feinere gehört an das
 * Objekt selbst, das `openTagro` mit echten Daten aufruft.
 *
 * Unbekannte Route → 'empty'. Lieber kein Kontext als ein falscher.
 */
import type { TagroContextType } from '@/components/TagroOverlay'

export type RouteContext = {
  contextType: TagroContextType
  /** Fläche in Nutzersprache — wird zum Titel des Tagro-Kontexts. */
  label: string
  /** Objekt-ID aus der Route, wenn die Route eine trägt. */
  id?: string
  /** Projekt-ID, wenn die Route in einem Projekt steht. */
  projectId?: string
}

/** Reihenfolge zählt: das spezifischere Präfix muss vor dem allgemeineren stehen. */
const AREAS: { prefix: string; contextType: TagroContextType; label: string }[] = [
  { prefix: '/project', contextType: 'project', label: 'Projekt' },
  { prefix: '/projects', contextType: 'project', label: 'Projekte' },
  { prefix: '/overview/projects', contextType: 'project', label: 'Projekte' },
  { prefix: '/tasks', contextType: 'task', label: 'Aufgaben' },
  { prefix: '/overview/tasks', contextType: 'task', label: 'Aufgaben' },
  { prefix: '/decisions', contextType: 'decision', label: 'Entscheidungen' },
  { prefix: '/documents', contextType: 'document', label: 'Dokumente' },
  { prefix: '/overview/documents', contextType: 'document', label: 'Dokumente' },
  { prefix: '/notes', contextType: 'note', label: 'Notizen' },
  { prefix: '/risks', contextType: 'risk', label: 'Risiken' },
  { prefix: '/issues', contextType: 'risk', label: 'Risiken' },
  { prefix: '/reports', contextType: 'status_report', label: 'Statusbericht' },
  { prefix: '/voice-reports', contextType: 'status_report', label: 'Statusbericht' },
  { prefix: '/updates', contextType: 'briefing', label: 'Updates' },
  { prefix: '/executive', contextType: 'report', label: 'Übersicht' },
  { prefix: '/clients', contextType: 'client', label: 'Kunden' },
  { prefix: '/captures', contextType: 'evidence', label: 'Aufnahmen' },
  { prefix: '/deliverables', contextType: 'evidence', label: 'Ergebnisse' },
  { prefix: '/dev', contextType: 'dev_item', label: 'Entwicklung' },
]

/** Sieht das nach einer ID aus — und nicht nach einem Unterpfad wie "milestones"? */
function looksLikeId(segment: string | undefined): segment is string {
  if (!segment) return false
  return /^[0-9a-f-]{8,}$/i.test(segment) || /^\d+$/.test(segment)
}

export function resolveRouteContext(pathname: string): RouteContext {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '') || '/'
  const segments = path.split('/').filter(Boolean)

  const area = AREAS
    .filter(a => path === a.prefix || path.startsWith(`${a.prefix}/`))
    // Längstes Präfix gewinnt: /overview/projects schlägt /projects nicht,
    // aber /projects schlägt / — und /project/x bleibt beim Projekt.
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]

  if (!area) return { contextType: 'empty', label: 'Festag' }

  // /project/<id>, /projects/<id>/tasks/<taskId>, /decisions/<id> …
  const prefixDepth = area.prefix.split('/').filter(Boolean).length
  const next = segments[prefixDepth]
  const id = looksLikeId(next) ? next : undefined

  // Eine Aufgabe innerhalb eines Projekts ist eine Aufgabe, kein Projekt.
  const taskIdx = segments.indexOf('tasks')
  if (area.contextType === 'project' && taskIdx > -1 && looksLikeId(segments[taskIdx + 1])) {
    return {
      contextType: 'task',
      label: 'Aufgabe',
      id: segments[taskIdx + 1],
      projectId: id,
    }
  }

  return {
    contextType: area.contextType,
    label: area.label,
    id,
    projectId: area.contextType === 'project' ? id : undefined,
  }
}
