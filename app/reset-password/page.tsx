'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Extraer tokens directamente del hash de la URL
    // El link de Supabase tiene formato:
    // /reset-password#access_token=XXX&refresh_token=YYY&type=recovery
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || type !== 'recovery') {
      setStatus('error')
      setMessage('Link inválido o expirado. Solicita uno nuevo.')
      return
    }

    // Establecer la sesión del usuario invitado usando
    // los tokens del link — NO la sesión del admin
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    }).then(({ data, error }) => {
      if (error || !data.session) {
        setStatus('error')
        setMessage('Link expirado. Solicita un nuevo correo de reset.')
      } else {
        // Sesión del usuario correcto establecida
        setStatus('ready')
      }
    })
  }, [])

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden')
      setStatus('error')
      return
    }
    if (password.length < 6) {
      setMessage('Mínimo 6 caracteres')
      setStatus('error')
      return
    }

    setStatus('loading')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setMessage('Error al guardar. Solicita un nuevo link.')
    } else {
      setStatus('success')
      setMessage('¡Contraseña establecida correctamente!')
      // Cerrar sesión y redirigir al login
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#1a1a1f',
        border: '1px solid #2a2a30',
        borderRadius: '16px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        {/* Logo */}
        <div style={{
          width: '56px', height: '56px',
          background: '#c9a84c',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '24px', fontWeight: 900,
          color: '#0d0d0f'
        }}>N</div>

        {status === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Verificando link...
            </div>
            <div style={{
              width: '32px', height: '32px',
              border: '3px solid #2a2a30',
              borderTop: '3px solid #c9a84c',
              borderRadius: '50%',
              margin: '24px auto',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Link inválido
            </div>
            <div style={{ color: '#666', fontSize: '13px', marginBottom: '24px' }}>
              {message}
            </div>
            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%', padding: '13px',
                background: '#c9a84c', color: '#0d0d0f',
                border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              IR AL LOGIN
            </button>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              ¡Contraseña establecida!
            </div>
            <div style={{ color: '#666', fontSize: '13px' }}>
              Redirigiendo al login...
            </div>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
              Nueva contraseña
            </div>
            <div style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginBottom: '32px' }}>
              Ingresa tu nueva contraseña
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
                NUEVA CONTRASEÑA
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: '#0d0d0f',
                  border: '1px solid #2a2a30',
                  borderRadius: '8px',
                  color: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
                CONFIRMAR CONTRASEÑA
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: '#0d0d0f',
                  border: '1px solid #2a2a30',
                  borderRadius: '8px',
                  color: '#fff', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleReset}
              style={{
                width: '100%', padding: '14px',
                background: '#c9a84c', color: '#0d0d0f',
                border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', letterSpacing: '1px'
              }}
            >
              ESTABLECER CONTRASEÑA
            </button>
          </>
        )}
      </div>
    </div>
  )
}
