'use client'

import Link from 'next/link'

export type ArticleTone = 'dawn' | 'tide' | 'moss' | 'ember' | 'slate'

export type FestagArticle = {
  href: string
  title: string
  category?: string | null
  /** Reading time in minutes, or a date string — whichever the surface has. */
  meta?: string | null
  /** Full-bleed canvas. Falls back to the tone gradient when absent. */
  canvasUrl?: string | null
  tone?: ArticleTone
  /** The thing resting on the canvas: a screenshot, a still, a poster. */
  artUrl?: string | null
  /** Or a line of type instead of a picture. */
  artText?: string | null
}

const TONES: ArticleTone[] = ['dawn', 'tide', 'moss', 'ember', 'slate']

/** Stable per slug, so a card keeps its colour between visits. */
function toneFor(article: FestagArticle): ArticleTone {
  if (article.tone) return article.tone
  let h = 0
  for (const ch of article.href) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}

export default function FestagArticleCard({ article }: { article: FestagArticle }) {
  const tone = toneFor(article)

  return (
    <Link href={article.href} className="fac">
      <div className="fac-media" data-tone={tone}>
        <span
          className="fac-canvas"
          aria-hidden="true"
          style={article.canvasUrl ? { backgroundImage: `url(${article.canvasUrl})` } : undefined}
        />
        {article.artUrl ? (
          <span className="fac-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.artUrl} alt="" className="fac-art-img" loading="lazy" decoding="async" />
          </span>
        ) : article.artText ? (
          <span className="fac-art fac-art--type">{article.artText}</span>
        ) : null}
      </div>

      <h3 className="fac-title">{article.title}</h3>

      {article.category || article.meta ? (
        <p className="fac-meta">
          {article.category ? <span className="fac-cat">{article.category}</span> : null}
          {article.meta ? <span>{article.meta}</span> : null}
        </p>
      ) : null}
    </Link>
  )
}
