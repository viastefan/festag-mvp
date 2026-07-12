import { festagDocsArticles } from '@/lib/festag-docs'

export type FestagHelpTopic = {
  title: string
  slug: string
  description: string
}

/** Kuratierte Themen für Festag Help — Tagro kann sie jederzeit erklären. */
export const FESTAG_HELP_TOPICS: FestagHelpTopic[] = [
  {
    title: 'Was ist Festag?',
    slug: 'was-ist-festag',
    description: 'Grundlagen, Navigation und die ersten Minuten in Festag.',
  },
  {
    title: 'Schnellstart mit Festag',
    slug: 'schnellstart-mit-festag',
    description: 'Die wichtigsten ersten Schritte nach der Registrierung.',
  },
  {
    title: 'Entscheidungen in Festag',
    slug: 'entscheidungen-in-festag',
    description: 'Saubere Entscheidungen über Tagro — ohne Chat-Chaos.',
  },
  {
    title: 'Tagro im Statusbriefing',
    slug: 'tagro-statusbriefing',
    description: 'Wie Dev-Updates zu ruhiger Client-Lage werden.',
  },
]

export function searchHelpTopics(query: string): FestagHelpTopic[] {
  const q = query.trim().toLowerCase()
  if (!q) return FESTAG_HELP_TOPICS
  const fromCurated = FESTAG_HELP_TOPICS.filter(
    t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
  )
  if (fromCurated.length) return fromCurated
  return festagDocsArticles
    .filter(
      a =>
        a.title.toLowerCase().includes(q)
        || a.description.toLowerCase().includes(q)
        || a.tags.some(tag => tag.toLowerCase().includes(q)),
    )
    .slice(0, 6)
    .map(a => ({ title: a.title, slug: a.slug, description: a.description }))
}

export function tagroPromptForTopic(title: string) {
  return `Erkläre mir kurz und verständlich: ${title}`
}
