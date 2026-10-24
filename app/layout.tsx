import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { CookieConsent } from '@/components/cookie-consent'
import { SmartNav } from '@/components/smart-nav'
import { getHomepageContent } from '@/lib/site-content'
import './globals.css'

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#08090e',
}

export async function generateMetadata(): Promise<Metadata> {
  const { content } = await getHomepageContent()
  const title = 'Film Expo India — Where stories take shape'
  const description = 'India’s most immersive film and media gathering. Four days of bold cinema, next-gen storytelling, and the people shaping what’s next.'
  const logo = content.brand?.logo || '/film-expo-logo.svg'
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://filmexpoindia.com'),
    title,
    description,
    icons: { icon: logo, apple: '/apple-icon.png' },
    openGraph: {
      title,
      description: 'India’s film and media gathering for cinema, technology and the people shaping what’s next.',
      siteName: 'Film Expo India',
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'India’s film and media gathering for cinema, technology and the people shaping what’s next.',
    },
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased"><SmartNav />{children}<CookieConsent />{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
