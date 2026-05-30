'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// ── Price IDs from env ────────────────────────────────────────────────────────
const PRICE_IDS = {
  starter: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY!,
    annual:  process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL!,
  },
  pro: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY!,
    annual:  process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL!,
  },
  enterprise: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY!,
    annual:  process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_ANNUAL!,
  },
} as const

type PlanKey = keyof typeof PRICE_IDS
type Interval = 'monthly' | 'annual'

interface PlanConfig {
  key:       PlanKey
  name:      string
  monthly:   number
  annual:    number
  highlight: boolean
  badge?:    string
  cta:       string
  features:  { label: string; included: boolean }[]
}

const PLANS: PlanConfig[] = [
  {
    key: 'starter', name: 'Starter', monthly: 49, annual: 39,
    highlight: false, cta: 'Empezar con Starter',
    features: [
      { label: '2 usuarios',                    included: true  },
      { label: '2 vehículos / técnicos',         included: true  },
      { label: 'Reservas y CRM básico',          included: true  },
      { label: 'Contabilidad y finanzas',        included: true  },
      { label: 'WhatsApp Bot incluido',          included: true  },
      { label: 'RRHH + Nómina completa',         included: false },
      { label: 'Reportes completos',             included: false },
      { label: 'Onboarding dedicado',            included: false },
    ],
  },
  {
    key: 'pro', name: 'Pro', monthly: 99, annual: 79,
    highlight: true, badge: 'Más popular', cta: 'Empezar con Pro',
    features: [
      { label: '5 usuarios',                    included: true },
      { label: 'Vehículos ilimitados',           included: true },
      { label: 'CRM completo + tiers',           included: true },
      { label: 'WhatsApp Bot incluido',          included: true },
      { label: 'RRHH + Nómina completa',         included: true },
      { label: 'Contabilidad y finanzas',        included: true },
      { label: 'Reportes completos',             included: true },
      { label: 'Onboarding dedicado',            included: false },
    ],
  },
  {
    key: 'enterprise', name: 'Enterprise', monthly: 199, annual: 159,
    highlight: false, cta: 'Empezar con Enterprise',
    features: [
      { label: 'Usuarios ilimitados',            included: true },
      { label: 'Todo lo de Pro',                 included: true },
      { label: 'Onboarding dedicado',            included: true },
      { label: 'Soporte prioritario 24/7',       included: true },
      { label: 'SLA garantizado',                included: true },
      { label: 'Backup diario de datos',         included: true },
      { label: 'Personalización de marca',       included: true },
      { label: 'Reportes completos',             included: true },
    ],
  },
]

// ── SAFFI SVG logo ────────────────────────────────────────────────────────────
function SaffiLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <svg width="28" height="46" viewBox="-25 -50 50 100">
        <path d="M 0 -45 C 3 -15, 7 -7, 24 0 C 7 7, 3 15, 0 45 C -3 15, -7 7, -24 0 C -7 -7, -3 -15, 0 -45 Z" fill="#0B2A4A"/>
        <path d="M 0 -18 C 1.5 -6, 3 -2, 10 0 C 3 2, 1.5 6, 0 18 C -1.5 6, -3 2, -10 0 C -3 -2, -1.5 -6, 0 -18 Z" fill="#3DD9D6"/>
      </svg>
      <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 22, fontWeight: 500, color: '#0B2A4A', letterSpacing: '-0.04em' }}>
        saffi
      </span>
    </div>
  )
}

