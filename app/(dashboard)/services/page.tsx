'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Pencil, Plus, Trash2 } from 'lucide-react'

// ─── modal inputs ─────────────────────────────────────────────────────────────
const INP_BASE: React.CSSProperties = {
  width:'100%', background:'#1a1a1e', borderRadius:8, padding:'10px 12px',
  color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box',
}
function MInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return <input {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP_BASE,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`, ...props.style}} />
}
function MTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc, setFoc] = useState(false)
  return <textarea {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP_BASE,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,resize:'vertical',...props.style}} />
}
function MSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc, setFoc] = useState(false)
  return <select {...props} onFocus={e=>{setFoc(true);props.onFocus?.(e)}} onBlur={e=>{setFoc(false);props.onBlur?.(e)}} style={{...INP_BASE,border:`1px solid ${foc?'#c9a84c':'rgba(255,255,255,0.08)'}`,cursor:'pointer',...props.style}} />
}
function MLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <label style={{display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.08em',color:'#888580',marginBottom:6}}>
      {children}{sub && <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'#888580',marginLeft:4}}>{sub}</span>}
    </label>
  )
}

// ─── pill selector ────────────────────────────────────────────────────────────
function PillSelector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
      {options.map(o => {
        const active = value === o
        return (
          <button key={o} type="button" onClick={() => onChange(o)}
            style={{padding:'7px 16px',borderRadius:99,cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'Outfit,sans-serif',transition:'all 0.15s',background:active?'#c9a84c':'#1a1a1e',color:active?'#0d0d0f':'#888580',border:active?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)'}}
          >{o}</button>
        )
      })}
    </div>
  )
}

// ─── modal wrapper ────────────────────────────────────────────────────────────
function SModal({ title, onClose, maxWidth=520, children }: { title: string; onClose: () => void; maxWidth?: number; children: React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <span style={{fontSize:18,fontWeight:700,color:'#f0ede8'}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex',alignItems:'center'}}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' }

// ─── material category badge ──────────────────────────────────────────────────
const MAT_CAT: Record<string,{bg:string;border:string;color:string}> = {
  'Químico':     {bg:'rgba(79,163,255,0.1)',  border:'rgba(79,163,255,0.3)',  color:'#4fa3ff'},
  'Consumible':  {bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.3)',  color:'#34d399'},
  'Herramienta': {bg:'rgba(201,168,76,0.12)', border:'rgba(201,168,76,0.3)', color:'#c9a84c'},
}
function MatCatBadge({ cat }: { cat: string }) {
  const s = MAT_CAT[cat] ?? MAT_CAT.Consumible
  return <span style={{display:'inline-block',padding:'2px 9px',borderRadius:99,fontSize:10,fontWeight:700,background:s.bg,border:`1px solid ${s.border}`,color:s.color}}>{cat}</span>
}

// ─── stock bar ────────────────────────────────────────────────────────────────
function StockBar({ current, minimum }: { current: number; minimum: number }) {
  const isLow = current <= minimum
  const maxRef = Math.max(current, minimum * 5, 1)
  const pct   = Math.min((current / maxRef) * 100, 100)
  return (
    <div style={{width:120,height:4,borderRadius:2,background:'#1a1a1e',flexShrink:0}}>
      <div style={{width:`${pct}%`,height:'100%',borderRadius:2,background:isLow?'#ff4f4f':'#c9a84c'}} />
    </div>
  )
}

// ─── action button (hover gold) ───────────────────────────────────────────────
function ABtn({ children, onClick, size=28 }: { children: React.ReactNode; onClick?: () => void; size?: number }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{width:size,height:size,borderRadius:'50%',background:'#1a1a1e',border:`1px solid ${hov?'#c9a84c':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:hov?'#c9a84c':'#888580',transition:'all 0.15s',flexShrink:0}}
    >{children}</button>
  )
}

