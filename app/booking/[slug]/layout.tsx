import type { Metadata } from 'next'

const TENANT_META: Record<string, { name: string; description: string; image?: string }> = {
  noirem: {
    name: 'Noirem Luxury Car Care',
    description: 'Schedule your premium car wash & detailing service. Fast, easy booking in 2 minutes.',
    image: 'https://vjzflmgfiihjrtvhlfih.supabase.co/storage/v1/object/public/company-assets/company-logo-1779036593657.jpg',
  },
}

const DEFAULT = {
  name: 'Book a service',
  description: 'Schedule your service online. Fast, easy booking in 2 minutes.',
  image: 'https://www.saffi.app/og-default.png',
}

type Props = {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = TENANT_META[slug] ?? DEFAULT
  const image  = tenant.image ?? DEFAULT.image

  return {
    title:       `Book — ${tenant.name}`,
    description: tenant.description,
    openGraph: {
      title:       `Book — ${tenant.name}`,
      description: tenant.description,
      images:      [{ url: image, width: 1200, height: 630, alt: tenant.name }],
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `Book — ${tenant.name}`,
      description: tenant.description,
      images:      [image],
    },
  }
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
