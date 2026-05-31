'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const S  = '#0B2A4A'
const C  = '#3DD9D6'
const A  = '#F5B544'

export default function LoginPage() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showPwd,     setShowPwd]     = useState(false)
  const [error,       setError]       = useState('')
  const [showReset,   setShowReset]   = useState(false)
  const [resetSent,   setResetSent]   = useState(false)
  const [brandName,   setBrandName]   = useState('SAFFI')
  const [brandSub,    setBrandSub]    = useState('LUXURY DETAILING')
  const [brandLogo,   setBrandLogo]   = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    createClient()
      .from('company_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_subtitle', 'logo_url'])
      .then(({ data }) => {
        data?.forEach(row => {
          if (row.key === 'company_name'     && row.value) setBrandName(row.value.toUpperCase())
          if (row.key === 'company_subtitle' && row.value) setBrandSub(row.value.toUpperCase())
          if (row.key === 'logo_url'         && row.value) setBrandLogo(row.value)
        })
      })
  }, [])

  const handleLogin = async () => {
    if (!email || !password) { setError('Completa todos los campos'); return }
    setError('')
    setLoading(true)
    const { data, error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(), password,
    })
    if (authError) { setLoading(false); setError('Correo o contraseña incorrectos'); return }
    if (data.session) { router.push('/dashboard'); router.refresh() }
  }

  const handleReset = async () => {
    if (!email) { setError('Ingresa tu correo electrónico'); return }
    setError('')
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (!resetError) setResetSent(true)
    else setError('Error al enviar el correo. Intenta de nuevo.')
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogin() }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#F4F6F8',
    border: '1.5px solid #E8EDF2',
    borderRadius: 10, padding: '12px 14px',
    fontSize: 14, color: S, outline: 'none',
    fontFamily: 'Geist, -apple-system, sans-serif',
    transition: 'border-color 0.15s',
  }
  const inpErr: React.CSSProperties = { ...inp, border: '1.5px solid #ef4444', background: 'rgba(239,68,68,0.04)' }

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${S} 0%, #0d3660 55%, #0a2240 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Geist, -apple-system, sans-serif',
      padding: 20, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blobs — same as hero */}
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

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420, position: 'relative', zIndex: 1,
        background: 'white', borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        padding: '44px 40px 36px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
            background: brandLogo ? 'transparent' : `linear-gradient(135deg, ${S}, #1a4a7a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px rgba(11,42,74,0.20)`,
            overflow: 'hidden',
          }}>
            {brandLogo
              ? <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: C, fontWeight: 900, fontSize: 22, letterSpacing: '-1px' }}>{brandName.charAt(0)}</span>
            }
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: S, letterSpacing: '0.06em' }}>{brandName}</div>
          <div style={{ fontSize: 10, color: '#A8A6A0', letterSpacing: '0.18em', marginTop: 4 }}>{brandSub}</div>
        </div>

        <div style={{ height: 1, background: '#F0EFEA', marginBottom: 28 }} />

        {!showReset ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: S, marginBottom: 22, letterSpacing: '-0.3px' }}>
              Iniciar sesión
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                Correo electrónico
              </label>
              <input
                type="email" value={email} placeholder="hola@saffi.app"
                onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
                style={!!error && !email ? inpErr : inp}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Contraseña
                </label>
                <span onClick={() => { setShowReset(true); setError('') }}
                  style={{ fontSize: 12, color: C, cursor: 'pointer', fontWeight: 600 }}>
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
                  style={{ ...(!!error && !password ? inpErr : inp), paddingRight: 44 }}
                />
                <button onClick={() => setShowPwd(v => !v)} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#A8A6A0', cursor: 'pointer', padding: 0, fontSize: 16,
                }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Checkbox recordarme */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: error ? 14 : 22 }}>
              <input type="checkbox" id="remember" style={{ accentColor: S, width: 14, height: 14, cursor: 'pointer' }} />
              <label htmlFor="remember" style={{ fontSize: 13, color: '#5A5852', cursor: 'pointer' }}>Recordarme</label>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* CTA */}
            <button onClick={handleLogin} disabled={loading} style={{
              width: '100%', background: loading ? `${A}88` : A,
              color: '#0B1A2A', border: 'none', borderRadius: 10,
              padding: '14px', fontSize: 15, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'opacity 0.15s',
              boxShadow: loading ? 'none' : `0 4px 16px rgba(245,181,68,0.35)`,
              letterSpacing: '-0.2px',
            }}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#A8A6A0' }}>
              ¿No tienes cuenta?{' '}
              <Link href="/register" style={{ color: C, fontWeight: 700, textDecoration: 'none' }}>
                Empieza gratis
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: S, marginBottom: 6, letterSpacing: '-0.3px' }}>
              Recuperar contraseña
            </div>
            <div style={{ fontSize: 13, color: '#5A5852', marginBottom: 22, lineHeight: 1.5 }}>
              Te enviamos un enlace a tu correo para restablecer tu contraseña.
            </div>

            {!resetSent ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                    Correo electrónico
                  </label>
                  <input type="email" value={email} placeholder="hola@saffi.app"
                    onChange={e => setEmail(e.target.value)} style={inp} />
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 14 }}>
                    {error}
                  </div>
                )}
                <button onClick={handleReset} style={{
                  width: '100%', background: A, color: '#0B1A2A', border: 'none', borderRadius: 10,
                  padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'inherit', marginBottom: 14,
                  boxShadow: `0 4px 16px rgba(245,181,68,0.30)`,
                }}>
                  Enviar enlace de recuperación
                </button>
              </>
            ) : (
              <div style={{
                background: 'rgba(61,217,214,0.08)', border: `1px solid rgba(61,217,214,0.3)`,
                borderRadius: 10, padding: '16px', fontSize: 14, color: '#0B7B78',
                textAlign: 'center', marginBottom: 16, lineHeight: 1.5,
              }}>
                ✓ Revisa tu correo para continuar
              </div>
            )}

            <span onClick={() => { setShowReset(false); setResetSent(false); setError('') }}
              style={{ fontSize: 13, color: C, cursor: 'pointer', display: 'block', textAlign: 'center', fontWeight: 600 }}>
              ← Volver al login
            </span>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: '#C8C6C0' }}>
          © 2026 SAFFI · Luxury Car Care
        </div>
      </div>
    </div>
  )
}
