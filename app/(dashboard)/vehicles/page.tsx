'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Pencil, Package } from 'lucide-react'
import { useTimezone, UseTimezoneReturn } from '@/hooks/useTimezone'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── shared inputs ────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%', background:'#1a1a1e', borderRadius:8, padding:'10px 12px',
  color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box',
}
function MInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc,setFoc] = useState(false)
  return <input {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`, ...props.style}}/>
}
function MSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc,setFoc] = useState(false)
  return <select {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,cursor:'pointer', ...props.style}}/>
}
function MLabel({ children }: { children: React.ReactNode }) {
  return <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#888580',marginBottom:6}}>{children}</label>
}

// ─── category badge ───────────────────────────────────────────────────────────
const CAT_STYLE: Record<string,{bg:string;border:string;color:string}> = {
  'Químico':     {bg:'rgba(79,163,255,0.1)',  border:'rgba(79,163,255,0.3)',  color:'#4fa3ff'},
  'Consumible':  {bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.3)',  color:'#34d399'},
  'Herramienta': {bg:'rgba(201,168,76,0.12)', border:'rgba(201,168,76,0.3)', color:'#c9a84c'},
}
function CatBadge({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? CAT_STYLE['Consumible']
  return <span style={{display:'inline-block',padding:'2px 9px',borderRadius:99,fontSize:10,fontWeight:700,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>{cat}</span>
}

// ─── status pill toggle ───────────────────────────────────────────────────────
function StatusPill({ value, onChange }: { value: string; onChange: (v: string)=>void }) {
  return (
    <div style={{display:'flex',gap:8}}>
      {[['en_ruta','EN RUTA'],['libre','LIBRE']].map(([v,label])=>(
        <button key={v} type="button" onClick={()=>onChange(v)}
          style={{padding:'7px 18px',borderRadius:99,cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'Outfit,sans-serif',transition:'all 0.15s',background:value===v?'#c9a84c':'#1a1a1e',color:value===v?'#0d0d0f':'#888580',border:value===v?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)'}}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── modal wrapper ────────────────────────────────────────────────────────────
function VModal({ title, onClose, children, maxWidth=520 }: { title: string; onClose: ()=>void; children: React.ReactNode; maxWidth?: number }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <span style={{fontSize:17,fontWeight:700,color:'#f0ede8'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

type Toast = { id: number; msg: string; type: 'success'|'error'|'warn' }

// ─── icon button ──────────────────────────────────────────────────────────────
function IconBtn({ onClick, danger=false, children }: { onClick: ()=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov,setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:24,height:24,borderRadius:'50%',background:'#1a1a1e',border:`1px solid ${hov?(danger?'#ff4f4f':'#c9a84c'):'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:hov?(danger?'#ff4f4f':'#c9a84c'):'#888580',transition:'all 0.15s',flexShrink:0}}>
      {children}
    </button>
  )
}

// ─── progress bar ─────────────────────────────────────────────────────────────
function ProgBar({ pct }: { pct: number }) {
  return (
    <div style={{height:4,borderRadius:2,background:'#1a1a1e',overflow:'hidden'}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',borderRadius:2,background:'#c9a84c',transition:'width 0.3s'}}/>
    </div>
  )
}

// ─── status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const enRuta = status === 'en_ruta'
  return (
    <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.1em',padding:'3px 8px',borderRadius:99,whiteSpace:'nowrap',background:enRuta?'rgba(201,168,76,0.15)':'rgba(52,211,153,0.15)',border:`1px solid ${enRuta?'rgba(201,168,76,0.4)':'rgba(52,211,153,0.4)'}`,color:enRuta?'#c9a84c':'#34d399'}}>
      {enRuta?'EN RUTA':'LIBRE'}
    </span>
  )
}

// ─── tech tag (gold chip with ×) ──────────────────────────────────────────────
function TechTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,
      background:'rgba(201,168,76,0.12)',border:`1px solid ${hov?'rgba(255,79,79,0.45)':'rgba(201,168,76,0.35)'}`,
      color:'#c9a84c',fontSize:11,fontWeight:600,transition:'border-color 0.15s'}}>
      {name}
      <button type="button" onClick={onRemove}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center',
          color:hov?'#ff4f4f':'#888580',lineHeight:1,transition:'color 0.15s'}}>
        <X size={10}/>
      </button>
    </span>
  )
}

const FALLBACK_TECHS = ['Mohammed A.', 'Carlos R.', 'Ivan P.', 'Yimmer', 'Ahmed H.']

// ─── multi-select technician picker ──────────────────────────────────────────
function TechPicker({ selected, onChange, pool }: {
  selected: string[]; onChange: (v: string[]) => void; pool: string[]
}) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const src      = pool.length > 0 ? pool : FALLBACK_TECHS
  const filtered = src.filter(t => t.toLowerCase().includes(query.toLowerCase()) && !selected.includes(t))
  const canAdd   = query.trim() && !src.includes(query.trim()) && !selected.includes(query.trim())

  function add(name: string) {
    if (!name.trim() || selected.includes(name)) return
    onChange([...selected, name]); setQuery(''); setOpen(false)
  }
  function remove(name: string) { onChange(selected.filter(t => t !== name)) }

  useEffect(()=>{
    function outside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return ()=>document.removeEventListener('mousedown', outside)
  },[])

  return (
    <div ref={wrapRef} style={{position:'relative'}}>
      {selected.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
          {selected.map(t=><TechTag key={t} name={t} onRemove={()=>remove(t)}/>)}
        </div>
      )}
      <div style={{position:'relative'}}>
        <MInput placeholder="Buscar o escribir técnico…" value={query}
          onChange={e=>{ setQuery(e.target.value); setOpen(true) }}
          onFocus={()=>setOpen(true)}/>
        {canAdd && (
          <button type="button" onClick={()=>add(query.trim())}
            style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
              background:'#c9a84c',border:'none',borderRadius:6,color:'#0d0d0f',
              fontSize:11,fontWeight:700,padding:'3px 8px',cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
            + Agregar
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
          background:'#1a1a1e',border:'1px solid rgba(201,168,76,0.25)',borderRadius:8,
          zIndex:810,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'}}>
          {filtered.map(t=>(
            <TechDropRow key={t} name={t} onPick={()=>add(t)}/>
          ))}
        </div>
      )}
    </div>
  )
}

function TechDropRow({ name, onPick }: { name: string; onPick: ()=>void }) {
  const [hov,setHov] = useState(false)
  return (
    <div onClick={onPick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:'10px 12px',cursor:'pointer',fontSize:13,color:'#f0ede8',
        fontFamily:'Outfit,sans-serif',background:hov?'rgba(201,168,76,0.1)':'transparent',
        transition:'background 0.1s'}}>
      {name}
    </div>
  )
}

