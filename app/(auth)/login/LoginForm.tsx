'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0B0E11', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ position:'fixed', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,175,55,.06),transparent 70%)', pointerEvents:'none' }} />
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#D4AF37,#8B6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#0B0E11', margin:'0 auto 16px' }}>N</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#F0EDE8', letterSpacing:.8 }}>NOIREM CRM</div>
          <div style={{ fontSize:11, color:'#8A8A9A', letterSpacing:2, textTransform:'uppercase', marginTop:4 }}>Luxury Car Care · Dubai</div>
        </div>
        <div className="glass" style={{ padding:36, borderRadius:20 }}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>Welcome back</div>
          <div style={{ fontSize:12, color:'#8A8A9A', marginBottom:28 }}>Sign in to your CRM account</div>
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <div className="field-label">Email</div>
              <input className="inp" type="email" placeholder="admin@noirem.ae" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <div className="field-label">Password</div>
              <input className="inp" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div style={{ fontSize:12, color:'#EF4444', padding:'9px 12px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)' }}>{error}</div>}
            <button className="btn btng" type="submit" disabled={loading} style={{ padding:'13px 0', fontSize:13, borderRadius:10, width:'100%', marginTop:4, opacity:loading?.7:1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#8A8A9A' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color:'#D4AF37', textDecoration:'none', fontWeight:600 }}>Create one</Link>
          </div>
        </div>
        <div style={{ textAlign:'center', marginTop:24, fontSize:10, color:'#4A4A5A', letterSpacing:1, textTransform:'uppercase' }}>Secured by Supabase Auth</div>
      </div>
    </div>
  )
}
