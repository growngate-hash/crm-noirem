'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CalendarCheck, Users, DollarSign, BarChart2,
  Package, Shield, CheckCircle2, ArrowRight, Globe,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useLandingLang } from './LandingLangContext'

const S  = '#0B2A4A'
const C  = '#3DD9D6'
const A  = '#F5B544'
const CR = '#FAFAF7'

const FEATURE_ICONS = [CalendarCheck, Users, DollarSign, Package, BarChart2, Shield]
const FEATURE_COLORS = [C, A, '#22c55e', '#818cf8', C, A]
const FEATURE_BGS    = [
  'rgba(61,217,214,0.10)', 'rgba(245,181,68,0.12)', 'rgba(34,197,94,0.10)',
  'rgba(129,140,248,0.12)', 'rgba(61,217,214,0.10)', 'rgba(245,181,68,0.12)',
]

export default function LandingContent() {
  const { t } = useLandingLang()

  const features = [
    { t: t.f1t, d: t.f1d }, { t: t.f2t, d: t.f2d },
    { t: t.f3t, d: t.f3d }, { t: t.f4t, d: t.f4d },
    { t: t.f5t, d: t.f5d }, { t: t.f6t, d: t.f6d },
  ]
  const steps = [
    { n: '01', t: t.s1t, d: t.s1d },
    { n: '02', t: t.s2t, d: t.s2d },
    { n: '03', t: t.s3t, d: t.s3d },
  ]
  const stats = [
    { v: t.stat1v, l: t.stat1l }, { v: t.stat2v, l: t.stat2l },
    { v: t.stat3v, l: t.stat3l }, { v: t.stat4v, l: t.stat4l },
  ]
  const PLANS = [
    {
      name: 'Starter', price: '$49', period: t.perMonth, sub: t.planStarterSub,
      highlight: false,
      features: t.planStarterFeatures, notIncluded: t.planStarterNot,
      cta: t.planStarterCta, ctaHref: '/register?plan=starter',
    },
    {
      name: 'Pro', price: '$99', period: t.perMonth, sub: t.planProSub,
      highlight: true,
      features: t.planProFeatures, notIncluded: t.planProNot,
      cta: t.planProCta, ctaHref: '/register?plan=pro',
    },
    {
      name: 'Enterprise', price: '$199', period: t.perMonth, sub: t.planEntSub,
      highlight: false,
      features: t.planEntFeatures, notIncluded: t.planEntNot,
      cta: t.planEntCta, ctaHref: '/register?plan=enterprise',
    },
  ]

  const [activeTestim, setActiveTestim] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setActiveTestim(i => (i + 1) % 4), 5000)
    return () => clearInterval(timer)
  }, [])
  const TESTIMS = [
    { q: t.testimQuote1, n: t.testimName1, b: t.testimBiz1, c: t.testimCity1, initials: 'CM', grad: `linear-gradient(135deg,${S},#1a4a7a)` },
    { q: t.testimQuote2, n: t.testimName2, b: t.testimBiz2, c: t.testimCity2, initials: 'MR', grad: `linear-gradient(135deg,${C},#2BB8B5)` },
    { q: t.testimQuote3, n: t.testimName3, b: t.testimBiz3, c: t.testimCity3, initials: 'AP', grad: `linear-gradient(135deg,${A},#D4952A)` },
    { q: t.testimQuote4, n: t.testimName4, b: t.testimBiz4, c: t.testimCity4, initials: 'DA', grad: 'linear-gradient(135deg,#818cf8,#6366f1)' },
  ]

  return (
    <div style={{ fontFamily: 'var(--font-geist), Geist, -apple-system, sans-serif', color: S, background: 'white' }}>

      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section style={{
        background: `linear-gradient(160deg, ${S} 0%, #0d3660 55%, #0a2240 100%)`,
        paddingTop: 120, paddingBottom: 96,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(61,217,214,0.12) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-120, left:-60, width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(245,181,68,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', position:'relative' }}>
          {/* Badge */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(61,217,214,0.12)', border:'1px solid rgba(61,217,214,0.3)', borderRadius:99, padding:'6px 16px', fontSize:13, fontWeight:600, color:C }}>
              <span style={{ fontSize:11 }}>✦</span>
              {t.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(36px, 6vw, 68px)', fontWeight:900, lineHeight:1.08, textAlign:'center', color:'white', letterSpacing:'-1.5px', margin:'0 auto 20px', maxWidth:900 }}>
            {t.heroLine1}{' '}
            <span style={{ background:`linear-gradient(90deg, ${C}, #5FE8E5)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {t.heroAccent}
            </span>
            {t.heroLine2 ? ` ${t.heroLine2}` : ''}
          </h1>

          {/* Subheadline */}
          <p style={{ fontSize:'clamp(16px, 2vw, 20px)', lineHeight:1.6, color:'rgba(255,255,255,0.72)', textAlign:'center', maxWidth:640, margin:'0 auto 40px' }}>
            {t.heroSub}
          </p>

          {/* CTAs */}
          <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap', marginBottom:56 }}>
            <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, background:A, color:'#0B1A2A', fontWeight:800, fontSize:16, padding:'14px 32px', borderRadius:10, textDecoration:'none', boxShadow:'0 4px 20px rgba(245,181,68,0.40)', letterSpacing:'-0.2px' }}>
              {t.heroCta1} <ArrowRight size={16} />
            </Link>
            <a href="#how" style={{ display:'inline-flex', alignItems:'center', gap:8, border:'1.5px solid rgba(255,255,255,0.3)', color:'white', fontWeight:600, fontSize:16, padding:'14px 28px', borderRadius:10, textDecoration:'none', background:'rgba(255,255,255,0.06)' }}>
              {t.heroCta2}
            </a>
          </div>

          {/* Dashboard mockup */}
          <div style={{ maxWidth:900, margin:'0 auto', background:'rgba(255,255,255,0.04)', borderRadius:16, border:'1px solid rgba(255,255,255,0.10)', padding:20, boxShadow:'0 32px 80px rgba(0,0,0,0.40)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, padding:'10px 14px', background:'rgba(255,255,255,0.06)', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display:'flex', gap:6 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />)}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>{t.mockupUrl}</div>
              <div style={{ width:60 }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
              {[
                { label:'Revenue MTD', value:'AED 84,200', color:C, delta:'+12.4%' },
                { label:'Active bookings', value:'23', color:A, delta:'↑ active' },
                { label:'Avg ticket', value:'AED 3,660', color:'#818cf8', delta:'+5.1%' },
                { label:'Low stock', value:'2 alerts', color:'#22c55e', delta:'← ok' },
              ].map(kpi => (
                <div key={kpi.label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, border:'1px solid rgba(255,255,255,0.08)', padding:'12px 14px' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{kpi.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:kpi.color, marginBottom:4 }}>{kpi.value}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{kpi.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:10 }}>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)', padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, marginBottom:12 }}>📊 Sales last 6 months</div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:70 }}>
                  {[45,62,38,80,54,90].map((h,i) => (
                    <div key={i} style={{ flex:1, borderRadius:'4px 4px 0 0', background: i===5 ? `linear-gradient(180deg,${C} 0%,rgba(61,217,214,0.6) 100%)` : 'rgba(255,255,255,0.15)', height:`${h}%` }} />
                  ))}
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.07)', padding:'14px 16px' }}>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, marginBottom:10 }}>{t.mockupBookings}</div>
                {[
                  { name:'Ahmed Al Maktoum', service:'Full Detailing', status:C },
                  { name:'Carlos Ortega',    service:'Oil change',    status:A },
                  { name:'Sara Johnson',     service:'PPF Premium',   status:'#818cf8' },
                ].map(row => (
                  <div key={row.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{row.name}</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>{row.service}</div>
                    </div>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:row.status, flexShrink:0 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p style={{ textAlign:'center', marginTop:28, fontSize:13, color:'rgba(255,255,255,0.45)', fontWeight:500 }}>
            {t.heroTrust}
          </p>
        </div>
      </section>

      {/* ═══ STATS ═════════════════════════════════════════════════════════ */}
      <section style={{ background:'white', borderBottom:'1px solid #F0EFEA', padding:'48px 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:24, textAlign:'center' }}>
          {stats.map(s => (
            <div key={s.v + s.l}>
              <div style={{ fontSize:'clamp(28px, 4vw, 40px)', fontWeight:900, color:S, letterSpacing:'-1px' }}>{s.v}</div>
              <div style={{ fontSize:14, color:'#5A5852', marginTop:4, fontWeight:500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ══════════════════════════════════════════════════════ */}
      <section id="features" style={{ background:CR, padding:'96px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <span style={{ display:'inline-block', fontSize:12, fontWeight:700, color:C, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>{t.featLabel}</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:S, letterSpacing:'-1px', margin:'0 0 16px' }}>
              {t.featTitle}{' '}<span style={{ color:C }}>{t.featAccent}</span>
            </h2>
            <p style={{ fontSize:18, color:'#5A5852', maxWidth:580, margin:'0 auto', lineHeight:1.6 }}>{t.featSub}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }} className="feature-grid">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i]
              return (
                <div key={f.t} className="feature-card" style={{ background:'white', borderRadius:16, border:'1px solid #F0EFEA', padding:'28px 28px 32px', transition:'box-shadow 0.2s, transform 0.2s' }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:FEATURE_BGS[i], display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                    <Icon size={22} color={FEATURE_COLORS[i]} strokeWidth={1.75} />
                  </div>
                  <h3 style={{ fontSize:17, fontWeight:800, color:S, margin:'0 0 10px', letterSpacing:'-0.3px' }}>{f.t}</h3>
                  <p style={{ fontSize:14, color:'#5A5852', lineHeight:1.65, margin:0 }}>{f.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section id="how" style={{ background:'white', padding:'96px 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <span style={{ display:'inline-block', fontSize:12, fontWeight:700, color:A, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>{t.howLabel}</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:S, letterSpacing:'-1px', margin:'0 0 16px' }}>{t.howTitle}</h2>
            <p style={{ fontSize:18, color:'#5A5852', maxWidth:520, margin:'0 auto', lineHeight:1.6 }}>{t.howSub}</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:32, position:'relative' }} className="steps-grid">
            <div style={{ position:'absolute', top:32, left:'16.66%', right:'16.66%', height:1, background:`linear-gradient(90deg,${C},${A})`, opacity:0.3, pointerEvents:'none' }} />
            {steps.map((s, i) => (
              <div key={s.n} style={{ textAlign:'center', padding:'0 12px' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 20px', background: i===1 ? `linear-gradient(135deg,${C},#2BB8B5)` : i===2 ? `linear-gradient(135deg,${A},#D4952A)` : `linear-gradient(135deg,${S},#1a4a7a)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(11,42,74,0.15)', position:'relative', zIndex:1 }}>
                  <span style={{ fontSize:18, fontWeight:900, color:'white' }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize:18, fontWeight:800, color:S, margin:'0 0 10px', letterSpacing:'-0.3px' }}>{s.t}</h3>
                <p style={{ fontSize:14, color:'#5A5852', lineHeight:1.65, margin:0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ══════════════════════════════════════════════════ */}
      <section id="testimonials" style={{ background: CR, padding: '96px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: S, letterSpacing: '-1px', margin: '0 0 16px' }}>{t.testimTitle}</h2>
            <p style={{ fontSize: 18, color: '#5A5852', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>{t.testimSub}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" className="testim-nav-btn" onClick={() => setActiveTestim(i => (i - 1 + TESTIMS.length) % TESTIMS.length)} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'white', border: '1px solid #F0EFEA', boxShadow: '0 2px 12px rgba(11,42,74,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={20} color={S} strokeWidth={2} />
            </button>

            <div style={{ flex: 1, overflow: 'hidden', borderRadius: 20, border: '1px solid #F0EFEA', boxShadow: '0 4px 24px rgba(11,42,74,0.06)' }}>
              <div style={{ display: 'flex', transform: `translateX(-${activeTestim * 100}%)`, transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', willChange: 'transform' }}>
                {TESTIMS.map(tm => (
                  <div key={tm.n} className="testim-card" style={{ minWidth: '100%', background: 'white', padding: '52px 56px', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 64, lineHeight: 0.8, color: C, fontFamily: 'Georgia,serif', marginBottom: 24, opacity: 0.6 }}>❝</div>
                    <p style={{ fontSize: 19, color: '#3A3830', lineHeight: 1.7, margin: '0 0 28px', fontStyle: 'italic' }}>{tm.q}</p>
                    <div style={{ fontSize: 16, color: A, marginBottom: 20, letterSpacing: 3 }}>★★★★★</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: tm.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '0.03em' }}>{tm.initials}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: S }}>{tm.n}</div>
                        <div style={{ fontSize: 13, color: '#5A5852' }}>{tm.b} · {tm.c}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" className="testim-nav-btn" onClick={() => setActiveTestim(i => (i + 1) % TESTIMS.length)} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: 'white', border: '1px solid #F0EFEA', boxShadow: '0 2px 12px rgba(11,42,74,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={20} color={S} strokeWidth={2} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            {TESTIMS.map((_, i) => (
              <button key={i} type="button" onClick={() => setActiveTestim(i)} style={{ width: i === activeTestim ? 24 : 8, height: 8, borderRadius: 4, background: i === activeTestim ? C : '#D0CEC9', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background:CR, padding:'96px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:64 }}>
            <span style={{ display:'inline-block', fontSize:12, fontWeight:700, color:C, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:12 }}>{t.priceLabel}</span>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:S, letterSpacing:'-1px', margin:'0 0 16px' }}>
              {t.priceTitle}{' '}<span style={{ color:C }}>{t.priceAccent}</span>
            </h2>
            <p style={{ fontSize:18, color:'#5A5852', maxWidth:480, margin:'0 auto', lineHeight:1.6 }}>{t.priceSub}</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, alignItems:'start' }} className="pricing-grid">
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: plan.highlight ? S : 'white', borderRadius:20, border: plan.highlight ? 'none' : '1px solid #F0EFEA', padding: plan.highlight ? '36px 32px 32px' : '32px 28px 28px', boxShadow: plan.highlight ? `0 16px 48px rgba(11,42,74,0.25)` : '0 2px 8px rgba(11,42,74,0.04)', position:'relative', overflow:'hidden' }}>
                {plan.highlight && (
                  <>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${C},${A})` }} />
                    <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:'rgba(61,217,214,0.06)', pointerEvents:'none' }} />
                    <div style={{ display:'inline-block', fontSize:11, fontWeight:700, background:'rgba(245,181,68,0.15)', color:A, border:`1px solid rgba(245,181,68,0.3)`, borderRadius:99, padding:'4px 12px', marginBottom:14 }}>
                      {t.popular}
                    </div>
                  </>
                )}
                <div style={{ fontSize:15, fontWeight:700, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#5A5852', marginBottom:8 }}>{plan.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                  <span style={{ fontSize:'clamp(28px,3vw,40px)', fontWeight:900, color: plan.highlight ? 'white' : S, letterSpacing:'-1px' }}>{plan.price}</span>
                  <span style={{ fontSize:15, color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#A8A6A0', fontWeight:500 }}>{plan.period}</span>
                </div>
                <div style={{ fontSize:13, color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#A8A6A0', marginBottom:20 }}>{plan.sub}</div>

                <Link href={plan.ctaHref} style={{ display:'block', textAlign:'center', padding:'12px 0', borderRadius:10, fontSize:15, fontWeight:700, textDecoration:'none', marginBottom:24, background: plan.highlight ? A : 'transparent', color: plan.highlight ? '#0B1A2A' : S, border: plan.highlight ? 'none' : `1.5px solid ${S}`, boxShadow: plan.highlight ? `0 4px 16px rgba(245,181,68,0.3)` : 'none' }}>
                  {plan.cta}
                </Link>

                <div style={{ height:1, background: plan.highlight ? 'rgba(255,255,255,0.1)' : '#F0EFEA', marginBottom:20 }} />

                <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <CheckCircle2 size={15} color={plan.highlight ? C : '#22c55e'} strokeWidth={2} style={{ flexShrink:0, marginTop:2 }} />
                      <span style={{ fontSize:13, color: plan.highlight ? 'rgba(255,255,255,0.82)' : '#5A5852', lineHeight:1.45 }}>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontSize:15, color: plan.highlight ? 'rgba(255,255,255,0.2)' : '#D0CEC9', flexShrink:0, lineHeight:1 }}>✗</span>
                      <span style={{ fontSize:13, color: plan.highlight ? 'rgba(255,255,255,0.3)' : '#B0AEA8', lineHeight:1.45 }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p style={{ textAlign:'center', marginTop:28, fontSize:14, color:'#A8A6A0' }}>
            {t.priceContact}{' '}
            <a href={`mailto:${t.footerEmail}`} style={{ color:C, fontWeight:600, textDecoration:'none' }}>{t.priceContactLink}</a>
            {' '}{t.priceContactSuffix}
          </p>
        </div>
      </section>

      {/* ═══ CTA BANNER ════════════════════════════════════════════════════ */}
      <section style={{ background:`linear-gradient(135deg,${S} 0%,#0d3660 100%)`, padding:'80px 24px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, left:'50%', transform:'translateX(-50%)', width:600, height:300, background:'radial-gradient(ellipse, rgba(61,217,214,0.15) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:680, margin:'0 auto', position:'relative' }}>
          <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', letterSpacing:'-1px', margin:'0 0 16px' }}>{t.ctaTitle}</h2>
          <p style={{ fontSize:18, color:'rgba(255,255,255,0.65)', marginBottom:36, lineHeight:1.6 }}>{t.ctaSub}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
            <Link href="/register" style={{ display:'inline-flex', alignItems:'center', gap:8, background:A, color:'#0B1A2A', fontWeight:800, fontSize:16, padding:'15px 36px', borderRadius:10, textDecoration:'none', boxShadow:'0 4px 24px rgba(245,181,68,0.40)' }}>
              {t.ctaBtn} <ArrowRight size={16} />
            </Link>
            <Link href="/login" style={{ display:'inline-flex', alignItems:'center', border:'1.5px solid rgba(255,255,255,0.35)', color:'white', fontWeight:600, fontSize:16, padding:'15px 28px', borderRadius:10, textDecoration:'none', background:'rgba(255,255,255,0.06)' }}>
              {t.ctaLogin}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer style={{ background:'#07192E', padding:'64px 24px 36px', color:'rgba(255,255,255,0.5)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:56 }} className="footer-grid">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <img src="/saffi-logo-light.svg" alt="SAFFI" style={{ width:24, height:29 }} />
                <span style={{ fontSize:20, fontWeight:800, color:'white', letterSpacing:'-0.5px' }}>saffi</span>
              </div>
              <p style={{ fontSize:14, lineHeight:1.7, maxWidth:280, margin:'0 0 20px' }}>{t.footerTagline}</p>
              <a href={`mailto:${t.footerEmail}`} style={{ fontSize:13, color:C, textDecoration:'none', fontWeight:600 }}>{t.footerEmail}</a>
            </div>
            {[
              { title: t.footerProduct, links: t.footerProdLinks,    hrefs: ['#features','#pricing','#','#'] },
              { title: t.footerCompany, links: t.footerCompanyLinks,  hrefs: ['/nosotros','#','#','#'] },
              { title: t.footerLegal,   links: t.footerLegalLinks,    hrefs: ['/privacidad','/terminos','/cookies','/seguridad'] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16, marginTop:0 }}>{col.title}</h4>
                <ul style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:10 }}>
                  {col.links.map((l, i) => (
                    <li key={l}>
                      <Link href={col.hrefs[i] ?? '#'} style={{ fontSize:14, color:'rgba(255,255,255,0.55)', textDecoration:'none' }}>{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <span style={{ fontSize:13 }}>{t.footerCopy}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Globe size={13} style={{ opacity:0.5 }} />
              <span style={{ fontSize:13 }}>{t.footerLang}</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .feature-card:hover { box-shadow: 0 8px 32px rgba(11,42,74,0.09) !important; transform: translateY(-2px) !important; }
        @media (max-width: 900px) {
          .feature-grid { grid-template-columns: repeat(2,1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 460px; margin-left: auto; margin-right: auto; }
          .footer-grid  { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .feature-grid    { grid-template-columns: 1fr !important; }
          .steps-grid      { grid-template-columns: 1fr !important; }
          .footer-grid     { grid-template-columns: 1fr !important; }
          .testim-nav-btn  { display: none !important; }
          .testim-card     { padding: 36px 28px !important; }
        }
        a:hover { opacity: 0.85; }
      `}</style>
    </div>
  )
}
