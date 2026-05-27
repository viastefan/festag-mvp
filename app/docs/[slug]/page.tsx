import { notFound } from 'next/navigation'
import FestagDocs from '@/components/FestagDocs'
import { festagDocsArticles, getDocArticle } from '@/lib/festag-docs'

export function generateStaticParams() {
  return festagDocsArticles.map((article) => ({ slug: article.slug }))
}

export default function DocsArticlePage({ params }: { params: { slug: string } }) {
  const article = getDocArticle(params.slug)
  if (!article) notFound()
  return <FestagDocs article={article} />
}
