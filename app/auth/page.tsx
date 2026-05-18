'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

let _tid = 0

export default function AuthPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ id: number; msg: string; type: 'success' | 'error' } | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [emailErr, setEmailErr] = useState(false)
  const [pwErr, setPwErr] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (session) router.replace('/')
      } catch {
        // ignore — always show the form
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [router])

  function showToast(msg: string, type: 'success' | 'error') {
    const id = ++_tid
    setToast({ id, msg, type })
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3500)
  }

  async function handleLogin() {
    setEmailErr(false); setPwErr(false)
    if (!email) { setEmailErr(true); showToast('Ingresa tu correo electrónico', 'error'); return }
    if (!password) { setPwErr(true); showToast('Ingresa tu contraseña', 'error'); return }
    setLoading(true)
    const { data, error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setLoading(false)
      showToast('Correo o contraseña incorrectos', 'error')
      return
    }
    if (data.session) {
      router.push('/')
      router.refresh()
    }
  }

  async function handleReset() {
    if (!email) { setEmailErr(true); showToast('Ingresa tu correo para recuperar tu contraseña', 'error'); return }
    setLoading(true)
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { showToast('Error al enviar el correo. Intenta de nuevo', 'error'); return }
    setResetSent(true)
    showToast('Revisa tu correo para resetear tu contraseña', 'success')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleReset()
  }

  if (checking) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0f', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0d0d0f', fontSize: 14 }}>N</div>
      <span style={{ color: '#888580', fontSize: 13 }}>Cargando...</span>
    </div>
  )

  const inp = (err: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    background: '#1a1a1e',
    border: `1px solid ${err ? '#ff4f4f' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#f0ede8',
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#141416', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 16, padding: 40 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 0 }}>
          <div style={{ width: 48, height: 48, background: '#c9a84c', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0d0d0f', fontSize: 24, marginBottom: 14 }}>S</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f0ede8', letterSpacing: '0.1em' }}>SAFFI</div>
          <div style={{ fontSize: 10, color: '#888580', letterSpacing: '0.15em', marginTop: 4 }}>LUXURY DETAILING</div>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }}/>

        {mode === 'login' ? (
          /* ── Login form ── */
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Correo Electrónico</label>
                <input
                  type="email" placeholder="ahmed@noirem.ae"
                  value={email} onChange={e => { setEmail(e.target.value); setEmailErr(false) }}
                  onKeyDown={handleKeyDown}
                  style={inp(emailErr)}
                  onFocus={e => (e.target.style.borderColor = '#c9a84c')}
                  onBlur={e => (e.target.style.borderColor = emailErr ? '#ff4f4f' : 'rgba(255,255,255,0.08)')}
                />
                {emailErr && <div style={{ fontSize: 11, color: '#ff4f4f', marginTop: 4 }}>Campo requerido</div>}
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contraseña</label>
                  <button onClick={() => setMode('reset')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a84c', fontSize: 12, fontFamily: 'Outfit, sans-serif', padding: 0 }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    value={password} onChange={e => { setPassword(e.target.value); setPwErr(false) }}
                    onKeyDown={handleKeyDown}
                    style={{ ...inp(pwErr), paddingRight: 40 }}
                    onFocus={e => (e.target.style.borderColor = '#c9a84c')}
                    onBlur={e => (e.target.style.borderColor = pwErr ? '#ff4f4f' : 'rgba(255,255,255,0.08)')}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888580', display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                {pwErr && <div style={{ fontSize: 11, color: '#ff4f4f', marginTop: 4 }}>Campo requerido</div>}
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div onClick={() => setRemember(!remember)}
                  style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: remember ? '#c9a84c' : '#1a1a1e',
                    border: `1px solid ${remember ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`,
                    transition: 'all 0.15s' }}>
                  {remember && <span style={{ fontSize: 10, color: '#0d0d0f', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: '#888580', cursor: 'pointer' }} onClick={() => setRemember(!remember)}>Recordarme</span>
              </div>

              {/* Submit */}
              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
                  background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 800,
                  fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em',
                  opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? (
                  <>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#0d0d0f', animation: 'spin 0.7s linear infinite' }}/>
                    Iniciando sesión...
                  </>
                ) : 'Iniciar Sesión'}
              </button>
            </div>
          </>
        ) : (
          /* ── Reset password form ── */
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8', marginBottom: 6 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 12, color: '#888580', marginBottom: 20 }}>
              {resetSent
                ? 'Revisa tu correo. Te enviamos un enlace para restablecer tu contraseña.'
                : 'Ingresa tu correo y te enviaremos un enlace de recuperación.'}
            </div>

            {!resetSent && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Correo Electrónico</label>
                  <input
                    type="email" placeholder="ahmed@noirem.ae"
                    value={email} onChange={e => { setEmail(e.target.value); setEmailErr(false) }}
                    onKeyDown={handleKeyDown}
                    style={inp(emailErr)}
                    onFocus={e => (e.target.style.borderColor = '#c9a84c')}
                    onBlur={e => (e.target.style.borderColor = emailErr ? '#ff4f4f' : 'rgba(255,255,255,0.08)')}
                  />
                </div>
                <button onClick={handleReset} disabled={loading}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
                    background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 800,
                    fontFamily: 'Outfit, sans-serif', opacity: loading ? 0.75 : 1 }}>
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </div>
            )}

            <button onClick={() => { setMode('login'); setResetSent(false); setEmailErr(false) }}
              style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#888580', fontSize: 12, fontFamily: 'Outfit, sans-serif', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver al login
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, fontSize: 11, color: '#3a3836', textAlign: 'center' }}>
        © 2026 Saffi · Luxury Car Care
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, padding: '12px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: '#fff',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(255,79,79,0.95)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #3a3836; }
      `}</style>
    </div>
  )
}
