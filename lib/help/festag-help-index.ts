import {
  festagDocsArticles,
  getDocArticle,
  type FestagDocArticle,
  type FestagDocSection,
} from '@/lib/festag-docs'

export type FestagHelpHit = {
  title: string
  slug: string
  description: string
  category: FestagDocSection | string
  readingTime: string
  score: number
  popular?: boolean
}

/** Natürliche Suchbegriffe → Doc-Slug (Deutsch, Umgangssprache). */
const QUERY_ALIASES: Array<{ slug: string; terms: string[] }> = [
  { slug: 'was-ist-festag', terms: ['was ist festag', 'festag erklärt', 'plattform', 'überblick'] },
  { slug: 'schnellstart-mit-festag', terms: ['schnellstart', 'erste schritte', 'anfangen', 'onboarding', 'registrierung'] },
  { slug: 'dashboard-verstehen', terms: ['dashboard', 'gesamtbericht', 'startseite', 'übersicht'] },
  { slug: 'projekt-anlegen', terms: ['projekt anlegen', 'neues projekt', 'projekt erstellen', 'project'] },
  { slug: 'projektstatus-verstehen', terms: ['projektstatus', 'status projekt', 'wie läuft projekt'] },
  { slug: 'tasks-verstehen', terms: ['aufgabe', 'aufgaben', 'task', 'tasks', 'todo'] },
  { slug: 'entscheidungen', terms: ['entscheidung', 'entscheidungen', 'decision', 'frage stellen'] },
  { slug: 'entscheidungen-in-festag', terms: ['entscheidung workflow', 'optionen wählen', 'tagro empfehlung'] },
  { slug: 'was-ist-tagro', terms: ['was ist tagro', 'tagro erklärt', 'ki', 'ai', 'interpreter'] },
  { slug: 'tagro-statusbriefing', terms: ['statusbriefing', 'dev update', '16 uhr', 'client lage', 'täglicher status'] },
  { slug: 'statusberichte-in-festag', terms: ['statusbericht', 'bericht', 'report', 'status report'] },
  { slug: 'statusabfragen-erstellen', terms: ['statusabfrage', 'abfrage senden', 'update anfordern'] },
  { slug: 'heute-im-fokus', terms: ['heute im fokus', 'fokus', 'prioritäten heute'] },
  { slug: 'posteingang-verstehen', terms: ['posteingang', 'inbox', 'post', 'benachrichtigung'] },
  { slug: 'notizen-mit-tagro', terms: ['notiz', 'notizen', 'meeting', 'journal', 'brief'] },
  { slug: 'teams-verwalten', terms: ['team', 'teams', 'mitglied', 'einladen', 'rolle'] },
  { slug: 'rollen-und-berechtigungen', terms: ['berechtigung', 'rolle', 'admin', 'zugriff'] },
  { slug: 'audio-briefings-mit-tagro', terms: ['audio', 'briefing', 'anhören', 'vorlesen'] },
  { slug: 'festag-fuer-agenturen', terms: ['agentur', 'whitelabel', 'kundenportal', 'agency'] },
  { slug: 'datenschutz-und-zugriffskontrolle', terms: ['datenschutz', 'privacy', 'sicherheit', 'dsgvo'] },
  { slug: 'festag-garantie', terms: ['garantie', 'vertrauen', 'qualität', 'support'] },
  { slug: 'mit-externen-entwicklern-arbeiten', terms: ['developer', 'entwickler', 'dev panel', 'extern'] },
  { slug: 'wichtigste-bereiche', terms: ['navigation', 'bereiche', 'menü', 'sidebar'] },
  { slug: 'executive-weekly-summary', terms: ['executive', 'führung', 'weekly', 'wochenbericht'] },
  { slug: 'kundenportal-fuer-agenturen', terms: ['client portal', 'kunden portal', 'portal'] },
]

export const FESTAG_HELP_STARTERS: FestagHelpHit[] = festagDocsArticles
  .filter(a => a.popular)
  .slice(0, 6)
  .map(a => ({
    title: a.title,
    slug: a.slug,
    description: a.description,
    category: a.category,
    readingTime: a.readingTime,
    score: 100,
    popular: true,
  }))

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

