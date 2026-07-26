import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dev/', '/internal-admin/', '/master-control/', '/api/'],
    },
    sitemap: 'https://festag.app/sitemap.xml',
  }
}
