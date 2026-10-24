import type { MetadataRoute } from 'next'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://filmexpoindia.com').replace(/\/+$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/superadmin/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
