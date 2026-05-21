'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Brand tokens ───────────────────────────────────────────────────────────────
const GOLD   = '#D4AF37'
const BLUE   = '#3b4fd8'       // new date/time accent
const BG2    = '#111111'
const BG3    = '#1a1a1a'
const BG4    = '#222222'
const TEXT   = '#f5f5f5'
const TEXT2  = '#888888'
const BORDER = 'rgba(255,255,255,0.08)'
const RED    = '#ff4f4f'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  description: string
  color: string
}

interface Service {
  id: string
  name: string
  description: string
  base_price: number
  duration: string
  duration_hrs: string
  category: string
}

interface TimeSlot {
  start: number
  startLabel: string
  endLabel: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Helpers ────────────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatHour(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour % 1) * 60)
  const period  = h >= 12 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayH}:${m === 0 ? '00' : String(m).padStart(2,'0')} ${period}`
}

function getDays(weekOffset: number): Date[] {
  const days: Date[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + weekOffset * 7 + i)
    days.push(d)
  }
  return days
}

function getServiceDurationHours(svc: Service | null): number {
  if (!svc) return 1
  const raw = svc.duration || svc.duration_hrs || ''
  const num  = parseFloat(raw)
  if (!isNaN(num)) return num
  const match = raw.match(/(\d+(\.\d+)?)/)
  if (match) return parseFloat(match[1])
  return 1
}

function generateTimeSlots(svc: Service | null): TimeSlot[] {
  const dur   = getServiceDurationHours(svc)
  const slots: TimeSlot[] = []
  let hour = 9
  while (hour + dur <= 19) {
    slots.push({ start: hour, startLabel: formatHour(hour), endLabel: formatHour(hour + dur) })
    hour += 1
  }
  return slots
}

function slotToUTC(date: Date, hourStart: number): string {
  const ymd  = toYMD(date)
  const hStr = String(Math.floor(hourStart)).padStart(2,'0')
  const mStr = String(Math.round((hourStart % 1) * 60)).padStart(2,'0')
  return new Date(`${ymd}T${hStr}:${mStr}:00.000+04:00`).toISOString()
}

function utcToHour(iso: string): number {
  const d = new Date(iso)
  return ((d.getUTCHours() + 4) % 24) + d.getUTCMinutes() / 60
}

// ── Shared input style ─────────────────────────────────────────────────────────
const INP_BASE: React.CSSProperties = {
  width:'100%', background:BG3, border:`1px solid ${BORDER}`,
  borderRadius:8, padding:'11px 14px', color:TEXT,
  fontSize:14, fontFamily:'Outfit,sans-serif', outline:'none',
  boxSizing:'border-box', transition:'border-color 0.15s',
}

function Field({ label, value, onChange, placeholder, type='text' }: {
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string; type?:string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:TEXT2,
        letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>
        {label}
      </label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...INP_BASE, borderColor: focused ? `${GOLD}80` : BORDER }}
      />
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const labels = ['Category','Service','Date & Time','Details','Confirm']
  return (
    <div style={{ padding:'14px 20px', background:BG2, borderBottom:`1px solid ${BORDER}` }}>
      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        {[1,2,3,4,5].map(n => (
          <div key={n} style={{
            flex:1, height:3, borderRadius:2,
            background: n <= current ? GOLD : 'rgba(255,255,255,0.10)',
            transition:'background 0.3s',
          }}/>
        ))}
      </div>
      <div style={{ fontSize:11, color:TEXT2, fontWeight:600 }}>
        Step {current} of 5 —{' '}
        <span style={{ color:TEXT }}>{labels[current-1]}</span>
      </div>
    </div>
  )
}

// ── Back button ────────────────────────────────────────────────────────────────
function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background:'none', border:'none', cursor:'pointer',
      color:GOLD, fontSize:13, fontFamily:'Outfit,sans-serif',
      padding:0, marginBottom:20,
    }}>
      ← Back
    </button>
  )
}

// ── Gold CTA (steps 4 & 5) ────────────────────────────────────────────────────
function GoldBtn({ children, onClick, disabled=false, loading=false }: {
  children:React.ReactNode; onClick?:()=>void; disabled?:boolean; loading?:boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled||loading} style={{
      width:'100%', padding:'15px', borderRadius:10, border:'none',
      background: (disabled||loading) ? `${GOLD}60` : GOLD,
      color:'#000', fontSize:15, fontWeight:700,
      cursor: (disabled||loading) ? 'not-allowed' : 'pointer',
      fontFamily:'Outfit,sans-serif', letterSpacing:'0.02em',
      marginTop:24, transition:'background 0.15s',
    }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

// ── Category card gradient ─────────────────────────────────────────────────────
function catBg(color: string) {
  return `radial-gradient(circle at 75% 25%, ${color}25 0%, transparent 55%),
          linear-gradient(160deg, #161616 0%, #0e0e0e 100%)`
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ h=140 }: { h?: number }) {
  return (
    <div style={{
      height:h, borderRadius:12, background:BG3,
      backgroundImage:'linear-gradient(90deg,#1a1a1a 25%,#252525 50%,#1a1a1a 75%)',
      backgroundSize:'600px 100%', animation:'shimmer 1.4s infinite',
    }}/>
  )
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryRow({ label, value, highlight=false }: {
  label:string; value:string; highlight?:boolean
}) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:13, color:TEXT2, minWidth:90, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color:highlight ? GOLD : TEXT, fontWeight:highlight ? 600 : 400 }}>
        {value}
      </span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BookingPage() {
  const [step,       setStep]       = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [done,       setDone]       = useState(false)
  const [err,        setErr]        = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  const [categories, setCategories] = useState<Category[]>([])
  const [services,   setServices]   = useState<Service[]>([])
  const [takenHours, setTakenHours] = useState<number[]>([])

  const [selCategory, setSelCategory] = useState<Category | null>(null)
  const [selService,  setSelService]  = useState<Service  | null>(null)
  const [selDate,     setSelDate]     = useState<Date | null>(null)
  const [selTime,     setSelTime]     = useState<number | null>(null)

  const [form, setForm] = useState({ name:'', phone:'', vehicle:'', plate:'', address:'' })

  // ── Load categories & services ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: cats, error: catErr }, { data: svcs, error: svcErr }] =
        await Promise.all([
          sb.from('service_categories').select('*').eq('is_active', true).order('sort_order'),
          sb.from('services').select('*').eq('is_active', true).order('name'),
        ])
      if (catErr) console.error('[booking] categories:', catErr.message)
      if (svcErr) console.error('[booking] services:', svcErr.message)
      setCategories(cats ?? [])
      setServices(svcs ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // ── Check taken hours when date changes ────────────────────────────────────
  useEffect(() => {
    if (!selDate) return
    setTakenHours([])
    const ymd = toYMD(selDate)
    async function checkSlots() {
      const sb = createClient()
      const { data } = await sb
        .from('booking_requests')
        .select('scheduled_at')
        .gte('scheduled_at', `${ymd}T00:00:00.000+04:00`)
        .lte('scheduled_at', `${ymd}T23:59:59.999+04:00`)
        .neq('status', 'cancelled')
      setTakenHours((data ?? []).map((r: { scheduled_at: string }) => utcToHour(r.scheduled_at)))
    }
    checkSlots()
  }, [selDate])

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!selService || !selDate || selTime === null) return
    setSaving(true); setErr('')
    const sb = createClient()
    const { error: dbErr } = await sb.from('booking_requests').insert({
      service_id:         selService.id,
      service_name:       selService.name,
      scheduled_at:       slotToUTC(selDate, selTime),
      customer_name:      form.name,
      customer_phone:     form.phone,
      vehicle_make_model: form.vehicle || null,
      plate:              form.plate   || null,
      address:            form.address || null,
      price:              selService.base_price ?? null,
      status:             'pending',
    })
    setSaving(false)
    if (dbErr) { setErr(dbErr.message); return }
    setDone(true)
  }

  const filteredServices = services.filter(s => s.category === selCategory?.name)
  const days             = getDays(weekOffset)
  const timeSlots        = generateTimeSlots(selService)
  const durationHrs      = getServiceDurationHours(selService)

  function timeLabel() {
    return selTime !== null
      ? `${formatHour(selTime)} — ${formatHour(selTime + durationHrs)}`
      : ''
  }

  function resetAll() {
    setDone(false); setStep(1); setWeekOffset(0)
    setSelCategory(null); setSelService(null)
    setSelDate(null); setSelTime(null)
    setForm({ name:'', phone:'', vehicle:'', plate:'', address:'' })
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight:'100vh', background:'#f5f5f7', fontFamily:'Outfit,sans-serif',
        display:'flex', flexDirection:'column' }}>
        <style>{`@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
        <PageHeader />
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ textAlign:'center', maxWidth:440 }}>
            <div style={{
              width:80, height:80, borderRadius:'50%',
              background:`${GOLD}18`, border:`2px solid ${GOLD}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 24px', fontSize:36,
            }}>✓</div>
            <h2 style={{ color:'#111', fontSize:26, fontWeight:700, marginBottom:12 }}>
              Booking Received!
            </h2>
            <p style={{ color:'#333', fontSize:15, marginBottom:10, lineHeight:1.6 }}>
              Thank you, <strong>{form.name}</strong>. Your booking for{' '}
              <strong style={{ color:GOLD }}>{selService?.name}</strong> on{' '}
              <strong>{selDate ? toYMD(selDate) : ''}</strong> at{' '}
              <strong style={{ color:GOLD }}>{timeLabel()}</strong>{' '}
              has been received.
            </p>
            <p style={{ color:'#666', fontSize:13 }}>
              We will contact you on{' '}
              <strong style={{ color:'#111' }}>{form.phone}</strong>{' '}
              to confirm your appointment.
            </p>
            <button onClick={resetAll} style={{
              marginTop:32, padding:'12px 28px', borderRadius:8,
              background:'transparent', border:`1px solid ${GOLD}60`,
              color:GOLD, fontSize:13, fontWeight:600, cursor:'pointer',
              fontFamily:'Outfit,sans-serif',
            }}>
              Book Another Service
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f7', fontFamily:'Outfit,sans-serif', color:'#111' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.2); border-radius:2px; }
      `}</style>

      <PageHeader />
      <StepBar current={step} />

      <main style={{ maxWidth:480, margin:'0 auto', padding:'24px 16px 48px' }}>

        {/* ── STEP 1: Categories ──────────────────────────────────────────── */}
        {step === 1 && (
          <section>
            <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4, color:'#111' }}>
              Select a Category
            </h1>
            <p style={{ color:'#666', fontSize:14, marginBottom:24 }}>
              What type of service are you looking for?
            </p>
            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[1,2,3,4].map(i => <Skeleton key={i} h={150}/>)}
              </div>
            ) : categories.length === 0 ? (
              <p style={{ color:'#666', textAlign:'center', padding:40 }}>
                No services available at the moment.
              </p>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                {categories.map(cat => (
                  <CategoryCard key={cat.id} cat={cat}
                    onClick={() => { setSelCategory(cat); setStep(2) }}/>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── STEP 2: Services ────────────────────────────────────────────── */}
        {step === 2 && selCategory && (
          <section>
            <Back onClick={() => setStep(1)}/>
            <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4, color:'#111' }}>
              {selCategory.name}
            </h1>
            <p style={{ color:'#666', fontSize:14, marginBottom:24 }}>Select a service to continue</p>
            {filteredServices.length === 0 ? (
              <div style={{ textAlign:'center', padding:48 }}>
                <p style={{ color:'#666', marginBottom:16 }}>No services in this category yet.</p>
                <button onClick={() => setStep(1)} style={{
                  background:'none', border:'1px solid #ddd', color:'#666',
                  padding:'9px 18px', borderRadius:8, cursor:'pointer',
                  fontFamily:'Outfit,sans-serif', fontSize:13,
                }}>← Choose another category</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {filteredServices.map(svc => (
                  <ServiceCard key={svc.id} svc={svc}
                    onClick={() => { setSelService(svc); setStep(3) }}/>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── STEP 3: Date & Time ─────────────────────────────────────────── */}
        {step === 3 && (
          <section>
            <Back onClick={() => setStep(2)}/>

            {/* Date selector ───────────────────────────────────────────── */}
            <div style={{
              background:'#fff', borderRadius:16, padding:20,
              marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#111' }}>Select Date</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={() => setWeekOffset(p => Math.max(0, p - 1))}
                    disabled={weekOffset === 0}
                    style={{
                      width:36, height:36, borderRadius:'50%',
                      background: weekOffset === 0 ? '#f5f5f5' : '#fff',
                      border:'1px solid #e5e5e5',
                      cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
                      fontSize:18, color: weekOffset === 0 ? '#ccc' : '#333',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>‹</button>
                  <button
                    onClick={() => setWeekOffset(p => p + 1)}
                    style={{
                      width:36, height:36, borderRadius:'50%',
                      background:'#fff', border:'1px solid #e5e5e5',
                      cursor:'pointer', fontSize:18, color:'#333',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>›</button>
                </div>
              </div>

              {/* 7-day grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
                {days.map((date, idx) => {
                  const today  = new Date()
                  const isToday = today.toDateString() === date.toDateString()
                  const isPast  = date < today && !isToday
                  const isSel   = selDate?.toDateString() === date.toDateString()
                  return (
                    <div key={idx}
                      onClick={() => { if (!isPast) { setSelDate(date); setSelTime(null) } }}
                      style={{
                        display:'flex', flexDirection:'column',
                        alignItems:'center', justifyContent:'center',
                        padding:'10px 2px', borderRadius:12,
                        cursor: isPast ? 'not-allowed' : 'pointer',
                        background: isSel ? BLUE : 'transparent',
                        opacity: isPast ? 0.3 : 1,
                        transition:'all 0.15s',
                        userSelect:'none',
                      }}>
                      <div style={{ color: isSel ? '#fff' : '#888',
                        fontSize:10, fontWeight:500, marginBottom:3 }}>
                        {DAY_NAMES[date.getDay()]}
                      </div>
                      <div style={{ color: isSel ? '#fff' : '#111',
                        fontSize:16, fontWeight:700, marginBottom:2 }}>
                        {date.getDate()}
                      </div>
                      <div style={{ color: isSel ? 'rgba(255,255,255,0.7)' : '#aaa', fontSize:9 }}>
                        {MONTH_NAMES[date.getMonth()]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Time slots ──────────────────────────────────────────────── */}
            {selDate && (
              <div style={{
                background:'#fff', borderRadius:16, padding:20,
                marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.08)',
              }}>
                <div style={{ fontSize:18, fontWeight:700, color:'#111', marginBottom:16 }}>
                  Select Time
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                  {timeSlots.map((slot, idx) => {
                    const isTaken = takenHours.includes(slot.start)
                    const isSel   = selTime === slot.start
                    return (
                      <button key={idx}
                        onClick={() => !isTaken && setSelTime(slot.start)}
                        disabled={isTaken}
                        style={{
                          padding:'14px 10px', borderRadius:12, textAlign:'center',
                          border: isSel ? `2px solid ${BLUE}` : '1px solid #e5e5e5',
                          background: isSel ? BLUE : isTaken ? '#f5f5f5' : '#fff',
                          color: isSel ? '#fff' : isTaken ? '#ccc' : '#111',
                          fontSize:13, fontWeight:500, lineHeight:1.4,
                          cursor: isTaken ? 'not-allowed' : 'pointer',
                          fontFamily:'Outfit,sans-serif', transition:'all 0.15s',
                        }}>
                        {slot.startLabel} — {slot.endLabel}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Continue button ─────────────────────────────────────────── */}
            <button
              onClick={() => { if (selDate && selTime !== null) setStep(4) }}
              disabled={!selDate || selTime === null}
              style={{
                width:'100%', padding:'16px', borderRadius:12, border:'none',
                background: selDate && selTime !== null ? BLUE : '#e5e5e5',
                color: selDate && selTime !== null ? '#fff' : '#aaa',
                fontSize:16, fontWeight:700, fontFamily:'Outfit,sans-serif',
                cursor: selDate && selTime !== null ? 'pointer' : 'not-allowed',
                transition:'all 0.2s',
              }}>
              Continue
            </button>
          </section>
        )}

        {/* ── STEP 4: Customer details ─────────────────────────────────────── */}
        {step === 4 && (
          <section>
            <Back onClick={() => setStep(3)}/>
            <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4, color:'#111' }}>Your Details</h1>
            <p style={{ color:'#666', fontSize:14, marginBottom:24 }}>
              Fill in your information to complete the booking
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <Field label="Full Name *" value={form.name}
                onChange={v => setForm(p => ({ ...p, name:v }))} placeholder="Your full name"/>
              <Field label="WhatsApp Number *" value={form.phone} type="tel"
                onChange={v => setForm(p => ({ ...p, phone:v }))} placeholder="+971 XX XXX XXXX"/>
              <Field label="Vehicle Make & Model" value={form.vehicle}
                onChange={v => setForm(p => ({ ...p, vehicle:v }))}
                placeholder="e.g. Toyota Land Cruiser 2023"/>
              <Field label="Plate Number" value={form.plate}
                onChange={v => setForm(p => ({ ...p, plate:v }))} placeholder="e.g. ABC 1234"/>
              <Field label="Service Address" value={form.address}
                onChange={v => setForm(p => ({ ...p, address:v }))}
                placeholder="Where should we come to?"/>
            </div>
            {err && <p style={{ color:RED, fontSize:13, marginTop:12 }}>{err}</p>}
            <GoldBtn onClick={() => {
              if (!form.name.trim() || !form.phone.trim()) {
                setErr('Full name and WhatsApp number are required.')
                return
              }
              setErr(''); setStep(5)
            }}>
              Review Booking →
            </GoldBtn>
          </section>
        )}

        {/* ── STEP 5: Summary & Confirm ────────────────────────────────────── */}
        {step === 5 && (
          <section>
            <Back onClick={() => setStep(4)}/>
            <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4, color:'#111' }}>Confirm Booking</h1>
            <p style={{ color:'#666', fontSize:14, marginBottom:24 }}>
              Review your details before confirming
            </p>

            <div style={{
              background:BG3, borderRadius:12, border:`1px solid ${BORDER}`,
              overflow:'hidden', marginBottom:16,
            }}>
              {/* Service */}
              <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
                <div style={{ fontSize:10, color:TEXT2, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:8 }}>Service</div>
                <div style={{ fontSize:18, fontWeight:700, color:TEXT }}>{selService?.name}</div>
                <div style={{ display:'flex', gap:16, marginTop:8, flexWrap:'wrap' }}>
                  {selService?.base_price != null && (
                    <span style={{ fontSize:20, fontWeight:700, color:GOLD }}>
                      AED {selService.base_price}
                    </span>
                  )}
                  {selService?.duration && (
                    <span style={{ fontSize:13, color:TEXT2, alignSelf:'flex-end', paddingBottom:2 }}>
                      {selService.duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Date / Time */}
              <div style={{
                padding:'14px 18px', borderBottom:`1px solid ${BORDER}`,
                display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
              }}>
                <div>
                  <div style={{ fontSize:10, color:TEXT2, textTransform:'uppercase',
                    letterSpacing:'0.06em', marginBottom:6 }}>Date</div>
                  <div style={{ fontSize:14, fontWeight:600, color:TEXT }}>
                    {selDate ? toYMD(selDate) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:TEXT2, textTransform:'uppercase',
                    letterSpacing:'0.06em', marginBottom:6 }}>Time</div>
                  <div style={{ fontSize:14, fontWeight:600, color:GOLD }}>{timeLabel()}</div>
                </div>
              </div>

              {/* Customer */}
              <div style={{ padding:'14px 18px' }}>
                <div style={{ fontSize:10, color:TEXT2, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:12 }}>Customer Details</div>
                <SummaryRow label="Name"     value={form.name}/>
                <SummaryRow label="WhatsApp" value={form.phone} highlight/>
                {form.vehicle && <SummaryRow label="Vehicle" value={form.vehicle}/>}
                {form.plate   && <SummaryRow label="Plate"   value={form.plate}/>}
                {form.address && <SummaryRow label="Address" value={form.address}/>}
              </div>
            </div>

            <p style={{ fontSize:12, color:'#666', marginBottom:4, lineHeight:1.6 }}>
              By confirming you agree to our terms. Our team will contact you via WhatsApp to
              confirm your appointment.
            </p>
            {err && <p style={{ color:RED, fontSize:13, marginTop:8 }}>{err}</p>}
            <GoldBtn onClick={submit} loading={saving}>Confirm Booking ✓</GoldBtn>
          </section>
        )}

      </main>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header style={{
      padding:'18px 24px', background:BG2, borderBottom:`1px solid ${BORDER}`,
      display:'flex', alignItems:'center', gap:16,
    }}>
      <div style={{
        width:40, height:40, borderRadius:8,
        background:`${GOLD}15`, border:`1px solid ${GOLD}40`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
      }}>
        <span style={{ fontSize:18, fontWeight:800, color:GOLD }}>S</span>
      </div>
      <div>
        <div style={{ fontSize:18, fontWeight:800, color:GOLD, letterSpacing:'0.06em',
          lineHeight:1, textTransform:'uppercase' }}>Saffi</div>
        <div style={{ fontSize:10, color:TEXT2, letterSpacing:'0.14em',
          textTransform:'uppercase', marginTop:2 }}>Luxury Car Care · Dubai</div>
      </div>
      <div style={{ marginLeft:'auto', fontSize:12, color:TEXT2 }}>Book a Service</div>
    </header>
  )
}

function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        height:155, borderRadius:12,
        border:`1px solid ${hovered ? cat.color+'55' : cat.color+'22'}`,
        background:catBg(cat.color),
        cursor:'pointer', padding:0, overflow:'hidden',
        position:'relative', display:'flex', flexDirection:'column',
        justifyContent:'flex-end', textAlign:'left',
        transition:'border-color 0.2s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        fontFamily:'Outfit,sans-serif',
      }}>
      <div style={{ position:'absolute', top:0, right:0, width:70, height:70,
        background:`radial-gradient(circle, ${cat.color}20 0%, transparent 70%)` }}/>
      <div style={{ position:'absolute', top:14, right:14, width:8, height:8,
        borderRadius:'50%', background:cat.color, opacity:0.7 }}/>
      <div style={{ padding:'12px 14px', position:'relative' }}>
        <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{cat.name}</div>
        {cat.description && (
          <div style={{ fontSize:11, color:TEXT2, marginTop:3, lineHeight:1.4,
            overflow:'hidden', display:'-webkit-box',
            WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
            {cat.description}
          </div>
        )}
        <div style={{ marginTop:8, fontSize:11, color:cat.color, fontWeight:600, letterSpacing:'0.04em' }}>
          View services →
        </div>
      </div>
    </button>
  )
}

function ServiceCard({ svc, onClick }: { svc: Service; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? BG4 : BG3,
        border:`1px solid ${hovered ? GOLD+'40' : BORDER}`,
        borderRadius:12, padding:'16px 18px',
        cursor:'pointer', textAlign:'left', width:'100%',
        fontFamily:'Outfit,sans-serif', transition:'all 0.15s', display:'block',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:TEXT, marginBottom:5 }}>{svc.name}</div>
          {svc.description && (
            <div style={{ fontSize:13, color:TEXT2, lineHeight:1.55,
              overflow:'hidden', display:'-webkit-box',
              WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
              {svc.description}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          {svc.base_price != null && (
            <div style={{ fontSize:18, fontWeight:700, color:GOLD }}>AED {svc.base_price}</div>
          )}
          {(svc.duration || svc.duration_hrs) && (
            <div style={{ fontSize:11, color:TEXT2, marginTop:4 }}>
              {svc.duration || svc.duration_hrs}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}