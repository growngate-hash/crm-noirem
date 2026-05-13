'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = isRegister
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.replace('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{
            width: 44, height: 44, background: 'var(--gold)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, color: '#000', fontSize: 22,
          }}>N</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.1em' }}>NOIREM</div>
            <div style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: '0.06em' }}>DUBAI · LUXURY DETAILING</div>
          </div>
        </div>

        <div className="glass" style={{ padding: 28, borderRadius: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {isRegister ? 'Create Account' : 'Sign In'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 24 }}>
            {isRegister ? 'Set up your Noirem CRM account' : 'Access your Noirem CRM dashboard'}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Email</label>
              <input className="inp" type="email" placeholder="you@noirem.ae" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="inp" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ fontSize: 11, color: 'var(--red)', background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <button className="btn btn-gold" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, height: 42, fontSize: 13 }}>
              {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
            {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
