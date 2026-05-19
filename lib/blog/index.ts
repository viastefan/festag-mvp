/**
 * Single source of truth for the Festag blog / docs.
 *
 * Each entry feeds the left sidebar (sectioned nav), the index page,
 * and the per-article header. Slug must match the route folder under
 * `app/blog/<slug>/page.tsx`.
 *
 * Order inside `BLOG_SECTIONS` is the order rendered in the sidebar.
 * Articles can declare their own table-of-contents in the page itself
 * via the `tocItems` prop on <BlogShell />.
 */

export type BlogArticle = {
  slug: string
  title: string
  eyebrow?: string
  description?: string
  date: string             // ISO yyyy-mm-dd
  readingMinutes?: number
  audience?: ('client' | 'dev' | 'internal' | 'website')[]
}

export type BlogSection = {
  id: string
  label: string
  articles: BlogArticle[]
}

export const BLOG_SECTIONS: BlogSection[] = [
  {
    id: 'product',
    label: 'Produkt-Architektur',
    articles: [
      {
        slug: 'tagro-statusbriefing',
        title: 'Vom Dev-Update zur ruhigen Client-Lage',
        eyebrow: 'Tagro Statusbriefing',
        description: 'Wie der tägliche 16:00-Loop funktioniert, was Tagro aus Dev-Updates baut und warum Reporting bei Festag operative Steuerung ist, nicht Doku.',
        date: '2026-05-19',
        readingMinutes: 6,
        audience: ['client', 'dev', 'website'],
      },
      {
        slug: 'daily-status-loop',
        title: 'Der tägliche Statusloop, technisch erklärt',
        eyebrow: 'Engineering Deep Dive',
        description: 'Vom Vercel-Cron um 16:00 bis zur Notification im Client-Postfach: jede Schicht, jede Tabelle, jede Sicherheitspolicy in einem Bild.',
        date: '2026-05-19',
        readingMinutes: 8,
        audience: ['dev', 'internal'],
      },
    ],
  },
  {
    id: 'people',
    label: 'Menschen & Rollen',
    articles: [
      {
        slug: 'mitbeobachter',
        title: 'Mitwirkende: stille Stakeholder, klare Sichtbarkeit',
        eyebrow: 'Workspace',
        description: 'Wer einen Festag-Workspace beobachtet, ohne mitzuschreiben — und warum das Rollenmodell so leise ist.',
        date: '2026-05-18',
        readingMinutes: 4,
        audience: ['client'],
      },
    ],
  },
]

export const ALL_ARTICLES: BlogArticle[] = BLOG_SECTIONS.flatMap(s => s.articles)

export function findArticle(slug: string): BlogArticle | undefined {
  return ALL_ARTICLES.find(a => a.slug === slug)
}

export function findSiblings(slug: string): { prev?: BlogArticle; next?: BlogArticle; section?: BlogSection } {
  const idx = ALL_ARTICLES.findIndex(a => a.slug === slug)
  if (idx < 0) return {}
  const section = BLOG_SECTIONS.find(s => s.articles.some(a => a.slug === slug))
  return {
    prev: idx > 0 ? ALL_ARTICLES[idx - 1] : undefined,
    next: idx < ALL_ARTICLES.length - 1 ? ALL_ARTICLES[idx + 1] : undefined,
    section,
  }
}
