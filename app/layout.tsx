import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'TechPulse | Hottest Tech News',
  description: 'Stay ahead with AI-summarized tech news from Hacker News. Updated every 10 minutes.',
  keywords: ['tech news', 'hacker news', 'AI', 'technology', 'programming', 'startups'],
  openGraph: {
    title: 'TechPulse | Hottest Tech News',
    description: 'Stay ahead with AI-summarized tech news from Hacker News.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}

