'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

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
      color:'#c9a84c',fontSize:11,fontWeight:600,transition:'border-color 0.15s'}}>
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
      background:hov?'rgba(201,168,76,0.1)':'transparent',transition:'background 0.1s'}}>{name}</div>
}
function TechPicker({ selected, onChange, pool }: { selected:string[]; onChange:(v:string[])=>void; pool:string[] }) {
  const [query,setQuery] = useState('')
  const [open,setOpen]   = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const src      = pool.length>0 ? pool : FALLBACK_TECHS
  const filtered = src.filter(t=>t.toLowerCase().includes(query.toLowerCase())&&!selected.includes(t))
  const canAdd   = query.trim()&&!src.includes(query.trim())&&!selected.includes(query.trim())
  function add(name:string) { if(!name.trim()||selected.includes(name)) return; onChange([...selected,name]); setQuery(''); setOpen(false) }
  function remove(name:string) { onChange(selected.filter(t=>t!==name)) }
  useEffect(()=>{
    function outside(e:MouseEvent) { if(wrapRef.current&&!wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown',outside); return ()=>document.removeEventListener('mousedown',outside)
  },[])
  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      {selected.length>0&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
          {selected.map(t=><TechTag key={t} name={t} onRemove={()=>remove(t)}/>)}
        </div>
      )}
      <div style={{position:'relative'}}>
        <MInput placeholder="Buscar técnico…" value={query}
          onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}/>
        {canAdd&&(
          <button type="button" onClick={()=>add(query.trim())}
            style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'#c9a84c',
              border:'none',borderRadius:6,color:'#0d0d0f',fontSize:11,fontWeight:700,padding:'3px 8px',
              cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>+ Agregar</button>
        )}
      </div>
      {open&&filtered.length>0&&(
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#1a1a1e',
          border:'1px solid rgba(201,168,76,0.25)',borderRadius:8,zIndex:810,overflow:'hidden',
          boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
          {filtered.map(t=><TechDropRow key={t} name={t} onPick={()=>add(t)}/>)}
        </div>
      )}
    </div>
  )
}

// ── Gantt constants ───────────────────────────────────────────────────────────
const HOUR_START = 7
const HOUR_END   = 20
const HOUR_W     = 80
const VEH_COL_W  = 180
const ROW_H      = 68
const HOURS      = Array.from({length:HOUR_END-HOUR_START},(_, i)=>HOUR_START+i) // [7..19]

const DAYS_ABBR = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB']

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO_BOOKINGS = [
  { _demo:true, id:'d1', vehicle_name:'Van 01', start_hour:9,  end_hour:12, client:'Tariq Al Sayed',     service:'Stage 2 Correction', status:'confirmed' },
  { _demo:true, id:'d2', vehicle_name:'Van 02', start_hour:15, end_hour:17, client:'Khalid Al Mansoori', service:'Ceramic Coating',     status:'confirmed' },
  { _demo:true, id:'d3', vehicle_name:'Van 04', start_hour:8,  end_hour:11, client:'Ahmad Binhendi',     service:'Full Detail + Wax',   status:'confirmed' },
]

