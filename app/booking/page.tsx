'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          '#f5f5f7',
  card:        '#ffffff',
  border:      '#e5e5e5',
  borderActive:'#3b4fd8',
  text:        '#111111',
  textMuted:   '#888888',
  textLight:   '#aaaaaa',
  accent:      '#c9a84c',
  accentBlue:  '#3b4fd8',
  accentBlueBg:'#eef0fb',
  accentGoldBg:'#fdf8ee',
  success:     '#22c55e',
  error:       '#ef4444',
}

// ── Dubai areas fallback ───────────────────────────────────────────────────────
const DUBAI_AREAS = [
  'JVC - Jumeirah Village Circle',
  'JVT - Jumeirah Village Triangle',
  'Downtown Dubai',
  'Dubai Marina',
  'Palm Jumeirah',
  'Business Bay',
  'DIFC',
  'Jumeirah',
  'Al Barsha',
  'Mirdif',
  'Deira',
  'Bur Dubai',
  'Al Quoz',
  'Dubai Hills Estate',
  'Arabian Ranches',
  'Motor City',
  'Sports City',
  'Discovery Gardens',
  'International City',
  'Silicon Oasis',
  'Academic City',
  'Al Furjan',
  'Damac Hills',
  'Town Square',
  'Mudon',
  'Reem',
  'Nad Al Sheba',
  'Al Warqa',
  'Rashidiya',
  'Muhaisnah',
  'Al Nahda',
  'Al Qusais',
  'Karama',
  'Satwa',
  'Mankhool',
  'Al Fahidi',
  'Creek',
  'Festival City',
  'Ras Al Khor',
  'Jebel Ali',
  'Dubai South',
  'Blue Waters',
  'City Walk',
  'La Mer',
  'Umm Suqeim',
  'Al Safa',
  'Al Wasl',
  'Al Manara',
]

// ── Types ──────────────────────────────────────────────────────────────────────
interface Category {
  id: string; name: string; description: string; color: string
}
interface Service {
  id: string; name: string; description: string
  base_price: number; duration: string; duration_hrs: string; category: string
}
interface TimeSlot {
  start: number; startLabel: string; endLabel: string
}
interface CustomerForm {
  full_name: string; whatsapp: string
  vehicle_model: string; plate_number: string
  address: string
  area: string; community: string; villa_flat: string; address_notes: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Helpers ────────────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatHour(hour: number): string {
  const h       = Math.floor(hour)
  const m       = Math.round((hour % 1) * 60)
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
  const dur = getServiceDurationHours(svc)
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

function buildAddress(f: CustomerForm): string {
  return [f.address, f.villa_flat, f.area, f.community, f.address_notes]
    .filter(Boolean).join(', ')
}

// ── Shared input style ─────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%', padding:'14px 16px', background:'#fff',
  border:'1px solid #e5e5e5', borderRadius:10, color:'#111',
  fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'Outfit,sans-serif',
}

// ── Small components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ textAlign:'center', marginBottom:28 }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <div style={{
          width:32, height:32, background:C.accent, borderRadius:8,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:16, fontWeight:900, color:'#0d0d0f',
        }}>N</div>
        <span style={{ color:C.text, fontSize:18, fontWeight:800, letterSpacing:'1px' }}>
          NOIREM
        </span>
      </div>
      <div style={{ color:C.textLight, fontSize:11, letterSpacing:'2px' }}>
        LUXURY DETAILING
      </div>
    </div>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      gap:6, marginBottom:28,
    }}>
      {[1,2,3,4,5].map(s => (
        <div key={s} style={{
          height:3,
          width: s === step ? 24 : 8,
          borderRadius:2,
          background: s <= step ? C.accent : C.border,
          transition:'all 0.3s',
        }}/>
      ))}
    </div>
  )
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background:'none', border:'none', cursor:'pointer',
      color:C.accentBlue, fontSize:14, fontWeight:600,
      padding:0, marginBottom:20, fontFamily:'Outfit,sans-serif',
    }}>← Back</button>
  )
}

