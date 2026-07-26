import type { Metadata } from 'next'

export function legalMetadata(title: string, description: string, path: string): Metadata {
  const url = `https://festag.app${path}`
  const fullTitle = `${title} — festag`

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'Festag',
      locale: 'de_DE',
      type: 'website',
    },
    alternates: { canonical: url },
  }
}
