'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Design tokens — dark luxury ────────────────────────────────────────────────
const GOLD   = '#D4AF37'
const BG     = '#0a0a0a'
const CARD   = '#111111'
const CARD2  = '#181818'
const BORDER = '#2a2a2a'
const BORDER2= '#3a3a3a'
const TEXT   = '#f0f0f0'
const MUTED  = '#888888'
const DIM    = '#555555'
const RED    = '#ef4444'

// ── Category visual map ────────────────────────────────────────────────────────
const CAT_META: Record<string, { emoji: string; gradient: string }> = {
  'Car Wash':        { emoji:'🚿', gradient:'linear-gradient(135deg,#0a2a3a 0%,#0d1a2a 60%,#0a0a0a 100%)' },
  'Detailing':       { emoji:'✨', gradient:'linear-gradient(135deg,#1a1500 0%,#2a1e00 50%,#0a0a0a 100%)' },
  'Glass Polishing': { emoji:'🔍', gradient:'linear-gradient(135deg,#001a2a 0%,#002233 50%,#0a0a0a 100%)' },
  'Ceramic Coating': { emoji:'🛡️', gradient:'linear-gradient(135deg,#1a0a2a 0%,#1e0a30 50%,#0a0a0a 100%)' },
  'Paint Protection':{ emoji:'🎨', gradient:'linear-gradient(135deg,#2a0a0a 0%,#1a0808 50%,#0a0a0a 100%)' },
  'Interior':        { emoji:'🪑', gradient:'linear-gradient(135deg,#0a1a0a 0%,#0d2010 50%,#0a0a0a 100%)' },
  'Engine Cleaning': { emoji:'⚙️', gradient:'linear-gradient(135deg,#1a1a1a 0%,#222 50%,#0a0a0a 100%)' },
}
function catMeta(name: string) {
  return CAT_META[name] ?? { emoji:'🚗', gradient:'linear-gradient(135deg,#181818 0%,#0a0a0a 100%)' }
}

// ── Dubai areas fallback ───────────────────────────────────────────────────────
const DUBAI_AREAS = [
  'JVC - Jumeirah Village Circle','JVT - Jumeirah Village Triangle',
  'Downtown Dubai','Dubai Marina','Palm Jumeirah','Business Bay','DIFC',
  'Jumeirah','Al Barsha','Mirdif','Deira','Bur Dubai','Al Quoz',
  'Dubai Hills Estate','Arabian Ranches','Motor City','Sports City',
  'Discovery Gardens','International City','Silicon Oasis','Academic City',
  'Al Furjan','Damac Hills','Town Square','Mudon','Reem','Nad Al Sheba',
  'Al Warqa','Rashidiya','Muhaisnah','Al Nahda','Al Qusais','Karama',
  'Satwa','Mankhool','Al Fahidi','Creek','Festival City','Ras Al Khor',
  'Jebel Ali','Dubai South','Blue Waters','City Walk','La Mer',
  'Umm Suqeim','Al Safa','Al Wasl','Al Manara',
]

// ── Types ──────────────────────────────────────────────────────────────────────
interface Category  { id:string; name:string; description:string; color:string }
interface Service   { id:string; name:string; description:string; base_price:number; duration:string; duration_hrs:string; category:string }
interface TimeSlot  { start:number; startLabel:string; endLabel:string }
interface CustomerForm {
  full_name:string; whatsapp:string; vehicle_model:string; plate_number:string
  address:string; area:string; community:string; villa_flat:string; address_notes:string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Helpers ────────────────────────────────────────────────────────────────────
function toYMD(d:Date):string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatHour(hour:number):string {
  const h=Math.floor(hour), m=Math.round((hour%1)*60)
  const period=h>=12?'PM':'AM', dh=h>12?h-12:h===0?12:h
  return `${dh}:${m===0?'00':String(m).padStart(2,'0')} ${period}`
}
function getDays(weekOffset:number):Date[] {
  const days:Date[]=[]; const today=new Date()
  for(let i=0;i<7;i++){const d=new Date(today);d.setDate(today.getDate()+weekOffset*7+i);days.push(d)}
  return days
}
function getServiceDurationHours(svc:Service|null):number {
  if(!svc)return 1
  const raw=svc.duration||svc.duration_hrs||''; const num=parseFloat(raw)
  if(!isNaN(num))return num
  const m=raw.match(/(\d+(\.\d+)?)/); return m?parseFloat(m[1]):1
}
function generateTimeSlots(_svc:Service|null):TimeSlot[] {
  const slots:TimeSlot[]=[]
  for(let hour=9;hour<=18;hour++){
    slots.push({start:hour,startLabel:formatHour(hour),endLabel:formatHour(hour+1)})
  }
  return slots
}
function slotToUTC(date:Date,hourStart:number):string {
  const ymd=toYMD(date)
  const hStr=String(Math.floor(hourStart)).padStart(2,'0')
  const mStr=String(Math.round((hourStart%1)*60)).padStart(2,'0')
  return new Date(`${ymd}T${hStr}:${mStr}:00.000+04:00`).toISOString()
}
function utcToHour(iso:string):number {
  const d=new Date(iso); return ((d.getUTCHours()+4)%24)+d.getUTCMinutes()/60
}
function buildAddress(f:CustomerForm):string {
  return [f.address,f.villa_flat,f.area,f.community,f.address_notes].filter(Boolean).join(', ')
}

// ── Shared dark input style ────────────────────────────────────────────────────
const INP:React.CSSProperties = {
  width:'100%', padding:'14px 16px', background:'#1a1a1a',
  border:`1px solid ${BORDER2}`, borderRadius:8, color:TEXT,
  fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'Outfit,sans-serif',
}

// ── Small components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div style={{ textAlign:'center', paddingBottom:32, borderBottom:`1px solid ${BORDER}`, marginBottom:32 }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:6 }}>
        <div style={{
          width:36, height:36, background:GOLD, borderRadius:6,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:900, color:'#000', letterSpacing:'-0.5px',
        }}>S</div>
        <span style={{ color:GOLD, fontSize:22, fontWeight:900, letterSpacing:'3px', textTransform:'uppercase' }}>
          SAFFI
        </span>
      </div>
      <div style={{ color:MUTED, fontSize:10, letterSpacing:'4px', textTransform:'uppercase' }}>
        LUXURY DETAILING
      </div>
    </div>
  )
}