function PrimaryBtn({ children, onClick, disabled=false, loading=false }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean
}) {
  const inactive = disabled || loading
  return (
    <button onClick={onClick} disabled={inactive} style={{
      width:'100%', padding:'16px', background: inactive ? `${C.accent}70` : C.accent,
      color:'#0d0d0f', border:'none', borderRadius:12, fontSize:16, fontWeight:800,
      cursor: inactive ? 'not-allowed' : 'pointer', fontFamily:'Outfit,sans-serif',
      letterSpacing:'0.3px', marginTop:8, transition:'background 0.15s',
    }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

function Skeleton({ h=140 }: { h?: number }) {
  return (
    <div style={{
      height:h, borderRadius:12,
      background:'linear-gradient(90deg,#ebebeb 25%,#f5f5f5 50%,#ebebeb 75%)',
      backgroundSize:'600px 100%', animation:'shimmer 1.4s infinite',
    }}/>
  )
}

function FLabel({ children, required, optional }: {
  children: React.ReactNode; required?: boolean; optional?: boolean
}) {
  return (
    <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:6,
      display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
      {children}
      {required && <span style={{ color:C.error }}>*</span>}
      {optional && <span style={{ color:C.textLight, fontWeight:400, fontSize:12 }}>(Optional)</span>}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'20px 0 16px' }}>
      <div style={{ flex:1, height:1, background:C.border }}/>
      <span style={{ color:C.textLight, fontSize:11, fontWeight:600, whiteSpace:'nowrap',
        letterSpacing:'0.08em' }}>{label}</span>
      <div style={{ flex:1, height:1, background:C.border }}/>
    </div>
  )
}

function ConfirmRow({ label, value, accent=false }: {
  label: string; value: string; accent?: boolean
}) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:7 }}>
      <span style={{ fontSize:13, color:C.textMuted, minWidth:90, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color: accent ? C.accentBlue : C.text,
        fontWeight: accent ? 600 : 400 }}>{value}</span>
    </div>
  )
}

