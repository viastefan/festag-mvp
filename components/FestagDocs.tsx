'use client'

import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpenText,
  Briefcase,
  CaretRight,
  ChartLineUp,
  CheckSquare,
  FileText,
  FolderSimple,
  Headphones,
  LockKey,
  MagnifyingGlass,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react'
import {
  docsCategories,
  festagDocsArticles,
  type ArticleBlock,
  type FestagDocArticle,
} from '@/lib/festag-docs'

type FestagDocsProps = {
  article?: FestagDocArticle | null
}

const iconMap: Record<string, React.ElementType> = {
  'Erste Schritte': BookOpenText,
  Projekte: FolderSimple,
  'Aufgaben & operative Arbeit': CheckSquare,
  Statusabfragen: ChartLineUp,
  'Tagro AI': Sparkle,
  'Reports & Briefings': Headphones,
  'Teams & Rollen': UsersThree,
  'Whitelabel & Agenturen': Briefcase,
  'Sicherheit & Vertrauen': LockKey,
  default: FileText,
}

function articleSearchText(article: FestagDocArticle) {
  const legacy = article.content
    ? [
        article.content.overview,
        article.content.explanation.join(' '),
        article.content.example,
        article.content.nextStep,
      ]
    : []
  const blocks = article.body
    ? article.body.map((block) => {
        switch (block.type) {
          case 'lead':
          case 'paragraph':
          case 'note':
          case 'quote':
          case 'mono':
            return block.text
          case 'heading':
            return block.text
          case 'list':
            return block.items.join(' ')
          case 'kvtable':
            return block.rows.map((row) => row.join(' ')).join(' ')
          default:
            return ''
        }
      })
    : []
  return [article.title, article.description, article.category, article.tags.join(' '), ...legacy, ...blocks]
    .join(' ')
    .toLowerCase()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function FestagDocs({ article }: FestagDocsProps) {
  const [query, setQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) return festagDocsArticles
    return festagDocsArticles.filter((item) => articleSearchText(item).includes(normalizedQuery))
  }, [normalizedQuery])

  const popular = filteredArticles.filter((item) => item.popular).slice(0, 4)
  const sections = docsCategories
    .map((category) => ({
      ...category,
      articles: filteredArticles.filter((item) => item.category === category.title),
    }))
    .filter((section) => section.articles.length > 0)

  return (
    <div className="docs-shell">
      <aside className={`docs-nav${mobileNavOpen ? ' open' : ''}`}>
        <div className="docs-brand">
          <span className="docs-brand-mark"><BookOpenText size={17} /></span>
          <span>Festag Docs</span>
        </div>
        <label className="docs-search">
          <MagnifyingGlass size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Docs durchsuchen..."
            aria-label="Festag Docs durchsuchen"
          />
        </label>
        <nav className="docs-category-list" aria-label="Docs Kategorien">
          <Link className={!article ? 'active' : ''} href="/docs" onClick={() => setMobileNavOpen(false)}>
            <span>Home</span>
            <CaretRight size={13} />
          </Link>
          {docsCategories.map((category) => {
            const Icon = iconMap[category.title] ?? iconMap.default
            return (
              <a key={category.title} href={`/docs#${encodeURIComponent(category.title)}`} onClick={() => setMobileNavOpen(false)}>
                <span><Icon size={14} /> {category.title}</span>
                <CaretRight size={13} />
              </a>
            )
          })}
        </nav>
      </aside>

      <main className="docs-main">
        <header className="docs-topbar">
          <button type="button" className="docs-mobile-menu" onClick={() => setMobileNavOpen((open) => !open)}>
            Kategorien
          </button>
          <div className="docs-crumb">
            <Link href="/docs">Docs</Link>
            <CaretRight size={12} />
            <span>{article ? article.title : 'Home'}</span>
          </div>
          <div className="docs-actions">
            <Link href="/dashboard">App öffnen</Link>
          </div>
        </header>

        <div className="docs-scroll">
          {article ? (
            <ArticleView article={article} />
          ) : (
            <HomeView
              popular={popular.length ? popular : festagDocsArticles.filter((item) => item.popular).slice(0, 4)}
              sections={sections}
              query={normalizedQuery}
            />
          )}
        </div>
      </main>

      <style jsx global>{CSS}</style>
    </div>
  )
}