// ─── vehicle agenda (today + tomorrow bookings) ───────────────────────────────
const STATUS_DOT: Record<string, string> = {
  confirmed:   '#34d399',
  in_progress: '#c9a84c',
  pending:     '#888580',
}

function VehicleAgenda({ bookings, tz }: { bookings: any[]; tz: UseTimezoneReturn }) {
  if (!bookings.length) return null

  const hoyLocal    = tz.getToday()
  const mananaDubai = new Date(hoyLocal)
  mananaDubai.setDate(mananaDubai.getDate() + 1)

  const { start: startHoy,    end: endHoy    } = tz.dayRange(hoyLocal)
  const { start: startManana, end: endManana } = tz.dayRange(mananaDubai)

  const serviciosHoy    = bookings.filter(b => b.scheduled_at && b.scheduled_at >= startHoy    && b.scheduled_at <= endHoy)
  const serviciosManana = bookings.filter(b => b.scheduled_at && b.scheduled_at >= startManana && b.scheduled_at <= endManana)

  if (!serviciosHoy.length && !serviciosManana.length) return null

  function AgendaRow({ b }: { b: any }) {
    const dot = STATUS_DOT[b.status] ?? '#888580'
    return (
      <div style={{display:'flex',gap:8,alignItems:'center',padding:'6px 8px',
        borderRadius:7,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#c9a84c',whiteSpace:'nowrap',flexShrink:0,fontVariantNumeric:'tabular-nums'}}>
          {tz.formatHora(b.scheduled_at)}
        </span>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:11,fontWeight:600,color:'#f0ede8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {b.contacts?.name ?? '—'}
          </div>
          <div style={{fontSize:10,color:'#888580',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {b.services?.name ?? '—'}
          </div>
        </div>
        <span style={{width:6,height:6,borderRadius:'50%',background:dot,flexShrink:0}}/>
      </div>
    )
  }

  return (
    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,marginTop:2,display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:9,fontWeight:700,color:'#888580',letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:2}}>
        Agenda
      </div>

      {serviciosHoy.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:8,fontWeight:800,letterSpacing:'0.14em',color:'#c9a84c',textTransform:'uppercase'}}>HOY</span>
            <span style={{flex:1,height:1,background:'rgba(201,168,76,0.15)'}}/>
            <span style={{fontSize:9,fontWeight:600,color:'#c9a84c',background:'rgba(201,168,76,0.1)',borderRadius:99,padding:'1px 6px'}}>
              {serviciosHoy.length}
            </span>
          </div>
          {serviciosHoy.map((b: any) => <AgendaRow key={b.id} b={b}/>)}
        </div>
      )}

      {serviciosManana.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:serviciosHoy.length?4:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:8,fontWeight:800,letterSpacing:'0.14em',color:'#888580',textTransform:'uppercase'}}>MAÑANA</span>
            <span style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
            <span style={{fontSize:9,fontWeight:600,color:'#888580',background:'rgba(255,255,255,0.05)',borderRadius:99,padding:'1px 6px'}}>
              {serviciosManana.length}
            </span>
          </div>
          {serviciosManana.map((b: any) => <AgendaRow key={b.id} b={b}/>)}
        </div>
      )}
    </div>
  )
}