// ── Inner component — uses useSearchParams ────────────────────────────────────
function UpgradeContent() {
  const params    = useSearchParams()
  const tenantId  = params.get('tenant_id') ?? ''
  const upgraded  = params.get('upgraded') === 'true'
  const canceled  = params.get('canceled')  === 'true'

  const [interval, setInterval] = useState<Interval>('monthly')
  const [loading,  setLoading]  = useState<PlanKey | null>(null)

  async function handleSelectPlan(priceId: string, planKey: PlanKey) {
    if (!tenantId) return
    setLoading(planKey)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, tenantId }),
    })
    const data = (await res.json()) as { url?: string; error?: string }
    if (data.url) {
      window.location.href = data.url
    } else {
      console.error('[upgrade] checkout error:', data.error)
      alert('Error al procesar: ' + (data.error ?? 'Sin respuesta del servidor'))
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F4EF',
      fontFamily: 'Outfit, -apple-system, sans-serif',
      padding: '48px 24px 80px',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 40 }}>
        <SaffiLogo />
      </div>

      {/* Success / Cancel banners */}
      {upgraded && (
        <div style={{
          maxWidth: 560, margin: '0 auto 32px',
          background: '#E6F4EE', border: '1px solid #A3D4B5',
          borderRadius: 12, padding: '16px 20px',
          color: '#1A6B40', fontSize: 14, fontWeight: 600, textAlign: 'center',
        }}>
          ✅ ¡Tu plan ha sido activado correctamente! Bienvenido a SAFFI ERP.
        </div>
      )}
      {canceled && (
        <div style={{
          maxWidth: 560, margin: '0 auto 32px',
          background: '#FBE7E2', border: '1px solid #F5B8AE',
          borderRadius: 12, padding: '16px 20px',
          color: '#D9533D', fontSize: 14, fontWeight: 600, textAlign: 'center',
        }}>
          El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0B2A4A', margin: '0 0 8px' }}>
          Elige tu plan
        </h1>
        <p style={{ fontSize: 16, color: '#5A5852', margin: 0 }}>
          Continúa usando SAFFI ERP
        </p>
      </div>

      {/* Interval toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 48 }}>
        <button
          onClick={() => setInterval('monthly')}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: interval === 'monthly' ? '#0B2A4A' : '#FFFFFF',
            color:      interval === 'monthly' ? '#FFFFFF' : '#5A5852',
            boxShadow:  interval === 'monthly' ? '0 2px 8px rgba(11,42,74,0.2)' : 'none',
          }}
        >
          Mensual
        </button>
        <button
          onClick={() => setInterval('annual')}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: interval === 'annual' ? '#0B2A4A' : '#FFFFFF',
            color:      interval === 'annual' ? '#FFFFFF' : '#5A5852',
            boxShadow:  interval === 'annual' ? '0 2px 8px rgba(11,42,74,0.2)' : 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          Anual
          <span style={{
            background: '#F5B544', color: '#1A1A1A',
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 99, letterSpacing: '0.3px',
          }}>
            AHORRA 20%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        {PLANS.map(plan => {
          const price     = interval === 'annual' ? plan.annual : plan.monthly
          const priceId   = PRICE_IDS[plan.key][interval]
          const isLoading = loading === plan.key

          return (
            <div
              key={plan.key}
              style={{
                background: '#FFFFFF',
                border: plan.highlight ? '2px solid #0B2A4A' : '1px solid #F0EFEA',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.highlight
                  ? '0 8px 32px rgba(11,42,74,0.12)'
                  : '0 2px 8px rgba(11,42,74,0.04)',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#0B2A4A', color: '#FFFFFF',
                  fontSize: 10, fontWeight: 700, padding: '4px 14px',
                  borderRadius: 99, letterSpacing: '0.5px', whiteSpace: 'nowrap',
                }}>
                  {plan.badge.toUpperCase()}
                </div>
              )}

              {/* Plan name */}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5A5852', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: '#0B2A4A', lineHeight: 1 }}>
                  ${price}
                </span>
                <span style={{ fontSize: 14, color: '#5A5852', fontWeight: 500 }}>/mes</span>
              </div>
              {interval === 'annual' && (
                <div style={{ fontSize: 12, color: '#A8A6A0', marginBottom: 24 }}>
                  Facturado anualmente · ${price * 12}/año
                </div>
              )}
              {interval === 'monthly' && <div style={{ marginBottom: 24 }} />}

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: f.included ? '#1A6B40' : '#A8A6A0' }}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    <span style={{ fontSize: 13, color: f.included ? '#0B2A4A' : '#A8A6A0' }}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(priceId, plan.key)}
                disabled={isLoading || !tenantId}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                  fontSize: 14, fontWeight: 700,
                  cursor: isLoading || !tenantId ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  background: plan.highlight ? '#0B2A4A' : '#F5B544',
                  color:      plan.highlight ? '#FFFFFF'  : '#1A1A1A',
                  opacity: isLoading || !tenantId ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Redirigiendo…' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#A8A6A0' }}>
        Todos los planes incluyen 30 días de garantía de devolución · Cancela cuando quieras
      </p>

      {!tenantId && (
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#D9533D' }}>
          URL inválida: falta el parámetro tenant_id
        </p>
      )}
    </div>
  )
}

// ── Page — wraps content in Suspense for useSearchParams ──────────────────────
export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: '#F5F4EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0B2A4A',
        fontSize: 16,
      }}>
        Cargando planes...
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  )
}
