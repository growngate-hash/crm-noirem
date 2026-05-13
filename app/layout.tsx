import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Noirem CRM — Luxury Car Care Dubai',
  description: 'Luxury CRM for Noirem Car Care Dubai',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.className} style={{ height: '100%' }}>
      <body style={{ height: '100%' }}>{children}</body>
    </html>
  )
}
