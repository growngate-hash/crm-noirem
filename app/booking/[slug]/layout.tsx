import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('business_settings')
    .select('business_name, logo_url')
    .eq('slug', params.slug)
    .single()

  const businessName = data?.business_name ?? 'Book a service'
  const logoUrl      = data?.logo_url ?? 'https://www.saffi.app/og-default.png'

  return {
    title:       `Book — ${businessName}`,
    description: `Schedule your ${businessName} service online. Fast, easy booking in 2 minutes.`,
    openGraph: {
      title:       `Book — ${businessName}`,
      description: `Schedule your ${businessName} service online. Fast, easy booking in 2 minutes.`,
      images: [
        {
          url:   logoUrl,
          width: 1200,
          height: 630,
          alt:   businessName,
        },
      ],
      type: 'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `Book — ${businessName}`,
      description: `Schedule your ${businessName} service online. Fast, easy booking in 2 minutes.`,
      images:      [logoUrl],
    },
  }
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