function ProgressBar({ step }:{ step:number }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:32 }}>
      {[1,2,3,4,5].map(s => (
        <div key={s} style={{
          height:2,
          width: s===step ? 28 : 8,
          borderRadius:1,
          background: s<=step ? GOLD : BORDER2,
          transition:'all 0.3s',
        }}/>
      ))}
    </div>
  )
}

function Back({ onClick }:{ onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      background:'none', border:'none', cursor:'pointer',
      color:GOLD, fontSize:13, fontWeight:600,
      padding:0, marginBottom:24, fontFamily:'Outfit,sans-serif',
      letterSpacing:'0.02em',
    }}>← Back</button>
  )
}

function PrimaryBtn({ children, onClick, disabled=false, loading=false }:{
  children:React.ReactNode; onClick?:()=>void; disabled?:boolean; loading?:boolean
}) {
  const off=disabled||loading
  return (
    <button onClick={onClick} disabled={off} style={{
      width:'100%', padding:'16px', background: off ? '#3a3000' : GOLD,
      color: off ? '#888' : '#000', border:'none', borderRadius:6,
      fontSize:15, fontWeight:800, cursor: off ? 'not-allowed':'pointer',
      fontFamily:'Outfit,sans-serif', letterSpacing:'0.5px', marginTop:8,
      transition:'background 0.15s',
    }}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}

function Skeleton({ h=160 }:{ h?:number }) {
  return (
    <div style={{
      height:h, borderRadius:10,
      background:'linear-gradient(90deg,#161616 25%,#1e1e1e 50%,#161616 75%)',
      backgroundSize:'600px 100%', animation:'shimmer 1.4s infinite',
    }}/>
  )
}

function FLabel({ children, required, optional }:{
  children:React.ReactNode; required?:boolean; optional?:boolean
}) {
  return (
    <div style={{ color:MUTED, fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:'0.04em',
      display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
      {children}
      {required  && <span style={{ color:RED }}>*</span>}
      {optional  && <span style={{ color:DIM, fontWeight:400, fontSize:11 }}>(optional)</span>}
    </div>
  )
}

function SectionDivider({ label }:{ label:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'24px 0 18px' }}>
      <div style={{ flex:1, height:1, background:BORDER }}/>
      <span style={{ color:DIM, fontSize:10, fontWeight:700, whiteSpace:'nowrap', letterSpacing:'0.12em' }}>
        {label}
      </span>
      <div style={{ flex:1, height:1, background:BORDER }}/>
    </div>
  )
}

function ConfirmRow({ label, value, gold=false }:{ label:string; value:string; gold?:boolean }) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:8 }}>
      <span style={{ fontSize:12, color:MUTED, minWidth:96, flexShrink:0, letterSpacing:'0.02em' }}>{label}</span>
      <span style={{ fontSize:13, color: gold ? GOLD : TEXT, fontWeight: gold ? 600 : 400 }}>{value}</span>
    </div>
  )
}

