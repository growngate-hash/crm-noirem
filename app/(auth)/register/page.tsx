'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES } from '@/lib/countries'
import Link from 'next/link'
import { useAuthLang } from '@/components/landing/useAuthLang'

const S = '#0B2A4A'
const C = '#3DD9D6'
const A = '#F5B544'

export default function RegisterPage() {
  const { t } = useAuthLang()

  const [step,    setStep]    = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({
    businessName: '', country: 'US', email: '', password: '', confirmPassword: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleRegister() {
    if (!form.businessName.trim()) { setError(t.errBusiness); return }
    if (!form.email.trim())        { setError(t.errEmail);    return }
    if (form.password.length < 8)  { setError(t.errPwdMin);   return }
    if (form.password !== form.confirmPassword) { setError(t.errPwdMatch); return }

    setLoading(true); setError('')

    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { business_name: form.businessName.trim(), country: form.country, pending_setup: true }
        }
      })
      if (authError) { setError(authError.message); setLoading(false); return }
      if (!authData.user) { setError(t.errGeneral + 'no user'); setLoading(false); return }

      const setupRes = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id, businessName: form.businessName.trim(), country: form.country, email: form.email.trim() }),
      })
      if (!setupRes.ok) {
        const d = await setupRes.json().catch(() => ({ error: 'Error desconocido' }))
        setError(t.errSetup + d.error); setLoading(false); return
      }
      setStep(2)
    } catch (err: any) {
      setError(t.errGeneral + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#F4F6F8', border: '1.5px solid #E8EDF2',
    borderRadius: 10, padding: '12px 14px',
    fontSize: 14, color: S, outline: 'none',
    fontFamily: 'Geist, -apple-system, sans-serif',
    transition: 'border-color 0.15s',
  }
  const lbl: React.CSSProperties = {
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
      <div style={{ position:'absolute', top:-100, right:-100, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(61,217,214,0.10) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-120, left:-80, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,181,68,0.07) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <Link href="/" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:10 }}>
            <img src="/saffi-logo-light.svg" alt="SAFFI" style={{ width:24, height:29 }} />
            <span style={{ fontSize:22, fontWeight:900, color:'white', letterSpacing:'-0.5px' }}>saffi</span>
          </Link>
        </div>

        {step === 1 ? (
          <div style={{ background:'white', borderRadius:20, boxShadow:'0 24px 64px rgba(0,0,0,0.25)', padding:'36px 40px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom:28 }}>
              <h1 style={{ fontSize:22, fontWeight:900, color:S, margin:'0 0 10px', letterSpacing:'-0.4px' }}>
                {t.registerTitle}
              </h1>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                <span style={{ fontSize:12, color:C, fontWeight:700 }}>{t.trialBadge}</span>
                <span style={{ color:'#D0CEC9', fontSize:12 }}>·</span>
                <span style={{ fontSize:12, color:'#5A5852' }}>{t.noCard}</span>
                <span style={{ color:'#D0CEC9', fontSize:12 }}>·</span>
                <span style={{ fontSize:12, color:'#5A5852' }}>{t.cancelAnytime}</span>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={lbl}>{t.businessLabel}</label>
                <input style={inp} placeholder={t.businessHolder}
                  value={form.businessName} onChange={e => update('businessName', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>{t.countryLabel}</label>
                <select style={{ ...inp, cursor:'pointer' }} value={form.country}
                  onChange={e => update('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input style={inp} type="email" placeholder="admin@tunegocio.com"
                  value={form.email} onChange={e => update('email', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>{t.pwdLabel2}</label>
                <input style={inp} type="password" placeholder={t.pwdHolder}
                  value={form.password} onChange={e => update('password', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>{t.confirmLabel}</label>
                <input style={inp} type="password" placeholder={t.confirmHolder}
                  value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
              </div>

              {error && (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', color:'#dc2626', fontSize:13 }}>
                  {error}
                </div>
              )}

              <button onClick={handleRegister} disabled={loading} style={{
                width:'100%', padding:'14px 0', borderRadius:10, border:'none',
                background: loading ? `${A}88` : A, color:'#0B1A2A',
                fontSize:15, fontWeight:800, fontFamily:'inherit',
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : `0 4px 16px rgba(245,181,68,0.35)`,
                marginTop:4, letterSpacing:'-0.2px', transition:'opacity 0.15s',
              }}>
                {loading ? t.registerLoading : t.registerBtn}
              </button>
            </div>

            <div style={{ height:1, background:'#F0EFEA', margin:'20px 0' }} />
            <div style={{ textAlign:'center', fontSize:13, color:'#A8A6A0' }}>
              {t.alreadyHave}{' '}
              <Link href="/login" style={{ color:C, textDecoration:'none', fontWeight:700 }}>{t.loginLink}</Link>
            </div>
          </div>

        ) : (
          <div style={{ background:'white', borderRadius:20, boxShadow:'0 24px 64px rgba(0,0,0,0.25)', padding:'48px 40px', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 20px', background:'rgba(61,217,214,0.12)', border:'1.5px solid rgba(61,217,214,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
              📧
            </div>
            <h2 style={{ fontSize:22, fontWeight:900, color:S, margin:'0 0 10px', letterSpacing:'-0.4px' }}>
              {t.checkEmail}
            </h2>
            <p style={{ fontSize:14, color:'#5A5852', lineHeight:1.7, margin:'0 0 24px' }}>
              {t.sentTo}<br/>
              <strong style={{ color:S }}>{form.email}</strong>
            </p>
            <div style={{ padding:'16px 20px', background:'rgba(61,217,214,0.07)', border:'1px solid rgba(61,217,214,0.25)', borderRadius:12, fontSize:13, color:'#5A5852', lineHeight:1.7, marginBottom:20 }}>
              {t.activateText}{' '}
              <strong style={{ color:'#0B7B78' }}>{t.days}</strong>.
            </div>
            <p style={{ fontSize:12, color:'#B0AEA8', margin:0 }}>{t.spamNote}</p>
          </div>
        )}

        {/* Trust strip */}
        <div style={{ marginTop:20, display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
          {[t.trust1, t.trust2, t.trust3].map(item => (
            <span key={item} style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:500 }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
