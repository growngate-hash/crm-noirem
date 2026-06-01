'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'es' | 'en'

const T = {
  es: {
    // Nav
    navFeatures:  'Funcionalidades',
    navPricing:   'Precios',
    navHow:       'Cómo funciona',
    navLogin:     'Iniciar sesión',
    navCta:       'Empieza gratis',
    navCtaMobile: 'Empieza gratis — 10 días',
    // Hero
    badge:       'Especializado en Car Wash & Detailing a Domicilio',
    heroLine1:   'El ERP para',
    heroAccent:  'car wash & detailing',
    heroLine2:   'a domicilio',
    heroSub:     'El software vertical que tu operación de car wash & detailing a domicilio necesita. Reservas, clientes, pagos e inventario — todo en un solo lugar, desde cualquier dispositivo.',
    heroCta1:    'Empieza gratis — 10 días',
    heroCta2:    'Ver demostración',
    heroTrust:   'Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español',
    // Stats
    stat1v: '500+', stat1l: 'Negocios activos',
    stat2v: '2M+',  stat2l: 'Servicios registrados',
    stat3v: '98%',  stat3l: 'Satisfacción de clientes',
    stat4v: '12',   stat4l: 'Países',
    // Features
    featLabel: 'Funcionalidades',
    featTitle: 'Todo lo que necesitas,',
    featAccent: 'en un solo lugar',
    featSub:   'Construido específicamente para operaciones de car wash & detailing a domicilio. Sin herramientas genéricas — SAFFI entiende tu negocio.',
    f1t: 'Gestión de Reservas',    f1d: 'Agenda servicios con un calendario visual. Confirma, reasigna y notifica a tu equipo en tiempo real desde cualquier dispositivo.',
    f2t: 'CRM de Clientes',        f2d: 'Historial completo por cliente y vehículo. Segmentación VIP, seguimiento de oportunidades y recordatorios automáticos.',
    f3t: 'Facturación Inteligente',f3d: 'Emite facturas, controla cobros, gestiona VAT y genera reportes financieros con un clic. Sin contadores externos.',
    f4t: 'Inventario & Compras',   f4d: 'Stock en tiempo real con alertas de mínimos. Órdenes de compra automáticas y control de costos por servicio.',
    f5t: 'Analytics & Reportes',   f5d: 'Dashboards interactivos con KPIs: ingresos, ticket promedio, clientes activos y tendencias mensuales.',
    f6t: 'Multi-usuario & Roles',  f6d: 'Permisos granulares por módulo. Cada persona ve y edita solo lo que necesita. Logs de auditoría incluidos.',
    // How it works
    howLabel: 'Cómo funciona',
    howTitle: 'Opera en menos de 10 minutos',
    howSub:   'Sin implementaciones complejas. Hecho para detailers que quieren operar como una empresa profesional.',
    s1t: 'Crea tu cuenta',       s1d: 'Regístrate en menos de 2 minutos. Sin tarjeta de crédito. 10 días de prueba completa con todas las funciones.',
    s2t: 'Configura tu negocio', s2d: 'Agrega tu logo, servicios, tarifas e inventario. El asistente de configuración te guía paso a paso.',
    s3t: 'Opera desde día uno',  s3d: 'Gestiona reservas, emite facturas y analiza tu negocio. Tu equipo puede unirse con una simple invitación.',
    // Pricing
    priceLabel:  'Precios',
    priceTitle:  'Simple, transparente,',
    priceAccent: 'sin sorpresas',
    priceSub:    'Empieza gratis. Crece cuando lo necesites. Sin contratos largos.',
    priceContact: '¿Necesitas algo específico?',
    priceContactLink: 'Contáctanos',
    priceContactSuffix: 'y diseñamos un plan a tu medida.',
    planStarterSub: '$39 / mes facturado anual',
    planProSub:     '$79 / mes facturado anual',
    planEntSub:     '$159 / mes facturado anual',
    planStarterCta:    'Empieza gratis 10 días',
    planProCta:        'Empieza gratis 10 días',
    planEntCta:        'Hablar con ventas',
    planStarterFeatures: ['2 usuarios','2 vehículos / técnicos','Reservas y CRM básico','Contabilidad y finanzas','WhatsApp Bot incluido'],
    planStarterNot:      ['RRHH + Nómina','Reportes completos','Soporte prioritario'],
    planProFeatures:     ['5 usuarios','Vehículos ilimitados','CRM completo + tiers VIP','WhatsApp Bot incluido','RRHH + Nómina completa','Contabilidad y finanzas','Reportes completos'],
    planProNot:          ['Soporte prioritario'],
    planEntFeatures:     ['Usuarios ilimitados','Todo lo de Pro','Onboarding dedicado','Soporte prioritario 24/7','SLA garantizado','Backup diario de datos','Personalización de marca'],
    planEntNot:          [] as string[],
    popular: 'El más popular',
    perMonth: '/ mes',
    // CTA Banner
    ctaTitle:  '¿Listo para profesionalizar tu car wash & detailing?',
    ctaSub:    'Únete a los negocios de detailing a domicilio que ya operan con SAFFI. Empieza gratis hoy, sin tarjeta de crédito.',
    ctaBtn:    'Empieza gratis ahora',
    ctaLogin:  'Ya tengo cuenta',
    // Footer
    footerTagline: 'El ERP vertical para car wash & detailing a domicilio. Reservas, clientes, pagos e inventario en una sola plataforma.',
    footerEmail: 'hola@saffi.app',
    footerProduct: 'Producto',
    footerCompany: 'Empresa',
    footerLegal:   'Legal',
    footerProdLinks:    ['Funcionalidades','Precios','Changelog','Roadmap'],
    footerCompanyLinks: ['Sobre nosotros','Blog','Socios','Contacto'],
    footerLegalLinks:   ['Privacidad','Términos de uso','Cookies','Seguridad'],
    footerCopy: '© 2026 SAFFI ERP. Todos los derechos reservados.',
    footerLang: 'Español · Disponible en 12 países',
    // Mockup
    mockupUrl: 'saffi.app · panel',
    mockupBookings: 'Reservas de hoy',
    // Testimonials
    testimLabel: 'Prueba Social',
    testimTitle: 'Lo que dicen quienes ya operan con SAFFI',
    testimSub: 'Negocios reales. Resultados medibles. No marketing.',
    testimQuote1: 'Antes llevaba las reservas en WhatsApp y un cuaderno. Con SAFFI dejé de perder citas y facturo en un clic. Pasé de 40 a 65 servicios al mes.',
    testimName1: 'Carlos M.',
    testimBiz1: 'Auto Spa Móvil',
    testimCity1: 'Guayaquil, Ecuador',
    testimQuote2: 'En una semana recuperé el tiempo que perdía coordinando por WhatsApp. Mis técnicos ya no me llaman para confirmar nada.',
    testimName2: 'Marcos R.',
    testimBiz2: 'Detailing XL',
    testimCity2: 'Lima, Perú',
    testimQuote3: 'Lo mejor fue dejar el papel. Ahora mis técnicos ven su agenda en el móvil y yo veo todo desde casa. Pasamos de 3 a 8 técnicos sin caos.',
    testimName3: 'Ana P.',
    testimBiz3: 'FleetClean Pro',
    testimCity3: 'Bogotá, Colombia',
    testimQuote4: 'Antes tardaba 20 min en hacer una factura. Ahora lo hago desde el coche en 40 segundos mientras el cliente todavía está ahí.',
    testimName4: 'Diego A.',
    testimBiz4: 'Auto Premium Móvil',
    testimCity4: 'Santiago, Chile',
  },
  en: {
    // Nav
    navFeatures:  'Features',
    navPricing:   'Pricing',
    navHow:       'How it works',
    navLogin:     'Log in',
    navCta:       'Get started',
    navCtaMobile: 'Get started — 10 days free',
    // Hero
    badge:      'Specialized in Mobile Car Wash & Detailing',
    heroLine1:  'The ERP for',
    heroAccent: 'mobile car wash & detailing',
    heroLine2:  '',
    heroSub:    'The vertical software your mobile car wash & detailing operation needs. Bookings, clients, payments and inventory — all in one place, from any device.',
    heroCta1:   'Start free — 10 days',
    heroCta2:   'See demo',
    heroTrust:  'No credit card · Cancel anytime · Support included',
    // Stats
    stat1v: '500+', stat1l: 'Active businesses',
    stat2v: '2M+',  stat2l: 'Services recorded',
    stat3v: '98%',  stat3l: 'Customer satisfaction',
    stat4v: '12',   stat4l: 'Countries',
    // Features
    featLabel: 'Features',
    featTitle: 'Everything you need,',
    featAccent: 'in one place',
    featSub:   'Built specifically for mobile car wash & detailing operations. No generic tools, no workarounds — SAFFI understands your business.',
    f1t: 'Booking Management',    f1d: 'Schedule services with a visual calendar. Confirm, reassign and notify your team in real time from any device.',
    f2t: 'Customer CRM',          f2d: 'Full history per client and vehicle. VIP segmentation, opportunity tracking and automatic reminders.',
    f3t: 'Smart Invoicing',       f3d: 'Issue invoices, track payments, manage VAT and generate financial reports in one click.',
    f4t: 'Inventory & Purchasing',f4d: 'Real-time stock with low-stock alerts. Automatic purchase orders and cost control per service.',
    f5t: 'Analytics & Reports',   f5d: 'Interactive dashboards with business KPIs: revenue, average ticket, active clients and monthly trends.',
    f6t: 'Multi-user & Roles',    f6d: 'Granular permissions per module. Each person sees and edits only what they need. Audit logs included.',
    // How it works
    howLabel: 'How it works',
    howTitle: 'Up and running in under 10 minutes',
    howSub:   'No complex implementations. Built for detailers who want to operate like a professional company.',
    s1t: 'Create your account',  s1d: 'Sign up in less than 2 minutes. No credit card. 10-day full trial with all features.',
    s2t: 'Set up your business', s2d: 'Add your logo, services, rates and inventory. The setup wizard guides you step by step.',
    s3t: 'Operate from day one', s3d: 'Manage bookings, issue invoices and analyze your business. Your team can join with a simple invitation.',
    // Pricing
    priceLabel:  'Pricing',
    priceTitle:  'Simple, transparent,',
    priceAccent: 'no surprises',
    priceSub:    'Start free. Grow when you need to. No long-term contracts.',
    priceContact: 'Need something specific?',
    priceContactLink: 'Contact us',
    priceContactSuffix: "and we'll design a plan for you.",
    planStarterSub: '$39 / mo billed annually',
    planProSub:     '$79 / mo billed annually',
    planEntSub:     '$159 / mo billed annually',
    planStarterCta:    'Start free 10 days',
    planProCta:        'Start free 10 days',
    planEntCta:        'Talk to sales',
    planStarterFeatures: ['2 users','2 vehicles / technicians','Bookings & basic CRM','Accounting & finance','WhatsApp Bot included'],
    planStarterNot:      ['HR + Payroll','Full reports','Priority support'],
    planProFeatures:     ['5 users','Unlimited vehicles','Full CRM + VIP tiers','WhatsApp Bot included','HR + Full payroll','Accounting & finance','Full reports'],
    planProNot:          ['Priority support'],
    planEntFeatures:     ['Unlimited users','Everything in Pro','Dedicated onboarding','Priority support 24/7','SLA guaranteed','Daily data backup','Brand customization'],
    planEntNot:          [] as string[],
    popular: 'Most popular',
    perMonth: '/ mo',
    // CTA Banner
    ctaTitle:  'Ready to professionalize your car wash & detailing?',
    ctaSub:    'Join the mobile detailing businesses already operating with SAFFI. Start free today, no credit card required.',
    ctaBtn:    'Start free now',
    ctaLogin:  'I already have an account',
    // Footer
    footerTagline: 'The vertical ERP for mobile car wash & detailing. Bookings, clients, payments and inventory in one platform.',
    footerEmail: 'hello@saffi.app',
    footerProduct: 'Product',
    footerCompany: 'Company',
    footerLegal:   'Legal',
    footerProdLinks:    ['Features','Pricing','Changelog','Roadmap'],
    footerCompanyLinks: ['About us','Blog','Partners','Contact'],
    footerLegalLinks:   ['Privacy','Terms of use','Cookies','Security'],
    footerCopy: '© 2026 SAFFI ERP. All rights reserved.',
    footerLang: 'English · Available in 12 countries',
    // Mockup
    mockupUrl: 'saffi.app · dashboard',
    mockupBookings: "Today's bookings",
    // Testimonials
    testimLabel: 'Social Proof',
    testimTitle: 'What businesses already using SAFFI say',
    testimSub: 'Real businesses. Measurable results. Not marketing.',
    testimQuote1: 'I used to track bookings on WhatsApp and a notebook. With SAFFI I stopped losing appointments and invoice in one click. I went from 40 to 65 services a month.',
    testimName1: 'Carlos M.',
    testimBiz1: 'Auto Spa Mobile',
    testimCity1: 'Guayaquil, Ecuador',
    testimQuote2: 'In one week I got back all the time I wasted coordinating on WhatsApp. My technicians no longer call me to confirm anything.',
    testimName2: 'Marcos R.',
    testimBiz2: 'Detailing XL',
    testimCity2: 'Lima, Peru',
    testimQuote3: 'The best part was ditching paper. Now my techs see their schedule on their phones and I see everything from home. We went from 3 to 8 technicians without chaos.',
    testimName3: 'Ana P.',
    testimBiz3: 'FleetClean Pro',
    testimCity3: 'Bogotá, Colombia',
    testimQuote4: 'It used to take me 20 minutes to make an invoice. Now I do it from the car in 40 seconds while the client is still standing there.',
    testimName4: 'Diego A.',
    testimBiz4: 'Auto Premium Mobile',
    testimCity4: 'Santiago, Chile',
  },
}

export type Translations = typeof T.es

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: Translations
}

const LandingLangContext = createContext<LangCtx>({
  lang: 'es',
  setLang: () => {},
  t: T.es,
})

export function LandingLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')

  useEffect(() => {
    const saved = localStorage.getItem('saffi-landing-lang') as Lang | null
    if (saved === 'en' || saved === 'es') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('saffi-landing-lang', l)
  }

  return (
    <LandingLangContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LandingLangContext.Provider>
  )
}

export function useLandingLang() {
  return useContext(LandingLangContext)
}
