import type { Metadata } from 'next'

const TENANT_META: Record<string, { name: string; description: string }> = {
  noirem: {
    name: 'Noirem Luxury Car Care',
    description: 'Schedule your premium car wash & detailing service. Fast, easy booking in 2 minutes.',
  },
}

const DEFAULT = {
  name: 'Book a service',
  description: 'Schedule your service online. Fast, easy booking in 2 minutes.',
}

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = TENANT_META[params.slug] ?? DEFAULT

  return {
    title:       `Book — ${tenant.name}`,
    description: tenant.description,
    openGraph: {
      title:       `Book — ${tenant.name}`,
      description: tenant.description,
      type:        'website',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `Book — ${tenant.name}`,
      description: tenant.description,
    },
  }
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
