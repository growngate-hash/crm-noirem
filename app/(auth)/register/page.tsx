'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/countries'

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

      // 1. Crear usuario — pasar metadata del negocio para usarla al confirmar
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

      // 2. Configurar tenant via API con el userId (funciona con service role)
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

      // 3. Mostrar pantalla de éxito — pedirle al usuario que confirme su email
      setStep(2)

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

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.1em' }}>SAFFI</div>
          <div style={{ fontSize: 12, color: '#888580', marginTop: 4 }}>Car Wash & Detailing ERP</div>
        </div>

        {step === 1 ? (
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 4 }}>
                Empieza tu prueba gratuita
              </div>
              <div style={{ fontSize: 13, color: '#888580' }}>
                10 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
              </div>
            </div>
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
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#888580' }}>
              ¿Ya tienes cuenta?{' '}
              <a href="/login" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 600 }}>
                Iniciar sesión
              </a>
            </div>
          </div>
        ) : (
          /* ── Step 2: Email enviado ── */
          <div style={{ background: '#141416', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>
              Revisa tu email
            </div>
            <div style={{ fontSize: 14, color: '#888580', lineHeight: 1.7, marginBottom: 24 }}>
              Te enviamos un enlace de confirmación a<br/>
              <strong style={{ color: '#f0ede8' }}>{form.email}</strong>
            </div>
            <div style={{ padding: '16px 20px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 10, fontSize: 13, color: '#888580', lineHeight: 1.7, marginBottom: 24 }}>
              Haz clic en el enlace del email para activar tu cuenta y comenzar tu prueba gratuita de <strong style={{ color: '#34d399' }}>10 días</strong>.
            </div>
            <div style={{ fontSize: 12, color: '#3a3836' }}>
              ¿No llegó el email? Revisa tu carpeta de spam.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 20 }}>
          {['✓ 10 días gratis', '✓ Sin tarjeta', '✓ Soporte incluido'].map(item => (
            <span key={item} style={{ fontSize: 11, color: '#888580' }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}