// ── Address search ─────────────────────────────────────────────────────────────
function AddressSearch({ value, onChange, onAreaChange, onCommunityChange }:{
  value:string; onChange:(v:string)=>void; onAreaChange:(v:string)=>void; onCommunityChange:(v:string)=>void
}) {
  const [suggestions,setSuggestions] = useState<string[]>([])
  const [showDrop,setShowDrop]       = useState(false)
  const [googleReady,setGoogleReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const key=process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if(!key)return
    if((window as any).google?.maps?.places){setGoogleReady(true);return}
    const ex=document.getElementById('gmap-script')
    if(ex){ex.addEventListener('load',()=>setGoogleReady(true));return}
    const s=document.createElement('script')
    s.id='gmap-script'; s.async=true
    s.src=`https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    s.onload=()=>setGoogleReady(true)
    document.head.appendChild(s)
  },[])

  useEffect(()=>{
    if(!googleReady||!inputRef.current)return
    const g=(window as any).google
    if(!g?.maps?.places)return
    const ac=new g.maps.places.Autocomplete(inputRef.current,{
      componentRestrictions:{country:'ae'},
      fields:['formatted_address','address_components'], types:['address'],
    })
    ac.addListener('place_changed',()=>{
      const pl=ac.getPlace(); if(!pl.formatted_address)return
      const comps:Array<{types:string[];long_name:string}>=pl.address_components||[]
      const get=(t:string)=>comps.find(c=>c.types.includes(t))?.long_name||''
      onChange(pl.formatted_address)
      onAreaChange(get('sublocality_level_1')||get('sublocality')||get('neighborhood'))
      onCommunityChange(get('locality')||get('administrative_area_level_2'))
    })
  },[googleReady,onChange,onAreaChange,onCommunityChange])

  function handleChange(v:string){
    onChange(v)
    if(googleReady)return
    if(v.length>=2){
      const f=DUBAI_AREAS.filter(a=>a.toLowerCase().includes(v.toLowerCase())).slice(0,6)
      setSuggestions(f); setShowDrop(f.length>0)
    } else setShowDrop(false)
  }
  function pick(s:string){
    onChange(s); const p=s.split(' - ')
    onAreaChange(p[0]); onCommunityChange(p[1]??''); setShowDrop(false)
  }
  useEffect(()=>{
    function h(e:MouseEvent){
      if(dropRef.current&&!dropRef.current.contains(e.target as Node)&&
         inputRef.current&&!inputRef.current.contains(e.target as Node))setShowDrop(false)
    }
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  return (
    <div style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input ref={inputRef} id="address-autocomplete" value={value}
          onChange={e=>handleChange(e.target.value)}
          onFocus={()=>!googleReady&&suggestions.length>0&&setShowDrop(true)}
          placeholder="Search area, community or address…"
          autoComplete="off" style={{ ...INP, paddingLeft:42 }}/>
        <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
          color:MUTED, fontSize:15, pointerEvents:'none' }}>🔍</span>
      </div>
      {showDrop&&suggestions.length>0&&(
        <div ref={dropRef} style={{
          position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
          background:CARD2, border:`1px solid ${BORDER2}`, borderRadius:10,
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:200, overflow:'hidden',
        }}>
          {suggestions.map((s,i)=>(
            <div key={i} onMouseDown={()=>pick(s)} style={{
              padding:'12px 16px', cursor:'pointer', fontSize:13, color:TEXT,
              borderBottom:i<suggestions.length-1?`1px solid ${BORDER}`:'none',
              display:'flex', alignItems:'center', gap:10,
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='#222')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              <span>📍</span>{s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Category card — large dark with emoji + gradient ───────────────────────────
function CategoryCard({ cat, svcCount, onClick }:{
  cat:Category; svcCount:number; onClick:()=>void
}) {
  const [hov,setHov]=useState(false)
  const meta=catMeta(cat.name)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        minHeight:170, borderRadius:12, overflow:'hidden',
        background: meta.gradient,
        border:`1px solid ${hov ? GOLD+'80' : BORDER}`,
        cursor:'pointer', padding:'20px 16px', textAlign:'left',
        fontFamily:'Outfit,sans-serif', transition:'all 0.2s',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        boxShadow: hov ? `0 0 24px ${GOLD}18, 0 4px 16px rgba(0,0,0,0.5)` : '0 2px 8px rgba(0,0,0,0.4)',
        transform: hov ? 'translateY(-2px)' : 'none',
        position:'relative',
      }}>
      {/* Glow accent corner */}
      <div style={{
        position:'absolute', top:0, right:0, width:80, height:80,
        background: hov ? `radial-gradient(circle at 100% 0%, ${GOLD}20 0%, transparent 70%)` : 'none',
        pointerEvents:'none',
      }}/>
      {/* Emoji */}
      <div style={{ fontSize:36, lineHeight:1, marginBottom:12 }}>{meta.emoji}</div>
      <div>
        <div style={{ fontSize:16, fontWeight:800, color:TEXT, marginBottom:4, letterSpacing:'0.02em' }}>
          {cat.name}
        </div>
        {cat.description && (
          <div style={{ fontSize:12, color:MUTED, lineHeight:1.5, marginBottom:8,
            overflow:'hidden', display:'-webkit-box',
            WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
            {cat.description}
          </div>
        )}
        <div style={{ fontSize:11, color: hov ? GOLD : MUTED, fontWeight:700, letterSpacing:'0.06em' }}>
          {svcCount} SERVICE{svcCount!==1?'S':''} &nbsp;→
        </div>
      </div>
    </button>
  )
}

// ── Service card ───────────────────────────────────────────────────────────────
function ServiceCard({ svc, onClick }:{ svc:Service; onClick:()=>void }) {
  const [hov,setHov]=useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: hov ? CARD2 : CARD,
        border:`1px solid ${hov ? GOLD+'60' : BORDER}`,
        borderRadius:10, padding:'16px 18px', cursor:'pointer', textAlign:'left',
        width:'100%', fontFamily:'Outfit,sans-serif', transition:'all 0.15s', display:'block',
        boxShadow: hov ? `0 0 20px ${GOLD}12` : 'none',
      }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:TEXT, marginBottom:5 }}>{svc.name}</div>
          {svc.description && (
            <div style={{ fontSize:13, color:MUTED, lineHeight:1.55, overflow:'hidden',
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>
              {svc.description}
            </div>
          )}
          {(svc.duration||svc.duration_hrs) && (
            <div style={{ fontSize:12, color:DIM, marginTop:6 }}>{svc.duration||svc.duration_hrs}</div>
          )}
        </div>
        {svc.base_price!=null && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:GOLD }}>AED {svc.base_price}</div>
            <div style={{ fontSize:11, color:RED, marginTop:3 }}>
              +VAT = AED {(svc.base_price*1.05).toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function BookingPage() {
  const [step,setStep]             = useState(1)
  const [loading,setLoading]       = useState(true)
  const [saving,setSaving]         = useState(false)
  const [done,setDone]             = useState(false)
  const [err,setErr]               = useState('')
  const [weekOffset,setWeekOffset] = useState(0)

  const [categories,setCategories]   = useState<Category[]>([])
  const [services,setServices]       = useState<Service[]>([])
  const [availSlots,setAvailSlots]   = useState<string[]>([])
  const [blockedMap,setBlockedMap]   = useState<Record<string,string>>({})
  const [loadingSlots,setLoadingSlots] = useState(false)

  const [selCategory,setSelCategory] = useState<Category|null>(null)
  const [selService, setSelService]  = useState<Service|null>(null)
  const [selDate,    setSelDate]     = useState<Date|null>(null)
  const [selTime,    setSelTime]     = useState<number|null>(null)
  const [paymentMethod,setPaymentMethod] = useState<'online'|'cash'>('cash')

  const [cf,setCf_] = useState<CustomerForm>({
    full_name:'',whatsapp:'',vehicle_model:'',plate_number:'',
    address:'',area:'',community:'',villa_flat:'',address_notes:'',
  })
  const setCf = useCallback((k:keyof CustomerForm,v:string)=>setCf_(p=>({...p,[k]:v})),[])

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(()=>{
    async function load(){
      const sb=createClient()
      const [{data:cats,error:ce},{data:svcs,error:se}]=await Promise.all([
        sb.from('service_categories').select('*').eq('is_active',true).order('sort_order'),
        sb.from('services').select('*').eq('is_active',true).order('name'),
      ])
      if(ce)console.error('[booking] categories:',ce.message)
      if(se)console.error('[booking] services:',se.message)
      const activeSvcs=svcs??[]
      setServices(activeSvcs)
      setCategories((cats??[]).filter(cat=>activeSvcs.some((s:Service)=>s.category===cat.name)))
      setLoading(false)
    }
    load()
  },[])

  // ── Availability from API (replaces simple takenHours) ───────────────────
  useEffect(()=>{
    if(!selDate||!selService)return
    setAvailSlots([]);setBlockedMap({});setLoadingSlots(true)
    fetch(`/api/availability?date=${toYMD(selDate)}&service_id=${selService.id}`)
      .then(r=>r.json())
      .then(({available,blocked})=>{
        setAvailSlots(available??[])
        const m:Record<string,string>={}
        for(const b of (blocked??[])) m[b.slot]=b.reason
        setBlockedMap(m)
      })
      .catch(e=>console.error('[availability]',e))
      .finally(()=>setLoadingSlots(false))
  },[selDate,selService])

  // ── Price ──────────────────────────────────────────────────────────────────
  const servicePrice = selService?.base_price ?? 0
  const vatAmount    = parseFloat((servicePrice*0.05).toFixed(2))
  const totalAmount  = parseFloat((servicePrice*1.05).toFixed(2))

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit(){
    if(!selService||!selDate||selTime===null)return
    setSaving(true); setErr('')
    const {error:dbErr}=await createClient().from('booking_requests').insert({
      service_id:selService.id, service_name:selService.name,
      scheduled_at:slotToUTC(selDate,selTime),
      customer_name:cf.full_name, customer_phone:cf.whatsapp,
      vehicle_make_model:cf.vehicle_model||null, plate:cf.plate_number||null,
      address:buildAddress(cf)||null,
      vehicle_model:cf.vehicle_model||null, plate_number:cf.plate_number||null,
      villa_flat:cf.villa_flat||null, area:cf.area||null,
      community:cf.community||null, address_notes:cf.address_notes||null,
      price:servicePrice||null,
      vat:servicePrice?vatAmount:null, total_amount:servicePrice?totalAmount:null,
      payment_method:paymentMethod, status:'pending',
    })
    setSaving(false)
    if(dbErr){setErr(dbErr.message);return}
    setDone(true)
  }

  const filteredServices = services.filter(s=>s.category===selCategory?.name)
  const days             = getDays(weekOffset)
  const timeSlots        = generateTimeSlots(selService)
  const durationHrs      = getServiceDurationHours(selService)

  function timeLabel(){
    return selTime!==null?`${formatHour(selTime)} — ${formatHour(selTime+durationHrs)}`:''
  }
  function resetAll(){
    setDone(false);setStep(1);setWeekOffset(0);setPaymentMethod('cash')
    setSelCategory(null);setSelService(null);setSelDate(null);setSelTime(null)
    setCf_({full_name:'',whatsapp:'',vehicle_model:'',plate_number:'',
      address:'',area:'',community:'',villa_flat:'',address_notes:''})
  }

  // ── Page shell ─────────────────────────────────────────────────────────────
  const shell = (children:React.ReactNode) => (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:'Outfit,sans-serif', color:TEXT }}>
      <style>{`
        @keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        *{box-sizing:border-box;}
        input::placeholder,textarea::placeholder{color:#444;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${GOLD}40;border-radius:2px;}
      `}</style>
      <main style={{ maxWidth:480, margin:'0 auto', padding:'40px 16px 72px' }}>
        <PageHeader/>
        {children}
      </main>
    </div>
  )

  // ── DONE screen ────────────────────────────────────────────────────────────
  if(done) return shell(
    <div style={{ textAlign:'center', paddingTop:24 }}>
      <div style={{
        width:72, height:72, borderRadius:'50%',
        background:`${GOLD}15`, border:`1px solid ${GOLD}60`,
        display:'flex', alignItems:'center', justifyContent:'center',
        margin:'0 auto 28px', fontSize:28, color:GOLD,
      }}>✓</div>
      <h2 style={{ color:TEXT, fontSize:26, fontWeight:800, marginBottom:12, letterSpacing:'0.02em' }}>
        Booking Received
      </h2>
      <p style={{ color:MUTED, fontSize:15, marginBottom:10, lineHeight:1.7 }}>
        Thank you, <strong style={{ color:TEXT }}>{cf.full_name}</strong>. Your booking for{' '}
        <strong style={{ color:GOLD }}>{selService?.name}</strong> on{' '}
        <strong style={{ color:TEXT }}>{selDate?toYMD(selDate):''}</strong> at{' '}
        <strong style={{ color:GOLD }}>{timeLabel()}</strong> has been received.
      </p>
      <p style={{ color:DIM, fontSize:13, marginBottom:36 }}>
        We will contact you on <strong style={{ color:TEXT }}>{cf.whatsapp}</strong> to confirm.
      </p>
      <button onClick={resetAll} style={{
        padding:'12px 28px', borderRadius:6, background:'transparent',
        border:`1px solid ${GOLD}60`, color:GOLD, fontSize:13, fontWeight:700,
        cursor:'pointer', fontFamily:'Outfit,sans-serif', letterSpacing:'0.5px',
      }}>Book Another Service</button>
    </div>
  )

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return shell(
    <>
      <ProgressBar step={step}/>

      {/* ── STEP 1: Categories ──────────────────────────────────────────────── */}
      {step===1&&(
        <section>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:TEXT, letterSpacing:'0.02em' }}>
            Select a Category
          </h1>
          <p style={{ color:MUTED, fontSize:14, marginBottom:28 }}>
            What type of service are you looking for?
          </p>
          {loading?(
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[1,2,3,4].map(i=><Skeleton key={i} h={170}/>)}
            </div>
          ):categories.length===0?(
            <p style={{ color:MUTED, textAlign:'center', padding:40 }}>
              No services available at the moment.
            </p>
          ):(
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
              {categories.map(cat=>(
                <CategoryCard key={cat.id} cat={cat}
                  svcCount={services.filter(s=>s.category===cat.name).length}
                  onClick={()=>{setSelCategory(cat);setStep(2)}}/>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── STEP 2: Services ────────────────────────────────────────────────── */}
      {step===2&&selCategory&&(
        <section>
          <Back onClick={()=>setStep(1)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:TEXT }}>{selCategory.name}</h1>
          <p style={{ color:MUTED, fontSize:14, marginBottom:24 }}>Select a service to continue</p>
          {filteredServices.length===0?(
            <div style={{ textAlign:'center', padding:48 }}>
              <p style={{ color:MUTED, marginBottom:16 }}>No services in this category yet.</p>
              <button onClick={()=>setStep(1)} style={{
                background:'none', border:`1px solid ${BORDER2}`, color:MUTED,
                padding:'9px 18px', borderRadius:6, cursor:'pointer',
                fontFamily:'Outfit,sans-serif', fontSize:13,
              }}>← Choose another category</button>
            </div>
          ):(
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filteredServices.map(svc=>(
                <ServiceCard key={svc.id} svc={svc}
                  onClick={()=>{setSelService(svc);setStep(3)}}/>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3: Date & Time ─────────────────────────────────────────────── */}
      {step===3&&(
        <section>
          <Back onClick={()=>setStep(2)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:24, color:TEXT }}>Date &amp; Time</h1>

          {/* Date picker */}
          <div style={{
            background:CARD, border:`1px solid ${BORDER}`, borderRadius:12,
            padding:20, marginBottom:12,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:TEXT, letterSpacing:'0.04em' }}>SELECT DATE</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>setWeekOffset(p=>Math.max(0,p-1))} disabled={weekOffset===0}
                  style={{
                    width:32, height:32, borderRadius:'50%',
                    background: weekOffset===0 ? 'transparent' : CARD2,
                    border:`1px solid ${weekOffset===0?BORDER:BORDER2}`,
                    cursor: weekOffset===0?'not-allowed':'pointer',
                    fontSize:16, color: weekOffset===0?DIM:TEXT,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>‹</button>
                <button onClick={()=>setWeekOffset(p=>p+1)}
                  style={{
                    width:32, height:32, borderRadius:'50%', background:CARD2,
                    border:`1px solid ${BORDER2}`, cursor:'pointer', fontSize:16, color:TEXT,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>›</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {days.map((date,idx)=>{
                const today=new Date()
                const isToday=today.toDateString()===date.toDateString()
                const isPast=date<today&&!isToday
                const isSel=selDate?.toDateString()===date.toDateString()
                return (
                  <div key={idx}
                    onClick={()=>{if(!isPast){setSelDate(date);setSelTime(null)}}}
                    style={{
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                      padding:'10px 2px', borderRadius:8,
                      cursor: isPast?'not-allowed':'pointer',
                      background: isSel ? GOLD : 'transparent',
                      border: isSel ? `1px solid ${GOLD}` : '1px solid transparent',
                      opacity: isPast?0.25:1,
                      transition:'all 0.15s', userSelect:'none',
                    }}>
                    <div style={{ color:isSel?'#000':MUTED, fontSize:9, fontWeight:600, marginBottom:3, letterSpacing:'0.04em' }}>
                      {DAY_NAMES[date.getDay()]}
                    </div>
                    <div style={{ color:isSel?'#000':TEXT, fontSize:16, fontWeight:700, marginBottom:2 }}>
                      {date.getDate()}
                    </div>
                    <div style={{ color:isSel?'#000':DIM, fontSize:9 }}>
                      {MONTH_NAMES[date.getMonth()]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selDate&&(
            <div style={{
              background:CARD, border:`1px solid ${BORDER}`, borderRadius:12,
              padding:20, marginBottom:12,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:TEXT, letterSpacing:'0.04em' }}>SELECT TIME</div>
                {loadingSlots&&(
                  <div style={{ fontSize:11, color:MUTED }}>Checking availability…</div>
                )}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                {timeSlots.map((slot,idx)=>{
                  const slotKey=`${String(Math.floor(slot.start)).padStart(2,'0')}:00`
                  const isBlocked=slotKey in blockedMap
                  const isSel=selTime===slot.start
                  const blockReason=blockedMap[slotKey]
                  return (
                    <button key={idx}
                      onClick={()=>!isBlocked&&!loadingSlots&&setSelTime(slot.start)}
                      disabled={isBlocked||loadingSlots}
                      title={isBlocked?blockReason:undefined}
                      style={{
                        padding:'13px 10px', borderRadius:6, textAlign:'center',
                        border: isSel ? `1px solid ${GOLD}` : isBlocked ? `1px solid ${BORDER}` : `1px solid ${GOLD}40`,
                        background: isSel ? GOLD : isBlocked ? '#0f0f0f' : 'transparent',
                        color: isSel ? '#000' : isBlocked ? DIM : GOLD,
                        fontSize:13, fontWeight: isSel?700:500, lineHeight:1.4,
                        cursor: isBlocked||loadingSlots?'not-allowed':'pointer',
                        fontFamily:'Outfit,sans-serif', transition:'all 0.15s',
                        opacity: loadingSlots&&!isSel ? 0.5 : 1,
                      }}>
                      {slot.startLabel}
                      {isBlocked&&<div style={{fontSize:9,color:DIM,marginTop:2}}>no disponible</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <PrimaryBtn onClick={()=>{if(selDate&&selTime!==null)setStep(4)}}
            disabled={!selDate||selTime===null}>
            Continue
          </PrimaryBtn>
        </section>
      )}

      {/* ── STEP 4: Details ─────────────────────────────────────────────────── */}
      {step===4&&(
        <section>
          <Back onClick={()=>setStep(3)}/>
          <h1 style={{ fontSize:22, fontWeight:800, color:TEXT, marginBottom:4 }}>Your Details</h1>
          <p style={{ color:MUTED, fontSize:14, marginBottom:24 }}>
            Fill in your information to complete the booking
          </p>

          {/* Summary pill */}
          <div style={{
            background:CARD, border:`1px solid ${BORDER}`, borderRadius:10,
            padding:'14px 16px', marginBottom:24,
            display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
          }}>
            <div>
              <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Service</div>
              <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{selService?.name}</div>
              {selService?.base_price!=null&&(
                <div style={{ fontSize:13, color:GOLD, fontWeight:700, marginTop:2 }}>AED {selService.base_price}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Date &amp; Time</div>
              <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>
                {selDate?.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
              </div>
              {selTime!==null&&(
                <div style={{ fontSize:12, color:GOLD, marginTop:2 }}>{formatHour(selTime)}</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Full Name</FLabel>
            <input value={cf.full_name} onChange={e=>setCf('full_name',e.target.value)}
              placeholder="Your full name" style={INP}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel required>WhatsApp Number</FLabel>
            <input type="tel" value={cf.whatsapp} onChange={e=>setCf('whatsapp',e.target.value)}
              placeholder="+971 XX XXX XXXX" style={INP}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel required>Vehicle Plate Number</FLabel>
            <input value={cf.plate_number} onChange={e=>setCf('plate_number',e.target.value)}
              placeholder="Enter plate number" style={INP}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel optional>Vehicle Make &amp; Model</FLabel>
            <input value={cf.vehicle_model} onChange={e=>setCf('vehicle_model',e.target.value)}
              placeholder="e.g. Toyota Land Cruiser 2023" style={INP}/>
          </div>

          <SectionDivider label="SERVICE ADDRESS"/>

          <div style={{ marginBottom:16 }}>
            <FLabel required>Search Location</FLabel>
            <AddressSearch value={cf.address}
              onChange={v=>setCf('address',v)}
              onAreaChange={v=>setCf('area',v)}
              onCommunityChange={v=>setCf('community',v)}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel required>Area Name</FLabel>
            <input value={cf.area} onChange={e=>setCf('area',e.target.value)}
              placeholder="Enter area name" style={INP}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel required>Community Name</FLabel>
            <input value={cf.community} onChange={e=>setCf('community',e.target.value)}
              placeholder="Enter community name" style={INP}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <FLabel required>Villa / Flat Number</FLabel>
            <input value={cf.villa_flat} onChange={e=>setCf('villa_flat',e.target.value)}
              placeholder="Enter villa/flat number" style={INP}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <FLabel optional>Other Address Details</FLabel>
            <textarea value={cf.address_notes} onChange={e=>setCf('address_notes',e.target.value)}
              placeholder="Parking spot, building access, etc."
              rows={3} style={{ ...INP, resize:'none' }}/>
          </div>

          {err&&<p style={{ color:RED, fontSize:13, marginBottom:12 }}>{err}</p>}

          <PrimaryBtn onClick={()=>{
            if(!cf.full_name.trim()||!cf.whatsapp.trim()||
               !cf.plate_number.trim()||!cf.address.trim()||
               !cf.area.trim()||!cf.community.trim()||!cf.villa_flat.trim()){
              setErr('Please fill in all required fields.'); return
            }
            setErr(''); setStep(5)
          }}>Continue</PrimaryBtn>
        </section>
      )}

      {/* ── STEP 5: Confirm ─────────────────────────────────────────────────── */}
      {step===5&&(
        <section>
          <Back onClick={()=>setStep(4)}/>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, color:TEXT }}>Confirm Booking</h1>
          <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>Review your details before confirming</p>

          {/* Summary card */}
          <div style={{
            background:CARD, border:`1px solid ${BORDER}`, borderRadius:12,
            overflow:'hidden', marginBottom:20,
          }}>
            {/* Service + price */}
            <div style={{ padding:'16px 18px', borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Service</div>
              <div style={{ fontSize:17, fontWeight:700, color:TEXT }}>{selService?.name}</div>
              {selService?.duration&&(
                <div style={{ fontSize:12, color:MUTED, marginTop:3 }}>{selService.duration}</div>
              )}
              {selService?.base_price!=null&&(
                <div style={{ marginTop:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    padding:'9px 0', borderBottom:`1px solid ${BORDER}` }}>
                    <span style={{ color:MUTED, fontSize:13 }}>Subtotal</span>
                    <span style={{ color:TEXT, fontSize:13, fontWeight:600 }}>AED {servicePrice.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    padding:'9px 0', borderBottom:`1px solid ${BORDER}` }}>
                    <span style={{ color:MUTED, fontSize:13 }}>VAT (5%)</span>
                    <span style={{ color:MUTED, fontSize:13 }}>AED {vatAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0' }}>
                    <span style={{ color:TEXT, fontSize:16, fontWeight:800 }}>Total</span>
                    <span style={{ color:GOLD, fontSize:22, fontWeight:900 }}>AED {totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Date/Time */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}`,
              display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Date</div>
                <div style={{ fontSize:14, fontWeight:600, color:TEXT }}>{selDate?toYMD(selDate):'—'}</div>
              </div>
              <div>
                <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Time</div>
                <div style={{ fontSize:14, fontWeight:600, color:GOLD }}>{timeLabel()}</div>
              </div>
            </div>

            {/* Customer */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Customer</div>
              <ConfirmRow label="Name"     value={cf.full_name}/>
              <ConfirmRow label="WhatsApp" value={cf.whatsapp} gold/>
              {cf.vehicle_model&&<ConfirmRow label="Vehicle" value={cf.vehicle_model}/>}
              {cf.plate_number &&<ConfirmRow label="Plate"   value={cf.plate_number}/>}
            </div>

            {/* Address */}
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:9, color:DIM, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Service Address</div>
              {cf.area         &&<ConfirmRow label="Area"       value={cf.area}/>}
              {cf.community    &&<ConfirmRow label="Community"  value={cf.community}/>}
              {cf.villa_flat   &&<ConfirmRow label="Villa/Flat" value={cf.villa_flat}/>}
              {cf.address_notes&&<ConfirmRow label="Notes"      value={cf.address_notes}/>}
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:MUTED, letterSpacing:'0.08em',
              textTransform:'uppercase', marginBottom:12 }}>Payment Method</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {(['online','cash'] as const).map(method=>{
                const isSel=paymentMethod===method
                return (
                  <div key={method} onClick={()=>setPaymentMethod(method)} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'14px 16px',
                    background: isSel ? `${GOLD}10` : CARD,
                    border:`1px solid ${isSel?GOLD:BORDER}`,
                    borderRadius:8, cursor:'pointer', transition:'all 0.2s',
                  }}>
                    <div style={{
                      width:34, height:34, borderRadius:'50%', flexShrink:0,
                      background: isSel ? `${GOLD}20` : CARD2,
                      border:`1px solid ${isSel?GOLD:BORDER2}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {method==='online'?(
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke={isSel?GOLD:DIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      ):(
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke={isSel?GOLD:DIM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23"/>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ color:isSel?GOLD:TEXT, fontSize:14, fontWeight:isSel?700:500 }}>
                      {method==='online'?'Online':'Cash'}
                    </span>
                    {isSel&&(
                      <div style={{ marginLeft:'auto', color:GOLD, fontSize:14, fontWeight:900 }}>✓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize:11, color:DIM, marginBottom:12, lineHeight:1.7, letterSpacing:'0.02em' }}>
            By confirming you agree to our terms. Our team will contact you via WhatsApp to confirm.
          </p>
          {err&&<p style={{ color:RED, fontSize:13, marginBottom:8 }}>{err}</p>}
          <PrimaryBtn onClick={submit} loading={saving}>Confirm Booking ✓</PrimaryBtn>
        </section>
      )}
    </>
  )
}