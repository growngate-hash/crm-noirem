import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNavbar from '@/components/landing/LandingNavbar'
import {
  CalendarCheck, Users, DollarSign, BarChart2,
  Package, Wrench, CheckCircle2, ArrowRight, Zap,
  Shield, Clock, Globe,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'SAFFI — El ERP inteligente para negocios automotrices',
  description: 'SAFFI centraliza reservas, clientes, finanzas e inventario en una sola plataforma. Software ERP diseñado para centros de servicio automotriz.',
  openGraph: {
    title: 'SAFFI ERP — Gestión inteligente para tu negocio automotriz',
    description: 'Reservas, CRM, facturación e inventario. Todo integrado, todo en tiempo real.',
    type: 'website',
  },
}

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const S  = '#0B2A4A'   // Sapphire
const C  = '#3DD9D6'   // Cyan
const A  = '#F5B544'   // Amber
const CR = '#FAFAF7'   // Cream

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: CalendarCheck,
    color: C,
    bg: 'rgba(61,217,214,0.10)',
    title: 'Gestión de Reservas',
    desc: 'Agenda servicios con un calendario visual. Confirma, reasigna y notifica a tu equipo en tiempo real desde cualquier dispositivo.',
  },
  {
    icon: Users,
    color: A,
    bg: 'rgba(245,181,68,0.12)',
    title: 'CRM de Clientes',
    desc: 'Historial completo por cliente y vehículo. Segmentación VIP, seguimiento de oportunidades y recordatorios automáticos.',
  },
  {
    icon: DollarSign,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    title: 'Facturación Inteligente',
    desc: 'Emite facturas, controla cobros, gestiona VAT y genera reportes financieros con un clic. Sin contadores externos.',
  },
  {
    icon: Package,
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    title: 'Inventario & Compras',
    desc: 'Stock en tiempo real con alertas de mínimos. Órdenes de compra automáticas y control de costos por servicio.',
  },
  {
    icon: BarChart2,
    color: C,
    bg: 'rgba(61,217,214,0.10)',
    title: 'Analytics & Reportes',
    desc: 'Dashboards interactivos con KPIs de negocio: ingresos, ticket promedio, clientes activos y tendencias mensuales.',
  },
  {
    icon: Shield,
    color: A,
    bg: 'rgba(245,181,68,0.12)',
    title: 'Multi-usuario & Roles',
    desc: 'Permisos granulares por módulo. Cada persona ve y edita solo lo que necesita. Logs de auditoría incluidos.',
  },
]

// ─── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Crea tu cuenta',
    desc: 'Regístrate en menos de 2 minutos. Sin tarjeta de crédito. 14 días de prueba completa con todas las funciones.',
  },
  {
    n: '02',
    title: 'Configura tu negocio',
    desc: 'Agrega tu logo, servicios, tarifas e inventario. El asistente de configuración te guía paso a paso.',
  },
  {
    n: '03',
    title: 'Opera desde día uno',
    desc: 'Gestiona reservas, emite facturas y analiza tu negocio. Tu equipo puede unirse con una simple invitación.',
  },
]

// ─── Pricing tiers ────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: '14 días',
    sub: 'Sin tarjeta de crédito',
    highlight: false,
    features: [
      '1 usuario',
      'Hasta 30 reservas / mes',
      'CRM básico de clientes',
      'Facturación simple',
      'Inventario (hasta 50 items)',
      'Soporte por email',
    ],
    cta: 'Empieza gratis',
    ctaHref: '/register',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/ mes',
    sub: 'El más popular',
    highlight: true,
    features: [
      'Hasta 5 usuarios',
      'Reservas ilimitadas',
      'CRM completo con VIP',
      'Facturación + VAT avanzado',
      'Inventario ilimitado',
      'Reportes y analytics',
      'Integración WhatsApp',
      'Soporte prioritario',
    ],
    cta: 'Empieza con Pro',
    ctaHref: '/register?plan=pro',
  },
  {
    name: 'Enterprise',
    price: 'Desde $149',
    period: '/ mes',
    sub: 'Para equipos grandes',
    highlight: false,
    features: [
      'Usuarios ilimitados',
      'Multi-sede / sucursales',
      'API y webhooks',
      'Integraciones a medida',
      'Onboarding personalizado',
      'Gerente de cuenta dedicado',
      'SLA garantizado',
    ],
    cta: 'Hablar con ventas',
    ctaHref: '/register?plan=enterprise',
  },
]