function HomeView({
  popular,
  sections,
  query,
}: {
  popular: FestagDocArticle[]
  sections: Array<{ title: string; description: string; articles: FestagDocArticle[] }>
  query: string
}) {
  const hasResults = sections.length > 0
  return (
    <div className="docs-home">
      <section className="docs-hero">
        <h1>Festag Docs</h1>
        <p>Lerne, wie Festag Projekte, Teams, Statusabfragen und Tagro-Briefings klar strukturiert.</p>
      </section>

      {!hasResults ? (
        <section className="docs-empty">
          <FileText size={22} />
          <h2>Keine passenden Artikel gefunden</h2>
          <p>Bitte einen anderen Suchbegriff verwenden oder eine Kategorie auswählen.</p>
          <Link href="/docs">Beliebte Artikel anzeigen</Link>
        </section>
      ) : (
        <>
          <DocsSection title={query ? 'Suchergebnisse' : 'Beliebt'} articles={query ? sections.flatMap((section) => section.articles).slice(0, 12) : popular} />
          {sections.map((section) => (
            <DocsSection key={section.title} id={section.title} title={section.title} description={section.description} articles={section.articles} />
          ))}
        </>
      )}
    </div>
  )
}

function DocsSection({
  id,
  title,
  description,
  articles,
}: {
  id?: string
  title: string
  description?: string
  articles: FestagDocArticle[]
}) {
  if (!articles.length) return null
  return (
    <section className="docs-section" id={id}>
      <div className="docs-section-head">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="docs-card-grid">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  )
}

function ArticleCard({ article }: { article: FestagDocArticle }) {
  const Icon = iconMap[article.category] ?? iconMap.default
  return (
    <Link href={`/docs/${article.slug}`} className="docs-card">
      <span className="docs-card-icon"><Icon size={18} /></span>
      <span className="docs-card-body">
        <span className="docs-card-meta">{article.category} · {article.readingTime}</span>
        <strong>{article.title}</strong>
        <span>{article.description}</span>
      </span>
      <ArrowRight size={14} className="docs-card-arrow" />
    </Link>
  )
}

