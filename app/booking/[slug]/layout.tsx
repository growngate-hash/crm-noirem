import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('business_settings')
    .select('business_name, logo_url')
    .eq('slug', params.slug)
    .single()

  const businessName = data?.business_name ?? 'Book a service'
  const description  = `Schedule your ${businessName} service online. Fast, easy booking in 2 minutes.`
  const imageUrl     = data?.logo_url && data.logo_url.startsWith('http')
    ? data.logo_url
    : 'https://www.saffi.app/og-default.png'

  return {
    title:       `Book — ${businessName}`,
    description,
    openGraph: {
      title:       `Book — ${businessName}`,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: businessName }],
      type: 'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `Book — ${businessName}`,
      description,
      images:      [imageUrl],
    },
  }
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