// ─── Stats strip ──────────────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Negocios activos' },
  { value: '2M+',  label: 'Servicios registrados' },
  { value: '98%',  label: 'Satisfacción de clientes' },
  { value: '12',   label: 'Países' },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ fontFamily: 'var(--font-geist), Geist, -apple-system, sans-serif', color: S, background: 'white' }}>
      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════ HERO */}
      <section style={{
        background: `linear-gradient(160deg, ${S} 0%, #0d3660 55%, #0a2240 100%)`,
        paddingTop: 120, paddingBottom: 96,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decorative blobs */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 600, height: 600,
          borderRadius: '50%', background: `radial-gradient(circle, rgba(61,217,214,0.12) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -120, left: -60, width: 480, height: 480,
          borderRadius: '50%', background: `radial-gradient(circle, rgba(245,181,68,0.08) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          {/* Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(61,217,214,0.12)', border: '1px solid rgba(61,217,214,0.3)',
              borderRadius: 99, padding: '6px 16px',
              fontSize: 13, fontWeight: 600, color: C, letterSpacing: '0.02em',
            }}>
              <Zap size={13} style={{ flexShrink: 0 }} />
              Nuevo · Reportes en tiempo real disponibles
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 900, lineHeight: 1.08,
            textAlign: 'center', color: 'white',
            letterSpacing: '-1.5px', margin: '0 auto 20px',
            maxWidth: 860,
          }}>
            Gestiona tu negocio{' '}
            <span style={{
              background: `linear-gradient(90deg, ${C}, #5FE8E5)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              automotriz
            </span>{' '}
            con inteligencia
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.6,
            color: 'rgba(255,255,255,0.72)', textAlign: 'center',
            maxWidth: 640, margin: '0 auto 40px',
          }}>
            SAFFI centraliza reservas, clientes, finanzas e inventario en una sola plataforma.
            Diseñado para centros de servicio que quieren operar como los mejores.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 56 }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: A, color: '#0B1A2A',
              fontWeight: 800, fontSize: 16,
              padding: '14px 32px', borderRadius: 10,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(245,181,68,0.40)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              letterSpacing: '-0.2px',
            }}>
              Empieza gratis — 14 días
              <ArrowRight size={16} />
            </Link>
            <a href="#how" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1.5px solid rgba(255,255,255,0.3)', color: 'white',
              fontWeight: 600, fontSize: 16,
              padding: '14px 28px', borderRadius: 10,
              textDecoration: 'none', background: 'rgba(255,255,255,0.06)',
              transition: 'background 0.15s',
            }}>
              Ver demostración
            </a>
          </div>

          {/* Dashboard mockup */}
          <div style={{
            maxWidth: 900, margin: '0 auto',
            background: 'rgba(255,255,255,0.04)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.10)',
            padding: 20,
            boxShadow: '0 32px 80px rgba(0,0,0,0.40)',
          }}>
            {/* Mockup topbar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                saffi.app · dashboard
              </div>
              <div style={{ width: 60 }} />
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Ingresos MTD', value: 'AED 84,200', color: C, delta: '+12.4%' },
                { label: 'Reservas activas', value: '23', color: A, delta: '↑ activas' },
                { label: 'Ticket promedio', value: 'AED 3,660', color: '#818cf8', delta: '+5.1%' },
                { label: 'Stock bajo', value: '2 alertas', color: '#22c55e', delta: '← ok' },
              ].map(kpi => (
                <div key={kpi.label} style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{kpi.delta}</div>
                </div>
              ))}
            </div>

            {/* Chart + table row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10 }}>
              {/* Fake bar chart */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 12 }}>📊 Ventas últimos 6 meses</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 70 }}>
                  {[45, 62, 38, 80, 54, 90].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, borderRadius: '4px 4px 0 0',
                      background: i === 5
                        ? `linear-gradient(180deg, ${C} 0%, rgba(61,217,214,0.6) 100%)`
                        : 'rgba(255,255,255,0.15)',
                      height: `${h}%`,
                    }} />
                  ))}
                </div>
              </div>

              {/* Fake table */}
              <div style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 10 }}>Reservas de hoy</div>
                {[
                  { name: 'Ahmed Al Maktoum', service: 'Detailing Full', status: C },
                  { name: 'Carlos Ortega', service: 'Cambio de aceite', status: A },
                  { name: 'Sara Johnson', service: 'PPF Premium', status: '#818cf8' },
                ].map(row => (
                  <div key={row.name} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{row.name}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{row.service}</div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: row.status,
                      flexShrink: 0,
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust line */}
          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            Sin tarjeta de crédito · Cancela cuando quieras · Soporte en español
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ STATS */}
      <section style={{ background: 'white', borderBottom: '1px solid #F0EFEA', padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
          {STATS.map(stat => (
            <div key={stat.value}>
              <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: S, letterSpacing: '-1px' }}>{stat.value}</div>
              <div style={{ fontSize: 14, color: '#5A5852', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ FEATURES */}
      <section id="features" style={{ background: CR, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              color: C, letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              Funcionalidades
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: S, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Todo lo que necesitas,{' '}
              <span style={{ color: C }}>en un solo lugar</span>
            </h2>
            <p style={{ fontSize: 18, color: '#5A5852', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Olvídate de spreadsheets y herramientas dispersas. SAFFI unifica todo tu negocio en una plataforma coherente.
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="feature-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card" style={{
                background: 'white', borderRadius: 16,
                border: '1px solid #F0EFEA', padding: '28px 28px 32px',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: f.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18,
                }}>
                  <f.icon size={22} color={f.color} strokeWidth={1.75} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: S, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#5A5852', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ HOW IT WORKS */}
      <section id="how" style={{ background: 'white', padding: '96px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: A, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Cómo funciona
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: S, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Opera en menos de 10 minutos
            </h2>
            <p style={{ fontSize: 18, color: '#5A5852', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Sin implementaciones complejas. Sin consultores. Solo tú y tu negocio.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, position: 'relative' }} className="steps-grid">
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: 32, left: '16.66%', right: '16.66%', height: 1,
              background: `linear-gradient(90deg, ${C}, ${A})`,
              opacity: 0.3, pointerEvents: 'none',
            }} />

            {STEPS.map((step, i) => (
              <div key={step.n} style={{ textAlign: 'center', padding: '0 12px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                  background: i === 1
                    ? `linear-gradient(135deg, ${C}, #2BB8B5)`
                    : i === 2 ? `linear-gradient(135deg, ${A}, #D4952A)` : `linear-gradient(135deg, ${S}, #1a4a7a)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(11,42,74,0.15)',
                  position: 'relative', zIndex: 1,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{step.n}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: S, margin: '0 0 10px', letterSpacing: '-0.3px' }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: '#5A5852', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ PRICING */}
      <section id="pricing" style={{ background: CR, padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: C, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Precios
            </span>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: S, letterSpacing: '-1px', margin: '0 0 16px' }}>
              Simple, transparente, <span style={{ color: C }}>sin sorpresas</span>
            </h2>
            <p style={{ fontSize: 18, color: '#5A5852', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Empieza gratis. Crece cuando lo necesites. Sin contratos largos.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }} className="pricing-grid">
            {PLANS.map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? S : 'white',
                borderRadius: 20,
                border: plan.highlight ? 'none' : '1px solid #F0EFEA',
                padding: plan.highlight ? '36px 32px 32px' : '32px 28px 28px',
                boxShadow: plan.highlight ? `0 16px 48px rgba(11,42,74,0.25)` : '0 2px 8px rgba(11,42,74,0.04)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {plan.highlight && (
                  <>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${C}, ${A})`,
                    }} />
                    <div style={{
                      position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                      borderRadius: '50%', background: 'rgba(61,217,214,0.06)',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}

                {/* Plan badge */}
                {plan.highlight && (
                  <div style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 700,
                    background: `rgba(245,181,68,0.15)`, color: A,
                    border: `1px solid rgba(245,181,68,0.3)`,
                    borderRadius: 99, padding: '4px 12px', marginBottom: 14,
                  }}>
                    {plan.sub}
                  </div>
                )}

                <div style={{ fontSize: 15, fontWeight: 700, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#5A5852', marginBottom: 8 }}>
                  {plan.name}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 900, color: plan.highlight ? 'white' : S, letterSpacing: '-1px' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 15, color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#A8A6A0', fontWeight: 500 }}>
                    {plan.period}
                  </span>
                </div>

                {!plan.highlight && (
                  <div style={{ fontSize: 13, color: '#A8A6A0', marginBottom: 20 }}>{plan.sub}</div>
                )}

                <div style={{ height: plan.highlight ? 0 : 0, marginBottom: 20 }} />

                <Link href={plan.ctaHref} style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px 0', borderRadius: 10,
                  fontSize: 15, fontWeight: 700, textDecoration: 'none',
                  marginBottom: 24,
                  background: plan.highlight ? A : 'transparent',
                  color: plan.highlight ? '#0B1A2A' : S,
                  border: plan.highlight ? 'none' : `1.5px solid ${S}`,
                  boxShadow: plan.highlight ? `0 4px 16px rgba(245,181,68,0.3)` : 'none',
                  transition: 'opacity 0.15s',
                }}>
                  {plan.cta}
                </Link>

                <div style={{ height: 1, background: plan.highlight ? 'rgba(255,255,255,0.1)' : '#F0EFEA', marginBottom: 20 }} />

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <CheckCircle2 size={16} color={plan.highlight ? C : '#22c55e'} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.80)' : '#5A5852', lineHeight: 1.4 }}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#A8A6A0' }}>
            ¿Necesitas algo específico?{' '}
            <a href="mailto:hola@saffi.app" style={{ color: C, fontWeight: 600, textDecoration: 'none' }}>
              Contáctanos
            </a>
            {' '}y diseñamos un plan a tu medida.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ CTA BANNER */}
      <section style={{
        background: `linear-gradient(135deg, ${S} 0%, #0d3660 100%)`,
        padding: '80px 24px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: `radial-gradient(ellipse, rgba(61,217,214,0.15) 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', letterSpacing: '-1px', margin: '0 0 16px' }}>
            ¿Listo para transformar tu negocio?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', marginBottom: 36, lineHeight: 1.6 }}>
            Únete a más de 500 negocios que ya operan con SAFFI. Empieza gratis hoy, sin tarjeta de crédito.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: A, color: '#0B1A2A',
              fontWeight: 800, fontSize: 16,
              padding: '15px 36px', borderRadius: 10,
              textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(245,181,68,0.40)',
            }}>
              Empieza gratis ahora
              <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center',
              border: '1.5px solid rgba(255,255,255,0.35)', color: 'white',
              fontWeight: 600, fontSize: 16,
              padding: '15px 28px', borderRadius: 10,
              textDecoration: 'none', background: 'rgba(255,255,255,0.06)',
            }}>
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ FOOTER */}
      <footer style={{ background: '#07192E', padding: '64px 24px 36px', color: 'rgba(255,255,255,0.5)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }} className="footer-grid">
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `linear-gradient(135deg, ${S}, #1a4a7a)`,
                  border: '1px solid rgba(61,217,214,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: C, fontWeight: 900, fontSize: 16, letterSpacing: '-1px' }}>S</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>saffi</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: '0 0 20px' }}>
                El ERP inteligente para negocios automotrices. Reservas, clientes, finanzas e inventario en una sola plataforma.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {['hola@saffi.app'].map(mail => (
                  <a key={mail} href={`mailto:${mail}`} style={{ fontSize: 13, color: C, textDecoration: 'none', fontWeight: 600 }}>
                    {mail}
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 0 }}>
                Producto
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Funcionalidades', 'Precios', 'Changelog', 'Roadmap'].map(l => (
                  <li key={l}><a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 0 }}>
                Empresa
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Sobre nosotros', 'Blog', 'Socios', 'Contacto'].map(l => (
                  <li key={l}><a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, marginTop: 0 }}>
                Legal
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Privacidad', 'Términos de uso', 'Cookies', 'Seguridad'].map(l => (
                  <li key={l}><a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{l}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13 }}>© 2026 SAFFI ERP. Todos los derechos reservados.</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Globe size={13} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: 13 }}>Español · Disponible en 12 países</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Responsive styles ─────────────────────────────────────────────────── */}
      <style>{`
        .feature-card:hover {
          box-shadow: 0 8px 32px rgba(11,42,74,0.09) !important;
          transform: translateY(-2px) !important;
        }
        @media (max-width: 900px) {
          .feature-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 460px; margin-left: auto; margin-right: auto; }
          .footer-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .feature-grid { grid-template-columns: 1fr !important; }
          .steps-grid   { grid-template-columns: 1fr !important; }
          .footer-grid  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          section > div > div[style*="repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        a:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