// ─── vehicle card ─────────────────────────────────────────────────────────────
function VehicleCard({ v, alertCount, agenda, tz, onEdit, onClear, onAssign, onInventory, onProgressUpdate, onToggleStatus }: {
  v: any; alertCount: number; agenda: any[]; tz: UseTimezoneReturn;
  onEdit: ()=>void; onClear: ()=>void; onAssign: ()=>void; onInventory: ()=>void;
  onProgressUpdate: (bookingId: string, pct: number) => void;
  onToggleStatus: ()=>void;
}) {
  const [confirmClear, setConfirmClear] = useState(false)

  const booking = v.currentBooking ?? null
  const isActive = booking !== null

  const vehicleStatus = !isActive ? 'disponible'
    : booking.status === 'in_progress' ? 'en_ruta'
    : 'asignado'

  const statusConfig: Record<string, {label: string; color: string; bg: string}> = {
    disponible: { label: 'DISPONIBLE', color: '#22c55e', bg: '#22c55e20' },
    en_ruta:    { label: 'EN RUTA',    color: '#f59e0b', bg: '#f59e0b20' },
    asignado:   { label: 'ASIGNADO',   color: '#3b82f6', bg: '#3b82f620' },
  }
  const sc = statusConfig[vehicleStatus]
  const progress = booking?.progress ?? 0

  return (
    <div style={{position:'relative',background:'#1a1a1f',border:`1px solid ${isActive?'#c9a84c40':'#2a2a30'}`,borderRadius:16,padding:20,width:260,flexShrink:0,transition:'border-color 0.2s'}}>

      {/* Header: placa + estado + acciones */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <div style={{color:'#fff',fontSize:16,fontWeight:800,marginBottom:4}}>
            {v.license_plate || v.vin || v.name || 'MÓVIL'}
          </div>
          <div style={{color:'#666',fontSize:12}}>
            {[v.make, v.model, v.year].filter(Boolean).join(' ') || v.name || ''}
          </div>
          {/* Service status toggle badge */}
          {(() => {
            const fuera = v.status === 'inactivo'
            return (
              <button
                onClick={e=>{ e.stopPropagation(); onToggleStatus() }}
                title="Clic para cambiar estado"
                style={{
                  marginTop:6, padding:'3px 10px', borderRadius:99, border:'none',
                  cursor:'pointer', fontSize:9, fontWeight:800, letterSpacing:'0.1em',
                  background: fuera ? 'rgba(255,79,79,0.15)' : 'rgba(34,197,94,0.15)',
                  color:       fuera ? '#ff4f4f'              : '#22c55e',
                  display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap',
                  fontFamily:'Outfit,sans-serif', transition:'all 0.15s',
                }}>
                <span style={{width:5,height:5,borderRadius:'50%',
                  background: fuera ? '#ff4f4f' : '#22c55e', flexShrink:0}}/>
                {fuera ? 'FUERA DE SERVICIO' : 'EN SERVICIO'}
              </button>
            )
          })()}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          <span style={{padding:'4px 10px',borderRadius:20,fontSize:10,fontWeight:800,letterSpacing:'1px',background:sc.bg,color:sc.color,border:`1px solid ${sc.color}40`,whiteSpace:'nowrap'}}>
            {sc.label}
          </span>
          <div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
            <IconBtn onClick={onEdit}><Pencil size={10}/></IconBtn>
            <IconBtn danger onClick={()=>setConfirmClear(true)}><X size={10}/></IconBtn>
          </div>
        </div>
      </div>

      {/* Alerta stock bajo */}
      {alertCount > 0 && (
        <div style={{background:'#f59e0b15',border:'1px solid #f59e0b40',borderRadius:8,padding:'8px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'#f59e0b',fontSize:13}}>⚠</span>
          <span style={{color:'#f59e0b',fontSize:12,fontWeight:600}}>Stock Bajo · {alertCount} item{alertCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Info del servicio activo */}
      {isActive ? (
        <div style={{background:'#0d0d0f',borderRadius:10,padding:14,marginBottom:12}}>
          {booking.services?.name && (
            <div style={{marginBottom:10}}>
              <div style={{color:'#666',fontSize:10,fontWeight:700,letterSpacing:'1px',marginBottom:3}}>SERVICIO</div>
              <div style={{color:'#fff',fontSize:14,fontWeight:700}}>{booking.services.name}</div>
            </div>
          )}
          {booking.contacts?.name && (
            <div style={{marginBottom:booking.technician||booking.scheduled_at?10:0}}>
              <div style={{color:'#666',fontSize:10,fontWeight:700,letterSpacing:'1px',marginBottom:3}}>CLIENTE</div>
              <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{booking.contacts.name}</div>
            </div>
          )}
          {booking.technician && (
            <div style={{marginBottom:booking.scheduled_at?10:0}}>
              <div style={{color:'#666',fontSize:10,fontWeight:700,letterSpacing:'1px',marginBottom:3}}>TÉCNICO</div>
              <div style={{color:'#888',fontSize:13}}>{booking.technician}</div>
            </div>
          )}
          {booking.scheduled_at && (
            <div>
              <div style={{color:'#666',fontSize:10,fontWeight:700,letterSpacing:'1px',marginBottom:3}}>PROGRAMADO</div>
              <div style={{color:'#888',fontSize:12}}>
                {new Date(booking.scheduled_at).toLocaleDateString('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{background:'#0d0d0f',borderRadius:10,padding:20,marginBottom:12,textAlign:'center'}}>
          <div style={{color:'#22c55e',fontSize:13,fontWeight:600}}>Sin reservas activas</div>
          <div style={{color:'#555',fontSize:11,marginTop:4}}>Disponible para asignar</div>
        </div>
      )}

      {/* Barra de progreso funcional */}
      {isActive && (
        <div style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <span style={{color:'#666',fontSize:11,fontWeight:700}}>PROGRESO DEL SERVICIO</span>
            <span style={{color:'#c9a84c',fontSize:12,fontWeight:800}}>{progress}%</span>
          </div>
          <div style={{height:6,background:'#2a2a30',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:progress>=100?'#22c55e':progress>=50?'#c9a84c':'#3b82f6',borderRadius:3,transition:'width 0.5s ease'}}/>
          </div>
          <div style={{display:'flex',gap:6,marginTop:8}}>
            {[0,25,50,75,100].map(pct=>(
              <button key={pct} onClick={()=>onProgressUpdate(booking.id, pct)}
                style={{flex:1,padding:'5px 0',background:progress===pct?'#c9a84c':'#0d0d0f',border:`1px solid ${progress===pct?'#c9a84c':'#2a2a30'}`,borderRadius:6,color:progress===pct?'#0d0d0f':'#666',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
                {pct}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Precio */}
      {isActive && booking.price && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,padding:'8px 12px',background:'#c9a84c10',borderRadius:8}}>
          <span style={{color:'#666',fontSize:12}}>Valor del servicio</span>
          <span style={{color:'#c9a84c',fontWeight:800,fontSize:15}}>AED {parseFloat(booking.price).toFixed(2)}</span>
        </div>
      )}

      {/* Agenda: hoy + mañana */}
      <VehicleAgenda bookings={agenda} tz={tz}/>

      {/* Botón inventario */}
      <div style={{position:'relative',marginTop:8}}>
        {alertCount > 0 && (
          <span style={{position:'absolute',top:-6,left:-4,background:'#ff4f4f',color:'#fff',fontSize:9,fontWeight:800,borderRadius:99,padding:'1px 5px',zIndex:1,lineHeight:'14px'}}>{alertCount}</span>
        )}
        <button onClick={onInventory} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'6px 12px',borderRadius:8,background:'#1a1a1e',border:'1px solid rgba(201,168,76,0.25)',color:'#c9a84c',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
          <Package size={12}/> Inventario
        </button>
      </div>

      {/* Clear confirmation overlay */}
      {confirmClear && (
        <div style={{position:'absolute',inset:0,background:'rgba(13,13,15,0.94)',borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:16,zIndex:10}}>
          <span style={{fontSize:12,color:'#f0ede8',textAlign:'center',lineHeight:1.6}}>¿Marcar este vehículo como disponible?</span>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setConfirmClear(false)} style={{padding:'7px 16px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'#1a1a1e',color:'#888580',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>No</button>
            <button onClick={()=>{setConfirmClear(false);onClear()}} style={{padding:'7px 16px',borderRadius:7,border:'none',background:'#c9a84c',color:'#0d0d0f',fontSize:11,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>Sí</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── seed data ────────────────────────────────────────────────────────────────
const SEED_VEHICLES = [
  { name:'Van 01 — Sprinter',     license_plate:'DXB-M-8231', status:'en_ruta', service:'Ceramic Coating',   client_name:'Sheikh Hamdan A.',  client_address:'Palm Jumeirah, Villa 14', progress:65, departed_at:'09:15', eta:'11:00', technician:'Mohammed A.' },
  { name:'Van 02 — Land Cruiser', license_plate:'DXB-M-0445', status:'en_ruta', service:'Interior Detail',   client_name:'Mansoor Al Nahyan', client_address:'Emirates Hills, Gate 3',  progress:30, departed_at:'10:30', eta:'13:30', technician:'Carlos R.' },
  { name:'Van 03 — Hiace',        license_plate:'DXB-M-0512', status:'libre',   service:null,                client_name:null,                client_address:null,                      progress:0,  departed_at:null,    eta:null,    technician:null },
  { name:'Van 04 — Sprinter',     license_plate:'DXB-M-0788', status:'en_ruta', service:'Full Detail + Wax', client_name:'Faisal Al Qassimi', client_address:'Downtown Dubai Blvd',     progress:88, departed_at:'08:00', eta:'12:00', technician:'Ivan P.' },
]

const INV_BASE = [
  { item_name:'Ceramic Pro 9H',  category:'Químico',     stock_current:500, stock_minimum:100, unit:'mL' },
  { item_name:'Iron Remover',    category:'Químico',     stock_current:300, stock_minimum:50,  unit:'mL' },
  { item_name:'Microfibra 400GSM',category:'Consumible', stock_current:10,  stock_minimum:5,   unit:'unit' },
  { item_name:'Foam Cannon',     category:'Herramienta', stock_current:1,   stock_minimum:1,   unit:'unit' },
  { item_name:'Clay Bar',        category:'Consumible',  stock_current:3,   stock_minimum:2,   unit:'unit' },
]

const UNITS = ['mL','L','unit','kg','g']
const CATS  = ['Químico','Consumible','Herramienta']

// ─── form defaults ────────────────────────────────────────────────────────────
const EMPTY_VEH       = { name:'', license_plate:'', make:'', model:'', year:'', color:'', technician:'' }
const EMPTY_ASSIGN    = { client_id:'', service_id:'', client_address:'', departed_at:'', eta:'', technician:'' }
const EMPTY_INV_ITEM  = { item_name:'', category:'Químico', stock_current:'', stock_minimum:'', unit:'mL' }

const SUBMIT_STYLE: React.CSSProperties = { width:'100%', padding:14, borderRadius:10, border:'none', marginTop:20, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }
const BTN_GOLD:     React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif' }
const BTN_RED:      React.CSSProperties = { padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,79,79,0.3)', background:'transparent', color:'#ff4f4f', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }
const BTN_GHOST:    React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'#1a1a1e', color:'#888580', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }

export default function VehiclesPage() {
  const { t } = useLanguage()
  const tz = useTimezone()
  const [vehicles,  setVehicles]  = useState<any[]>([])
  const [contacts,  setContacts]  = useState<any[]>([])
  const [services,  setServices]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // alert counts per vehicle: { vehicleId -> alertCount }
  const [vehAlerts,   setVehAlerts]   = useState<Record<string,number>>({})
  // agenda bookings per vehicle: { vehicleId -> booking[] }
  const [vehBookings, setVehBookings] = useState<Record<string,any[]>>({})

  // vehicle CRUD modals
  const [showAdd,           setShowAdd]           = useState(false)
  const [editVeh,           setEditVeh]           = useState<any|null>(null)
  const [assignVeh,         setAssignVeh]         = useState<any|null>(null)
  const [addForm,           setAddForm]           = useState({...EMPTY_VEH})
  const [editForm,          setEditForm]          = useState<any>({})
  const [assignForm,        setAssignForm]        = useState({...EMPTY_ASSIGN})
  const [saving,            setSaving]            = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // multi-tech state
  const [addTechs,    setAddTechs]    = useState<string[]>([])
  const [editTechs,   setEditTechs]   = useState<string[]>([])
  const [assignTechs, setAssignTechs] = useState<string[]>([])

  // vehicle inventory panel
  const [invVeh,        setInvVeh]        = useState<any|null>(null)
  const [vehInventory,  setVehInventory]  = useState<any[]>([])
  const [loadingInv,    setLoadingInv]    = useState(false)
  const [showAddInv,    setShowAddInv]    = useState(false)
  const [addInvForm,    setAddInvForm]    = useState({...EMPTY_INV_ITEM})
  const [savingInv,     setSavingInv]     = useState(false)
  const [editInvItem,   setEditInvItem]   = useState<any|null>(null)
  const [editInvForm,   setEditInvForm]   = useState<any>({})
  const [savingInvEdit, setSavingInvEdit] = useState(false)
  const [allInvItems,      setAllInvItems]      = useState<any[]>([])
  const [serviceInvMap,    setServiceInvMap]    = useState<Record<string, any[]>>({})
  const [activeServices,   setActiveServices]   = useState<any[]>([])
  const [availableServices,setAvailableServices]= useState<any[]>([])

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  function addToast(msg: string, type: 'success'|'error'|'warn'='success') {
    const id = ++toastId.current
    setToasts(prev=>[...prev,{id,msg,type}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3500)
  }

  // ── fetch vehicles + seed ────────────────────────────────────────────────
  async function fetchVehicles() {
    setLoading(true)
    const sb = createClient()
    const [{ data: existing }, { data: allVehicleInv }] = await Promise.all([
      sb.from('vehicles')
        .select(`*, active_booking:bookings(id, status, scheduled_at, progress, price, technician, contacts(name), services(name))`)
        .is('contact_id', null)
        .order('created_at', {ascending: true}),
      sb.from('vehicle_inventory').select('vehicle_id, stock_current, stock_minimum'),
    ])

    if (!existing || existing.length === 0) {
      setVehicles([])
      setLoading(false)
      return
    }

    const vehiclesWithData = existing.map((v: any) => {
      const currentBooking = Array.isArray(v.active_booking)
        ? v.active_booking.find((b: any) => ['confirmed', 'in_progress', 'pending'].includes(b.status)) || null
        : null
      const lowStockCount = (allVehicleInv ?? []).filter(vi =>
        vi.vehicle_id === v.id && (vi.stock_current ?? 0) <= (vi.stock_minimum ?? 0)
      ).length
      return { ...v, currentBooking, lowStockCount }
    })

    setVehicles(vehiclesWithData)
    setLoading(false)
    const counts: Record<string,number> = {}
    vehiclesWithData.forEach((v: any) => { counts[v.id] = v.lowStockCount })
    setVehAlerts(counts)
  }

  async function fetchVehicleBookings() {
    // Fetch today + tomorrow in Dubai time
    const today    = tz.getToday()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const { start } = tz.dayRange(today)
    const { end }   = tz.dayRange(tomorrow)

    const { data } = await createClient()
      .from('bookings')
      .select('id, vehicle_id, scheduled_at, end_at, contacts(name), services(name), status')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .in('status', ['confirmed','in_progress','pending'])
      .order('scheduled_at', {ascending:true})

    if (!data) return
    const byVehicle: Record<string,any[]> = {}
    data.forEach(b => {
      if (!b.vehicle_id) return
      if (!byVehicle[b.vehicle_id]) byVehicle[b.vehicle_id] = []
      byVehicle[b.vehicle_id].push(b)
    })
    setVehBookings(byVehicle)
  }

  useEffect(()=>{
    fetchVehicles()
    if (tz.ready) fetchVehicleBookings()
    const sb = createClient()
    sb.from('contacts').select('id, name').then(({data})=>setContacts(data??[]))
    sb.from('services').select('id, name').then(({data})=>setServices(data??[]))
    sb.from('inventory_items').select('id, name, unit').then(({data})=>setAllInvItems(data??[]))
    sb.from('services').select('*').eq('is_active', true).then(({data})=>setActiveServices(data??[]))
    sb.from('service_inventory').select('*').then(({data})=>{
      const map: Record<string, any[]> = {}
      data?.forEach((si:any)=>{ if(!map[si.service_id]) map[si.service_id]=[]; map[si.service_id].push(si) })
      setServiceInvMap(map)
    })

    const channel = sb.channel('vehicles-realtime')
      .on('postgres_changes', {event:'*', schema:'public', table:'vehicles'}, (payload:any)=>{
        if (payload.eventType === 'DELETE') {
          setVehicles(prev=>prev.filter(v=>v.id!==payload.old.id))
        } else {
          setVehicles(prev=>{
            const exists = prev.find(v=>v.id===payload.new.id)
            return exists ? prev.map(v=>v.id===payload.new.id?payload.new:v) : [...prev, payload.new]
          })
        }
      })
      .subscribe()
    return ()=>{ sb.removeChannel(channel) }
  },[tz.ready])

  useEffect(()=>{
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (editInvItem)  { setEditInvItem(null); return }
      if (showAddInv)   { setShowAddInv(false); setAddInvForm({...EMPTY_INV_ITEM}); return }
      if (invVeh)       { setInvVeh(null); setVehInventory([]); return }
      if (assignVeh)    { setAssignVeh(null); setAssignForm({...EMPTY_ASSIGN}); return }
      if (editVeh)      { setEditVeh(null); setShowDeleteConfirm(false); return }
      if (showAdd)      { setShowAdd(false); setAddForm({...EMPTY_VEH}); return }
    }
    document.addEventListener('keydown', onKey)
    return ()=>document.removeEventListener('keydown', onKey)
  },[showAdd, editVeh, assignVeh, invVeh, showAddInv, editInvItem])

  // ── vehicle inventory ────────────────────────────────────────────────────
  async function openInventory(v: any) {
    setInvVeh(v)
    setLoadingInv(true)
    const sb = createClient()
    const [{ data: vInv }, { data: siData }, { data: svcs }] = await Promise.all([
      sb.from('vehicle_inventory').select('*').eq('vehicle_id', v.id).order('created_at',{ascending:true}),
      sb.from('service_inventory').select('*'),
      sb.from('services').select('*').eq('is_active', true),
    ])
    const vInvArr = vInv ?? []
    const map: Record<string, any[]> = {}
    siData?.forEach((si:any)=>{ if(!map[si.service_id]) map[si.service_id]=[]; map[si.service_id].push(si) })
    setVehInventory(vInvArr)
    setServiceInvMap(map)
    setActiveServices(svcs ?? [])
    setAvailableServices(getAvailableServices(vInvArr, svcs ?? [], map))
    setLoadingInv(false)
  }

  async function refreshInventory() {
    if (!invVeh) return
    const { data } = await createClient().from('vehicle_inventory').select('*').eq('vehicle_id', invVeh.id).order('created_at',{ascending:true})
    setVehInventory(data ?? [])
    // refresh alert counts via full refetch
    fetchVehicles()
  }

  async function loadStandardInventory() {
    if (!invVeh) return
    setSavingInv(true)
    await createClient().from('vehicle_inventory').insert(
      INV_BASE.map(item=>({...item, vehicle_id: invVeh.id}))
    )
    setSavingInv(false)
    addToast('Inventario estándar cargado','success')
    refreshInventory()
  }

  async function saveAddInvItem() {
    if (!invVeh || !addInvForm.item_name.trim()) return
    setSavingInv(true)
    const { error } = await createClient().from('vehicle_inventory').insert({
      vehicle_id:    invVeh.id,
      item_name:     addInvForm.item_name,
      category:      addInvForm.category,
      stock_current: Number(addInvForm.stock_current)||0,
      stock_minimum: Number(addInvForm.stock_minimum)||0,
      unit:          addInvForm.unit,
    })
    setSavingInv(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Item agregado','success')
    setShowAddInv(false); setAddInvForm({...EMPTY_INV_ITEM})
    refreshInventory()
  }

  function openEditInv(item: any) {
    setEditInvForm({ stock_current: String(item.stock_current??0), stock_minimum: String(item.stock_minimum??0) })
    setEditInvItem(item)
  }

  async function saveEditInvItem() {
    if (!editInvItem) return
    setSavingInvEdit(true)
    const newStock = Number(editInvForm.stock_current)||0
    const newMin   = Number(editInvForm.stock_minimum)||0
    const { error } = await createClient().from('vehicle_inventory').update({
      stock_current: newStock, stock_minimum: newMin
    }).eq('id', editInvItem.id)
    setSavingInvEdit(false)
    if (error) { addToast(error.message,'error'); return }
    if (newStock === 0) addToast(`🚨 Sin stock de ${editInvItem.item_name}`,'error')
    else if (newStock < newMin) addToast(`⚠️ Stock bajo en ${editInvItem.item_name}`,'warn')
    else addToast('Cantidad actualizada','success')
    setEditInvItem(null)
    refreshInventory()
  }

  // ── possible services ────────────────────────────────────────────────────
  function getAvailableServices(vInv: any[], svcs: any[], map: Record<string, any[]>) {
    return svcs.filter(service => {
      const required = map[service.id] || []
      if (required.length === 0) return false
      return required.every((insumo: any) => {
        const vItem = vInv.find((vi: any) => vi.inventory_item_id === insumo.inventory_item_id)
        return vItem && (vItem.stock_current ?? 0) >= (insumo.quantity ?? 0)
      })
    })
  }

  // ── vehicle CRUD ─────────────────────────────────────────────────────────
  async function saveAdd() {
    if (!addForm.name.trim() || !addForm.license_plate.trim()) return
    setSaving(true)
    const {error} = await createClient().from('vehicles').insert({
      name:addForm.name, license_plate:addForm.license_plate, make:addForm.make,
      model:addForm.model, year:addForm.year?Number(addForm.year):null,
      color:addForm.color, status:'libre',
      technician:addTechs.join(', '), technicians:addTechs,
    })
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast(t('vehicleAdded'), 'success')
    setShowAdd(false); setAddForm({...EMPTY_VEH}); setAddTechs([]); fetchVehicles()
  }

  function openEdit(v: any) {
    setEditForm({ name:v.name??'', license_plate:v.license_plate??'', make:v.make??'', model:v.model??'', year:v.year?String(v.year):'', color:v.color??'' })
    const techs: string[] = Array.isArray(v.technicians) && v.technicians.length > 0
      ? v.technicians
      : v.technician ? v.technician.split(', ').map((t:string)=>t.trim()).filter(Boolean) : []
    setEditTechs(techs)
    setShowDeleteConfirm(false); setEditVeh(v)
  }

  async function saveEdit() {
    if (!editVeh || !editForm.name.trim()) return
    setSaving(true)
    const {error} = await createClient().from('vehicles').update({
      name:editForm.name, license_plate:editForm.license_plate, make:editForm.make,
      model:editForm.model, year:editForm.year?Number(editForm.year):null,
      color:editForm.color,
      technician:editTechs.join(', '), technicians:editTechs,
    }).eq('id', editVeh.id)
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast(t('vehicleSaved'), 'success'); setEditVeh(null); fetchVehicles()
  }

  async function deleteVeh() {
    if (!editVeh) return
    const {error} = await createClient().from('vehicles').delete().eq('id', editVeh.id)
    if (error) { addToast(error.message,'error'); return }
    addToast(t('vehicleDeleted'), 'success'); setEditVeh(null); fetchVehicles()
  }

  async function toggleServiceStatus(v: any) {
    const newStatus = v.status === 'inactivo' ? 'activo' : 'inactivo'
    const { error } = await createClient().from('vehicles').update({ status: newStatus }).eq('id', v.id)
    if (error) { addToast(error.message, 'error'); return }
    addToast(newStatus === 'activo' ? 'Vehículo en servicio' : 'Vehículo fuera de servicio', 'success')
    fetchVehicles()
  }

  async function clearVehicle(v: any) {
    const {error} = await createClient().from('vehicles').update({
      status:'libre', service:null, client_name:null, client_address:null,
      progress:0, departed_at:null, eta:null, technician:null, technicians:[],
    }).eq('id', v.id)
    if (error) { addToast(error.message,'error'); return }
    addToast('Vehículo marcado como disponible','success'); fetchVehicles()
  }

  async function saveAssign() {
    if (!assignVeh || !assignForm.service_id) return
    setSaving(true)
    const svc     = services.find(s=>s.id===assignForm.service_id)
    const contact = contacts.find(c=>c.id===assignForm.client_id)
    const {error} = await createClient().from('vehicles').update({
      status:'en_ruta', service:svc?.name??'',
      client_name:contact?.name??'', client_address:assignForm.client_address,
      departed_at:assignForm.departed_at, eta:assignForm.eta,
      technician:assignTechs.join(', '), technicians:assignTechs, progress:0,
    }).eq('id', assignVeh.id)
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Trabajo asignado','success')
    setAssignVeh(null); setAssignForm({...EMPTY_ASSIGN}); setAssignTechs([]); fetchVehicles()
  }

  // ── computed ─────────────────────────────────────────────────────────────
  const invAlerts = vehInventory.filter(i=>(i.stock_current??0)<(i.stock_minimum??0)).length

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:24}}>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#f0ede8'}}>{t('vehicles')} — Home Service</div>
          <div style={{fontSize:12,color:'#888580',marginTop:3}}>{tz.getToday().toLocaleDateString('es-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        <button style={BTN_GOLD} onClick={()=>setShowAdd(true)}>+ {t('addVehicle')}</button>
      </div>

      {/* ── Section label ── */}
      <div style={{fontSize:11,fontWeight:600,color:'#888580',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>
        Vehicles — Real Time
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div style={{display:'flex',gap:12}}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{width:224,height:320,background:'#141416',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',flexShrink:0}} className="skeleton"/>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon="vehicle"
          title="No hay vehículos registrados"
          subtitle="Registra los vehículos de tu flota para comenzar"
          actionLabel="+ AGREGAR VEHÍCULO"
          onAction={() => setShowAdd(true)}
        />
      ) : (
        <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:8}}>
          {vehicles.map(v=>(
            <VehicleCard key={v.id} v={v}
              alertCount={v.lowStockCount ?? vehAlerts[v.id] ?? 0}
              agenda={vehBookings[v.id]??[]}
              tz={tz}
              onEdit={()=>openEdit(v)}
              onClear={()=>clearVehicle(v)}
              onAssign={()=>{ setAssignVeh(v); setAssignForm({...EMPTY_ASSIGN}) }}
              onInventory={()=>openInventory(v)}
              onToggleStatus={()=>toggleServiceStatus(v)}
              onProgressUpdate={async (bookingId, pct) => {
                await createClient().from('bookings').update({
                  progress: pct,
                  status: pct === 100 ? 'completed' : pct > 0 ? 'in_progress' : 'confirmed',
                  updated_at: new Date().toISOString(),
                }).eq('id', bookingId)
                fetchVehicles()
              }}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VEHICLE INVENTORY PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {invVeh && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:620,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>{ setInvVeh(null); setVehInventory([]); setShowAddInv(false); setEditInvItem(null) }}>
          <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth:780,maxHeight:'90vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>

            {/* panel header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#f0ede8',marginBottom:4}}>
                  Inventario — {invVeh.name}
                </div>
                <div style={{fontSize:12,color:'#888580'}}>{invVeh.license_plate}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button onClick={()=>setShowAddInv(true)} style={{...BTN_GOLD,fontSize:12,padding:'6px 14px'}}>+ Agregar Item</button>
                <button onClick={()=>{ setInvVeh(null); setVehInventory([]); setShowAddInv(false); setEditInvItem(null) }}
                  style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={18}/></button>
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
              {[
                { label:'Total Items',        value:String(vehInventory.length),  color:'#f0ede8' },
                { label:'Alertas Stock',       value:String(invAlerts),            color:invAlerts>0?'#ff4f4f':'#34d399' },
                { label:'Servicios Posibles',  value:String(availableServices.length),   color:availableServices.length>0?'#c9a84c':'#888580' },
              ].map(k=>(
                <div key={k.label} style={{background:'#1a1a1e',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'14px 16px'}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* empty state */}
            {!loadingInv && vehInventory.length === 0 && (
              <div style={{textAlign:'center',padding:'32px 0',marginBottom:16}}>
                <div style={{fontSize:13,color:'#888580',marginBottom:16}}>Sin inventario registrado para este vehículo.</div>
                <button onClick={loadStandardInventory} disabled={savingInv}
                  style={{padding:'10px 20px',borderRadius:8,border:'1px solid rgba(201,168,76,0.3)',background:'transparent',color:'#c9a84c',fontSize:13,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                  {savingInv?'Cargando…':'📦 Cargar inventario estándar'}
                </button>
              </div>
            )}

            {/* inventory table */}
            {(loadingInv || vehInventory.length > 0) && (
              <div style={{overflow:'hidden',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)',marginBottom:20}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      {['Producto','Categoría','Stock Móvil','Mínimo','Estado',''].map(h=>(
                        <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.07em',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInv ? (
                      <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#888580'}}>Cargando…</td></tr>
                    ) : vehInventory.map((item:any)=>{
                      const cur = item.stock_current ?? 0
                      const min = item.stock_minimum ?? 0
                      const estado = cur === 0 ? 'sin' : cur < min ? 'bajo' : 'ok'
                      const isEditing = editInvItem?.id === item.id
                      return (
                        <tr key={item.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <td style={{padding:'12px 14px',fontSize:13,fontWeight:500,color:'#f0ede8'}}>{item.item_name}</td>
                          <td style={{padding:'12px 14px'}}><CatBadge cat={item.category||'Consumible'}/></td>
                          <td style={{padding:'12px 14px'}}>
                            <span style={{fontSize:13,fontWeight:700,color:cur<min?'#ff4f4f':'#f0ede8'}}>
                              {cur} {item.unit}
                              {cur<min && <span style={{marginLeft:4}}>⚠️</span>}
                            </span>
                          </td>
                          <td style={{padding:'12px 14px',fontSize:13,color:'#888580'}}>{min} {item.unit}</td>
                          <td style={{padding:'12px 14px'}}>
                            {estado==='ok'   && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#34d399'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>OK</span>}
                            {estado==='bajo' && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#fbbf24'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#fbbf24',display:'inline-block'}}/>Bajo</span>}
                            {estado==='sin'  && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#ff4f4f'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#ff4f4f',display:'inline-block'}}/>Sin Stock</span>}
                          </td>
                          <td style={{padding:'12px 14px'}}>
                            <IconBtn onClick={()=>isEditing?setEditInvItem(null):openEditInv(item)}>
                              <Pencil size={10}/>
                            </IconBtn>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* possible services */}
            {vehInventory.length > 0 && (
              <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid #2a2a30'}}>
                <div style={{color:'#888',fontSize:11,fontWeight:700,letterSpacing:'2px',marginBottom:12}}>
                  SERVICIOS QUE PUEDE REALIZAR CON STOCK ACTUAL
                </div>
                {availableServices.length === 0 ? (
                  <div style={{background:'#ef444410',border:'1px solid #ef444430',borderRadius:8,padding:'12px 16px',color:'#ef4444',fontSize:13}}>
                    Stock insuficiente para realizar servicios completos
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {availableServices.map((service:any)=>{
                      const required = serviceInvMap[service.id] || []
                      return (
                        <div key={service.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#22c55e10',border:'1px solid #22c55e30',borderRadius:8,padding:'10px 14px'}}>
                          <div>
                            <div style={{color:'#fff',fontWeight:600,fontSize:13}}>{service.name}</div>
                            <div style={{color:'#666',fontSize:11,marginTop:2}}>
                              {required.map((r:any)=>`${r.item?.name ?? r.inventory_item_id}: ${r.quantity} ${r.unit || 'u'}`).join(' · ')}
                            </div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}/>
                            <span style={{color:'#22c55e',fontSize:11,fontWeight:700}}>DISPONIBLE</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit inventory item (inline modal, zIndex 650) ── */}
      {editInvItem && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:650,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>setEditInvItem(null)}>
          <div style={{background:'#141416',border:'1px solid rgba(201,168,76,0.25)',borderRadius:12,padding:20,width:'100%',maxWidth:360}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontSize:14,fontWeight:700,color:'#f0ede8'}}>{editInvItem.item_name}</span>
              <button onClick={()=>setEditInvItem(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={15}/></button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <MLabel>Stock Actual</MLabel>
                <MInput type="number" min={0} value={editInvForm.stock_current} onChange={e=>setEditInvForm({...editInvForm,stock_current:e.target.value})}/>
              </div>
              <div>
                <MLabel>Stock Mínimo</MLabel>
                <MInput type="number" min={0} value={editInvForm.stock_minimum} onChange={e=>setEditInvForm({...editInvForm,stock_minimum:e.target.value})}/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setEditInvItem(null)} style={BTN_GHOST}>Cancelar</button>
              <button onClick={saveEditInvItem} disabled={savingInvEdit}
                style={{flex:1,padding:10,borderRadius:8,border:'none',background:'#c9a84c',color:'#0d0d0f',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                {savingInvEdit?'Guardando…':'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Vehicle ── */}
      {showAdd && (
        <VModal title={t('addVehicle')} onClose={()=>{setShowAdd(false);setAddForm({...EMPTY_VEH})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><MLabel>{t('name')} *</MLabel><MInput placeholder="Van 01 — Sprinter" value={addForm.name} onChange={e=>setAddForm({...addForm,name:e.target.value})}/></div>
              <div><MLabel>{t('licensePlate')} *</MLabel><MInput placeholder="DXB-M-8231" value={addForm.license_plate} onChange={e=>setAddForm({...addForm,license_plate:e.target.value})}/></div>
              <div><MLabel>{t('make')}</MLabel><MInput placeholder="Mercedes" value={addForm.make} onChange={e=>setAddForm({...addForm,make:e.target.value})}/></div>
              <div><MLabel>{t('model')}</MLabel><MInput placeholder="Sprinter" value={addForm.model} onChange={e=>setAddForm({...addForm,model:e.target.value})}/></div>
              <div><MLabel>{t('year')}</MLabel><MInput type="number" placeholder="2023" value={addForm.year} onChange={e=>setAddForm({...addForm,year:e.target.value})}/></div>
              <div><MLabel>{t('color')}</MLabel><MInput placeholder="White" value={addForm.color} onChange={e=>setAddForm({...addForm,color:e.target.value})}/></div>
            </div>
            <div><MLabel>{t('technicians')}</MLabel><TechPicker selected={addTechs} onChange={setAddTechs} pool={contacts.map(c=>c.name)}/></div>
          </div>
          <button onClick={saveAdd} disabled={saving||!addForm.name.trim()||!addForm.license_plate.trim()} style={{...SUBMIT_STYLE,opacity:(addForm.name.trim()&&addForm.license_plate.trim())?1:0.5}}>
            {saving ? t('saving') : t('addVehicle')}
          </button>
        </VModal>
      )}

      {/* ── Modal: Edit Vehicle ── */}
      {editVeh && (
        <VModal title={t('editVehicle')} onClose={()=>{setEditVeh(null);setShowDeleteConfirm(false)}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><MLabel>{t('name')} *</MLabel><MInput placeholder="Van 01 — Sprinter" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></div>
              <div><MLabel>{t('licensePlate')} *</MLabel><MInput placeholder="DXB-M-8231" value={editForm.license_plate} onChange={e=>setEditForm({...editForm,license_plate:e.target.value})}/></div>
              <div><MLabel>{t('make')}</MLabel><MInput placeholder="Mercedes" value={editForm.make} onChange={e=>setEditForm({...editForm,make:e.target.value})}/></div>
              <div><MLabel>{t('model')}</MLabel><MInput placeholder="Sprinter" value={editForm.model} onChange={e=>setEditForm({...editForm,model:e.target.value})}/></div>
              <div><MLabel>{t('year')}</MLabel><MInput type="number" placeholder="2023" value={editForm.year} onChange={e=>setEditForm({...editForm,year:e.target.value})}/></div>
              <div><MLabel>{t('color')}</MLabel><MInput placeholder="White" value={editForm.color} onChange={e=>setEditForm({...editForm,color:e.target.value})}/></div>
            </div>
            <div><MLabel>{t('technicians')}</MLabel><TechPicker selected={editTechs} onChange={setEditTechs} pool={contacts.map(c=>c.name)}/></div>
          </div>
          {showDeleteConfirm && (
            <div style={{marginTop:16,padding:12,background:'rgba(255,79,79,0.08)',border:'1px solid rgba(255,79,79,0.25)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'#ff4f4f'}}>{t('deleteContactQ').replace('contacto','vehículo')}</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setShowDeleteConfirm(false)} style={{padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'#1a1a1e',color:'#888580',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>{t('no')}</button>
                <button onClick={deleteVeh} style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#ff4f4f',color:'#fff',fontSize:11,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>{t('yes')}, {t('delete').toLowerCase()}</button>
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20}}>
            <button onClick={()=>setShowDeleteConfirm(true)} style={BTN_RED}>{t('delete')} {t('vehicle').toLowerCase()}</button>
            <button onClick={saveEdit} disabled={saving||!editForm.name?.trim()} style={{...BTN_GOLD,padding:'10px 20px',opacity:editForm.name?.trim()?1:0.5}}>
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </VModal>
      )}

      {/* ── Modal: Add Inventory Item ── */}
      {showAddInv && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:650,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>{setShowAddInv(false);setAddInvForm({...EMPTY_INV_ITEM})}}>
          <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <span style={{fontSize:16,fontWeight:700,color:'#f0ede8'}}>Agregar Item a {invVeh?.name}</span>
              <button onClick={()=>{setShowAddInv(false);setAddInvForm({...EMPTY_INV_ITEM})}} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={18}/></button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <MLabel>Producto</MLabel>
                {allInvItems.length > 0 ? (
                  <MSelect value={addInvForm.item_name} onChange={e=>{
                    const item = allInvItems.find(i=>i.name===e.target.value)
                    setAddInvForm({...addInvForm, item_name:e.target.value, unit:item?.unit||addInvForm.unit})
                  }}>
                    <option value="">Seleccionar producto…</option>
                    {allInvItems.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}
                  </MSelect>
                ) : (
                  <MInput placeholder="Nombre del producto" value={addInvForm.item_name} onChange={e=>setAddInvForm({...addInvForm,item_name:e.target.value})}/>
                )}
              </div>
              <div>
                <MLabel>Categoría</MLabel>
                <div style={{display:'flex',gap:6}}>
                  {CATS.map(c=>(
                    <button key={c} type="button" onClick={()=>setAddInvForm({...addInvForm,category:c})}
                      style={{padding:'6px 14px',borderRadius:99,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',background:addInvForm.category===c?'#c9a84c':'#1a1a1e',color:addInvForm.category===c?'#0d0d0f':'#888580',border:addInvForm.category===c?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)'}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 100px',gap:12}}>
                <div><MLabel>Cantidad en Móvil *</MLabel><MInput type="number" min={0} placeholder="500" value={addInvForm.stock_current} onChange={e=>setAddInvForm({...addInvForm,stock_current:e.target.value})}/></div>
                <div><MLabel>Mínimo Recom. *</MLabel><MInput type="number" min={0} placeholder="100" value={addInvForm.stock_minimum} onChange={e=>setAddInvForm({...addInvForm,stock_minimum:e.target.value})}/></div>
                <div><MLabel>Unidad</MLabel><MSelect value={addInvForm.unit} onChange={e=>setAddInvForm({...addInvForm,unit:e.target.value})}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</MSelect></div>
              </div>
            </div>
            <button onClick={saveAddInvItem} disabled={savingInv||!addInvForm.item_name.trim()} style={{...SUBMIT_STYLE,opacity:addInvForm.item_name.trim()?1:0.5}}>
              {savingInv?'Guardando…':'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Assign Job ── */}
      {assignVeh && (
        <VModal title="Asignar Trabajo" onClose={()=>{setAssignVeh(null);setAssignForm({...EMPTY_ASSIGN})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <MLabel>Cliente</MLabel>
              <MSelect value={assignForm.client_id} onChange={e=>setAssignForm({...assignForm,client_id:e.target.value})}>
                <option value="">Seleccionar cliente…</option>
                {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </MSelect>
            </div>
            <div>
              <MLabel>Servicio</MLabel>
              <MSelect value={assignForm.service_id} onChange={e=>setAssignForm({...assignForm,service_id:e.target.value})}>
                <option value="">Seleccionar servicio…</option>
                {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </MSelect>
            </div>
            <div><MLabel>Dirección del Cliente</MLabel><MInput placeholder="Palm Jumeirah, Villa 14" value={assignForm.client_address} onChange={e=>setAssignForm({...assignForm,client_address:e.target.value})}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><MLabel>Hora de Salida</MLabel><MInput placeholder="09:00" value={assignForm.departed_at} onChange={e=>setAssignForm({...assignForm,departed_at:e.target.value})}/></div>
              <div><MLabel>ETA Estimada</MLabel><MInput placeholder="11:30" value={assignForm.eta} onChange={e=>setAssignForm({...assignForm,eta:e.target.value})}/></div>
            </div>
            <div><MLabel>Técnicos</MLabel><TechPicker selected={assignTechs} onChange={setAssignTechs} pool={contacts.map(c=>c.name)}/></div>
          </div>
          <button onClick={saveAssign} disabled={saving||!assignForm.service_id} style={{...SUBMIT_STYLE,opacity:assignForm.service_id?1:0.5}}>
            {saving?'Asignando…':'Asignar'}
          </button>
        </VModal>
      )}

      {/* ── Toasts ── */}
      <div style={{position:'fixed',bottom:24,right:24,zIndex:900,display:'flex',flexDirection:'column',gap:8}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:'12px 18px',borderRadius:10,fontSize:13,fontWeight:600,fontFamily:'Outfit,sans-serif',color:'#fff',
            background:t.type==='success'?'rgba(34,197,94,0.95)':t.type==='warn'?'rgba(251,191,36,0.95)':'rgba(255,79,79,0.95)',
            border:`1px solid ${t.type==='success'?'rgba(34,197,94,0.4)':t.type==='warn'?'rgba(251,191,36,0.4)':'rgba(255,79,79,0.4)'}`,
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)',backdropFilter:'blur(8px)'}}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
