import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Props = {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Leer business_name y user_id por slug
  const { data: biz } = await supabase
    .from('business_settings')
    .select('user_id, business_name')
    .eq('slug', slug)
    .single()

  const businessName = biz?.business_name ?? 'Book a service'
  const description  = `Schedule your ${businessName} service online. Fast, easy booking in 2 minutes.`

  // Leer logo_url de company_settings usando user_id
  let imageUrl = 'https://www.saffi.app/og-default.png'
  if (biz?.user_id) {
    const { data: logoSetting } = await supabase
      .from('company_settings')
      .select('value')
      .eq('user_id', biz.user_id)
      .eq('key', 'logo_url')
      .single()

    if (logoSetting?.value?.startsWith('http')) {
      imageUrl = logoSetting.value
    }
  }

  return {
    title:       `Book — ${businessName}`,
    description,
    openGraph: {
      title:       `Book — ${businessName}`,
      description,
      images:      [{ url: imageUrl, width: 1200, height: 630, alt: businessName }],
      type:        'website',
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
