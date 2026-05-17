'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completa todos los campos')
      return
    }
    setError('')
    setLoading(true)

    const { data, error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setLoading(false)
      setError('Correo o contraseña incorrectos')
      return
    }

    if (data.session) {
      router.push('/')
      router.refresh()
    }
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#1a1a1e',
    border: `1px solid ${hasError ? '#ff4f4f' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', color: '#f0ede8', outline: 'none',
    fontFamily: "'Outfit', sans-serif",
  })

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d0f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', sans-serif", padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#141416', border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: '16px', padding: '40px',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', background: '#c9a84c',
            borderRadius: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
            fontSize: '22px', fontWeight: 800, color: '#0d0d0f',
          }}>S</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f0ede8', letterSpacing: '0.08em' }}>SAFFI</div>
          <div style={{ fontSize: '10px', color: '#888580', letterSpacing: '0.15em', marginTop: '4px' }}>LUXURY DETAILING</div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '28px' }}/>

        {!showReset ? (
          <>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0ede8', marginBottom: '20px' }}>Iniciar sesión</div>

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Correo electrónico</div>
              <input
                type="email" value={email} placeholder="ahmed@noirem.ae"
                onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown}
                style={inputStyle(!!error && !email)}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Contraseña</div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
                  style={{ ...inputStyle(!!error && !password), paddingRight: '40px' }}
                />
                <button onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888580', cursor: 'pointer', fontSize: '16px', padding: 0 }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(255,79,79,0.1)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff4f4f', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span onClick={() => { setShowReset(true); setError('') }}
                style={{ fontSize: '12px', color: '#c9a84c', cursor: 'pointer' }}>
                ¿Olvidaste tu contraseña?
              </span>
            </div>

            {/* Submit */}
            <button onClick={handleLogin} disabled={loading}
              style={{
                width: '100%', background: loading ? 'rgba(201,168,76,0.5)' : '#c9a84c',
                color: '#0d0d0f', border: 'none', borderRadius: '10px',
                padding: '14px', fontSize: '14px', fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'opacity 0.15s',
              }}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0ede8', marginBottom: '8px' }}>Recuperar contraseña</div>
            <div style={{ fontSize: '12px', color: '#888580', marginBottom: '20px' }}>Te enviaremos un enlace a tu correo</div>

            {!resetSent ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Correo electrónico</div>
                  <input type="email" value={email} placeholder="ahmed@noirem.ae"
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle(false)}/>
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,79,79,0.1)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff4f4f', marginBottom: '14px' }}>
                    {error}
                  </div>
                )}
                <button onClick={handleReset}
                  style={{ width: '100%', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px' }}>
                  Enviar enlace de recuperación
                </button>
              </>
            ) : (
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#34d399', textAlign: 'center', marginBottom: '16px' }}>
                ✓ Revisa tu correo para continuar
              </div>
            )}

            <span onClick={() => { setShowReset(false); setResetSent(false); setError('') }}
              style={{ fontSize: '12px', color: '#c9a84c', cursor: 'pointer', display: 'block', textAlign: 'center' }}>
              ← Volver al login
            </span>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '11px', color: '#3a3836' }}>© 2026 Saffi · Luxury Car Care</div>
      </div>
    </div>
  )
}
