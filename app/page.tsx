import type { Metadata } from 'next'
import { LandingLangProvider } from '@/components/landing/LandingLangContext'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingContent from '@/components/landing/LandingContent'

export const metadata: Metadata = {
  title: 'SAFFI — El ERP para Car Wash & Detailing a Domicilio',
  description: 'El software vertical que tu operación de car wash & detailing a domicilio necesita. Reservas, clientes, pagos e inventario en un solo lugar.',
  openGraph: {
    title: 'SAFFI — Software para Car Wash & Detailing a Domicilio',
    description: 'Reservas, CRM, facturación e inventario. Todo integrado para tu negocio de detailing.',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <LandingLangProvider>
      <LandingNavbar />
      <LandingContent />
    </LandingLangProvider>
  )
}
