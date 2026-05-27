'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpgradePage() {
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  const PLANS = [
    {
      name: 'Starter',
      price: 'Próximamente',
      features: ['Hasta 3 usuarios', 'Reportes básicos', 'Bot de WhatsApp', 'Soporte por email'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: 'Próximamente',
      features: ['Hasta 10 usuarios', 'Reportes avanzados', 'Bot de WhatsApp', 'Soporte prioritario', 'Integraciones'],
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Contactar',
      features: ['Usuarios ilimitados', 'Reportes personalizados', 'Manager dedicado', 'SLA garantizado', 'Onboarding personalizado'],
      highlight: false,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Outfit,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 860 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.1em', marginBottom: 8 }}>SAFFI</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>Tu período de prueba ha terminado</div>
          <div style={{ fontSize: 14, color: '#888580' }}>Elige un plan para continuar usando SAFFI ERP</div>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: plan.highlight ? '#1a1a1e' : '#141416',
              border: `1px solid ${plan.highlight ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 16, padding: 24, position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#c9a84c', color: '#0d0d0f', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 99, letterSpacing: '0.08em' }}>
                  RECOMENDADO
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: plan.highlight ? '#c9a84c' : '#888580', marginBottom: 20 }}>{plan.price}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888580' }}>
                    <span style={{ color: '#c9a84c', fontSize: 12 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => window.open('mailto:hello@saffi.app?subject=Plan ' + plan.name, '_blank')}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)', background: plan.highlight ? '#c9a84c' : 'transparent', color: plan.highlight ? '#0d0d0f' : '#888580', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
                {plan.name === 'Enterprise' ? 'Contactar ventas' : 'Seleccionar plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: '#888580', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', textDecoration: 'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}