// ── Address search with Dubai areas fallback ───────────────────────────────────
function AddressSearch({
  value, onChange, onAreaChange, onCommunityChange,
}: {
  value: string
  onChange: (v: string) => void
  onAreaChange: (v: string) => void
  onCommunityChange: (v: string) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDrop, setShowDrop]       = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!key) return
    if ((window as any).google?.maps?.places) { setGoogleReady(true); return }
    const existing = document.getElementById('gmap-script')
    if (existing) { existing.addEventListener('load', () => setGoogleReady(true)); return }
    const script = document.createElement('script')
    script.id    = 'gmap-script'
    script.src   = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.onload = () => setGoogleReady(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!googleReady || !inputRef.current) return
    const g = (window as any).google
    if (!g?.maps?.places) return
    const ac = new g.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ae' },
      fields: ['formatted_address', 'address_components'],
      types: ['address'],
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.formatted_address) return
      const comps: Array<{ types: string[]; long_name: string }> = place.address_components || []
      const get = (t: string) => comps.find(c => c.types.includes(t))?.long_name || ''
      onChange(place.formatted_address)
      onAreaChange(get('sublocality_level_1') || get('sublocality') || get('neighborhood'))
      onCommunityChange(get('locality') || get('administrative_area_level_2'))
    })
  }, [googleReady, onChange, onAreaChange, onCommunityChange])

  function handleChange(v: string) {
    onChange(v)
    if (googleReady) return
    if (v.length >= 2) {
      const filtered = DUBAI_AREAS.filter(a => a.toLowerCase().includes(v.toLowerCase())).slice(0, 6)
      setSuggestions(filtered)
      setShowDrop(filtered.length > 0)
    } else {
      setShowDrop(false)
    }
  }

  function pickSuggestion(s: string) {
    onChange(s)
    const parts = s.split(' - ')
    onAreaChange(parts[0])
    onCommunityChange(parts[1] ?? '')
    setShowDrop(false)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          ref={inputRef}
          id="address-autocomplete"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => !googleReady && suggestions.length > 0 && setShowDrop(true)}
          placeholder="Search area, community or address…"
          autoComplete="off"
          style={{ ...INP, paddingLeft:44 }}
        />
        <span style={{
          position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
          color:C.textLight, fontSize:16, pointerEvents:'none', lineHeight:1,
        }}>🔍</span>
      </div>
      {showDrop && suggestions.length > 0 && (
        <div ref={dropRef} style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
          background:'#fff', border:'1px solid #e5e5e5', borderRadius:12,
          boxShadow:'0 4px 20px rgba(0,0,0,0.10)', zIndex:200, overflow:'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div key={i} onMouseDown={() => pickSuggestion(s)}
              style={{
                padding:'12px 16px', cursor:'pointer', fontSize:14, color:'#333',
                borderBottom: i < suggestions.length-1 ? '1px solid #f5f5f5' : 'none',
                display:'flex', alignItems:'center', gap:10,
              }}
              onMouseEnter={e => (e.currentTarget.style.background='#f9f9f9')}
              onMouseLeave={e => (e.currentTarget.style.background='#fff')}
            >
              <span style={{ fontSize:14 }}>📍</span>{s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category card ──────────────────────────────────────────────────────────────
function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        minHeight:130, borderRadius:14,
        background: hov ? C.accentBlueBg : C.card,
        border:`2px solid ${hov ? C.borderActive : C.border}`,
        cursor:'pointer', padding:'18px 14px', textAlign:'left',
        fontFamily:'Outfit,sans-serif', transition:'all 0.18s',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        boxShadow: hov ? '0 4px 16px rgba(59,79,216,0.08)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
      <div>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: hov ? C.borderActive : cat.color || C.accent,
          marginBottom:10,
        }}/>
        <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:4 }}>
          {cat.name}
        </div>
        {cat.description && (
          <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.5,
            overflow:'hidden', display:'-webkit-box',
            WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
            {cat.description}
          </div>
        )}
      </div>
      <div style={{
        marginTop:12, fontSize:11, fontWeight:700, letterSpacing:'0.04em',
        color: hov ? C.borderActive : C.textLight,
      }}>
        View →
      </div>
    </button>
  )
}