function articleSearchBlob(article: FestagDocArticle) {
  const legacy = article.content
    ? [
        article.content.overview,
        ...article.content.explanation,
        article.content.example,
        article.content.nextStep,
      ]
    : []
  const body = (article.body ?? [])
    .flatMap(block => {
      if (block.type === 'list') return block.items
      if ('text' in block && typeof block.text === 'string') return [block.text]
      return []
    })
  return [article.title, article.description, article.category, ...article.tags, ...legacy, ...body]
    .join(' ')
    .toLowerCase()
}

export function articlePlainText(article: FestagDocArticle, maxChars = 2400) {
  const parts: string[] = [article.description]
  if (article.content) {
    parts.push(
      article.content.overview,
      ...article.content.explanation,
      article.content.example,
      `Nächster Schritt: ${article.content.nextStep}`,
    )
  }
  if (article.body) {
    for (const block of article.body) {
      if (block.type === 'paragraph' || block.type === 'lead') parts.push(block.text)
      if (block.type === 'list') parts.push(block.items.join('. '))
      if (block.type === 'note') parts.push(block.text)
    }
  }
  return parts.filter(Boolean).join('\n\n').slice(0, maxChars)
}

function scoreArticle(article: FestagDocArticle, q: string, aliasBoost: number) {
  let score = aliasBoost
  const title = article.title.toLowerCase()
  const desc = article.description.toLowerCase()
  if (title === q) score += 120
  else if (title.includes(q)) score += 80
  if (desc.includes(q)) score += 45
  for (const tag of article.tags) {
    if (tag.toLowerCase().includes(q)) score += 35
  }
  if (article.category.toLowerCase().includes(q)) score += 25
  const blob = articleSearchBlob(article)
  if (blob.includes(q)) score += 30
  if (article.popular) score += 8
  return score
}

export function searchFestagHelp(query: string, limit = 8): FestagHelpHit[] {
  const q = normalizeQuery(query)
  if (!q) return FESTAG_HELP_STARTERS

  const aliasSlugs = new Map<string, number>()
  for (const row of QUERY_ALIASES) {
    if (row.terms.some(term => term.includes(q) || q.includes(term))) {
      aliasSlugs.set(row.slug, 95)
    }
  }

  const scored = festagDocsArticles.map(article => ({
    article,
    score: scoreArticle(article, q, aliasSlugs.get(article.slug) ?? 0),
  }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (!scored.length) {
    return festagDocsArticles
      .filter(a => articleSearchBlob(a).split(' ').some(word => word.startsWith(q.slice(0, 4))))
      .slice(0, limit)
      .map(a => ({
        title: a.title,
        slug: a.slug,
        description: a.description,
        category: a.category,
        readingTime: a.readingTime,
        score: 1,
        popular: a.popular,
      }))
  }

  return scored.map(({ article, score }) => ({
    title: article.title,
    slug: article.slug,
    description: article.description,
    category: article.category,
    readingTime: article.readingTime,
    score,
    popular: article.popular,
  }))
}

export function resolveFestagHelpDoc(query: string, preferredSlug?: string) {
  if (preferredSlug) {
    const direct = getDocArticle(preferredSlug)
    if (direct) return direct
  }
  const hit = searchFestagHelp(query, 1)[0]
  if (!hit) return null
  return getDocArticle(hit.slug)
}

export function docsHref(slug: string) {
  return `/docs/${slug}`
}

export function tagroPromptForHelp(query: string, doc?: { slug: string; title: string } | null) {
  if (doc) {
    return [
      `Meine Frage: ${query}`,
      '',
      `Bitte erkläre mir das anhand des Festag-Docs „${doc.title}".`,
      `Am Ende verlinke den Artikel: ${docsHref(doc.slug)}`,
    ].join('\n')
  }
  return query
}

export function relatedHelpDocs(slug: string, limit = 3) {
  const article = getDocArticle(slug)
  if (!article) return []
  return festagDocsArticles
    .filter(a => a.slug !== slug && a.category === article.category)
    .slice(0, limit)
    .map(a => ({ title: a.title, slug: a.slug, description: a.description }))
}

export function openFestagHelp() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('festag:open-help'))
}
