import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300','400','500','600','700','800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Noirem CRM — Luxury Car Care',
  description: 'Luxury CRM for Noirem Car Care Dubai',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.className} style={{ height:'100%', overflow:'hidden' }}>
      <body style={{ height:'100%', overflow:'hidden' }}>{children}</body>
    </html>
  )
}
