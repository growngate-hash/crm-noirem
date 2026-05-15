'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Pencil } from 'lucide-react'

// ─── shared input components ──────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%', background:'#1a1a1e', borderRadius:8, padding:'10px 12px',
  color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box',
}
function MInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return <input {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`, ...props.style}}/>
}
function MSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc, setFoc] = useState(false)
  return <select {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,cursor:'pointer', ...props.style}}/>
}
function MLabel({ children }: { children: React.ReactNode }) {
  return <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#888580',marginBottom:6}}>{children}</label>
}

// ─── status pill toggle ───────────────────────────────────────────────────────
function StatusPill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
function VModal({ title, onClose, children }: { title: string; onClose: ()=>void; children: React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <span style={{fontSize:17,fontWeight:700,color:'#f0ede8'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── toast type ───────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success'|'error' }

// ─── icon button (edit / close) ───────────────────────────────────────────────
function IconBtn({ onClick, danger=false, children }: { onClick: ()=>void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
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

// ─── vehicle card ─────────────────────────────────────────────────────────────
function VehicleCard({ v, onEdit, onClear, onAssign }: { v: any; onEdit: ()=>void; onClear: ()=>void; onAssign: ()=>void }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const enRuta = v.status === 'en_ruta'

  return (
    <div style={{position:'relative',background:'#141416',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16,width:224,flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>

      {/* top action icons */}
      <div style={{position:'absolute',top:12,right:12,display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
        <IconBtn onClick={onEdit}><Pencil size={10}/></IconBtn>
        <IconBtn danger onClick={()=>setConfirmClear(true)}><X size={10}/></IconBtn>
      </div>

      {/* name + badge */}
      <div style={{paddingRight:60}}>
        <div style={{fontSize:15,fontWeight:700,color:'#f0ede8',lineHeight:1.3,marginBottom:6}}>{v.name}</div>
        <StatusBadge status={v.status}/>
      </div>

      {/* plate */}
      <div style={{fontSize:12,fontFamily:'monospace',color:'#c9a84c',letterSpacing:'0.05em'}}>{v.license_plate||'—'}</div>

      {enRuta ? (
        <>
          <div>
            <div style={{fontSize:11,color:'#888580',marginBottom:2}}>Service</div>
            <div style={{fontSize:14,fontWeight:600,color:'#f0ede8'}}>{v.service||'—'}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'#888580',marginBottom:2}}>Client</div>
            <div style={{fontSize:13,fontWeight:600,color:'#f0ede8'}}>{v.client_name||'—'}</div>
            {v.client_address && <div style={{fontSize:11,color:'#888580',marginTop:2}}>📍 {v.client_address}</div>}
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,color:'#888580'}}>Progress</span>
              <span style={{fontSize:11,color:'#c9a84c'}}>{v.progress??0}%</span>
            </div>
            <ProgBar pct={v.progress??0}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div style={{display:'flex',gap:12}}>
              <div>
                <div style={{fontSize:10,color:'#888580'}}>Departed</div>
                <div style={{fontSize:12,fontWeight:600,color:'#f0ede8'}}>{v.departed_at||'—'}</div>
              </div>
              <div>
                <div style={{fontSize:10,color:'#888580'}}>ETA</div>
                <div style={{fontSize:12,fontWeight:600,color:'#f0ede8'}}>{v.eta||'—'}</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:10,color:'#888580'}}>Tech</div>
              <div style={{fontSize:11,fontWeight:500,color:'#f0ede8'}}>{v.technician||'—'}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'12px 0'}}>
            <span style={{fontSize:32,filter:'grayscale(1) opacity(0.4)'}}>🚐</span>
            <span style={{fontSize:12,color:'#888580'}}>Unit Available</span>
          </div>
          <button onClick={onAssign} style={{width:'100%',padding:10,borderRadius:8,border:'none',background:'#c9a84c',color:'#0d0d0f',fontSize:12,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
            + Assign Job
          </button>
        </>
      )}

      {/* clear confirmation overlay */}
      {confirmClear && (
        <div style={{position:'absolute',inset:0,background:'rgba(13,13,15,0.94)',borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:16,zIndex:10}}>
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

// ─── form defaults ────────────────────────────────────────────────────────────
const EMPTY_VEH    = { name:'', license_plate:'', make:'', model:'', year:'', color:'', status:'libre', technician:'' }
const EMPTY_ASSIGN = { client_id:'', service_id:'', client_address:'', departed_at:'', eta:'', technician:'' }
const SUBMIT_STYLE: React.CSSProperties = { width:'100%', padding:14, borderRadius:10, border:'none', marginTop:20, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }
const BTN_GOLD:     React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif' }
const BTN_RED:      React.CSSProperties = { padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,79,79,0.3)', background:'transparent', color:'#ff4f4f', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }

export default function VehiclesPage() {
  const [vehicles,  setVehicles]  = useState<any[]>([])
  const [contacts,  setContacts]  = useState<any[]>([])
  const [services,  setServices]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  // modals
  const [showAdd,             setShowAdd]             = useState(false)
  const [editVeh,             setEditVeh]             = useState<any|null>(null)
  const [assignVeh,           setAssignVeh]           = useState<any|null>(null)
  const [addForm,             setAddForm]             = useState({...EMPTY_VEH})
  const [editForm,            setEditForm]            = useState<any>({})
  const [assignForm,          setAssignForm]          = useState({...EMPTY_ASSIGN})
  const [saving,              setSaving]              = useState(false)
  const [showDeleteConfirm,   setShowDeleteConfirm]   = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  function addToast(msg: string, type: 'success'|'error') {
    const id = ++toastId.current
    setToasts(prev=>[...prev,{id,msg,type}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3500)
  }

  // ── fetch + seed ──────────────────────────────────────────────────────────
  async function fetchVehicles() {
    setLoading(true)
    const sb = createClient()
    const { data: existing } = await sb.from('vehicles').select('*').order('created_at', {ascending:true})
    if (existing && existing.length > 0) {
      setVehicles(existing); setLoading(false); return
    }
    const { data: seeded } = await sb.from('vehicles').insert(SEED_VEHICLES).select()
    setVehicles(seeded ?? []); setLoading(false)
  }

  useEffect(()=>{
    fetchVehicles()
    const sb = createClient()
    sb.from('contacts').select('id, name').then(({data})=>setContacts(data??[]))
    sb.from('services').select('id, name').then(({data})=>setServices(data??[]))

    // realtime subscription
    const channel = sb.channel('vehicles-realtime')
      .on('postgres_changes', {event:'*', schema:'public', table:'vehicles'}, (payload: any)=>{
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
  },[])

  // ESC closes modals in priority order
  useEffect(()=>{
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (assignVeh) { setAssignVeh(null); setAssignForm({...EMPTY_ASSIGN}); return }
      if (editVeh)   { setEditVeh(null);   setShowDeleteConfirm(false);      return }
      if (showAdd)   { setShowAdd(false);  setAddForm({...EMPTY_VEH});        return }
    }
    document.addEventListener('keydown', onKey)
    return ()=>document.removeEventListener('keydown', onKey)
  },[showAdd, editVeh, assignVeh])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function saveAdd() {
    if (!addForm.name.trim() || !addForm.license_plate.trim()) return
    setSaving(true)
    const {error} = await createClient().from('vehicles').insert({
      name:addForm.name, license_plate:addForm.license_plate, make:addForm.make,
      model:addForm.model, year:addForm.year?Number(addForm.year):null,
      color:addForm.color, status:addForm.status, technician:addForm.technician,
    })
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Vehículo agregado','success')
    setShowAdd(false); setAddForm({...EMPTY_VEH}); fetchVehicles()
  }

  function openEdit(v: any) {
    setEditForm({ name:v.name??'', license_plate:v.license_plate??'', make:v.make??'', model:v.model??'', year:v.year?String(v.year):'', color:v.color??'', status:v.status??'libre', technician:v.technician??'' })
    setShowDeleteConfirm(false)
    setEditVeh(v)
  }

  async function saveEdit() {
    if (!editVeh || !editForm.name.trim()) return
    setSaving(true)
    const {error} = await createClient().from('vehicles').update({
      name:editForm.name, license_plate:editForm.license_plate, make:editForm.make,
      model:editForm.model, year:editForm.year?Number(editForm.year):null,
      color:editForm.color, status:editForm.status, technician:editForm.technician,
    }).eq('id', editVeh.id)
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Vehículo actualizado','success')
    setEditVeh(null); fetchVehicles()
  }

  async function deleteVeh() {
    if (!editVeh) return
    const {error} = await createClient().from('vehicles').delete().eq('id', editVeh.id)
    if (error) { addToast(error.message,'error'); return }
    addToast('Vehículo eliminado','success')
    setEditVeh(null); fetchVehicles()
  }

  async function clearVehicle(v: any) {
    const {error} = await createClient().from('vehicles').update({
      status:'libre', service:null, client_name:null, client_address:null,
      progress:0, departed_at:null, eta:null, technician:null,
    }).eq('id', v.id)
    if (error) { addToast(error.message,'error'); return }
    addToast('Vehículo marcado como disponible','success')
    fetchVehicles()
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
      technician:assignForm.technician, progress:0,
    }).eq('id', assignVeh.id)
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Trabajo asignado','success')
    setAssignVeh(null); setAssignForm({...EMPTY_ASSIGN}); fetchVehicles()
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:24}}>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#f0ede8'}}>Vehicles — Home Service</div>
          <div style={{fontSize:12,color:'#888580',marginTop:3}}>{new Date().toLocaleDateString('es-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        <button style={BTN_GOLD} onClick={()=>setShowAdd(true)}>+ Add Vehicle</button>
      </div>

      {/* ── Section label ── */}
      <div style={{fontSize:11,fontWeight:600,color:'#888580',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:14}}>
        Vehicles — Real Time
      </div>

      {/* ── Cards ── */}
      {loading ? (
        <div style={{display:'flex',gap:12}}>
          {[1,2,3,4].map(i=>(
            <div key={i} style={{width:224,height:300,background:'#141416',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',flexShrink:0}} className="skeleton"/>
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{color:'#888580',fontSize:13,padding:20}}>Sin vehículos registrados.</div>
      ) : (
        <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:8}}>
          {vehicles.map(v=>(
            <VehicleCard key={v.id} v={v}
              onEdit={()=>openEdit(v)}
              onClear={()=>clearVehicle(v)}
              onAssign={()=>{ setAssignVeh(v); setAssignForm({...EMPTY_ASSIGN}) }}
            />
          ))}
        </div>
      )}

      {/* ── Modal: Add Vehicle ── */}
      {showAdd && (
        <VModal title="Agregar Vehículo" onClose={()=>{setShowAdd(false);setAddForm({...EMPTY_VEH})}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><MLabel>Nombre *</MLabel><MInput placeholder="Van 01 — Sprinter" value={addForm.name} onChange={e=>setAddForm({...addForm,name:e.target.value})}/></div>
              <div><MLabel>Matrícula *</MLabel><MInput placeholder="DXB-M-8231" value={addForm.license_plate} onChange={e=>setAddForm({...addForm,license_plate:e.target.value})}/></div>
              <div><MLabel>Marca</MLabel><MInput placeholder="Mercedes" value={addForm.make} onChange={e=>setAddForm({...addForm,make:e.target.value})}/></div>
              <div><MLabel>Modelo</MLabel><MInput placeholder="Sprinter" value={addForm.model} onChange={e=>setAddForm({...addForm,model:e.target.value})}/></div>
              <div><MLabel>Año</MLabel><MInput type="number" placeholder="2023" value={addForm.year} onChange={e=>setAddForm({...addForm,year:e.target.value})}/></div>
              <div><MLabel>Color</MLabel><MInput placeholder="White" value={addForm.color} onChange={e=>setAddForm({...addForm,color:e.target.value})}/></div>
            </div>
            <div><MLabel>Estado</MLabel><StatusPill value={addForm.status} onChange={v=>setAddForm({...addForm,status:v})}/></div>
            <div><MLabel>Técnico Asignado</MLabel><MInput placeholder="Mohammed A." value={addForm.technician} onChange={e=>setAddForm({...addForm,technician:e.target.value})}/></div>
          </div>
          <button onClick={saveAdd} disabled={saving||!addForm.name.trim()||!addForm.license_plate.trim()} style={{...SUBMIT_STYLE,opacity:(addForm.name.trim()&&addForm.license_plate.trim())?1:0.5}}>
            {saving?'Guardando…':'Agregar Vehículo'}
          </button>
        </VModal>
      )}

      {/* ── Modal: Edit Vehicle ── */}
      {editVeh && (
        <VModal title="Editar Vehículo" onClose={()=>{setEditVeh(null);setShowDeleteConfirm(false)}}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><MLabel>Nombre *</MLabel><MInput placeholder="Van 01 — Sprinter" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></div>
              <div><MLabel>Matrícula *</MLabel><MInput placeholder="DXB-M-8231" value={editForm.license_plate} onChange={e=>setEditForm({...editForm,license_plate:e.target.value})}/></div>
              <div><MLabel>Marca</MLabel><MInput placeholder="Mercedes" value={editForm.make} onChange={e=>setEditForm({...editForm,make:e.target.value})}/></div>
              <div><MLabel>Modelo</MLabel><MInput placeholder="Sprinter" value={editForm.model} onChange={e=>setEditForm({...editForm,model:e.target.value})}/></div>
              <div><MLabel>Año</MLabel><MInput type="number" placeholder="2023" value={editForm.year} onChange={e=>setEditForm({...editForm,year:e.target.value})}/></div>
              <div><MLabel>Color</MLabel><MInput placeholder="White" value={editForm.color} onChange={e=>setEditForm({...editForm,color:e.target.value})}/></div>
            </div>
            <div><MLabel>Estado</MLabel><StatusPill value={editForm.status} onChange={v=>setEditForm({...editForm,status:v})}/></div>
            <div><MLabel>Técnico Asignado</MLabel><MInput placeholder="Mohammed A." value={editForm.technician} onChange={e=>setEditForm({...editForm,technician:e.target.value})}/></div>
          </div>
          {showDeleteConfirm && (
            <div style={{marginTop:16,padding:12,background:'rgba(255,79,79,0.08)',border:'1px solid rgba(255,79,79,0.25)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'#ff4f4f'}}>¿Eliminar este vehículo?</span>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setShowDeleteConfirm(false)} style={{padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'#1a1a1e',color:'#888580',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>No</button>
                <button onClick={deleteVeh} style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#ff4f4f',color:'#fff',fontSize:11,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>Sí, eliminar</button>
              </div>
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20}}>
            <button onClick={()=>setShowDeleteConfirm(true)} style={BTN_RED}>Eliminar Vehículo</button>
            <button onClick={saveEdit} disabled={saving||!editForm.name?.trim()} style={{...BTN_GOLD,padding:'10px 20px',opacity:editForm.name?.trim()?1:0.5}}>
              {saving?'Guardando…':'Guardar Cambios'}
            </button>
          </div>
        </VModal>
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
            <div><MLabel>Técnico</MLabel><MInput placeholder="Mohammed A." value={assignForm.technician} onChange={e=>setAssignForm({...assignForm,technician:e.target.value})}/></div>
          </div>
          <button onClick={saveAssign} disabled={saving||!assignForm.service_id} style={{...SUBMIT_STYLE,opacity:assignForm.service_id?1:0.5}}>
            {saving?'Asignando…':'Asignar'}
          </button>
        </VModal>
      )}

      {/* ── Toasts ── */}
      <div style={{position:'fixed',bottom:24,right:24,zIndex:900,display:'flex',flexDirection:'column',gap:8}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:'12px 18px',borderRadius:10,fontSize:13,fontWeight:600,fontFamily:'Outfit,sans-serif',color:'#fff',background:t.type==='success'?'rgba(34,197,94,0.95)':'rgba(255,79,79,0.95)',border:`1px solid ${t.type==='success'?'rgba(34,197,94,0.4)':'rgba(255,79,79,0.4)'}`,boxShadow:'0 4px 20px rgba(0,0,0,0.4)',backdropFilter:'blur(8px)'}}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
