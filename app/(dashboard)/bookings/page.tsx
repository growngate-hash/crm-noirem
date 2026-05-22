'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createNotification } from '@/utils/createNotification'
import {
  toDubaiTime, formatHoraDubai, getHoraDecimalDubai,
  dubaiToUTC, getDubaiToday, dubaiDayRange,
} from '@/utils/timezone'

// ── shared UI ─────────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%', background:'#1a1a1e', borderRadius:8, padding:'10px 12px',
  color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box',
}
function MInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc,setFoc] = useState(false)
  return <input {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}}
    style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`, ...props.style}}/>
}
function MSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc,setFoc] = useState(false)
  return <select {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}}
    style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,cursor:'pointer', ...props.style}}/>
}
function MTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc,setFoc] = useState(false)
  return <textarea {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}}
    style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,resize:'vertical', ...props.style}}/>
}
function MLabel({ children }: { children: React.ReactNode }) {
  return <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',
    letterSpacing:'0.08em',color:'#888580',marginBottom:6}}>{children}</label>
}

// ── Tech chips ────────────────────────────────────────────────────────────────
function TechTag({ name, onRemove }: { name:string; onRemove:()=>void }) {
  const [hov,setHov] = useState(false)
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,
      background:'rgba(201,168,76,0.12)',border:`1px solid ${hov?'rgba(255,79,79,0.45)':'rgba(201,168,76,0.35)'}`,
      color:'#c9a84c',fontSize:11,fontWeight:600}}>
      {name}
      <button type="button" onClick={onRemove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',
          color:hov?'#ff4f4f':'#888580',lineHeight:1}}><X size={10}/></button>
    </span>
  )
}
const FALLBACK_TECHS = ['Mohammed A.','Carlos R.','Ivan P.','Yimmer','Ahmed H.']
function TechDropRow({ name, onPick }: { name:string; onPick:()=>void }) {
  const [hov,setHov] = useState(false)
  return <div onClick={onPick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{padding:'10px 12px',cursor:'pointer',fontSize:13,color:'#f0ede8',fontFamily:'Outfit,sans-serif',
      background:hov?'rgba(201,168,76,0.1)':'transparent'}}>{name}</div>
}
function TechPicker({ selected, onChange, pool }: { selected:string[]; onChange:(v:string[])=>void; pool:string[] }) {
  const [query,setQuery] = useState('')
  const [open,setOpen]   = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const src      = pool.length>0 ? pool : FALLBACK_TECHS
  const filtered = src.filter(t=>t.toLowerCase().includes(query.toLowerCase())&&!selected.includes(t))
  const canAdd   = query.trim()&&!src.includes(query.trim())&&!selected.includes(query.trim())
  function add(n:string) { if(!n.trim()||selected.includes(n)) return; onChange([...selected,n]); setQuery(''); setOpen(false) }
  function remove(n:string) { onChange(selected.filter(t=>t!==n)) }
  useEffect(()=>{
    function outside(e:MouseEvent) { if(wrapRef.current&&!wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',outside); return ()=>document.removeEventListener('mousedown',outside)
  },[])
  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      {selected.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {selected.map(t=><TechTag key={t} name={t} onRemove={()=>remove(t)}/>)}
      </div>}
      <div style={{position:'relative'}}>
        <MInput placeholder="Buscar técnico…" value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}/>
        {canAdd&&<button type="button" onClick={()=>add(query.trim())}
          style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'#c9a84c',
            border:'none',borderRadius:6,color:'#0d0d0f',fontSize:11,fontWeight:700,padding:'3px 8px',
            cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>+ Agregar</button>}
      </div>
      {open&&filtered.length>0&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
        background:'#1a1a1e',border:'1px solid rgba(201,168,76,0.25)',borderRadius:8,zIndex:810,
        overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
        {filtered.map(t=><TechDropRow key={t} name={t} onPick={()=>add(t)}/>)}
      </div>}
    </div>
  )
}

// ── Gantt constants ───────────────────────────────────────────────────────────
const HORA_INICIO  = 7
const HORA_FIN     = 20
const TOTAL_HORAS  = HORA_FIN - HORA_INICIO   // 13
const VEH_COL_W    = 180
const ROW_H        = 68
const HOURS        = Array.from({length:TOTAL_HORAS},(_,i)=>HORA_INICIO+i) // [7..19]

const DAYS_ABBR = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB']

// ── Gantt position helpers (Dubai UTC+4) ─────────────────────────────────────
function calcLeft(scheduled_at: string): string {
  const h = getHoraDecimalDubai(scheduled_at)
  const pct = ((h - HORA_INICIO) / TOTAL_HORAS) * 100
  return `${Math.max(0, pct).toFixed(3)}%`
}
function calcWidth(scheduled_at: string, end_at: string | null): string {
  const sh = getHoraDecimalDubai(scheduled_at)
  const eh = end_at ? getHoraDecimalDubai(end_at) : sh + 2
  const pct = ((eh - sh) / TOTAL_HORAS) * 100
  return `${Math.max(0.5, pct).toFixed(3)}%`
}
function formatHora(iso: string | null): string {
  return formatHoraDubai(iso)
}

// ── Demo data (shown when DB has no bookings) ─────────────────────────────────
const DEMO_BOOKINGS = [
  { _demo:true, id:'d1', vehicle_name:'Van 01', start_hour:9,  end_hour:12, client:'Tariq Al Sayed',     service:'Stage 2 Correction', status:'confirmed' },
  { _demo:true, id:'d2', vehicle_name:'Van 02', start_hour:15, end_hour:17, client:'Khalid Al Mansoori', service:'Ceramic Coating',     status:'confirmed' },
  { _demo:true, id:'d3', vehicle_name:'Van 04', start_hour:8,  end_hour:11, client:'Ahmad Binhendi',     service:'Full Detail + Wax',   status:'confirmed' },
]

// ── Week helpers ──────────────────────────────────────────────────────────────
function getWeekDays(ref:Date):Date[] {
  const day=ref.getDay(); const mon=new Date(ref)
  mon.setDate(ref.getDate()-(day===0?6:day-1))
  return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x})
}
function sameDay(a:Date,b:Date){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function toDateStr(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function toTimeStr(d:Date){return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}

// ── Status badge ──────────────────────────────────────────────────────────────
function BookingBadge({status}:{status:string}) {
  const M:Record<string,{bg:string;color:string;border:string}>={
    confirmed:  {bg:'rgba(79,163,255,0.1)', color:'#4fa3ff',border:'rgba(79,163,255,0.3)'},
    pending:    {bg:'rgba(251,191,36,0.1)', color:'#fbbf24',border:'rgba(251,191,36,0.3)'},
    completed:  {bg:'rgba(52,211,153,0.1)', color:'#34d399',border:'rgba(52,211,153,0.3)'},
    cancelled:  {bg:'rgba(255,79,79,0.1)',  color:'#ff4f4f',border:'rgba(255,79,79,0.3)'},
    in_progress:{bg:'rgba(201,168,76,0.1)', color:'#c9a84c',border:'rgba(201,168,76,0.3)'},
  }
  const s=M[status?.toLowerCase()]??M['pending']
  return <span style={{padding:'2px 10px',borderRadius:99,fontSize:10,fontWeight:700,
    letterSpacing:'0.06em',background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:'uppercase'}}>
    {status}
  </span>
}
function DetailRow({label,children}:{label:string;children:React.ReactNode}) {
  return <div>
    <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',color:'#888580',marginBottom:4}}>{label}</div>
    <div style={{fontSize:13,color:'#f0ede8'}}>{children}</div>
  </div>
}

// ── GanttBlock (percentage positioned) ───────────────────────────────────────
function GanttBlock({leftPct,widthPct,timeLabel,client,service,status,onClick}:{
  leftPct:string;widthPct:string;timeLabel:string;client:string;service:string;status:string;onClick:()=>void
}) {
  const [hov,setHov] = useState(false)
  const BG:Record<string,string>={
    confirmed:'rgba(201,168,76,0.87)',pending:'rgba(251,191,36,0.78)',
    completed:'rgba(52,211,153,0.80)',cancelled:'rgba(255,79,79,0.68)',in_progress:'rgba(79,163,255,0.85)',
  }
  const bg=BG[status?.toLowerCase()]??BG['confirmed']
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:'absolute',left:leftPct,width:widthPct,top:4,bottom:4,
        background:bg,borderRadius:6,padding:'4px 8px',cursor:'pointer',overflow:'hidden',
        transition:'filter 0.15s,box-shadow 0.15s',minWidth:20,
        filter:hov?'brightness(1.12)':'brightness(1)',
        boxShadow:hov?'0 4px 14px rgba(0,0,0,0.45)':'0 2px 6px rgba(0,0,0,0.3)'}}>
      <div style={{fontSize:10,fontWeight:600,color:'rgba(0,0,0,0.65)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
        {timeLabel}
      </div>
      <div style={{fontSize:12,fontWeight:700,color:'#0d0d0f',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>
        {client}
      </div>
      <div style={{fontSize:11,color:'rgba(0,0,0,0.6)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
        {service}
      </div>
    </div>
  )
}

type Toast={id:number;msg:string;type:'success'|'error'|'warn'}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [bookings,    setBookings]    = useState<any[]>([])
  const [contacts,    setContacts]    = useState<any[]>([])
  const [vehicles,    setVehicles]    = useState<any[]>([])
  const [services,    setServices]    = useState<any[]>([])
  const [loadingB,    setLoadingB]    = useState(true)
  const [loadingV,    setLoadingV]    = useState(true)
  const [nowDate,     setNowDate]     = useState(()=>getDubaiToday())
  const [selectedDay, setSelectedDay] = useState<Date>(()=>getDubaiToday())
  const [weekRef,     setWeekRef]     = useState<Date>(()=>getDubaiToday())

  const [showNew,         setShowNew]         = useState(false)
  const [editId,          setEditId]          = useState<string|null>(null)
  const [detailBooking,   setDetailBooking]   = useState<any|null>(null)
  const [saving,          setSaving]          = useState(false)
  const [completedInvoice, setCompletedInvoice] = useState<any|null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  const [newForm, setNewForm] = useState({
    contact_id:'',vehicle_id:'',service_id:'',
    date:'',start_time:'09:00',end_time:'11:00',
    address:'',price:'',discount:'',notes:'',
  })
  const [newTechs,         setNewTechs]         = useState<string[]>([])
  const [conflictWarn,     setConflictWarn]     = useState('')
  const [reassignVehicleId,setReassignVehicleId]= useState('')
  const [reassignConflict, setReassignConflict] = useState('')
  const [reassignSaving,   setReassignSaving]   = useState(false)
  const [toasts,           setToasts]           = useState<Toast[]>([])
  const toastId = useRef(0)

  function addToast(msg:string,type:'success'|'error'|'warn'='success'){
    const id=++toastId.current
    setToasts(p=>[...p,{id,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500)
  }

  // ── fetch bookings filtered by selected day ────────────────────────────────
  const fetchBookings = useCallback(async (day:Date) => {
    setLoadingB(true)
    const sb = createClient()

    // Use Dubai midnight → UTC range so the server-side filter is correct
    const { start: startISO, end: endISO } = dubaiDayRange(day)
    console.log('Buscando reservas entre:', startISO, 'y', endISO)

    const { data, error } = await sb
      .from('bookings')
      .select('*, contacts(name), vehicles(name,license_plate), services(name)')
      .gte('scheduled_at', startISO)
      .lte('scheduled_at', endISO)
      .order('scheduled_at', {ascending:true})

    if (error) {
      console.error('[bookings] fetch error:', error)
    }

    const result = data ?? []
    console.log('[bookings] día seleccionado:', toDateStr(day))
    console.log('[bookings] cargados:', result.length, result)
    result.forEach(b => console.log('  booking:', {
      id: b.id, vehicle_id: b.vehicle_id,
      scheduled_at: b.scheduled_at, end_at: b.end_at,
      cliente: b.contacts?.name, servicio: b.services?.name,
    }))

    setBookings(result)
    setLoadingB(false)
  }, [])

  // ── fetch static refs (contacts, vehicles, services) ──────────────────────
  async function fetchRefs() {
    setLoadingV(true)
    const sb = createClient()
    const [cRes,vRes,sRes] = await Promise.all([
      sb.from('contacts').select('id, name'),
      sb.from('vehicles').select('id, name, license_plate, status, technician, technicians').order('created_at'),
      sb.from('services').select('id, name, price').eq('is_active', true).order('name'),
    ])
    console.log('[vehicles] cargados:', vRes.data?.length, vRes.data?.map(v=>({id:v.id,name:v.name})))
    setContacts(cRes.data??[])
    setVehicles(vRes.data??[])
    setServices(sRes.data??[])
    setLoadingV(false)
  }

  // ── initial load + re-fetch when day changes ───────────────────────────────
  useEffect(()=>{ fetchRefs() },[])
  useEffect(()=>{ fetchBookings(selectedDay) },[selectedDay, fetchBookings])

  // ── realtime subscription ──────────────────────────────────────────────────
  useEffect(()=>{
    const sb = createClient()
    const channel = sb.channel('bookings-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{
        console.log('[realtime] cambio detectado en bookings, recargando…')
        fetchBookings(selectedDay)
      })
      .subscribe()
    return ()=>{ sb.removeChannel(channel) }
  },[selectedDay, fetchBookings])

  // ── reset reassign state when detail panel opens/closes ──────────────────
  useEffect(()=>{
    setReassignVehicleId(detailBooking?.vehicle_id ?? '')
    setReassignConflict('')
  },[detailBooking?.id])

  // ── conflict check when reassign vehicle changes ──────────────────────────
  useEffect(()=>{
    const vid = reassignVehicleId
    const db  = detailBooking
    if (!db?.scheduled_at || !vid || vid === (db.vehicle_id ?? '')) {
      setReassignConflict(''); return
    }
    const bufStart = new Date(new Date(db.scheduled_at).getTime() - 60*60*1000).toISOString()
    const bufEnd   = db.end_at
      ? new Date(new Date(db.end_at).getTime() + 60*60*1000).toISOString()
      : new Date(new Date(db.scheduled_at).getTime() + 3*60*60*1000).toISOString()
    createClient()
      .from('bookings')
      .select('id, scheduled_at, end_at')
      .eq('vehicle_id', vid)
      .neq('status', 'cancelled')
      .neq('id', db.id)
      .gte('scheduled_at', bufStart)
      .lte('scheduled_at', bufEnd)
      .then(({ data }) => {
        setReassignConflict(
          data && data.length > 0
            ? `⚠️ Este vehículo tiene ${data.length} reserva(s) en ese horario`
            : ''
        )
      })
  },[reassignVehicleId, detailBooking?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── save vehicle reassignment ─────────────────────────────────────────────
  async function saveReassignment() {
    if (!detailBooking) return
    setReassignSaving(true)
    const { error } = await createClient()
      .from('bookings')
      .update({ vehicle_id: reassignVehicleId || null })
      .eq('id', detailBooking.id)
    setReassignSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    const veh = vehicles.find(v => v.id === reassignVehicleId) ?? null
    setDetailBooking((p: any) => p ? { ...p, vehicle_id: reassignVehicleId || null, vehicles: veh } : null)
    addToast('Vehículo reasignado', 'success')
    fetchBookings(selectedDay)
  }

  // ── availability conflict check for new-booking modal ────────────────────
  useEffect(()=>{
    setConflictWarn('')
    const { date, start_time, service_id } = newForm
    if (!showNew || !date || !start_time) return
    const slotKey = start_time.slice(0,5) // "HH:MM"
    fetch(`/api/availability?date=${date}${service_id?`&service_id=${service_id}`:''}`)
      .then(r=>r.json())
      .then(({blocked})=>{
        const hit = (blocked??[]).find((b:{slot:string;reason:string})=>b.slot===slotKey)
        setConflictWarn(hit ? `⚠️ Conflicto: ${hit.reason}` : '')
      })
      .catch(()=>setConflictWarn(''))
  },[showNew, newForm.date, newForm.start_time, newForm.service_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── clock ─────────────────────────────────────────────────────────────────
  useEffect(()=>{const t=setInterval(()=>setNowDate(getDubaiToday()),60000);return()=>clearInterval(t)},[])

  // ── week nav ───────────────────────────────────────────────────────────────
  const weekDays = getWeekDays(weekRef)
  function prevWeek(){const d=new Date(weekRef);d.setDate(d.getDate()-7);setWeekRef(d)}
  function nextWeek(){const d=new Date(weekRef);d.setDate(d.getDate()+7);setWeekRef(d)}

  // ── helpers ────────────────────────────────────────────────────────────────
  function getBookingsForVehicle(vehicleId:string):any[] {
    // bookings already filtered by day server-side; just match vehicle
    return bookings.filter(b=>b.vehicle_id===vehicleId && b.scheduled_at)
  }
function getDemoForVehicle(vName:string):any[] {
    if(bookings.length>0) return []
    return DEMO_BOOKINGS.filter(d=>vName.includes(d.vehicle_name))
  }

  // ── current time line ──────────────────────────────────────────────────────
  const isToday     = sameDay(selectedDay, nowDate)
  const nowPct      = ((nowDate.getHours()-HORA_INICIO+nowDate.getMinutes()/60)/TOTAL_HORAS)*100
  const showNowLine = isToday&&nowDate.getHours()>=HORA_INICIO&&nowDate.getHours()<HORA_FIN

  // ── save / update booking ──────────────────────────────────────────────────
  function resetForm(){
    setNewForm({contact_id:'',vehicle_id:'',service_id:'',date:'',start_time:'09:00',end_time:'11:00',address:'',price:'',discount:'',notes:''})
    setNewTechs([]);setEditId(null);setConflictWarn('')
  }

  async function saveBooking(){
    if(!newForm.contact_id||!newForm.date||!newForm.start_time) return
    setSaving(true)
    // Input times are Dubai local — store as UTC using +04:00 offset
    const scheduled_at = dubaiToUTC(newForm.date, newForm.start_time)
    const end_at       = newForm.end_time ? dubaiToUTC(newForm.date, newForm.end_time) : null
    const payload:any={
      contact_id:newForm.contact_id,scheduled_at,end_at,
      technician:newTechs.join(', '),
      price:newForm.price?Number(newForm.price):null,
      discount:newForm.discount?Number(newForm.discount):null,
      address:newForm.address||null,notes:newForm.notes||null,
      status:'confirmed',
    }
    if(newForm.vehicle_id) payload.vehicle_id=newForm.vehicle_id
    if(newForm.service_id) payload.service_id=newForm.service_id

    let error:any
    if(editId){
      ;({error}=await createClient().from('bookings').update(payload).eq('id',editId))
    } else {
      ;({error}=await createClient().from('bookings').insert(payload))
    }
    setSaving(false)
    if(error){addToast(error.message,'error');return}
    addToast(editId ? t('bookingUpdated') : t('bookingCreated'), 'success')
    if (!editId) {
      const contact = contacts.find(c => c.id === newForm.contact_id)
      const service = services.find(s => s.id === newForm.service_id)
      createNotification({
        type: 'booking',
        title: 'Nueva reserva creada',
        message: `${contact?.name ?? '—'} · ${service?.name ?? '—'}${newForm.price ? ` · AED ${newForm.price}` : ''}`,
      })
    }
    setShowNew(false);resetForm()
    await fetchBookings(selectedDay) // reload immediately
  }

  function openEdit(b:any){
    // Convert stored UTC times back to Dubai local for the form inputs
    const s=b.scheduled_at?toDubaiTime(b.scheduled_at):null
    const e=b.end_at?toDubaiTime(b.end_at):null
    setNewForm({
      contact_id:b.contact_id??'',vehicle_id:b.vehicle_id??'',service_id:b.service_id??'',
      date:s?toDateStr(s):'',start_time:s?toTimeStr(s):'09:00',end_time:e?toTimeStr(e):'11:00',
      address:b.address??'',price:b.price!=null?String(b.price):'',
      discount:b.discount!=null?String(b.discount):'',notes:b.notes??'',
    })
    setNewTechs(b.technician?b.technician.split(', ').filter(Boolean):[])
    setEditId(b.id);setDetailBooking(null);setShowNew(true)
  }

  async function updateStatus(id:string, status:string){
    const supabase = createClient()

    // Actualizar status
    const { error: statusError } = await supabase
      .from('bookings')
      .update({
        status,
        ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      })
      .eq('id', id)

    if (statusError) { addToast(statusError.message, 'error'); return }

    // Si se marca como completada, generar factura
    if (status === 'completed') {
      console.log('🔥 Generando factura para booking:', id)

      // Obtener datos del booking
      const { data: booking, error: bookingErr } = await supabase
        .from('bookings')
        .select('*, contacts(name), services(name)')
        .eq('id', id)
        .single()

      console.log('📋 Booking:', booking)
      console.log('❌ Booking error:', bookingErr)

      if (booking) {
        // Número de factura
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')

        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${year}-${month}-01`)

        const sequence = String((count || 0) + 1).padStart(3, '0')
        const invoiceNo = `INV-${year}${month}-${sequence}`

        const subtotal = Number(booking.price) || 0
        const discount = Number(booking.discount) || 0
        const tax      = Number(((subtotal - discount) * 0.05).toFixed(2))
        const total    = Number((subtotal - discount + tax).toFixed(2))

        console.log('💰 Creando factura:', { invoiceNo, total })

        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            booking_id: id,
            contact_id: booking.contact_id,
            invoice_no: invoiceNo,
            subtotal,
            discount,
            tax,
            total,
            status: 'por_cobrar',
            issued_at: now.toISOString(),
            due_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (invoiceError) {
          console.error('❌ Error factura:', invoiceError)
          addToast(`${t('bookingCompleted')} · Error al generar factura`, 'warn')
        } else {
          console.log('✅ Factura creada:', invoice)

          await supabase.from('notifications').insert({
            type: 'payment',
            title: 'Factura generada',
            message: `${invoiceNo} · ${booking.contacts?.name ?? '—'} · AED ${total}`,
            read: false,
          })

          alert(`✅ Factura ${invoiceNo} generada · AED ${total}`)
          setCompletedInvoice(invoice)
          setShowInvoiceModal(true)
        }
      }
    } else {
      addToast(t('bookingCancelled'), 'warn')
    }

    setDetailBooking(null)
    fetchBookings(selectedDay)
  }

  const loading = loadingB||loadingV
  const todayStr = getDubaiToday().toLocaleDateString('es-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:24,fontFamily:'Outfit,sans-serif'}}>
      <style>{`
        .gantt-scroll::-webkit-scrollbar{height:4px}
        .gantt-scroll::-webkit-scrollbar-track{background:#1a1a1e}
        .gantt-scroll::-webkit-scrollbar-thumb{background:#c9a84c;border-radius:2px}
      `}</style>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#f0ede8'}}>{t('bookingsCalendar')}</div>
          <div style={{fontSize:12,color:'#888580',marginTop:3,textTransform:'capitalize'}}>{todayStr}</div>
        </div>
        <button onClick={()=>{setNewForm(f=>({...f,date:toDateStr(selectedDay)}));setShowNew(true)}}
          style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#c9a84c',color:'#0d0d0f',
            fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
          + {t('newBooking')}
        </button>
      </div>

      {/* ── Week selector ── */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <button onClick={prevWeek} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
          background:'#1a1a1e',color:'#888580',cursor:'pointer',display:'flex',alignItems:'center',
          justifyContent:'center',flexShrink:0}}><ChevronLeft size={14}/></button>
        <div style={{display:'flex',gap:6,flex:1,justifyContent:'center'}}>
          {weekDays.map(d=>{
            const active=sameDay(d,selectedDay), isNow=sameDay(d,getDubaiToday())
            return (
              <button key={d.toISOString()} onClick={()=>setSelectedDay(d)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 14px',
                  borderRadius:10,cursor:'pointer',fontFamily:'Outfit,sans-serif',transition:'all 0.15s',
                  background:active?'#c9a84c':'#141416',
                  border:active?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.06)',
                  color:active?'#0d0d0f':'#888580'}}>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em'}}>{DAYS_ABBR[d.getDay()]}</span>
                <span style={{fontSize:16,fontWeight:700,color:active?'#0d0d0f':isNow?'#c9a84c':'#f0ede8'}}>
                  {d.getDate()}
                </span>
              </button>
            )
          })}
        </div>
        <button onClick={nextWeek} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
          background:'#1a1a1e',color:'#888580',cursor:'pointer',display:'flex',alignItems:'center',
          justifyContent:'center',flexShrink:0}}><ChevronRight size={14}/></button>
      </div>

      {/* ── Gantt Calendar ── */}
      <div style={{overflow:'hidden',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',background:'#141416'}}>
        <div className="gantt-scroll" style={{overflowX:'auto',scrollbarWidth:'thin',scrollbarColor:'#c9a84c #1a1a1e'}}>
          {/* Minimum width: vehicle col + enough for readability */}
          <div style={{minWidth:VEH_COL_W+780,position:'relative'}}>

            {/* ── Hour header ── */}
            <div style={{display:'flex',height:40,borderBottom:'1px solid rgba(255,255,255,0.06)',
              background:'#141416',position:'sticky',top:0,zIndex:5}}>
              {/* vehicle col header */}
              <div style={{width:VEH_COL_W,flexShrink:0,position:'sticky',left:0,zIndex:6,
                background:'#141416',borderRight:'1px solid rgba(255,255,255,0.06)',
                display:'flex',alignItems:'center',padding:'0 14px'}}>
                <span style={{fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.1em'}}>{t('vehicle')}</span>
              </div>
              {/* hour labels — percentage based */}
              <div style={{flex:1,display:'flex',position:'relative'}}>
                {HOURS.map(h=>(
                  <div key={h} style={{flex:1,borderLeft:'1px solid rgba(255,255,255,0.04)',
                    display:'flex',alignItems:'center',padding:'0 6px'}}>
                    <span style={{fontSize:11,color:'#888580'}}>{String(h).padStart(2,'0')}:00</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Current time line (percentage) ── */}
            {showNowLine&&(
              <div style={{position:'absolute',
                left:`calc(${VEH_COL_W}px + (100% - ${VEH_COL_W}px) * ${nowPct/100})`,
                top:40,bottom:0,width:1,background:'#ff4f4f',zIndex:4,pointerEvents:'none'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#ff4f4f',marginLeft:-4,marginTop:-4}}/>
              </div>
            )}

            {/* ── Vehicle rows ── */}
            {loading ? (
              <div style={{padding:48,textAlign:'center',color:'#888580',fontSize:13}}>Cargando…</div>
            ) : vehicles.length===0 ? (
              <EmptyState
                icon="booking"
                title="Sin vehículos registrados"
                subtitle="Agrega vehículos desde la sección Vehículos para poder crear reservas"
              />
            ) : (<>
            {vehicles.map((v,i)=>{
              const vBookings = getBookingsForVehicle(v.id)
              const demoItems = getDemoForVehicle(v.name)
              const enRuta    = v.status==='en_ruta'
              const techs:string[] = Array.isArray(v.technicians)&&v.technicians.length>0
                ? v.technicians : v.technician?[v.technician]:[]

              return (
                <div key={v.id} style={{display:'flex',height:ROW_H,
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  background:i%2===0?'#141416':'#0d0d0f'}}>

                  {/* vehicle label — sticky */}
                  <div style={{width:VEH_COL_W,flexShrink:0,position:'sticky',left:0,zIndex:2,
                    background:i%2===0?'#141416':'#0d0d0f',
                    borderRight:'1px solid rgba(255,255,255,0.06)',
                    display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 14px',gap:2}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,
                        background:enRuta?'#34d399':'rgba(255,255,255,0.2)'}}/>
                      <span style={{fontSize:12,fontWeight:600,color:'#f0ede8',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.name}</span>
                    </div>
                    <div style={{fontSize:10,fontFamily:'monospace',color:'#c9a84c',paddingLeft:12}}>
                      {v.license_plate}
                    </div>
                    {techs.length>0&&(
                      <div style={{fontSize:10,color:'#888580',paddingLeft:12,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {techs[0]}{techs.length>1?` +${techs.length-1}`:''}
                      </div>
                    )}
                  </div>

                  {/* timeline area — percentage positioned */}
                  <div style={{flex:1,position:'relative',overflow:'visible'}}>
                    {/* grid lines at each hour */}
                    {HOURS.map((_,idx)=>(
                      <div key={idx} style={{position:'absolute',left:`${(idx/TOTAL_HORAS)*100}%`,
                        top:0,bottom:0,width:1,background:'rgba(255,255,255,0.035)',pointerEvents:'none'}}/>
                    ))}
                    {/* half-hour lines */}
                    {HOURS.map((_,idx)=>(
                      <div key={`h${idx}`} style={{position:'absolute',
                        left:`${((idx+0.5)/TOTAL_HORAS)*100}%`,
                        top:0,bottom:0,width:1,background:'rgba(255,255,255,0.015)',pointerEvents:'none'}}/>
                    ))}

                    {/* real bookings for this vehicle on selected day */}
                    {vBookings.map(b=>(
                      <GanttBlock key={b.id}
                        leftPct={calcLeft(b.scheduled_at)}
                        widthPct={calcWidth(b.scheduled_at,b.end_at)}
                        timeLabel={`${formatHora(b.scheduled_at)} — ${formatHora(b.end_at)}`}
                        client={b.contacts?.name ?? 'Cliente'}
                        service={b.services?.name ?? ''}
                        status={b.status ?? 'confirmed'}
                        onClick={()=>setDetailBooking(b)}/>
                    ))}

                    {/* demo bookings */}
                    {demoItems.map(d=>{
                      const lPct = ((d.start_hour-HORA_INICIO)/TOTAL_HORAS*100).toFixed(3)+'%'
                      const wPct = (((d.end_hour-d.start_hour)/TOTAL_HORAS)*100).toFixed(3)+'%'
                      return <GanttBlock key={d.id}
                        leftPct={lPct} widthPct={wPct}
                        timeLabel={`${String(d.start_hour).padStart(2,'0')}:00 — ${String(d.end_hour).padStart(2,'0')}:00`}
                        client={d.client} service={d.service} status={d.status}
                        onClick={()=>{}}/>
                    })}
                  </div>
                </div>
              )
            })}

          </>)}
          </div>
        </div>
      </div>

      {/* ══ MODAL: Nueva / Editar Reserva ══════════════════════════════════════ */}
      {showNew&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:700,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>{setShowNew(false);resetForm()}}>
          <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,
            padding:28,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <span style={{fontSize:17,fontWeight:700,color:'#f0ede8'}}>{editId ? t('editBooking') : t('newBooking')}</span>
              <button onClick={()=>{setShowNew(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}>
                <X size={18}/>
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><MLabel>{t('client')} *</MLabel>
                <MSelect value={newForm.contact_id} onChange={e=>setNewForm(f=>({...f,contact_id:e.target.value}))}>
                  <option value="">{t('selectClient')}</option>
                  {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </MSelect>
              </div>
              <div><MLabel>{t('vehicle')} *</MLabel>
                <MSelect value={newForm.vehicle_id} onChange={e=>setNewForm(f=>({...f,vehicle_id:e.target.value}))}>
                  <option value="">{t('selectVehicle')}</option>
                  {vehicles.map(v=><option key={v.id} value={v.id}>{v.name} — {v.license_plate}</option>)}
                </MSelect>
              </div>
              <div><MLabel>{t('service')} *</MLabel>
                <MSelect value={newForm.service_id} onChange={e=>{
                  const svc=services.find(s=>s.id===e.target.value)
                  setNewForm(f=>({...f,service_id:e.target.value,price:svc?.price?String(svc.price):f.price}))
                }}>
                  <option value="">{t('selectService')}</option>
                  {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </MSelect>
              </div>
              <div><MLabel>{t('date')} *</MLabel>
                <MInput type="date" value={newForm.date} onChange={e=>setNewForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><MLabel>{t('startTime')} *</MLabel>
                  <MInput type="time" value={newForm.start_time} onChange={e=>setNewForm(f=>({...f,start_time:e.target.value}))}/></div>
                <div><MLabel>{t('endTime')} *</MLabel>
                  <MInput type="time" value={newForm.end_time} onChange={e=>setNewForm(f=>({...f,end_time:e.target.value}))}/></div>
              </div>
              {conflictWarn&&(
                <div style={{padding:'10px 12px',borderRadius:8,background:'rgba(239,68,68,0.08)',
                  border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',fontSize:12,fontWeight:500,lineHeight:1.5}}>
                  {conflictWarn}
                </div>
              )}
              <div><MLabel>{t('technicians')}</MLabel>
                <TechPicker selected={newTechs} onChange={setNewTechs} pool={contacts.map(c=>c.name)}/>
              </div>
              <div><MLabel>{t('clientAddress')}</MLabel>
                <MInput placeholder="Palm Jumeirah, Villa 14" value={newForm.address}
                  onChange={e=>setNewForm(f=>({...f,address:e.target.value}))}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><MLabel>{t('priceAED')} *</MLabel>
                  <MInput type="number" min={0} placeholder="3500" value={newForm.price}
                    onChange={e=>setNewForm(f=>({...f,price:e.target.value}))}/></div>
                <div><MLabel>{t('discountAED')}</MLabel>
                  <MInput type="number" min={0} placeholder="0" value={newForm.discount}
                    onChange={e=>setNewForm(f=>({...f,discount:e.target.value}))}/></div>
              </div>
              <div><MLabel>{t('notes')}</MLabel>
                <MTextarea rows={3} placeholder={t('specialInstr')} value={newForm.notes}
                  onChange={e=>setNewForm(f=>({...f,notes:e.target.value}))}/></div>
            </div>
            <button onClick={saveBooking} disabled={saving||!newForm.contact_id||!newForm.date}
              style={{width:'100%',padding:14,borderRadius:10,border:'none',marginTop:20,
                background:'#c9a84c',color:'#0d0d0f',fontSize:14,fontWeight:700,
                fontFamily:'Outfit,sans-serif',cursor:'pointer',
                opacity:(!newForm.contact_id||!newForm.date)?0.5:1}}>
              {saving ? t('saving') : editId ? t('updateBooking') : t('createBooking')}
            </button>
          </div>
        </div>
      )}

      {/* ══ PANEL: Detalle de Reserva ══════════════════════════════════════════ */}
      {detailBooking&&(
        <div style={{position:'fixed',inset:0,zIndex:700}} onClick={()=>setDetailBooking(null)}>
          <div style={{position:'absolute',right:0,top:0,bottom:0,width:'min(420px,100vw)',
            background:'#141416',borderLeft:'1px solid rgba(255,255,255,0.08)',
            display:'flex',flexDirection:'column',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',
              display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#f0ede8',marginBottom:6}}>
                  {detailBooking.contacts?.name??'Reserva'}
                </div>
                <BookingBadge status={detailBooking.status??'confirmed'}/>
              </div>
              <button onClick={()=>setDetailBooking(null)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex',flexShrink:0}}>
                <X size={18}/>
              </button>
            </div>
            <div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:18,flex:1}}>
              <DetailRow label={t('vehicleLabel')}>
                {detailBooking.vehicles
                  ?<span>{detailBooking.vehicles.name} · <span style={{fontFamily:'monospace',color:'#c9a84c'}}>{detailBooking.vehicles.license_plate}</span></span>
                  :'—'}
              </DetailRow>

              {/* ── Vehicle reassignment ── */}
              <div>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',
                  letterSpacing:'0.07em',color:'#888580',marginBottom:6}}>
                  Reasignar vehículo
                </div>
                <MSelect value={reassignVehicleId}
                  onChange={e=>setReassignVehicleId(e.target.value)}>
                  <option value="">— Sin vehículo —</option>
                  {vehicles.map(v=>(
                    <option key={v.id} value={v.id}>{v.name} · {v.license_plate}</option>
                  ))}
                </MSelect>
                {reassignConflict&&(
                  <div style={{marginTop:6,padding:'7px 10px',borderRadius:6,
                    background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',
                    color:'#ef4444',fontSize:11,lineHeight:1.4}}>
                    {reassignConflict}
                  </div>
                )}
                {reassignVehicleId !== (detailBooking.vehicle_id ?? '') && (
                  <button onClick={saveReassignment} disabled={reassignSaving}
                    style={{marginTop:8,width:'100%',padding:'8px 12px',borderRadius:6,
                      border:'1px solid rgba(201,168,76,0.5)',background:'rgba(201,168,76,0.1)',
                      color:'#c9a84c',fontSize:12,fontWeight:700,fontFamily:'Outfit,sans-serif',
                      cursor:reassignSaving?'not-allowed':'pointer',opacity:reassignSaving?0.6:1}}>
                    {reassignSaving ? 'Guardando…' : '↺ Guardar reasignación'}
                  </button>
                )}
              </div>

              <DetailRow label={t('serviceLabel')}>{detailBooking.services?.name??'—'}</DetailRow>
              {detailBooking.scheduled_at&&(
                <DetailRow label={t('schedule')}>
                  {(()=>{
                    const ds=toDubaiTime(detailBooking.scheduled_at).toLocaleDateString('es-AE',{weekday:'long',day:'numeric',month:'long'})
                    return <span style={{textTransform:'capitalize'}}>{ds} · {formatHoraDubai(detailBooking.scheduled_at)}{detailBooking.end_at?` — ${formatHoraDubai(detailBooking.end_at)}`:''}</span>
                  })()}
                </DetailRow>
              )}
              {detailBooking.technician&&(
                <div>
                  <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',color:'#888580',marginBottom:8}}>{t('technicians')}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {detailBooking.technician.split(', ').filter(Boolean).map((t:string)=>(
                      <span key={t} style={{padding:'3px 10px',borderRadius:99,background:'rgba(201,168,76,0.12)',
                        border:'1px solid rgba(201,168,76,0.3)',color:'#c9a84c',fontSize:11,fontWeight:600}}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {detailBooking.price!=null&&(
                <DetailRow label={t('price')}>
                  <span style={{color:'#c9a84c',fontWeight:700}}>AED {Number(detailBooking.price).toLocaleString('en-AE')}</span>
                  {detailBooking.discount>0&&<span style={{marginLeft:8,color:'#888580',fontSize:11}}>-AED {Number(detailBooking.discount).toLocaleString('en-AE')} desc.</span>}
                </DetailRow>
              )}
              {detailBooking.address&&<DetailRow label={t('address')}>📍 {detailBooking.address}</DetailRow>}
              {detailBooking.notes&&<DetailRow label={t('notes')}><span style={{color:'#888580'}}>{detailBooking.notes}</span></DetailRow>}
            </div>
            <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:8}}>
              {detailBooking.status!=='completed'&&detailBooking.status!=='cancelled'&&(
                <button
                  onClick={async () => {
                    const bookingId = detailBooking.id
                    console.log('🔥 CLIC EN MARK COMPLETE')
                    console.log('🔥 Booking ID:', bookingId)

                    if (!bookingId) { console.error('❌ Sin booking ID'); return }

                    const sb = createClient()

                    // Paso 1: actualizar status
                    const { error: updateError } = await sb.from('bookings')
                      .update({ status: 'completed', completed_at: new Date().toISOString() })
                      .eq('id', bookingId)
                    console.log('📋 Update error:', updateError)
                    if (updateError) { addToast(updateError.message, 'error'); return }

                    // Paso 2: obtener booking
                    const { data: bk, error: bkErr } = await sb.from('bookings')
                      .select('*, contacts(name)')
                      .eq('id', bookingId)
                      .single()
                    console.log('📋 Booking data:', bk)
                    console.log('❌ Booking error:', bkErr)

                    if (!bk) { addToast(t('bookingCompleted'), 'success'); setDetailBooking(null); fetchBookings(selectedDay); return }

                    // Paso 3: número de factura
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = String(now.getMonth() + 1).padStart(2, '0')
                    const { count } = await sb.from('invoices')
                      .select('*', { count: 'exact', head: true })
                      .gte('created_at', `${year}-${month}-01`)
                    const invoiceNo = `INV-${year}${month}-${String((count||0)+1).padStart(3,'0')}`
                    const subtotal = Number(bk.price) || 0
                    const discount = Number(bk.discount) || 0
                    const tax   = Number(((subtotal - discount) * 0.05).toFixed(2))
                    const total = Number((subtotal - discount + tax).toFixed(2))
                    console.log('💰 Invoice:', { invoiceNo, subtotal, tax, total })

                    // Paso 4: insertar factura
                    const { data: inv, error: invError } = await sb.from('invoices')
                      .insert({
                        booking_id: bookingId,
                        contact_id: bk.contact_id,
                        invoice_no: invoiceNo,
                        subtotal, discount, tax, total,
                        status: 'por_cobrar',
                        issued_at: now.toISOString(),
                        due_at: new Date(now.getTime() + 30*24*60*60*1000).toISOString(),
                      })
                      .select()
                      .single()
                    console.log('✅ Invoice creado:', inv)
                    console.log('❌ Invoice error:', invError)

                    if (inv) {
                      await sb.from('notifications').insert({
                        type: 'payment',
                        title: 'Factura generada',
                        message: `${invoiceNo} · ${bk.contacts?.name ?? '—'} · AED ${total}`,
                        read: false,
                      })
                      alert(`✅ Factura ${invoiceNo} generada · AED ${total}`)
                      setCompletedInvoice(inv)
                      setShowInvoiceModal(true)
                    } else {
                      alert(`❌ Error: ${invError?.message}`)
                    }

                    setDetailBooking(null)
                    fetchBookings(selectedDay)
                  }}
                  style={{width:'100%',padding:11,borderRadius:8,
                    border:'1px solid rgba(52,211,153,0.35)',background:'rgba(52,211,153,0.12)',
                    color:'#34d399',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                  ✓ {t('markCompleted')}
                </button>
              )}
              <button onClick={()=>openEdit(detailBooking)}
                style={{width:'100%',padding:11,borderRadius:8,
                  border:'1px solid rgba(201,168,76,0.4)',background:'transparent',
                  color:'#c9a84c',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                ✏ {t('edit')}
              </button>
              {detailBooking.status!=='cancelled'&&detailBooking.status!=='completed'&&(
                <button onClick={()=>updateStatus(detailBooking.id,'cancelled')}
                  style={{width:'100%',padding:11,borderRadius:8,
                    border:'1px solid rgba(255,79,79,0.3)',background:'transparent',
                    color:'#ff4f4f',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                  {t('cancelBooking')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice confirmation modal ── */}
      {showInvoiceModal && completedInvoice && (
        <div style={{position:'fixed',inset:0,zIndex:800,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#141416',border:'1px solid rgba(201,168,76,0.3)',borderRadius:16,padding:32,maxWidth:420,width:'100%',textAlign:'center',fontFamily:'Outfit,sans-serif'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(52,211,153,0.15)',border:'2px solid #34d399',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>✓</div>
            <div style={{fontSize:18,fontWeight:700,color:'#f0ede8',marginBottom:8}}>
              {lang==='es' ? '¡Reserva completada!' : 'Booking completed!'}
            </div>
            <div style={{fontSize:13,color:'#888580',marginBottom:20}}>
              {lang==='es' ? 'Se generó la factura automáticamente' : 'Invoice generated automatically'}
            </div>
            <div style={{background:'#1a1a1e',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:16,marginBottom:20,textAlign:'left'}}>
              {[
                { label: lang==='es' ? 'Número de factura' : 'Invoice number', value: completedInvoice.invoice_no, mono: true, color: '#c9a84c' },
                { label: 'Subtotal', value: `AED ${completedInvoice.subtotal?.toFixed(2)}`, mono: false, color: '#f0ede8' },
                { label: 'VAT (5%)', value: `AED ${completedInvoice.tax?.toFixed(2)}`, mono: false, color: '#f0ede8' },
              ].map(row => (
                <div key={row.label} style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:12,color:'#888580'}}>{row.label}</span>
                  <span style={{fontSize:12,fontWeight:700,color:row.color,fontFamily:row.mono?'monospace':'Outfit,sans-serif'}}>{row.value}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{fontSize:13,fontWeight:700,color:'#f0ede8'}}>Total</span>
                <span style={{fontSize:13,fontWeight:800,color:'#00d4aa'}}>AED {completedInvoice.total?.toFixed(2)}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setShowInvoiceModal(false);router.push('/finance')}}
                style={{flex:1,padding:10,background:'#c9a84c',color:'#0d0d0f',border:'none',borderRadius:8,fontFamily:'Outfit,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                {lang==='es' ? 'Ver en Finanzas' : 'View in Finance'}
              </button>
              <button onClick={()=>setShowInvoiceModal(false)}
                style={{flex:1,padding:10,background:'#1a1a1e',border:'1px solid rgba(255,255,255,0.1)',color:'#888580',borderRadius:8,fontFamily:'Outfit,sans-serif',fontSize:13,cursor:'pointer'}}>
                {lang==='es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      <div style={{position:'fixed',bottom:24,right:24,zIndex:900,display:'flex',flexDirection:'column',gap:8}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:'12px 18px',borderRadius:10,fontSize:13,fontWeight:600,
            fontFamily:'Outfit,sans-serif',color:'#fff',
            background:t.type==='success'?'rgba(34,197,94,0.95)':t.type==='warn'?'rgba(251,191,36,0.95)':'rgba(255,79,79,0.95)',
            border:`1px solid ${t.type==='success'?'rgba(34,197,94,0.4)':t.type==='warn'?'rgba(251,191,36,0.4)':'rgba(255,79,79,0.4)'}`,
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)'}}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