// ── Service card ───────────────────────────────────────────────────────────────
function ServiceCard({ svc, onClick }: { svc: Service; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.accentGoldBg : C.card,
        border:`2px solid ${hov ? C.accent : C.border}`,
        borderRadius:14, padding:'16px 18px', cursor:'pointer', textAlign:'left',
        width:'100%', fontFamily:'Outfit,sans-serif', transition:'all 0.15s', display:'block',
        boxShadow: hov ? '0 4px 16px rgba(201,168,76,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:5 }}>
            {svc.name}
          </div>
          {svc.description && (
            <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.55, overflow:'hidden',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
              {svc.description}
            </div>
          )}
          {(svc.duration || svc.duration_hrs) && (
            <div style={{ fontSize:12, color:C.textMuted, marginTop:6 }}>
              {svc.duration || svc.duration_hrs}
            </div>
          )}
        </div>
        {svc.base_price != null && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:C.accent }}>
              AED {svc.base_price}
            </div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>
              + VAT 5% = AED {(svc.base_price * 1.05).toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </button>
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

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('cash')

  const [cf, setCf_] = useState<CustomerForm>({
    full_name:'', whatsapp:'', vehicle_model:'', plate_number:'',
    address:'', area:'', community:'', villa_flat:'', address_notes:'',
  })
  const setCf = useCallback((k: keyof CustomerForm, v: string) =>
    setCf_(p => ({ ...p, [k]: v })), [])

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [{ data: cats, error: ce }, { data: svcs, error: se }] = await Promise.all([
        sb.from('service_categories').select('*').eq('is_active', true).order('sort_order'),
        sb.from('services').select('*').eq('is_active', true).order('name'),
      ])
      if (ce) console.error('[booking] categories:', ce.message)
      if (se) console.error('[booking] services:', se.message)
      const activeSvcs = svcs ?? []
      const filteredCats = (cats ?? []).filter(cat =>
        activeSvcs.some((s: Service) => s.category === cat.name)
      )
      setServices(activeSvcs)
      setCategories(filteredCats)
      setLoading(false)
    }
    load()
  }, [])

  // ── Taken slots ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selDate) return
    setTakenHours([])
    const ymd = toYMD(selDate)
    createClient()
      .from('booking_requests')
      .select('scheduled_at')
      .gte('scheduled_at', `${ymd}T00:00:00.000+04:00`)
      .lte('scheduled_at', `${ymd}T23:59:59.999+04:00`)
      .neq('status', 'cancelled')
      .then(({ data }) =>
        setTakenHours((data ?? []).map((r: { scheduled_at: string }) => utcToHour(r.scheduled_at)))
      )
  }, [selDate])

  // ── Computed price ─────────────────────────────────────────────────────────
  const servicePrice = selService?.base_price ?? 0
  const vatAmount    = parseFloat((servicePrice * 0.05).toFixed(2))
  const totalAmount  = parseFloat((servicePrice * 1.05).toFixed(2))

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!selService || !selDate || selTime === null) return
    setSaving(true); setErr('')
    const { error: dbErr } = await createClient().from('booking_requests').insert({
      service_id:         selService.id,
      service_name:       selService.name,
      scheduled_at:       slotToUTC(selDate, selTime),
      customer_name:      cf.full_name,
      customer_phone:     cf.whatsapp,
      vehicle_make_model: cf.vehicle_model  || null,
      plate:              cf.plate_number   || null,
      address:            buildAddress(cf)  || null,
      vehicle_model:      cf.vehicle_model  || null,
      plate_number:       cf.plate_number   || null,
      villa_flat:         cf.villa_flat     || null,
      area:               cf.area           || null,
      community:          cf.community      || null,
      address_notes:      cf.address_notes  || null,
      price:              servicePrice || null,
      vat:                servicePrice ? vatAmount   : null,
      total_amount:       servicePrice ? totalAmount : null,
      payment_method:     paymentMethod,
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
    setDone(false); setStep(1); setWeekOffset(0); setPaymentMethod('cash')
    setSelCategory(null); setSelService(null); setSelDate(null); setSelTime(null)
    setCf_({ full_name:'', whatsapp:'', vehicle_model:'', plate_number:'',
      address:'', area:'', community:'', villa_flat:'', address_notes:'' })
  }

  // ── Wrapper ────────────────────────────────────────────────────────────────
  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Outfit,sans-serif', color:C.text }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #aaa; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.25); border-radius:2px; }
      `}</style>
      <main style={{ maxWidth:480, margin:'0 auto', padding:'40px 16px 64px' }}>
        <PageHeader />
        {children}
      </main>
    </div>
  )

  // ── DONE screen ────────────────────────────────────────────────────────────
  if (done) {
    return wrap(
      <div style={{ textAlign:'center', paddingTop:24 }}>
        <div style={{
          width:72, height:72, borderRadius:'50%',
          background:`${C.accent}18`, border:`2px solid ${C.accent}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 24px', fontSize:32,
        }}>✓</div>
        <h2 style={{ color:C.text, fontSize:26, fontWeight:800, marginBottom:12 }}>
          Booking Received!
        </h2>
        <p style={{ color:C.textMuted, fontSize:15, marginBottom:10, lineHeight:1.6 }}>
          Thank you, <strong style={{ color:C.text }}>{cf.full_name}</strong>. Your booking for{' '}
          <strong style={{ color:C.accent }}>{selService?.name}</strong> on{' '}
          <strong style={{ color:C.text }}>{selDate ? toYMD(selDate) : ''}</strong> at{' '}
          <strong style={{ color:C.accent }}>{timeLabel()}</strong> has been received.
        </p>
        <p style={{ color:C.textMuted, fontSize:13, marginBottom:32 }}>
          We will contact you on{' '}
          <strong style={{ color:C.text }}>{cf.whatsapp}</strong>{' '}
          to confirm your appointment.
        </p>
        <button onClick={resetAll} style={{
          padding:'12px 28px', borderRadius:10,
          background:'transparent', border:`1.5px solid ${C.accent}`,
          color:C.accent, fontSize:14, fontWeight:700, cursor:'pointer',
          fontFamily:'Outfit,sans-serif',
        }}>Book Another Service</button>
      </div>
    )
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return wrap(
    <>
      <ProgressBar step={step} />

      {/* ── STEP 1: Categories ────────────────────────────────────────────── */}
      {step === 1 && (
        <section>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:C.text }}>
            Select a Category
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:24 }}>
            What type of service are you looking for?
          </p>
          {loading ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={130}/>)}
            </div>
          ) : categories.length === 0 ? (
            <p style={{ color:C.textMuted, textAlign:'center', padding:40 }}>
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

      {/* ── STEP 2: Services ──────────────────────────────────────────────── */}
      {step === 2 && selCategory && (
        <section>
          <Back onClick={() => setStep(1)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:C.text }}>
            {selCategory.name}
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:24 }}>
            Select a service to continue
          </p>
          {filteredServices.length === 0 ? (
            <div style={{ textAlign:'center', padding:48 }}>
              <p style={{ color:C.textMuted, marginBottom:16 }}>
                No services in this category yet.
              </p>
              <button onClick={() => setStep(1)} style={{
                background:'none', border:`1px solid ${C.border}`, color:C.textMuted,
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

      {/* ── STEP 3: Date & Time ───────────────────────────────────────────── */}
      {step === 3 && (
        <section>
          <Back onClick={() => setStep(2)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:20, color:C.text }}>
            Date &amp; Time
          </h1>

          {/* Date picker */}
          <div style={{
            background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
            padding:20, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Select Date</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setWeekOffset(p => Math.max(0, p-1))}
                  disabled={weekOffset === 0}
                  style={{
                    width:34, height:34, borderRadius:'50%',
                    background: weekOffset === 0 ? '#f5f5f5' : C.card,
                    border:`1px solid ${C.border}`,
                    cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
                    fontSize:17, color: weekOffset === 0 ? C.textLight : C.text,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>‹</button>
                <button onClick={() => setWeekOffset(p => p+1)}
                  style={{
                    width:34, height:34, borderRadius:'50%', background:C.card,
                    border:`1px solid ${C.border}`, cursor:'pointer', fontSize:17, color:C.text,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>›</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {days.map((date, idx) => {
                const today   = new Date()
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
                      background: isSel ? C.accentBlue : 'transparent',
                      opacity: isPast ? 0.3 : 1,
                      transition:'all 0.15s', userSelect:'none',
                    }}>
                    <div style={{ color: isSel ? '#fff' : C.textMuted, fontSize:10, fontWeight:500, marginBottom:3 }}>
                      {DAY_NAMES[date.getDay()]}
                    </div>
                    <div style={{ color: isSel ? '#fff' : C.text, fontSize:16, fontWeight:700, marginBottom:2 }}>
                      {date.getDate()}
                    </div>
                    <div style={{ color: isSel ? 'rgba(255,255,255,0.7)' : C.textLight, fontSize:9 }}>
                      {MONTH_NAMES[date.getMonth()]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selDate && (
            <div style={{
              background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
              padding:20, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:16 }}>
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
                        padding:'14px 10px', borderRadius:10, textAlign:'center',
                        border: isSel ? `2px solid ${C.accentBlue}` : `1px solid ${C.border}`,
                        background: isSel ? C.accentBlueBg : isTaken ? '#f5f5f5' : C.card,
                        color: isSel ? C.accentBlue : isTaken ? C.textLight : C.text,
                        fontSize:13, fontWeight: isSel ? 700 : 500, lineHeight:1.4,
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

          <PrimaryBtn
            onClick={() => { if (selDate && selTime !== null) setStep(4) }}
            disabled={!selDate || selTime === null}>
            Continue
          </PrimaryBtn>
        </section>
      )}

      {/* ── STEP 4: Customer Details ───────────────────────────────────────── */}
      {step === 4 && (
        <section>
          <Back onClick={() => setStep(3)}/>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>
            Your Details
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:24 }}>
            Fill in your information to complete the booking
          </p>

          {/* Service + date summary */}
          <div style={{
            background:C.bg, border:`1px solid ${C.border}`, borderRadius:12,
            padding:'14px 16px', marginBottom:24,
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
          }}>
            <div>
              <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:4 }}>Service</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{selService?.name}</div>
              {selService?.base_price != null && (
                <div style={{ fontSize:13, color:C.accent, fontWeight:700, marginTop:2 }}>
                  AED {selService.base_price}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:4 }}>Date &amp; Time</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>
                {selDate?.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
              </div>
              {selTime !== null && (
                <div style={{ fontSize:12, color:C.accentBlue, marginTop:2 }}>
                  {formatHour(selTime)}
                </div>
              )}
            </div>
          </div>

          {/* Personal info */}
          <div style={{ marginBottom:16 }}>
            <FLabel required>Full Name</FLabel>
            <input value={cf.full_name} onChange={e => setCf('full_name', e.target.value)}
              placeholder="Your full name" style={INP}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>WhatsApp Number</FLabel>
            <input type="tel" value={cf.whatsapp} onChange={e => setCf('whatsapp', e.target.value)}
              placeholder="+971 XX XXX XXXX" style={INP}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Vehicle Plate Number</FLabel>
            <input value={cf.plate_number} onChange={e => setCf('plate_number', e.target.value)}
              placeholder="Enter plate number" style={INP}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel optional>Vehicle Make &amp; Model</FLabel>
            <input value={cf.vehicle_model} onChange={e => setCf('vehicle_model', e.target.value)}
              placeholder="e.g. Toyota Land Cruiser 2023" style={INP}/>
          </div>

          <SectionDivider label="SERVICE ADDRESS" />

          <div style={{ marginBottom:16 }}>
            <FLabel required>Search Location</FLabel>
            <AddressSearch
              value={cf.address}
              onChange={v => setCf('address', v)}
              onAreaChange={v => setCf('area', v)}
              onCommunityChange={v => setCf('community', v)}
            />
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Area Name</FLabel>
            <input value={cf.area} onChange={e => setCf('area', e.target.value)}
              placeholder="Enter area name" style={INP}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Community Name</FLabel>
            <input value={cf.community} onChange={e => setCf('community', e.target.value)}
              placeholder="Enter community name" style={INP}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Villa / Flat Number</FLabel>
            <input value={cf.villa_flat} onChange={e => setCf('villa_flat', e.target.value)}
              placeholder="Enter villa/flat number" style={INP}/>
          </div>

          <div style={{ marginBottom:24 }}>
            <FLabel optional>Other Address Details</FLabel>
            <textarea value={cf.address_notes} onChange={e => setCf('address_notes', e.target.value)}
              placeholder="Parking spot, building access, etc."
              rows={3} style={{ ...INP, resize:'none' }}/>
          </div>

          {err && <p style={{ color:C.error, fontSize:13, marginBottom:12 }}>{err}</p>}

          <PrimaryBtn onClick={() => {
            if (!cf.full_name.trim() || !cf.whatsapp.trim() ||
                !cf.plate_number.trim() || !cf.address.trim() ||
                !cf.area.trim() || !cf.community.trim() || !cf.villa_flat.trim()) {
              setErr('Please fill in all required fields.')
              return
            }
            setErr(''); setStep(5)
          }}>
            Continue
          </PrimaryBtn>
        </section>
      )}

      {/* ── STEP 5: Confirm ───────────────────────────────────────────────── */}
      {step === 5 && (
        <section>
          <Back onClick={() => setStep(4)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:C.text }}>
            Confirm Booking
          </h1>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:20 }}>
            Review your details before confirming
          </p>

          {/* Summary card */}
          <div style={{
            background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginBottom:20,
          }}>
            {/* Service + price */}
            <div style={{ padding:'16px 18px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:8 }}>Service</div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text }}>{selService?.name}</div>
              {selService?.duration && (
                <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>{selService.duration}</div>
              )}
              {selService?.base_price != null && (
                <div style={{ marginTop:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMuted, fontSize:13 }}>Subtotal</span>
                    <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>
                      AED {servicePrice.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMuted, fontSize:13 }}>VAT (5%)</span>
                    <span style={{ color:C.textMuted, fontSize:13 }}>
                      AED {vatAmount.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0' }}>
                    <span style={{ color:C.text, fontSize:16, fontWeight:800 }}>Total</span>
                    <span style={{ color:C.accent, fontSize:20, fontWeight:900 }}>
                      AED {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Date / Time */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`,
              display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:6 }}>Date</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>
                  {selDate ? toYMD(selDate) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                  letterSpacing:'0.06em', marginBottom:6 }}>Time</div>
                <div style={{ fontSize:14, fontWeight:600, color:C.accentBlue }}>{timeLabel()}</div>
              </div>
            </div>

            {/* Customer */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:10 }}>Customer</div>
              <ConfirmRow label="Name"     value={cf.full_name}/>
              <ConfirmRow label="WhatsApp" value={cf.whatsapp} accent/>
              {cf.vehicle_model && <ConfirmRow label="Vehicle" value={cf.vehicle_model}/>}
              {cf.plate_number  && <ConfirmRow label="Plate"   value={cf.plate_number}/>}
            </div>

            {/* Address */}
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:10, color:C.textMuted, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:10 }}>Service Address</div>
              {cf.area        && <ConfirmRow label="Area"       value={cf.area}/>}
              {cf.community   && <ConfirmRow label="Community"  value={cf.community}/>}
              {cf.villa_flat  && <ConfirmRow label="Villa/Flat" value={cf.villa_flat}/>}
              {cf.address_notes && <ConfirmRow label="Notes"    value={cf.address_notes}/>}
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:12 }}>
              Payment Method
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {/* Online */}
              <div onClick={() => setPaymentMethod('online')} style={{
                display:'flex', alignItems:'center', gap:10, padding:'14px 16px',
                background: paymentMethod === 'online' ? C.accentBlueBg : C.card,
                border:`2px solid ${paymentMethod === 'online' ? C.borderActive : C.border}`,
                borderRadius:14, cursor:'pointer', transition:'all 0.2s',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background: paymentMethod === 'online' ? C.accentBlue : '#f0f0f0',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={paymentMethod === 'online' ? '#fff' : C.textLight}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <span style={{ color:C.text, fontSize:14, fontWeight:600 }}>Online</span>
                {paymentMethod === 'online' && (
                  <div style={{ marginLeft:'auto', width:20, height:20, borderRadius:'50%',
                    background:C.accentBlue, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Cash */}
              <div onClick={() => setPaymentMethod('cash')} style={{
                display:'flex', alignItems:'center', gap:10, padding:'14px 16px',
                background: paymentMethod === 'cash' ? C.accentBlueBg : C.card,
                border:`2px solid ${paymentMethod === 'cash' ? C.borderActive : C.border}`,
                borderRadius:14, cursor:'pointer', transition:'all 0.2s',
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background: paymentMethod === 'cash' ? C.accentBlue : '#f0f0f0',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={paymentMethod === 'cash' ? '#fff' : C.textLight}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <span style={{ color:C.text, fontSize:14, fontWeight:600 }}>Cash</span>
                {paymentMethod === 'cash' && (
                  <div style={{ marginLeft:'auto', width:20, height:20, borderRadius:'50%',
                    background:C.accentBlue, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize:12, color:C.textMuted, marginBottom:12, lineHeight:1.6 }}>
            By confirming you agree to our terms. Our team will contact you via WhatsApp to
            confirm your appointment.
          </p>
          {err && <p style={{ color:C.error, fontSize:13, marginBottom:8 }}>{err}</p>}
          <PrimaryBtn onClick={submit} loading={saving}>Confirm Booking ✓</PrimaryBtn>
        </section>
      )}
    </>
  )
}