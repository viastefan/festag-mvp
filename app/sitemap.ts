import type { MetadataRoute } from 'next'
import { LEGAL_EXTRA, LEGAL_NAV } from '@/lib/legal-nav'

const BASE = 'https://festag.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const legalPaths = [...LEGAL_NAV, ...LEGAL_EXTRA].map(item => item.href.slice(1))
  const staticPaths = ['', 'login', 'register', 'blog', 'docs']

  return [
    ...staticPaths.map(path => ({
      url: path ? `${BASE}/${path}` : BASE,
      lastModified: new Date('2026-06-29'),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.6,
    })),
    ...legalPaths.map(path => ({
      url: `${BASE}/${path}`,
      lastModified: new Date('2026-06-29'),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ]
}
