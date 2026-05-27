'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const COUNTRIES = [
  { code: 'AE', name: 'United Arab Emirates', timezone: 'Asia/Dubai',    currency: 'AED' },
  { code: 'CO', name: 'Colombia',             timezone: 'America/Bogota', currency: 'COP' },
  { code: 'US', name: 'United States',        timezone: 'America/New_York', currency: 'USD' },
  { code: 'SA', name: 'Saudi Arabia',         timezone: 'Asia/Riyadh',   currency: 'SAR' },
  { code: 'MX', name: 'Mexico',               timezone: 'America/Mexico_City', currency: 'MXN' },
  { code: 'ES', name: 'Spain',                timezone: 'Europe/Madrid', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom',       timezone: 'Europe/London', currency: 'GBP' },
]

export default function RegisterPage() {
  const router = useRouter()
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

  const selectedCountry = COUNTRIES.find(c => c.code === form.country) ?? COUNTRIES[0]

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleRegister() {
    // Validaciones
    if (!form.businessName.trim()) { setError('El nombre del negocio es requerido'); return }
    if (!form.email.trim())        { setError('El email es requerido'); return }
    if (form.password.length < 8)  { setError('La contraseña debe tener mínimo 8 caracteres'); return }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            business_name: form.businessName.trim(),
            country: form.country,
          }
        }
      })

      if (authError) { setError(authError.message); setLoading(false); return }
      if (!authData.user) { setError('Error al crear la cuenta'); setLoading(false); return }

      const userId = authData.user.id
      const slug = form.businessName.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // 2. Crear tenant con trial de 10 días
      const { data: plan } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'Trial')
        .single()

      const { error: tenantError } = await supabase
        .from('tenants')
        .insert({
          owner_id:      userId,
          name:          form.businessName.trim(),
          slug:          slug,
          plan_id:       plan?.id ?? null,
          status:        'trial',
          trial_ends_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          country:       form.country,
          timezone:      selectedCountry.timezone,
          currency:      selectedCountry.currency,
        })

      if (tenantError) { setError('Error al configurar tu cuenta: ' + tenantError.message); setLoading(false); return }

      // 3. Crear business_settings con timezone y moneda del país
      await supabase.from('business_settings').insert({
        user_id:  userId,
        timezone: selectedCountry.timezone,
        currency: selectedCountry.currency,
      })

      // 4. Crear company_settings básicos
      await supabase.from('company_settings').insert([
        { user_id: userId, key: 'company_name',     value: form.businessName.trim() },
        { user_id: userId, key: 'company_subtitle', value: 'CAR WASH & DETAILING' },
      ])

      // 5. Crear user_permissions para el owner (Admin con acceso total)
      await supabase.from('user_permissions').upsert({
        user_id:     userId,
        role:        'admin',
        permissions: {
          dashboard: { view: true },
          contacts:  { view: true, create: true, edit: true, delete: true },
          services:  { view: true, create: true, edit: true, delete: true },
          vehicles:  { view: true, create: true, edit: true, delete: true },
          bookings:  { view: true, create: true, edit: true, delete: true },
          finance:   { view: true, create: true, edit: true, delete: true },
          reports:   { view: true },
          settings:  { view: true, create: true, edit: true, delete: true },
          _email:    form.email.trim(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Registro exitoso
      router.push('/')

    } catch (err: any) {
      setError('Error inesperado: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const INP: React.CSSProperties = {
    width: '100%', background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '12px 14px', color: '#f0ede8', fontSize: 14,
    fontFamily: 'Outfit,sans-serif', outline: 'none', boxSizing: 'border-box',
  }
  const LBL: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#888580', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Outfit,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.1em' }}>SAFFI</div>
          <div style={{ fontSize: 12, color: '#888580', marginTop: 4 }}>Car Wash & Detailing ERP</div>
        </div>

        {/* Card */}
        <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32 }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>
              Empieza tu prueba gratuita
            </div>
            <div style={{ fontSize: 13, color: '#888580' }}>
              10 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={LBL}>Nombre del negocio *</label>
              <input style={INP} placeholder="ej. Miami Car Detailing" value={form.businessName}
                onChange={e => update('businessName', e.target.value)} />
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
              <input style={INP} type="email" placeholder="admin@tunegocio.com" value={form.email}
                onChange={e => update('email', e.target.value)} />
            </div>

            <div>
              <label style={LBL}>Contraseña *</label>
              <input style={INP} type="password" placeholder="Mínimo 8 caracteres" value={form.password}
                onChange={e => update('password', e.target.value)} />
            </div>

            <div>
              <label style={LBL}>Confirmar contraseña *</label>
              <input style={INP} type="password" placeholder="Repite tu contraseña" value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)} />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', color: '#ff4f4f', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button onClick={handleRegister} disabled={loading}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 15, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Creando tu cuenta…' : 'Comenzar prueba gratuita →'}
            </button>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#888580' }}>
            ¿Ya tienes cuenta?{' '}
            <a href="/login" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}>
              Iniciar sesión
            </a>
          </div>
        </div>

        {/* Trial badge */}
        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 20 }}>
          {['✓ 10 días gratis', '✓ Sin tarjeta', '✓ Soporte incluido'].map(item => (
            <span key={item} style={{ fontSize: 11, color: '#888580' }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}