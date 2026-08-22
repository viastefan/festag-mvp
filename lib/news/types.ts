/**
 * Festag News — the workspace newsroom.
 *
 * Not an activity log. The activity feed answers "what happened"; News answers
 * "what should I know", which is a smaller and much more useful set. Every
 * story is a sentence a person can read without knowing how the system works,
 * and — when something is still open — it carries the one action that closes it.
 */

export type NewsCategory =
  | 'decision'   // something needs a call, or a call was made
  | 'delivery'   // work reached a state the reader cares about
  | 'risk'       // something threatens the plan
  | 'progress'   // the project moved
  | 'report'     // Tagro summarised a stretch of work
  | 'team'       // people joined, left, took something on

/** How loudly a story is told. `lead` is reserved for the single top story. */
export type NewsWeight = 'lead' | 'major' | 'normal' | 'quiet'

export type NewsAction = {
  label: string
  href: string
}

export type NewsStory = {
  id: string
  category: NewsCategory
  weight: NewsWeight
  /** Plain-language sentence. Never an enum, never a field name. */
  headline: string
  /** One or two sentences of context. Optional — silence beats filler. */
  body: string | null
  projectId: string | null
  projectTitle: string | null
  /** ISO timestamp the story is filed under. */
  at: string
  href: string | null
  /** Present only while the story still waits for someone. */
  action: NewsAction | null
  /** Still open = still the reader's problem. Drives ordering and the marker. */
  open: boolean
  /** Internal ranking score — highest first inside a day. */
  rank: number
}

export type NewsDigest = {
  /** One sentence for the top of the page: the state of things right now. */
  line: string
  openCount: number
  /** Stories filed since the reader's last visit. */
  freshCount: number
}

export type NewsPayload = {
  stories: NewsStory[]
  reader: NewsReader
  digest: NewsDigest
  projects: { id: string; title: string; color: string | null }[]
  generatedAt: string
}

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  decision: 'Entscheidung',
  delivery: 'Lieferung',
  risk: 'Risiko',
  progress: 'Fortschritt',
  report: 'Bericht',
  team: 'Team',
}

export const CATEGORY_COLOR: Record<NewsCategory, string> = {
  decision: '#6366f1',
  delivery: '#16a34a',
  risk: '#ea580c',
  progress: '#5b647d',
  report: '#0ea5e9',
  team: '#8790a5',
}

/** Who the page greets. Resolved server-side — the page never guesses a name. */
export type NewsReader = {
  /** First name if we know one, otherwise a readable fallback. Never an id. */
  name: string
}

/**
 * Wie ein Ton getragen wird: `wait` wartet auf den Leser, `watch` beobachtet,
 * `good` ist erledigt, `quiet` ist nur Kenntnisnahme.
 */
export type NewsTone = 'wait' | 'watch' | 'good' | 'quiet'

export type NewsStatus = {
  /** Was gerade gilt — in der Sprache des Lesers, nie ein Feldname. */
  label: string
  tone: NewsTone
}

export const TONE_COLOR: Record<NewsTone, string> = {
  wait: '#D6A34F',
  watch: '#D86060',
  good: '#2E9B52',
  quiet: '#8790a5',
}

/**
 * Der Status einer Meldung — eine Stelle, an der entschieden wird, was oben
 * an einer Zeile steht. Offene Punkte sagen, was sie brauchen; geschlossene
 * sagen, was passiert ist. Sonst stünde in jeder Oberfläche ein anderes Wort
 * für denselben Zustand.
 */
export function storyStatus(story: Pick<NewsStory, 'category' | 'open'>): NewsStatus {
  if (story.open) {
    switch (story.category) {
      case 'decision': return { label: 'Benötigt Entscheidung', tone: 'wait' }
      case 'risk': return { label: 'Benötigt Aufmerksamkeit', tone: 'watch' }
      case 'delivery': return { label: 'Benötigt Abnahme', tone: 'wait' }
      default: return { label: 'Benötigt dich', tone: 'wait' }
    }
  }
  switch (story.category) {
    case 'decision': return { label: 'Entschieden', tone: 'quiet' }
    case 'risk': return { label: 'Geklärt', tone: 'good' }
    case 'delivery': return { label: 'Geliefert', tone: 'good' }
    case 'report': return { label: 'Bericht', tone: 'quiet' }
    case 'team': return { label: 'Team', tone: 'quiet' }
    default: return { label: 'Fortschritt', tone: 'quiet' }
  }
}
