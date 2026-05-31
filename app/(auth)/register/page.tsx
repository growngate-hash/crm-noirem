'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/countries'
import Link from 'next/link'

const S = '#0B2A4A'
const C = '#3DD9D6'
const A = '#F5B544'

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    businessName: '',
    country: 'US',
    email: '',
    password: '',
    confirmPassword: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleRegister() {
    if (!form.businessName.trim()) { setError('El nombre del negocio es requerido'); return }
    if (!form.email.trim())        { setError('El email es requerido'); return }
    if (form.password.length < 8)  { setError('La contraseña debe tener mínimo 8 caracteres'); return }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            business_name: form.businessName.trim(),
            country:       form.country,
            pending_setup: true,
          }
        }
      })

      if (authError) { setError(authError.message); setLoading(false); return }
      if (!authData.user) { setError('Error al crear la cuenta'); setLoading(false); return }

      const setupRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:       authData.user.id,
          businessName: form.businessName.trim(),
          country:      form.country,
          email:        form.email.trim(),
        }),
      })

      if (!setupRes.ok) {
        const setupData = await setupRes.json().catch(() => ({ error: 'Error desconocido' }))
        setError('Error al configurar tu cuenta: ' + setupData.error)
        setLoading(false)
        return
      }

      setStep(2)
    } catch (err: any) {
      setError('Error inesperado: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const INP: React.CSSProperties = {
    width: '100%', background: '#F4F6F8',
    border: '1.5px solid #E8EDF2',
    borderRadius: 10, padding: '12px 14px',
    color: S, fontSize: 14,
    fontFamily: 'Geist, -apple-system, sans-serif',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
  const LBL: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#5A5852', marginBottom: 7,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${S} 0%, #0d3660 55%, #0a2240 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'Geist, -apple-system, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,217,214,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -120, left: -80, width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,181,68,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <img src="/saffi-logo-light.svg" alt="SAFFI" style={{ width: 24, height: 29 }} />
            <span style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>saffi</span>
          </Link>
        </div>

        {step === 1 ? (
          <div style={{
            background: 'white', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            padding: '36px 40px 32px',
          }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: S, margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Empieza tu prueba gratuita
              </h1>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['10 días gratis', 'Sin tarjeta de crédito', 'Cancela cuando quieras'].map((t, i) => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5A5852' }}>
                    {i > 0 && <span style={{ color: '#D0CEC9' }}>·</span>}
                    <span style={{ color: i === 0 ? C : '#5A5852', fontWeight: i === 0 ? 700 : 400 }}>{t}</span>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LBL}>Nombre del negocio *</label>
                <input style={INP} placeholder="ej. Miami Car Detailing"
                  value={form.businessName} onChange={e => update('businessName', e.target.value)} />
              </div>
              <div>
                <label style={LBL}>País *</label>
                <select style={{ ...INP, cursor: 'pointer' }} value={form.country}
                  onChange={e => update('country', e.target.value)}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LBL}>Email *</label>
                <input style={INP} type="email" placeholder="admin@tunegocio.com"
                  value={form.email} onChange={e => update('email', e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Contraseña *</label>
                <input style={INP} type="password" placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={e => update('password', e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Confirmar contraseña *</label>
                <input style={INP} type="password" placeholder="Repite tu contraseña"
                  value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#dc2626', fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <button onClick={handleRegister} disabled={loading} style={{
                width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                background: loading ? `${A}88` : A,
                color: '#0B1A2A', fontSize: 15, fontWeight: 800,
                fontFamily: 'inherit', cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 16px rgba(245,181,68,0.35)`,
                marginTop: 4, letterSpacing: '-0.2px',
                transition: 'opacity 0.15s',
              }}>
                {loading ? 'Creando tu cuenta…' : 'Comenzar prueba gratuita →'}
              </button>
            </div>

            <div style={{ height: 1, background: '#F0EFEA', margin: '20px 0' }} />

            <div style={{ textAlign: 'center', fontSize: 13, color: '#A8A6A0' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" style={{ color: C, textDecoration: 'none', fontWeight: 700 }}>
                Iniciar sesión
              </Link>
            </div>
          </div>

        ) : (
          /* ── Step 2: Email enviado ── */
          <div style={{
            background: 'white', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            padding: '48px 40px', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: `rgba(61,217,214,0.12)`, border: `1.5px solid rgba(61,217,214,0.35)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              📧
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: S, margin: '0 0 10px', letterSpacing: '-0.4px' }}>
              Revisa tu email
            </h2>
            <p style={{ fontSize: 14, color: '#5A5852', lineHeight: 1.7, margin: '0 0 24px' }}>
              Te enviamos un enlace de confirmación a<br/>
              <strong style={{ color: S }}>{form.email}</strong>
            </p>
            <div style={{
              padding: '16px 20px',
              background: `rgba(61,217,214,0.07)`,
              border: `1px solid rgba(61,217,214,0.25)`,
              borderRadius: 12, fontSize: 13, color: '#5A5852', lineHeight: 1.7, marginBottom: 20,
            }}>
              Haz clic en el enlace para activar tu cuenta y comenzar tu prueba gratuita de{' '}
              <strong style={{ color: '#0B7B78' }}>10 días</strong>.
            </div>
            <p style={{ fontSize: 12, color: '#B0AEA8', margin: 0 }}>
              ¿No llegó el email? Revisa tu carpeta de spam.
            </p>
          </div>
        )}

        {/* Trust strip */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          {['✓ 10 días gratis', '✓ Sin tarjeta', '✓ Soporte incluido'].map(item => (
            <span key={item} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