function ArticleView({ article }: { article: FestagDocArticle }) {
  const related = festagDocsArticles
    .filter((item) => item.slug !== article.slug && item.category === article.category)
    .slice(0, 3)

  const useBlocks = !!article.body && article.body.length > 0
  const tocEntries = useBlocks
    ? article.body!
        .filter((block): block is Extract<ArticleBlock, { type: 'heading' }> => block.type === 'heading' && block.level === 2)
        .map((block) => ({ id: block.id || slugify(block.text), label: block.text }))
    : [
        { id: 'ueberblick', label: 'Überblick' },
        { id: 'erklaerung', label: 'Erklärung' },
        { id: 'beispiel', label: 'Beispiel' },
        { id: 'naechster-schritt', label: 'Nächster Schritt' },
      ]

  return (
    <div className="docs-article-layout">
      <article className="docs-article">
        <Link href="/docs" className="docs-back">Zurück zu Docs</Link>
        <p className="docs-article-category">{article.category} · {article.readingTime}</p>
        <h1>{article.title}</h1>
        <p className="docs-article-summary">{article.description}</p>

        {useBlocks ? renderBlocks(article.body!) : article.content ? renderLegacyContent(article.content) : null}

        {related.length > 0 ? (
          <section className="docs-related">
            <h2>Weiterlesen</h2>
            <div>
              {related.map((item) => (
                <Link key={item.slug} href={`/docs/${item.slug}`}>
                  <span>{item.title}</span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      <aside className="docs-toc" aria-label="Inhaltsnavigation">
        <span>Auf dieser Seite</span>
        {tocEntries.map((entry) => (
          <a key={entry.id} href={`#${entry.id}`}>{entry.label}</a>
        ))}
      </aside>
    </div>
  )
}

function renderLegacyContent(content: NonNullable<FestagDocArticle['content']>) {
  return (
    <>
      <section id="ueberblick">
        <h2>Überblick</h2>
        <p>{content.overview}</p>
      </section>
      <section id="erklaerung">
        <h2>Erklärung</h2>
        {content.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      <section id="beispiel">
        <h2>Beispiel aus Festag</h2>
        <div className="docs-note">{content.example}</div>
      </section>
      <section id="naechster-schritt">
        <h2>Nächster sinnvoller Schritt</h2>
        <p>{content.nextStep}</p>
      </section>
    </>
  )
}

function renderBlocks(blocks: ArticleBlock[]) {
  const out: React.ReactNode[] = []
  let currentSection: { id: string; nodes: React.ReactNode[] } | null = null

  const flush = () => {
    if (currentSection) {
      out.push(
        <section key={currentSection.id} id={currentSection.id}>
          {currentSection.nodes}
        </section>,
      )
      currentSection = null
    }
  }

  blocks.forEach((block, index) => {
    if (block.type === 'heading' && block.level === 2) {
      flush()
      const id = block.id || slugify(block.text)
      currentSection = { id, nodes: [<h2 key={`h-${index}`}>{block.text}</h2>] }
      return
    }
    const node = renderBlockNode(block, index)
    if (!node) return
    if (currentSection) {
      currentSection.nodes.push(node)
    } else {
      out.push(node)
    }
  })

  flush()
  return out
}

function renderBlockNode(block: ArticleBlock, index: number): React.ReactNode {
  const key = `b-${index}`
  switch (block.type) {
    case 'lead':
      return <p key={key} className="docs-lead">{block.text}</p>
    case 'paragraph':
      return <p key={key}>{block.text}</p>
    case 'heading':
      return <h3 key={key} id={block.id || slugify(block.text)}>{block.text}</h3>
    case 'list':
      return block.ordered ? (
        <ol key={key} className="docs-block-list">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      ) : (
        <ul key={key} className="docs-block-list">
          {block.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    case 'note':
      return <div key={key} className={`docs-note${block.kind === 'warning' ? ' docs-note-warning' : ''}`}>{block.text}</div>
    case 'quote':
      return <blockquote key={key} className="docs-quote">{block.text}</blockquote>
    case 'mono':
      return <pre key={key} className="docs-mono">{block.text}</pre>
    case 'kvtable':
      return (
        <dl key={key} className="docs-kvtable">
          {block.rows.map(([label, value], i) => (
            <div key={i} className="docs-kvrow">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )
    case 'divider':
      return <hr key={key} className="docs-divider" />
    default:
      return null
  }
}

const CSS = `
  .docs-shell {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: 282px minmax(0, 1fr);
    overflow: hidden;
    color: var(--text);
    background: var(--surface);
    font-family: var(--font-aeonik, 'Aeonik', Inter, sans-serif);
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-nav {
    min-height: 0;
    border-right: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
    background: color-mix(in srgb, var(--sidebar-bg) 72%, transparent);
  }
  .docs-brand {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: .005em;
  }
  .docs-brand-mark,
  .docs-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--border) 72%, transparent);
    background: color-mix(in srgb, var(--card) 84%, transparent);
    color: var(--text-secondary);
  }
  .docs-brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 10px;
  }
  .docs-search {
    height: 38px;
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    background: color-mix(in srgb, var(--card) 82%, transparent);
    border-radius: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    color: var(--text-muted);
  }
  .docs-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-search input::placeholder { color: var(--text-muted); opacity: .75; }
  .docs-category-list {
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 2px;
  }
  .docs-category-list a {
    min-height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 10px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: .015em;
    transition: background .12s ease, color .12s ease;
  }
  .docs-category-list a span {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .docs-category-list a svg { flex-shrink: 0; color: var(--text-muted); }
  .docs-category-list a:hover,
  .docs-category-list a.active {
    background: color-mix(in srgb, var(--surface-2) 64%, transparent);
    color: var(--text);
  }
  .docs-main {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .docs-topbar {
    height: 58px;
    flex-shrink: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 64%, transparent);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 0 26px;
  }
  .docs-crumb {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--text-muted);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-crumb a {
    color: var(--text-secondary);
    text-decoration: none;
  }
  .docs-crumb span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }
  .docs-actions a,
  .docs-mobile-menu,
  .docs-back,
  .docs-empty a {
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
    background: color-mix(in srgb, var(--card) 84%, transparent);
    color: var(--text-secondary);
    padding: 0 14px;
    font: inherit;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .015em;
    text-decoration: none;
  }
  .docs-mobile-menu { display: none; }
  .docs-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .docs-home {
    width: min(100%, 1380px);
    margin: 0 auto;
    padding: 64px clamp(24px, 5vw, 72px) 96px;
  }
  .docs-hero {
    max-width: 720px;
    margin-bottom: 54px;
  }
  .docs-hero h1,
  .docs-article h1 {
    margin: 0;
    color: var(--text);
    font-size: clamp(38px, 5vw, 60px);
    line-height: 1.05;
    letter-spacing: -.012em;
    font-weight: 500;
  }
  .docs-hero p {
    margin: 20px 0 0;
    color: var(--text-secondary);
    font-size: clamp(16px, 1.4vw, 18px);
    line-height: 1.6;
    font-weight: 500;
    letter-spacing: .012em;
  }
  .docs-article-summary {
    margin: 22px 0 0;
    color: var(--text-secondary);
    font-family: 'Editors Note', Georgia, serif;
    font-style: italic;
    font-size: clamp(17px, 1.6vw, 20px);
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: .003em;
  }
  .docs-section {
    margin-top: 54px;
    scroll-margin-top: 84px;
  }
  .docs-section-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 18px;
  }
  .docs-section-head h2,
  .docs-related h2 {
    margin: 0;
    color: var(--text);
    font-size: 20px;
    line-height: 1.25;
    letter-spacing: -.005em;
    font-weight: 500;
  }
  .docs-section-head p {
    max-width: 520px;
    margin: 0;
    color: var(--text-muted);
    font-size: 12.5px;
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: .015em;
    text-align: right;
  }
  .docs-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
  .docs-card {
    min-height: 224px;
    border: 1px solid color-mix(in srgb, var(--border) 76%, transparent);
    border-radius: 18px;
    background: color-mix(in srgb, var(--card) 84%, transparent);
    color: var(--text);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 18px;
    padding: 20px;
    text-decoration: none;
    box-shadow: 0 16px 44px -42px color-mix(in srgb, var(--text) 24%, transparent);
    transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
  }
  .docs-card:hover {
    transform: translateY(-2px);
    background: color-mix(in srgb, var(--card) 96%, var(--surface-2) 4%);
    border-color: color-mix(in srgb, var(--border-strong) 74%, var(--border));
    box-shadow: 0 22px 54px -44px color-mix(in srgb, var(--text) 32%, transparent);
  }
  .docs-card-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
  }
  .docs-card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .docs-card-meta,
  .docs-article-category,
  .docs-focus-kicker {
    color: var(--text-muted);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: .14em;
    text-transform: uppercase;
  }
  .docs-card strong {
    color: var(--text);
    font-size: 15px;
    line-height: 1.32;
    letter-spacing: -.005em;
    font-weight: 500;
  }
  .docs-card-body > span:last-child {
    color: var(--text-secondary);
    font-size: 12.7px;
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-card-arrow {
    color: var(--text-muted);
    opacity: .55;
    transition: transform .16s ease, opacity .16s ease;
  }
  .docs-card:hover .docs-card-arrow {
    transform: translateX(2px);
    opacity: 1;
  }
  .docs-empty {
    min-height: 360px;
    display: grid;
    place-items: center;
    text-align: center;
    color: var(--text-muted);
  }
  .docs-empty h2 {
    margin: 12px 0 0;
    color: var(--text);
    font-size: 22px;
  }
  .docs-empty p {
    margin: 8px 0 16px;
    max-width: 420px;
    line-height: 1.55;
  }
  .docs-article-layout {
    width: min(100%, 1180px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 760px) 220px;
    gap: 74px;
    padding: 58px clamp(24px, 5vw, 72px) 96px;
  }
  .docs-article {
    min-width: 0;
  }
  .docs-back {
    width: max-content;
    margin-bottom: 34px;
  }
  .docs-article-category {
    margin: 0 0 13px;
  }
  .docs-article h1 {
    font-size: clamp(36px, 4.4vw, 52px);
    letter-spacing: -.008em;
  }
  .docs-article section {
    margin-top: 42px;
    scroll-margin-top: 82px;
  }
  .docs-article h2 {
    margin: 0 0 14px;
    color: var(--text);
    font-size: 20px;
    line-height: 1.3;
    letter-spacing: -.005em;
    font-weight: 500;
  }
  .docs-article h3 {
    margin: 22px 0 10px;
    color: var(--text);
    font-size: 15.5px;
    line-height: 1.4;
    letter-spacing: .005em;
    font-weight: 500;
  }
  .docs-article p {
    margin: 0 0 18px;
    color: var(--text-secondary);
    font-size: 15.5px;
    line-height: 1.78;
    font-weight: 500;
    letter-spacing: .012em;
  }
  .docs-lead {
    margin: 0 0 32px !important;
    color: var(--text);
    font-family: 'Editors Note', Georgia, serif;
    font-style: italic;
    font-size: clamp(19px, 1.9vw, 23px);
    line-height: 1.5;
    font-weight: 500;
    letter-spacing: .003em;
  }
  .docs-block-list {
    margin: 0 0 20px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 9px;
    color: var(--text-secondary);
    font-size: 15px;
    line-height: 1.7;
    font-weight: 500;
    letter-spacing: .012em;
    counter-reset: docs-ol;
  }
  .docs-block-list li {
    position: relative;
    padding-left: 22px;
  }
  .docs-block-list li::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 13px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
    opacity: .55;
  }
  ol.docs-block-list { counter-reset: docs-ol; }
  ol.docs-block-list li { counter-increment: docs-ol; }
  ol.docs-block-list li::before {
    content: counter(docs-ol) '.';
    width: auto;
    height: auto;
    top: 0;
    left: 0;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: .015em;
    border-radius: 0;
    opacity: .9;
  }
  .docs-note {
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    background: color-mix(in srgb, var(--surface-2) 38%, transparent);
    border-radius: 14px;
    padding: 16px 18px;
    color: var(--text);
    font-size: 14px;
    line-height: 1.7;
    font-weight: 500;
    letter-spacing: .012em;
    margin: 0 0 22px;
  }
  .docs-note-warning {
    border-color: color-mix(in srgb, var(--red, #D14343) 28%, var(--border));
    background: color-mix(in srgb, var(--red, #D14343) 5%, transparent);
  }
  .docs-quote {
    margin: 32px 0;
    padding: 6px 0 6px 18px;
    border-left: 2px solid color-mix(in srgb, var(--text) 40%, transparent);
    color: var(--text);
    font-family: 'Editors Note', Georgia, serif;
    font-style: italic;
    font-size: clamp(17px, 1.7vw, 21px);
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: .003em;
  }
  .docs-mono {
    margin: 0 0 22px;
    padding: 16px 18px;
    border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-2) 42%, transparent);
    color: var(--text);
    font-family: 'Berkeley Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.65;
    font-weight: 500;
    letter-spacing: .005em;
    white-space: pre;
    overflow-x: auto;
  }
  .docs-kvtable {
    margin: 0 0 24px;
    display: flex;
    flex-direction: column;
    border-top: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
  .docs-kvrow {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 24px;
    padding: 14px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  }
  .docs-kvrow dt {
    margin: 0;
    color: var(--text);
    font-size: 13.5px;
    line-height: 1.5;
    font-weight: 500;
    letter-spacing: .005em;
  }
  .docs-kvrow dd {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14.5px;
    line-height: 1.7;
    font-weight: 500;
    letter-spacing: .012em;
  }
  .docs-divider {
    margin: 32px 0;
    border: 0;
    height: 1px;
    background: color-mix(in srgb, var(--border) 78%, transparent);
  }
  .docs-related {
    margin-top: 54px;
  }
  .docs-related > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
  }
  .docs-related a {
    min-height: 42px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-2) 42%, transparent);
    color: var(--text);
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-toc {
    position: sticky;
    top: 32px;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding-top: 8px;
  }
  .docs-toc span {
    color: var(--text-muted);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: .14em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .docs-toc a {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: .015em;
  }
  .docs-toc a:hover { color: var(--text); }
  @media (max-width: 1180px) {
    .docs-card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .docs-article-layout { grid-template-columns: minmax(0, 1fr); }
    .docs-toc { display: none; }
  }
  @media (max-width: 760px) {
    .docs-kvrow {
      grid-template-columns: 1fr;
      gap: 4px;
      padding: 12px 0;
    }
    .docs-kvrow dt { font-size: 12.5px; color: var(--text-muted); letter-spacing: .07em; text-transform: uppercase; }
  }
  @media (max-width: 900px) {
    .docs-shell { grid-template-columns: minmax(0, 1fr); }
    .docs-nav {
      position: fixed;
      z-index: 40;
      inset: 0 auto 0 0;
      width: min(320px, calc(100vw - 34px));
      transform: translateX(-104%);
      transition: transform .18s cubic-bezier(.16,1,.3,1);
      box-shadow: 28px 0 72px -48px rgba(15,23,42,.5);
    }
    .docs-nav.open { transform: translateX(0); }
    .docs-mobile-menu { display: inline-flex; }
    .docs-topbar { padding: 0 16px; }
    .docs-actions { display: none; }
    .docs-home { padding: 42px 18px 82px; }
    .docs-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .docs-section-head {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }
    .docs-section-head p { text-align: left; }
    .docs-article-layout { padding: 38px 18px 82px; }
  }
  @media (max-width: 600px) {
    .docs-card-grid { grid-template-columns: 1fr; }
    .docs-card { min-height: 182px; }
    .docs-hero h1 { font-size: 46px; }
  }
`
