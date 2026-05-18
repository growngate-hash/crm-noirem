'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

type Status = 'loading' | 'set-password' | 'success' | 'error'

export default function AcceptInvitePage() {
  const [status, setStatus]     = useState<Status>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [fieldErr, setFieldErr] = useState('')
  const [saving, setSaving]     = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      // createBrowserClient (@supabase/ssr) automatically exchanges the
      // #access_token / ?code from the invite URL and creates a session.
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setErrorMsg('El link de invitación es inválido o ha expirado.')
        setStatus('error')
        return
      }
      setStatus('set-password')
    }
    init()
  }, [])

  async function handleSetPassword() {
    setFieldErr('')
    if (password.length < 8) {
      setFieldErr('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setFieldErr('Las contraseñas no coinciden')
      return
    }
    setSaving(true)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setSaving(false)
      setFieldErr(error.message)
      return
    }
    setStatus('success')
    setTimeout(() => router.push('/'), 2200)
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '10px 14px', paddingRight: 40,
    fontSize: 13, color: '#f0ede8', fontFamily: 'Outfit, sans-serif', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d0f',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#141416', border: '1px solid rgba(201,168,76,0.2)',
        borderRadius: 16, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, background: '#c9a84c', borderRadius: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#0d0d0f', fontSize: 24, marginBottom: 14,
          }}>S</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f0ede8', letterSpacing: '0.1em' }}>SAFFI</div>
          <div style={{ fontSize: 10, color: '#888580', letterSpacing: '0.15em', marginTop: 4 }}>LUXURY DETAILING</div>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }} />

        {/* ── Loading ── */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>
              Verificando invitación…
            </div>
            <div style={{ fontSize: 12, color: '#888580', marginBottom: 24 }}>Por favor espera un momento</div>
            <div style={{
              width: 32, height: 32, margin: '0 auto',
              border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#c9a84c',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {/* ── Set password ── */}
        {status === 'set-password' && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8', marginBottom: 6 }}>
              Crea tu contraseña
            </div>
            <div style={{ fontSize: 12, color: '#888580', marginBottom: 24 }}>
              Tu invitación está confirmada. Elige una contraseña para acceder al CRM.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErr('') }}
                    onFocus={e => (e.target.style.borderColor = '#c9a84c')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    style={inp}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888580', display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Confirmar contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCf ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setFieldErr('') }}
                    onFocus={e => (e.target.style.borderColor = '#c9a84c')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    style={inp}
                  />
                  <button type="button" onClick={() => setShowCf(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888580', display: 'flex', padding: 0 }}>
                    {showCf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Field error */}
              {fieldErr && (
                <div style={{ fontSize: 12, color: '#ff4f4f', background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                  {fieldErr}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSetPassword}
                disabled={saving || !password || !confirm}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
                  background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 800,
                  fontFamily: 'Outfit, sans-serif', letterSpacing: '0.02em',
                  cursor: (saving || !password || !confirm) ? 'default' : 'pointer',
                  opacity: (saving || !password || !confirm) ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                }}
              >
                {saving ? (
                  <>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#0d0d0f', animation: 'spin 0.7s linear infinite' }} />
                    Guardando…
                  </>
                ) : 'Activar cuenta'}
              </button>
            </div>
          </>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>
              ¡Cuenta activada!
            </div>
            <div style={{ fontSize: 13, color: '#888580' }}>
              Redirigiendo al panel…
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ width: 32, height: 32, margin: '0 auto', border: '3px solid rgba(201,168,76,0.2)', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8', marginBottom: 8 }}>
              Link inválido
            </div>
            <div style={{ fontSize: 13, color: '#888580', marginBottom: 28, lineHeight: 1.5 }}>
              {errorMsg}
            </div>
            <button
              onClick={() => router.push('/auth')}
              style={{
                padding: '12px 28px', background: '#c9a84c', color: '#0d0d0f',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', letterSpacing: '0.8px', fontFamily: 'Outfit, sans-serif',
              }}
            >
              IR AL LOGIN
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: '#3a3836', textAlign: 'center' }}>
        © 2026 Saffi · Luxury Car Care
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