// ── Week helpers ──────────────────────────────────────────────────────────────
function getWeekDays(ref: Date): Date[] {
  const d = new Date(ref)
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate()-(day===0?6:day-1))
  return Array.from({length:7},(_,i)=>{ const x=new Date(mon); x.setDate(mon.getDate()+i); return x })
}
function sameDay(a:Date, b:Date) {
  return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()
}
function toDateStr(d:Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function toTimeStr(d:Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ── Status badge ──────────────────────────────────────────────────────────────
function BookingBadge({ status }: { status:string }) {
  const MAP: Record<string,{bg:string;color:string;border:string}> = {
    confirmed:   {bg:'rgba(79,163,255,0.1)',  color:'#4fa3ff', border:'rgba(79,163,255,0.3)'},
    pending:     {bg:'rgba(251,191,36,0.1)',  color:'#fbbf24', border:'rgba(251,191,36,0.3)'},
    completed:   {bg:'rgba(52,211,153,0.1)',  color:'#34d399', border:'rgba(52,211,153,0.3)'},
    cancelled:   {bg:'rgba(255,79,79,0.1)',   color:'#ff4f4f', border:'rgba(255,79,79,0.3)'},
    in_progress: {bg:'rgba(201,168,76,0.1)',  color:'#c9a84c', border:'rgba(201,168,76,0.3)'},
  }
  const s = MAP[status?.toLowerCase()] ?? MAP['pending']
  return <span style={{padding:'2px 10px',borderRadius:99,fontSize:10,fontWeight:700,letterSpacing:'0.06em',
    background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:'uppercase'}}>{status}</span>
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',color:'#888580',marginBottom:4}}>{label}</div>
      <div style={{fontSize:13,color:'#f0ede8'}}>{children}</div>
    </div>
  )
}

// ── Gantt block ───────────────────────────────────────────────────────────────
function GanttBlock({ left, width, timeLabel, client, service, status, onClick }: {
  left:number; width:number; timeLabel:string; client:string; service:string; status:string; onClick:()=>void
}) {
  const [hov,setHov] = useState(false)
  const BG: Record<string,string> = {
    confirmed:   'rgba(201,168,76,0.85)',
    pending:     'rgba(251,191,36,0.75)',
    completed:   'rgba(52,211,153,0.78)',
    cancelled:   'rgba(255,79,79,0.65)',
    in_progress: 'rgba(79,163,255,0.82)',
  }
  const bg = BG[status?.toLowerCase()] ?? BG['confirmed']
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:'absolute',left,top:6,height:ROW_H-12,width:Math.max(width-2,18),
        background:bg,borderRadius:6,padding:'4px 8px',cursor:'pointer',overflow:'hidden',
        transition:'filter 0.15s, box-shadow 0.15s',
        filter:hov?'brightness(1.12)':'brightness(1)',
        boxShadow:hov?'0 4px 14px rgba(0,0,0,0.45)':'0 2px 6px rgba(0,0,0,0.3)'}}>
      <div style={{fontSize:10,fontWeight:600,color:'rgba(0,0,0,0.65)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
        {timeLabel}
      </div>
      <div style={{fontSize:12,fontWeight:700,color:'#0d0d0f',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>
        {client}
      </div>
      {width>64&&(
        <div style={{fontSize:11,color:'rgba(0,0,0,0.6)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          {service}
        </div>
      )}
    </div>
  )
}

type Toast = { id:number; msg:string; type:'success'|'error'|'warn' }

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const [bookings,    setBookings]    = useState<any[]>([])
  const [contacts,    setContacts]    = useState<any[]>([])
  const [vehicles,    setVehicles]    = useState<any[]>([])
  const [services,    setServices]    = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [nowDate,     setNowDate]     = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [weekRef,     setWeekRef]     = useState<Date>(new Date())

  const [showNew,       setShowNew]       = useState(false)
  const [editId,        setEditId]        = useState<string|null>(null)
  const [detailBooking, setDetailBooking] = useState<any|null>(null)
  const [saving,        setSaving]        = useState(false)

  const [newForm, setNewForm] = useState({
    contact_id:'', vehicle_id:'', service_id:'',
    date:'', start_time:'09:00', end_time:'11:00',
    address:'', price:'', discount:'', notes:'',
  })
  const [newTechs, setNewTechs] = useState<string[]>([])

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  function addToast(msg:string, type:'success'|'error'|'warn'='success') {
    const id=++toastId.current
    setToasts(prev=>[...prev,{id,msg,type}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3500)
  }

  // ── fetch ──────────────────────────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)
    const sb = createClient()
    const [bRes,cRes,vRes,sRes] = await Promise.all([
      sb.from('bookings').select('*, contacts(name), vehicles(name,license_plate), services(name)').order('scheduled_at'),
      sb.from('contacts').select('id, name'),
      sb.from('vehicles').select('id, name, license_plate, status, technician, technicians').order('created_at'),
      sb.from('services').select('id, name, price'),
    ])
    setBookings(bRes.data??[])
    setContacts(cRes.data??[])
    setVehicles(vRes.data??[])
    setServices(sRes.data??[])
    setLoading(false)
  }

  useEffect(()=>{ fetchAll() },[])
  useEffect(()=>{ const t=setInterval(()=>setNowDate(new Date()),60000); return ()=>clearInterval(t) },[])

  // ── week navigation ────────────────────────────────────────────────────────
  const weekDays = getWeekDays(weekRef)
  function prevWeek() { const d=new Date(weekRef); d.setDate(d.getDate()-7); setWeekRef(d) }
  function nextWeek() { const d=new Date(weekRef); d.setDate(d.getDate()+7); setWeekRef(d) }

  // ── bookings helpers ───────────────────────────────────────────────────────
  function getBookingsForVehicle(vehicleId:string): any[] {
    return bookings.filter(b=>{
      if(b.vehicle_id!==vehicleId||!b.scheduled_at) return false
      return sameDay(new Date(b.scheduled_at), selectedDay)
    })
  }
  function getDemoForVehicle(vName:string): any[] {
    if(bookings.length>0) return []
    return DEMO_BOOKINGS.filter(d=>vName.includes(d.vehicle_name))
  }

  // ── current time ───────────────────────────────────────────────────────────
  const isToday     = sameDay(selectedDay, nowDate)
  const nowLeft     = ((nowDate.getHours()-HOUR_START)+nowDate.getMinutes()/60)*HOUR_W
  const showNowLine = isToday&&nowDate.getHours()>=HOUR_START&&nowDate.getHours()<HOUR_END

  // ── save / update booking ──────────────────────────────────────────────────
  function resetForm() {
    setNewForm({contact_id:'',vehicle_id:'',service_id:'',date:'',start_time:'09:00',end_time:'11:00',address:'',price:'',discount:'',notes:''})
    setNewTechs([]); setEditId(null)
  }

  async function saveBooking() {
    if(!newForm.contact_id||!newForm.date||!newForm.start_time) return
    setSaving(true)
    const scheduled_at = `${newForm.date}T${newForm.start_time}:00`
    const end_at       = newForm.end_time ? `${newForm.date}T${newForm.end_time}:00` : null
    const payload: any = {
      contact_id:   newForm.contact_id,
      scheduled_at, end_at,
      technician:   newTechs.join(', '),
      price:        newForm.price ? Number(newForm.price) : null,
      discount:     newForm.discount ? Number(newForm.discount) : null,
      address:      newForm.address||null,
      notes:        newForm.notes||null,
      status:       'confirmed',
    }
    if(newForm.vehicle_id) payload.vehicle_id = newForm.vehicle_id
    if(newForm.service_id) payload.service_id = newForm.service_id

    let error: any
    if(editId) {
      ;({error} = await createClient().from('bookings').update(payload).eq('id',editId))
    } else {
      ;({error} = await createClient().from('bookings').insert(payload))
    }
    setSaving(false)
    if(error) { addToast(error.message,'error'); return }
    addToast(editId?'Reserva actualizada':'Reserva creada','success')
    setShowNew(false); resetForm(); fetchAll()
  }

  function openEdit(b:any) {
    const s = b.scheduled_at ? new Date(b.scheduled_at) : null
    const e = b.end_at ? new Date(b.end_at) : null
    setNewForm({
      contact_id: b.contact_id??'',
      vehicle_id: b.vehicle_id??'',
      service_id: b.service_id??'',
      date:       s ? toDateStr(s) : '',
      start_time: s ? toTimeStr(s) : '09:00',
      end_time:   e ? toTimeStr(e) : '11:00',
      address:    b.address??'',
      price:      b.price!=null ? String(b.price) : '',
      discount:   b.discount!=null ? String(b.discount) : '',
      notes:      b.notes??'',
    })
    setNewTechs(b.technician ? b.technician.split(', ').filter(Boolean) : [])
    setEditId(b.id); setDetailBooking(null); setShowNew(true)
  }

  async function updateStatus(id:string, status:string) {
    const {error} = await createClient().from('bookings').update({status}).eq('id',id)
    if(error) { addToast(error.message,'error'); return }
    addToast(status==='completed'?'Reserva completada':'Reserva cancelada', status==='completed'?'success':'warn')
    setDetailBooking(null); fetchAll()
  }

  const todayStr = new Date().toLocaleDateString('es-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:24,fontFamily:'Outfit,sans-serif'}}>

      {/* custom scrollbar for webkit */}
      <style>{`
        .gantt-scroll::-webkit-scrollbar { height: 4px; }
        .gantt-scroll::-webkit-scrollbar-track { background: #1a1a1e; }
        .gantt-scroll::-webkit-scrollbar-thumb { background: #c9a84c; border-radius: 2px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#f0ede8'}}>Reservas — Calendario</div>
          <div style={{fontSize:12,color:'#888580',marginTop:3,textTransform:'capitalize'}}>{todayStr}</div>
        </div>
        <button onClick={()=>{ setNewForm(f=>({...f,date:toDateStr(selectedDay)})); setShowNew(true) }}
          style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#c9a84c',color:'#0d0d0f',
            fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
          + Nueva Reserva
        </button>
      </div>

      {/* ── Week selector ── */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
        <button onClick={prevWeek}
          style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
            background:'#1a1a1e',color:'#888580',cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',flexShrink:0}}>
          <ChevronLeft size={14}/>
        </button>
        <div style={{display:'flex',gap:6,flex:1,justifyContent:'center'}}>
          {weekDays.map(d=>{
            const active  = sameDay(d,selectedDay)
            const todayD  = sameDay(d,new Date())
            return (
              <button key={d.toISOString()} onClick={()=>setSelectedDay(d)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 14px',
                  borderRadius:10,cursor:'pointer',fontFamily:'Outfit,sans-serif',transition:'all 0.15s',
                  background:active?'#c9a84c':'#141416',
                  border:active?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.06)',
                  color:active?'#0d0d0f':'#888580'}}>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em'}}>{DAYS_ABBR[d.getDay()]}</span>
                <span style={{fontSize:16,fontWeight:700,color:active?'#0d0d0f':todayD?'#c9a84c':'#f0ede8'}}>
                  {d.getDate()}
                </span>
              </button>
            )
          })}
        </div>
        <button onClick={nextWeek}
          style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',
            background:'#1a1a1e',color:'#888580',cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',flexShrink:0}}>
          <ChevronRight size={14}/>
        </button>
      </div>

      {/* ── Gantt Calendar ── */}
      <div style={{overflow:'hidden',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',background:'#141416'}}>
        <div className="gantt-scroll" style={{overflowX:'auto',scrollbarWidth:'thin',scrollbarColor:'#c9a84c #1a1a1e'}}>
          <div style={{minWidth:VEH_COL_W+HOUR_W*HOURS.length,position:'relative'}}>

            {/* hour header */}
            <div style={{display:'flex',height:40,borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#141416',position:'sticky',top:0,zIndex:5}}>
              <div style={{width:VEH_COL_W,flexShrink:0,position:'sticky',left:0,zIndex:6,
                background:'#141416',borderRight:'1px solid rgba(255,255,255,0.06)',
                display:'flex',alignItems:'center',padding:'0 14px'}}>
                <span style={{fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.1em'}}>Vehículo</span>
              </div>
              {HOURS.map(h=>(
                <div key={h} style={{width:HOUR_W,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,0.04)',
                  display:'flex',alignItems:'center',padding:'0 8px'}}>
                  <span style={{fontSize:11,color:'#888580'}}>{String(h).padStart(2,'0')}:00</span>
                </div>
              ))}
            </div>

            {/* current time line */}
            {showNowLine&&(
              <div style={{position:'absolute',left:VEH_COL_W+nowLeft,top:40,bottom:0,width:1,
                background:'#ff4f4f',zIndex:4,pointerEvents:'none'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#ff4f4f',marginLeft:-4,marginTop:-4}}/>
              </div>
            )}

            {/* vehicle rows */}
            {loading ? (
              <div style={{padding:48,textAlign:'center',color:'#888580',fontSize:13}}>Cargando…</div>
            ) : vehicles.length===0 ? (
              <div style={{padding:48,textAlign:'center',color:'#888580',fontSize:13}}>Sin vehículos registrados.</div>
            ) : vehicles.map((v,i)=>{
              const vBookings  = getBookingsForVehicle(v.id)
              const demoItems  = getDemoForVehicle(v.name)
              const enRuta     = v.status==='en_ruta'
              const techs: string[] = Array.isArray(v.technicians)&&v.technicians.length>0
                ? v.technicians : v.technician?[v.technician]:[]
              return (
                <div key={v.id} style={{display:'flex',height:ROW_H,
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  background:i%2===0?'#141416':'#0d0d0f'}}>

                  {/* vehicle label */}
                  <div style={{width:VEH_COL_W,flexShrink:0,position:'sticky',left:0,zIndex:2,
                    background:i%2===0?'#141416':'#0d0d0f',
                    borderRight:'1px solid rgba(255,255,255,0.06)',
                    display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 14px',gap:2}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:6,height:6,borderRadius:'50%',flexShrink:0,
                        background:enRuta?'#34d399':'rgba(255,255,255,0.2)'}}/>
                      <span style={{fontSize:12,fontWeight:600,color:'#f0ede8',
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {v.name}
                      </span>
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

                  {/* timeline area */}
                  <div style={{flex:1,position:'relative',overflow:'visible'}}>
                    {HOURS.map(h=>(
                      <div key={h} style={{position:'absolute',left:(h-HOUR_START)*HOUR_W,top:0,bottom:0,
                        width:1,background:'rgba(255,255,255,0.03)',pointerEvents:'none'}}/>
                    ))}
                    {HOURS.map(h=>(
                      <div key={`${h}m`} style={{position:'absolute',left:(h-HOUR_START)*HOUR_W+HOUR_W/2,top:0,bottom:0,
                        width:1,background:'rgba(255,255,255,0.015)',pointerEvents:'none'}}/>
                    ))}

                    {/* real bookings */}
                    {vBookings.map(b=>{
                      if(!b.scheduled_at) return null
                      const start  = new Date(b.scheduled_at)
                      const end    = b.end_at?new Date(b.end_at):new Date(start.getTime()+3600000)
                      const left   = ((start.getHours()-HOUR_START)+start.getMinutes()/60)*HOUR_W
                      const width  = Math.max(((end.getTime()-start.getTime())/3600000)*HOUR_W,18)
                      return (
                        <GanttBlock key={b.id}
                          left={left} width={width}
                          timeLabel={`${toTimeStr(start)} — ${toTimeStr(end)}`}
                          client={b.contacts?.name??'Cliente'}
                          service={b.services?.name??''}
                          status={b.status??'confirmed'}
                          onClick={()=>setDetailBooking(b)}/>
                      )
                    })}

                    {/* demo bookings */}
                    {demoItems.map(d=>(
                      <GanttBlock key={d.id}
                        left={(d.start_hour-HOUR_START)*HOUR_W}
                        width={(d.end_hour-d.start_hour)*HOUR_W}
                        timeLabel={`${String(d.start_hour).padStart(2,'0')}:00 — ${String(d.end_hour).padStart(2,'0')}:00`}
                        client={d.client} service={d.service} status={d.status}
                        onClick={()=>{}}/>
                    ))}
                  </div>
                </div>
              )
            })}
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
              <span style={{fontSize:17,fontWeight:700,color:'#f0ede8'}}>{editId?'Editar Reserva':'Nueva Reserva'}</span>
              <button onClick={()=>{setShowNew(false);resetForm()}}
                style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}>
                <X size={18}/>
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <MLabel>Cliente *</MLabel>
                <MSelect value={newForm.contact_id} onChange={e=>setNewForm(f=>({...f,contact_id:e.target.value}))}>
                  <option value="">Seleccionar cliente…</option>
                  {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </MSelect>
              </div>
              <div>
                <MLabel>Vehículo *</MLabel>
                <MSelect value={newForm.vehicle_id} onChange={e=>setNewForm(f=>({...f,vehicle_id:e.target.value}))}>
                  <option value="">Seleccionar vehículo…</option>
                  {vehicles.map(v=><option key={v.id} value={v.id}>{v.name} — {v.license_plate}</option>)}
                </MSelect>
              </div>
              <div>
                <MLabel>Servicio *</MLabel>
                <MSelect value={newForm.service_id} onChange={e=>{
                  const svc=services.find(s=>s.id===e.target.value)
                  setNewForm(f=>({...f,service_id:e.target.value,price:svc?.price?String(svc.price):f.price}))
                }}>
                  <option value="">Seleccionar servicio…</option>
                  {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </MSelect>
              </div>
              <div>
                <MLabel>Fecha *</MLabel>
                <MInput type="date" value={newForm.date} onChange={e=>setNewForm(f=>({...f,date:e.target.value}))}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><MLabel>Hora Inicio *</MLabel>
                  <MInput type="time" value={newForm.start_time} onChange={e=>setNewForm(f=>({...f,start_time:e.target.value}))}/></div>
                <div><MLabel>Hora Fin *</MLabel>
                  <MInput type="time" value={newForm.end_time} onChange={e=>setNewForm(f=>({...f,end_time:e.target.value}))}/></div>
              </div>
              <div>
                <MLabel>Técnicos</MLabel>
                <TechPicker selected={newTechs} onChange={setNewTechs} pool={contacts.map(c=>c.name)}/>
              </div>
              <div>
                <MLabel>Dirección del Cliente</MLabel>
                <MInput placeholder="Palm Jumeirah, Villa 14" value={newForm.address}
                  onChange={e=>setNewForm(f=>({...f,address:e.target.value}))}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><MLabel>Precio AED *</MLabel>
                  <MInput type="number" min={0} placeholder="3500" value={newForm.price}
                    onChange={e=>setNewForm(f=>({...f,price:e.target.value}))}/></div>
                <div><MLabel>Descuento AED</MLabel>
                  <MInput type="number" min={0} placeholder="0" value={newForm.discount}
                    onChange={e=>setNewForm(f=>({...f,discount:e.target.value}))}/></div>
              </div>
              <div>
                <MLabel>Notas</MLabel>
                <MTextarea rows={3} placeholder="Instrucciones especiales…" value={newForm.notes}
                  onChange={e=>setNewForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>
            <button onClick={saveBooking}
              disabled={saving||!newForm.contact_id||!newForm.date}
              style={{width:'100%',padding:14,borderRadius:10,border:'none',marginTop:20,
                background:'#c9a84c',color:'#0d0d0f',fontSize:14,fontWeight:700,
                fontFamily:'Outfit,sans-serif',cursor:'pointer',
                opacity:(!newForm.contact_id||!newForm.date)?0.5:1}}>
              {saving?'Guardando…':editId?'Actualizar Reserva':'Crear Reserva'}
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
              <DetailRow label="Vehículo">
                {detailBooking.vehicles
                  ? <span>{detailBooking.vehicles.name} · <span style={{fontFamily:'monospace',color:'#c9a84c'}}>{detailBooking.vehicles.license_plate}</span></span>
                  : '—'}
              </DetailRow>
              <DetailRow label="Servicio">{detailBooking.services?.name??'—'}</DetailRow>
              {detailBooking.scheduled_at&&(
                <DetailRow label="Horario">
                  {(()=>{
                    const s=new Date(detailBooking.scheduled_at)
                    const e=detailBooking.end_at?new Date(detailBooking.end_at):null
                    const dateStr=s.toLocaleDateString('es-AE',{weekday:'long',day:'numeric',month:'long'})
                    return <span style={{textTransform:'capitalize'}}>{dateStr} · {toTimeStr(s)}{e?` — ${toTimeStr(e)}`:''}</span>
                  })()}
                </DetailRow>
              )}
              {detailBooking.technician&&(
                <div>
                  <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.07em',color:'#888580',marginBottom:8}}>Técnicos</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {detailBooking.technician.split(', ').filter(Boolean).map((t:string)=>(
                      <span key={t} style={{padding:'3px 10px',borderRadius:99,background:'rgba(201,168,76,0.12)',
                        border:'1px solid rgba(201,168,76,0.3)',color:'#c9a84c',fontSize:11,fontWeight:600}}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {detailBooking.price!=null&&(
                <DetailRow label="Precio">
                  <span style={{color:'#c9a84c',fontWeight:700}}>AED {Number(detailBooking.price).toLocaleString('en-AE')}</span>
                  {detailBooking.discount>0&&<span style={{marginLeft:8,color:'#888580',fontSize:11}}>-AED {Number(detailBooking.discount).toLocaleString('en-AE')} desc.</span>}
                </DetailRow>
              )}
              {detailBooking.address&&(
                <DetailRow label="Dirección">📍 {detailBooking.address}</DetailRow>
              )}
              {detailBooking.notes&&(
                <DetailRow label="Notas"><span style={{color:'#888580'}}>{detailBooking.notes}</span></DetailRow>
              )}
            </div>

            <div style={{padding:'16px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:8}}>
              {detailBooking.status!=='completed'&&detailBooking.status!=='cancelled'&&(
                <button onClick={()=>updateStatus(detailBooking.id,'completed')}
                  style={{width:'100%',padding:11,borderRadius:8,
                    border:'1px solid rgba(52,211,153,0.35)',background:'rgba(52,211,153,0.12)',
                    color:'#34d399',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                  ✓ Marcar Completada
                </button>
              )}
              <button onClick={()=>openEdit(detailBooking)}
                style={{width:'100%',padding:11,borderRadius:8,
                  border:'1px solid rgba(201,168,76,0.4)',background:'transparent',
                  color:'#c9a84c',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                ✏ Editar
              </button>
              {detailBooking.status!=='cancelled'&&detailBooking.status!=='completed'&&(
                <button onClick={()=>updateStatus(detailBooking.id,'cancelled')}
                  style={{width:'100%',padding:11,borderRadius:8,
                    border:'1px solid rgba(255,79,79,0.3)',background:'transparent',
                    color:'#ff4f4f',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                  Cancelar Reserva
                </button>
              )}
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