// ─── service card ─────────────────────────────────────────────────────────────
function ServiceCard({ s, onEdit }: { s: any; onEdit: () => void }) {
  const [hov, setHov] = useState(false)
  const pills = (s.variants ?? '').split(',').map((v: string) => v.trim()).filter(Boolean)
  const priceStr = s.price_min != null && s.price_max != null
    ? `AED ${Number(s.price_min).toLocaleString('en-AE')} – ${Number(s.price_max).toLocaleString('en-AE')}`
    : s.base_price != null ? `AED ${Number(s.base_price).toLocaleString('en-AE')}` : '—'
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:'relative',background:'#141416',border:`1px solid ${hov?'rgba(201,168,76,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:12,padding:20,display:'flex',flexDirection:'column',transition:'border-color 0.15s'}}
    >
      {/* Edit button */}
      <div style={{position:'absolute',top:12,right:12}} onClick={e=>e.stopPropagation()}>
        <ABtn onClick={onEdit} size={28}><Pencil size={12}/></ABtn>
      </div>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4,paddingRight:36}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'#c9a84c',fontSize:18,lineHeight:1,flexShrink:0}}>◈</span>
          <span style={{fontSize:16,fontWeight:700,color:'#f0ede8'}}>{s.name}</span>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:'#c9a84c',whiteSpace:'nowrap',marginLeft:12}}>{priceStr}</span>
      </div>
      {/* Code + duration */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginLeft:26,marginBottom:14}}>
        <span style={{fontSize:11,color:'#888580'}}>{s.code ?? s.category ?? ''}</span>
        {(s.duration || s.duration_hrs) && <span style={{fontSize:11,color:'#888580'}}>⏱ {s.duration || s.duration_hrs}</span>}
      </div>
      {/* Description */}
      {s.description && <div style={{fontSize:13,color:'#888580',lineHeight:1.65,marginBottom:14}}>{s.description}</div>}
      {/* Pills */}
      {pills.length > 0 && (
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {pills.map((p: string, i: number) => (
            <span key={i} style={{background:'#1a1a1e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'3px 10px',fontSize:11,color:'#888580'}}>{p}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_SERVICES = [
  {id:'s1',name:'Ceramic Coating', code:'CC·PRO',  price_min:3500, price_max:8500,  duration:'2-3 Days',  description:'Nano-ceramic protection for hydrophobics, UV resistance, and mirror-like gloss.',     variants:'Silver Shield,Gold Armor,Platinum Crystal'},
  {id:'s2',name:'PPF Full Wrap',   code:'PPF·FULL',price_min:12000,price_max:35000, duration:'3-5 Days',  description:'Self-healing urethane film providing invisible armour against chips and abrasion.', variants:'Front Zones,Full Body,Full Body + Roof'},
  {id:'s3',name:'Full Restoration',code:'REST·360',price_min:8000, price_max:25000, duration:'5-7 Days',  description:'Complete paint correction, exterior and interior transformation.',                    variants:'Stage 1,Stage 2,Stage 3 Concours'},
  {id:'s4',name:'Interior Detail', code:'INT·LUX', price_min:1500, price_max:4500,  duration:'4-8 hours', description:'Deep-clean, leather conditioning, steam treatment and fragrance.',                  variants:'Express,Signature,Black Diamond'},
]
const DEMO_INVENTORY = [
  {id:'i1',name:'Ceramic Pro 9H',              brand:'Ceramic Pro',stock_current:340,stock_minimum:100,unit:'mL'},
  {id:'i2',name:'Gtechniq Crystal Serum Ultra',brand:'Gtechniq',  stock_current:175,stock_minimum:100,unit:'mL'},
  {id:'i3',name:'Gyeon Q2 Mohs+',              brand:'Gyeon',     stock_current:85, stock_minimum:100,unit:'mL'},
  {id:'i4',name:'Koch Chemie',                 brand:'Koch',      stock_current:520,stock_minimum:100,unit:'mL'},
  {id:'i5',name:'Carpro Cquartz',              brand:'Carpro',    stock_current:210,stock_minimum:100,unit:'mL'},
]
const DEMO_MATERIALS: Record<string, any[]> = {
  s1: [
    {id:'m1',service_id:'s1',material_name:'Ceramic Pro 9H',   quantity:150,unit:'mL',  unit_cost:45, category:'Químico'},
    {id:'m2',service_id:'s1',material_name:'Applicator Pad',   quantity:2,  unit:'unit', unit_cost:8,  category:'Consumible'},
    {id:'m3',service_id:'s1',material_name:'IR Curing Lamp',   quantity:1,  unit:'unit', unit_cost:0,  category:'Herramienta'},
  ],
  s2: [
    {id:'m4',service_id:'s2',material_name:'PPF Film Roll',     quantity:3,  unit:'unit', unit_cost:280,category:'Consumible'},
    {id:'m5',service_id:'s2',material_name:'Squeegee Set',      quantity:1,  unit:'unit', unit_cost:35, category:'Herramienta'},
    {id:'m6',service_id:'s2',material_name:'Gyeon Q2 Mohs+',   quantity:50, unit:'mL',  unit_cost:22, category:'Químico'},
  ],
  s3: [
    {id:'m7',service_id:'s3',material_name:'Carpro Cquartz',    quantity:100,unit:'mL',  unit_cost:38, category:'Químico'},
    {id:'m8',service_id:'s3',material_name:'Polishing Pad Set', quantity:4,  unit:'unit', unit_cost:25, category:'Consumible'},
    {id:'m9',service_id:'s3',material_name:'DA Polisher',       quantity:1,  unit:'unit', unit_cost:0,  category:'Herramienta'},
  ],
  s4: [
    {id:'m10',service_id:'s4',material_name:'Leather Cleaner',  quantity:200,unit:'mL',  unit_cost:18, category:'Químico'},
    {id:'m11',service_id:'s4',material_name:'Microfiber Towel', quantity:5,  unit:'unit', unit_cost:6,  category:'Consumible'},
  ],
}

const CATS   = ['Lavado','Pulido','Protección','Detailing']
const LEVELS = ['Junior','Senior','Master']
const UNITS  = ['unit','mL','L','kg','g']
const MAT_CATS = ['Consumible','Químico','Herramienta']

const EMPTY_SERVICE = { name:'', category:'Lavado', base_price:'', description:'', duration_hrs:'', technician_count:'1', technician_level:'Junior' }
const EMPTY_INVENTORY_FORM = { name:'', brand:'', stock_current:'', stock_minimum:'', unit:'mL', unit_price:'', supplier:'' }
const EMPTY_ITEM = { material_name:'', quantity:'', unit:'unit', unit_cost:'', category:'Consumible' }
const SUBMIT_STYLE: React.CSSProperties = { width:'100%',padding:14,borderRadius:10,border:'none',marginTop:20,background:'#c9a84c',color:'#0d0d0f',fontSize:14,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer' }

type MatRow = { name: string; qty: string; unit: string }

export default function ServicesPage() {
  const [services,  setServices]  = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loadingS,  setLoadingS]  = useState(true)
  const [loadingI,  setLoadingI]  = useState(true)

  // add modals
  const [showService, setShowService] = useState(false)
  const [showInv,     setShowInv]     = useState(false)
  const [serviceForm, setServiceForm] = useState({...EMPTY_SERVICE})
  const [matRows,     setMatRows]     = useState<MatRow[]>([{name:'',qty:'',unit:'unit'}])
  const [invForm,     setInvForm]     = useState({...EMPTY_INVENTORY_FORM})
  const [saving,      setSaving]      = useState(false)

  // materials panel
  const [selectedSvc,    setSelectedSvc]    = useState<any|null>(null)
  const [svcMaterials,   setSvcMaterials]   = useState<any[]>([])
  const [allInv,         setAllInv]         = useState<any[]>([])
  const [loadingMat,     setLoadingMat]     = useState(false)
  const [showAddItem,    setShowAddItem]    = useState(false)
  const [newItem,        setNewItem]        = useState({...EMPTY_ITEM})
  const [savingItem,     setSavingItem]     = useState(false)

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  function addToast(msg: string, type: 'success'|'error') {
    const id = ++toastId.current
    setToasts(prev=>[...prev,{id,msg,type}])
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3000)
  }

  function closeService() { setShowService(false); setServiceForm({...EMPTY_SERVICE}); setMatRows([{name:'',qty:'',unit:'unit'}]) }
  function closeInv()     { setShowInv(false); setInvForm({...EMPTY_INVENTORY_FORM}) }
  function closeMaterials(){ setSelectedSvc(null); setSvcMaterials([]); setShowAddItem(false); setNewItem({...EMPTY_ITEM}) }

  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(e.key!=='Escape') return
      if(selectedSvc)  { closeMaterials(); return }
      if(showService)  { closeService();   return }
      if(showInv)      { closeInv();       return }
    }
    document.addEventListener('keydown',onKey)
    return ()=>document.removeEventListener('keydown',onKey)
  },[showService,showInv,selectedSvc])

  function fetchServices()  { createClient().from('services').select('*').order('name').then(({data})=>{setServices(data??[]);setLoadingS(false)}) }
  function fetchInventory() { createClient().from('inventory_items').select('*').order('name').then(({data})=>{setInventory(data??[]);setLoadingI(false)}) }
  useEffect(()=>{ fetchServices(); fetchInventory() },[])

  // open materials panel for a service
  async function openMaterials(svc: any) {
    setSelectedSvc(svc)
    setLoadingMat(true)
    const isDemo = String(svc.id).startsWith('s')
    if (isDemo) {
      setSvcMaterials(DEMO_MATERIALS[svc.id] ?? [])
      setAllInv(DEMO_INVENTORY)
      setLoadingMat(false)
    } else {
      const [matRes, invRes] = await Promise.all([
        createClient().from('service_materials').select('*').eq('service_id', svc.id),
        createClient().from('inventory_items').select('*'),
      ])
      setSvcMaterials(matRes.data ?? [])
      setAllInv(invRes.data ?? [])
      setLoadingMat(false)
    }
  }

  function getInvItem(matName: string) {
    const lower = matName.toLowerCase()
    return allInv.find(i => i.name?.toLowerCase().includes(lower) || lower.includes(i.name?.toLowerCase()??''))
  }

  async function saveService() {
    if (!serviceForm.name.trim()) return
    setSaving(true)
    const {data, error} = await createClient().from('services').insert({
      name: serviceForm.name, category: serviceForm.category,
      base_price: serviceForm.base_price ? Number(serviceForm.base_price) : null,
      description: serviceForm.description, duration_hrs: serviceForm.duration_hrs,
      technician_count: Number(serviceForm.technician_count)||1,
      technician_level: serviceForm.technician_level, is_active: true,
    }).select('id').single()
    if (error) { setSaving(false); addToast(error.message,'error'); return }
    // save materials
    const validMats = matRows.filter(r=>r.name.trim())
    if (validMats.length > 0 && data?.id) {
      await createClient().from('service_materials').insert(
        validMats.map(r=>({ service_id:data.id, material_name:r.name, quantity:Number(r.qty)||0, unit:r.unit }))
      )
    }
    setSaving(false)
    addToast('Servicio creado correctamente','success')
    closeService(); fetchServices()
  }

  async function saveInventory() {
    if (!invForm.name.trim()) return
    setSaving(true)
    const {error} = await createClient().from('inventory_items').insert({
      name:invForm.name, brand:invForm.brand, unit:invForm.unit,
      supplier:invForm.supplier,
      stock_current: invForm.stock_current ? Number(invForm.stock_current) : 0,
      stock_minimum: invForm.stock_minimum ? Number(invForm.stock_minimum) : 0,
      unit_price:    invForm.unit_price    ? Number(invForm.unit_price)    : 0,
    })
    setSaving(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Producto agregado correctamente','success')
    closeInv(); fetchInventory()
  }

  async function saveItem() {
    if (!newItem.material_name.trim() || !selectedSvc) return
    const isDemo = String(selectedSvc.id).startsWith('s')
    if (isDemo) { addToast('No se puede guardar en datos de ejemplo','error'); return }
    setSavingItem(true)
    const {error} = await createClient().from('service_materials').insert({
      service_id: selectedSvc.id, material_name: newItem.material_name,
      quantity: Number(newItem.quantity)||0, unit: newItem.unit,
      unit_cost: Number(newItem.unit_cost)||0, category: newItem.category,
    })
    setSavingItem(false)
    if (error) { addToast(error.message,'error'); return }
    addToast('Ítem agregado','success')
    setShowAddItem(false); setNewItem({...EMPTY_ITEM})
    openMaterials(selectedSvc)
  }

  const srcServices  = services.length  > 0 && !loadingS ? services  : (!loadingS ? DEMO_SERVICES  : [])
  const srcInventory = inventory.length > 0 && !loadingI ? inventory : (!loadingI ? DEMO_INVENTORY : [])

  // KPIs for materials panel
  const totalArticulos = svcMaterials.length
  const costoTotal     = svcMaterials.reduce((s,m)=>(s + (m.quantity??0)*(m.unit_cost??0)),0)
  const alertas        = svcMaterials.filter(m=>{ const inv=getInvItem(m.material_name); return inv && (inv.stock_current??0)<=(inv.stock_minimum??0) }).length

  const BTN_OUTLINE: React.CSSProperties = {padding:'8px 16px',borderRadius:8,cursor:'pointer',background:'#1a1a1e',border:'1px solid rgba(201,168,76,0.3)',color:'#c9a84c',fontSize:13,fontWeight:600,fontFamily:'Outfit,sans-serif',whiteSpace:'nowrap'}
  const BTN_GOLD:    React.CSSProperties = {padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',background:'#c9a84c',color:'#0d0d0f',fontSize:13,fontWeight:700,fontFamily:'Outfit,sans-serif',whiteSpace:'nowrap'}

  return (
    <div style={{padding:24}}>

      {/* ── Header ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:'#f0ede8'}}>Servicios e Inventario</div>
          <div style={{fontSize:12,color:'#888580',marginTop:3}}>{new Date().toLocaleDateString('es-AE',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button style={BTN_OUTLINE} onClick={()=>setShowService(true)}>+ Agregar Servicio</button>
          <button style={BTN_GOLD}    onClick={()=>setShowInv(true)}>+ Agregar Inventario</button>
        </div>
      </div>

      {/* ── Services grid ── */}
      <div style={{marginBottom:40}}>
        {loadingS ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[1,2,3,4].map(i=><div key={i} style={{background:'#141416',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:20,height:180}} className="skeleton"/>)}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {srcServices.map((s:any)=><ServiceCard key={s.id} s={s} onEdit={()=>openMaterials(s)}/>)}
          </div>
        )}
      </div>

      {/* ── Inventory table ── */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#f0ede8'}}>Inventario de Químicos</div>
            <div style={{fontSize:12,color:'#888580',marginTop:2}}>Niveles de stock de productos premium</div>
          </div>
          <button style={BTN_GOLD} onClick={()=>setShowInv(true)}>+ Agregar Inventario</button>
        </div>
        <div className="glass" style={{overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                {['Producto','Marca','Stock','Unidad','Nivel'].map(h=>(
                  <th key={h} style={{padding:'12px 16px',fontSize:11,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.08em',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingI ? (
                <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'#888580'}}>Cargando…</td></tr>
              ) : srcInventory.map((item:any)=>{
                const isLow = (item.stock_current??0)<=(item.stock_minimum??0)
                return (
                  <tr key={item.id} className="row-hover" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'14px 16px',fontSize:13,fontWeight:500,color:'#f0ede8'}}>{item.name}</td>
                    <td style={{padding:'14px 16px',fontSize:13,color:'#888580'}}>{item.brand||'—'}</td>
                    <td style={{padding:'14px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,fontWeight:700,color:isLow?'#ff4f4f':'#f0ede8'}}>{item.stock_current??0}</span>
                        {isLow && <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:99,background:'rgba(255,79,79,0.12)',border:'1px solid rgba(255,79,79,0.3)',color:'#ff4f4f'}}>▲ BAJO</span>}
                      </div>
                    </td>
                    <td style={{padding:'14px 16px',fontSize:13,color:'#888580'}}>{item.unit||'mL'}</td>
                    <td style={{padding:'14px 16px'}}><StockBar current={item.stock_current??0} minimum={item.stock_minimum??0}/></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Agregar Servicio ── */}
      {showService && (
        <SModal title="Agregar Nuevo Servicio" onClose={closeService} maxWidth={560}>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Nombre */}
            <div><MLabel>Nombre del Servicio *</MLabel><MInput placeholder="ej. Corrección de Pintura" value={serviceForm.name} onChange={e=>setServiceForm({...serviceForm,name:e.target.value})}/></div>
            {/* Categoría + Precio */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div>
                <MLabel>Categoría *</MLabel>
                <PillSelector options={CATS} value={serviceForm.category} onChange={v=>setServiceForm({...serviceForm,category:v})}/>
              </div>
              <div><MLabel>Precio (AED) *</MLabel><MInput type="number" min={0} placeholder="0" value={serviceForm.base_price} onChange={e=>setServiceForm({...serviceForm,base_price:e.target.value})}/></div>
            </div>
            {/* Descripción */}
            <div><MLabel>Descripción</MLabel><MTextarea rows={2} placeholder="Breve descripción del servicio..." value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm,description:e.target.value})}/></div>
            {/* Tiempo + Técnicos */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><MLabel>Tiempo Estimado</MLabel><MInput placeholder="ej. 2-4 Horas" value={serviceForm.duration_hrs} onChange={e=>setServiceForm({...serviceForm,duration_hrs:e.target.value})}/></div>
              <div><MLabel>Cantidad de Técnicos *</MLabel><MInput type="number" min={1} placeholder="1" value={serviceForm.technician_count} onChange={e=>setServiceForm({...serviceForm,technician_count:e.target.value})}/></div>
            </div>
            {/* Nivel */}
            <div>
              <MLabel>Nivel de Técnicos *</MLabel>
              <PillSelector options={LEVELS} value={serviceForm.technician_level} onChange={v=>setServiceForm({...serviceForm,technician_level:v})}/>
            </div>
            {/* Materiales */}
            <div>
              <MLabel sub="(para control de inventario)">Materiales e Insumos</MLabel>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {matRows.map((row,idx)=>(
                  <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 80px 80px 32px',gap:6,alignItems:'center'}}>
                    <MInput placeholder="Nombre del material..." value={row.name} onChange={e=>{const r=[...matRows];r[idx]={...r[idx],name:e.target.value};setMatRows(r)}}/>
                    <MInput placeholder="Cant." value={row.qty} onChange={e=>{const r=[...matRows];r[idx]={...r[idx],qty:e.target.value};setMatRows(r)}}/>
                    <MSelect value={row.unit} onChange={e=>{const r=[...matRows];r[idx]={...r[idx],unit:e.target.value};setMatRows(r)}}>
                      {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                    </MSelect>
                    {idx===matRows.length-1
                      ? <button type="button" onClick={()=>setMatRows([...matRows,{name:'',qty:'',unit:'unit'}])} style={{width:32,height:36,borderRadius:6,border:'none',background:'#c9a84c',color:'#0d0d0f',fontSize:18,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Plus size={14}/></button>
                      : <button type="button" onClick={()=>setMatRows(matRows.filter((_,i)=>i!==idx))} style={{width:32,height:36,borderRadius:6,border:'1px solid rgba(255,79,79,0.3)',background:'transparent',color:'#ff4f4f',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Trash2 size={12}/></button>
                    }
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:'#888580',marginTop:8}}>Cada ejecución del servicio descontará estas cantidades del inventario.</div>
            </div>
          </div>
          <button onClick={saveService} disabled={saving||!serviceForm.name.trim()} style={{...SUBMIT_STYLE,opacity:serviceForm.name.trim()?1:0.5,cursor:serviceForm.name.trim()?'pointer':'not-allowed'}}>
            {saving?'Guardando…':'Crear Servicio'}
          </button>
        </SModal>
      )}

      {/* ── Modal: Agregar Inventario ── */}
      {showInv && (
        <SModal title="Agregar Producto" onClose={closeInv}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><MLabel>Nombre *</MLabel><MInput placeholder="Ceramic Pro 9H" value={invForm.name} onChange={e=>setInvForm({...invForm,name:e.target.value})}/></div>
            <div><MLabel>Marca</MLabel><MInput placeholder="Ceramic Pro" value={invForm.brand} onChange={e=>setInvForm({...invForm,brand:e.target.value})}/></div>
            <div><MLabel>Stock Actual *</MLabel><MInput type="number" min={0} placeholder="340" value={invForm.stock_current} onChange={e=>setInvForm({...invForm,stock_current:e.target.value})}/></div>
            <div><MLabel>Stock Mínimo</MLabel><MInput type="number" min={0} placeholder="100" value={invForm.stock_minimum} onChange={e=>setInvForm({...invForm,stock_minimum:e.target.value})}/></div>
            <div><MLabel>Unidad</MLabel><MSelect value={invForm.unit} onChange={e=>setInvForm({...invForm,unit:e.target.value})}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</MSelect></div>
            <div><MLabel>Precio Unitario AED</MLabel><MInput type="number" min={0} placeholder="0" value={invForm.unit_price} onChange={e=>setInvForm({...invForm,unit_price:e.target.value})}/></div>
            <div style={{gridColumn:'1 / -1'}}><MLabel>Proveedor</MLabel><MInput placeholder="Al Noor Supplies" value={invForm.supplier} onChange={e=>setInvForm({...invForm,supplier:e.target.value})}/></div>
          </div>
          <button onClick={saveInventory} disabled={saving||!invForm.name.trim()} style={{...SUBMIT_STYLE,opacity:invForm.name.trim()?1:0.5,cursor:invForm.name.trim()?'pointer':'not-allowed'}}>
            {saving?'Guardando…':'Agregar Producto'}
          </button>
        </SModal>
      )}

      {/* ── Panel: Control de Insumos y Materiales ── */}
      {selectedSvc && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={closeMaterials}>
          <div style={{background:'#141416',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:28,width:'100%',maxWidth:760,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>

            {/* Panel header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#f0ede8',marginBottom:4}}>Control de Insumos y Materiales</div>
                <div style={{fontSize:12,color:'#888580'}}>{selectedSvc.name}{selectedSvc.code?` · ${selectedSvc.code}`:''}</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <button onClick={()=>setShowAddItem(!showAddItem)} style={{...BTN_GOLD,fontSize:12,padding:'6px 14px'}}>+ Agregar Ítem</button>
                <button onClick={closeMaterials} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',padding:4,display:'flex'}}><X size={18}/></button>
              </div>
            </div>

            {/* KPI row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
              {[
                {label:'Total Artículos',  value:String(totalArticulos),  color:'#f0ede8'},
                {label:'Costo Est. / Serv.',value:`AED ${costoTotal.toLocaleString('en-AE')}`, color:'#c9a84c'},
                {label:'Alertas',           value:String(alertas),         color: alertas>0?'#ff4f4f':'#f0ede8'},
              ].map(k=>(
                <div key={k.label} style={{background:'#1a1a1e',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'14px 16px'}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:k.color}}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Inline add item form */}
            {showAddItem && (
              <div style={{background:'#1a1a1e',border:'1px solid rgba(201,168,76,0.2)',borderRadius:10,padding:16,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:'#c9a84c',marginBottom:12}}>Agregar Material</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 80px 1fr 1fr',gap:8,alignItems:'end',marginBottom:10}}>
                  <div><MLabel>Nombre</MLabel><MInput placeholder="Nombre del ítem" value={newItem.material_name} onChange={e=>setNewItem({...newItem,material_name:e.target.value})}/></div>
                  <div><MLabel>Categoría</MLabel><MSelect value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})}>{MAT_CATS.map(c=><option key={c} value={c}>{c}</option>)}</MSelect></div>
                  <div><MLabel>Cantidad</MLabel><MInput type="number" min={0} placeholder="0" value={newItem.quantity} onChange={e=>setNewItem({...newItem,quantity:e.target.value})}/></div>
                  <div><MLabel>Unidad</MLabel><MSelect value={newItem.unit} onChange={e=>setNewItem({...newItem,unit:e.target.value})}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</MSelect></div>
                  <div><MLabel>Costo Unit.</MLabel><MInput type="number" min={0} placeholder="0" value={newItem.unit_cost} onChange={e=>setNewItem({...newItem,unit_cost:e.target.value})}/></div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                  <button onClick={()=>{setShowAddItem(false);setNewItem({...EMPTY_ITEM})}} style={{padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#888580',fontSize:12,fontWeight:600,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>Cancelar</button>
                  <button onClick={saveItem} disabled={savingItem||!newItem.material_name.trim()} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#c9a84c',color:'#0d0d0f',fontSize:12,fontWeight:700,fontFamily:'Outfit,sans-serif',cursor:'pointer'}}>
                    {savingItem?'Guardando…':'Agregar'}
                  </button>
                </div>
              </div>
            )}

            {/* Materials table */}
            <div style={{overflow:'hidden',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    {['Ítem','Categoría','Cant. x Servicio','Stock','Costo Unit.','Estado',''].map(h=>(
                      <th key={h} style={{padding:'10px 14px',fontSize:10,fontWeight:600,color:'#888580',textTransform:'uppercase',letterSpacing:'0.07em',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingMat ? (
                    <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'#888580'}}>Cargando…</td></tr>
                  ) : svcMaterials.length===0 ? (
                    <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:'#888580',fontSize:13}}>Sin materiales registrados</td></tr>
                  ) : svcMaterials.map((m:any)=>{
                    const inv = getInvItem(m.material_name)
                    const stock = inv?.stock_current ?? '—'
                    const minimum = inv?.stock_minimum ?? 0
                    const stockNum = typeof stock === 'number' ? stock : -1
                    const estado = stockNum < 0 ? null : stockNum===0 ? 'sin' : stockNum<=minimum ? 'bajo' : 'ok'
                    return (
                      <tr key={m.id} className="row-hover" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'12px 14px',fontSize:13,fontWeight:500,color:'#f0ede8'}}>{m.material_name}</td>
                        <td style={{padding:'12px 14px'}}><MatCatBadge cat={m.category||'Consumible'}/></td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#888580'}}>{m.quantity} {m.unit}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#f0ede8'}}>{typeof stock==='number'?stock:'—'}</td>
                        <td style={{padding:'12px 14px',fontSize:13,color:'#c9a84c',fontWeight:600}}>{m.unit_cost?`AED ${m.unit_cost}`:'—'}</td>
                        <td style={{padding:'12px 14px'}}>
                          {estado==='ok'  && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#34d399'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>OK</span>}
                          {estado==='bajo' && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#fbbf24'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#fbbf24',display:'inline-block'}}/>Bajo</span>}
                          {estado==='sin'  && <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#ff4f4f'}}><span style={{width:6,height:6,borderRadius:'50%',background:'#ff4f4f',display:'inline-block'}}/>Sin Stock</span>}
                          {!estado && <span style={{fontSize:12,color:'#888580'}}>—</span>}
                        </td>
                        <td style={{padding:'12px 14px'}}><ABtn size={26}><Pencil size={10}/></ABtn></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
