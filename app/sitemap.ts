import type { MetadataRoute } from 'next'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'

const BASE = 'https://festag.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const legalPaths = [...LEGAL_NAV, ...LEGAL_EXTRA].map(item => item.href.slice(1))
  const staticPaths = [
    { path: '', priority: 1 },
    { path: 'enter', priority: 1 },
    { path: 'login', priority: 0.6 },
    { path: 'register', priority: 0.6 },
    { path: 'blog', priority: 0.7 },
    { path: 'docs', priority: 0.8 },
  ]

  return [
    ...staticPaths.map(({ path, priority }) => ({
      url: path ? `${BASE}/${path}` : BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority,
    })),
    ...legalPaths.map(path => ({
      url: `${BASE}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ]
}
