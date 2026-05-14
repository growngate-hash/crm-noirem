'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

// ─── modal inputs ─────────────────────────────────────────────────────────────
const INP_BASE: React.CSSProperties = { width:'100%', background:'#1a1a1e', borderRadius:8, padding:'10px 12px', color:'#f0ede8', fontSize:13, fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }

function MInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return (
    <input {...props}
      onFocus={e => { setFoc(true); props.onFocus?.(e) }}
      onBlur={e => { setFoc(false); props.onBlur?.(e) }}
      style={{ ...INP_BASE, border:`1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, ...props.style }}
    />
  )
}
function MTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc, setFoc] = useState(false)
  return (
    <textarea {...props}
      onFocus={e => { setFoc(true); props.onFocus?.(e) }}
      onBlur={e => { setFoc(false); props.onBlur?.(e) }}
      style={{ ...INP_BASE, border:`1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, resize:'vertical', ...props.style }}
    />
  )
}
function MSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc, setFoc] = useState(false)
  return (
    <select {...props}
      onFocus={e => { setFoc(true); props.onFocus?.(e) }}
      onBlur={e => { setFoc(false); props.onBlur?.(e) }}
      style={{ ...INP_BASE, border:`1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, cursor:'pointer', ...props.style }}
    />
  )
}
function MLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#888580', marginBottom:6 }}>{children}</label>
}

// ─── modal wrapper ────────────────────────────────────────────────────────────
function SModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <span style={{ fontSize:18, fontWeight:700, color:'#f0ede8' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', padding:4, display:'flex', alignItems:'center' }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' }

// ─── stock bar ────────────────────────────────────────────────────────────────
function StockBar({ current, minimum }: { current: number; minimum: number }) {
  const isLow = current <= minimum
  const maxRef = Math.max(current, minimum * 5, 1)
  const pct   = Math.min((current / maxRef) * 100, 100)
  return (
    <div style={{ width:120, height:4, borderRadius:2, background:'#1a1a1e', flexShrink:0 }}>
      <div style={{ width:`${pct}%`, height:'100%', borderRadius:2, background: isLow ? '#ff4f4f' : '#c9a84c' }} />
    </div>
  )
}

// ─── service card ─────────────────────────────────────────────────────────────
function ServiceCard({ s }: { s: any }) {
  const [hov, setHov] = useState(false)
  const pills = (s.variants ?? '').split(',').map((v: string) => v.trim()).filter(Boolean)
  const priceStr = s.price_min != null && s.price_max != null
    ? `AED ${Number(s.price_min).toLocaleString('en-AE')} – ${Number(s.price_max).toLocaleString('en-AE')}`
    : s.price_min != null
    ? `AED ${Number(s.price_min).toLocaleString('en-AE')}`
    : '—'
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'#141416', border:`1px solid ${hov ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:20, display:'flex', flexDirection:'column', transition:'border-color 0.15s' }}
    >
      {/* Header row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:'#c9a84c', fontSize:18, lineHeight:1, flexShrink:0 }}>◈</span>
          <span style={{ fontSize:16, fontWeight:700, color:'#f0ede8' }}>{s.name}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:'#c9a84c', whiteSpace:'nowrap', marginLeft:12 }}>{priceStr}</span>
      </div>
      {/* Code + duration */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginLeft:26, marginBottom:14 }}>
        <span style={{ fontSize:11, color:'#888580' }}>{s.code ?? ''}</span>
        {s.duration && <span style={{ fontSize:11, color:'#888580' }}>⏱ {s.duration}</span>}
      </div>
      {/* Description */}
      {s.description && (
        <div style={{ fontSize:13, color:'#888580', lineHeight:1.65, marginBottom:14 }}>{s.description}</div>
      )}
      {/* Variant pills */}
      {pills.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {pills.map((p: string, i: number) => (
            <span key={i} style={{ background:'#1a1a1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'3px 10px', fontSize:11, color:'#888580' }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_SERVICES = [
  { id:'s1', name:'Ceramic Coating',  code:'CC·PRO',   price_min:3500,  price_max:8500,  duration:'2-3 Days',   description:'Nano-ceramic protection for hydrophobics, UV resistance, and mirror-like gloss.',          variants:'Silver Shield,Gold Armor,Platinum Crystal' },
  { id:'s2', name:'PPF Full Wrap',    code:'PPF·FULL', price_min:12000, price_max:35000, duration:'3-5 Days',   description:'Self-healing urethane film providing invisible armour against chips and abrasion.',      variants:'Front Zones,Full Body,Full Body + Roof' },
  { id:'s3', name:'Full Restoration', code:'REST·360', price_min:8000,  price_max:25000, duration:'5-7 Days',   description:'Complete paint correction, exterior and interior transformation.',                       variants:'Stage 1,Stage 2,Stage 3 Concours' },
  { id:'s4', name:'Interior Detail',  code:'INT·LUX',  price_min:1500,  price_max:4500,  duration:'4-8 hours',  description:'Deep-clean, leather conditioning, steam treatment and fragrance.',                      variants:'Express,Signature,Black Diamond' },
]
const DEMO_INVENTORY = [
  { id:'i1', name:'Ceramic Pro 9H',               brand:'Ceramic Pro', stock_current:340, stock_minimum:100, unit:'mL' },
  { id:'i2', name:'Gtechniq Crystal Serum Ultra', brand:'Gtechniq',    stock_current:175, stock_minimum:100, unit:'mL' },
  { id:'i3', name:'Gyeon Q2 Mohs+',               brand:'Gyeon',       stock_current:85,  stock_minimum:100, unit:'mL' },
  { id:'i4', name:'Koch Chemie',                  brand:'Koch',        stock_current:520, stock_minimum:100, unit:'mL' },
  { id:'i5', name:'Carpro Cquartz',               brand:'Carpro',      stock_current:210, stock_minimum:100, unit:'mL' },
]

const EMPTY_SERVICE   = { name:'', code:'', price_min:'', price_max:'', duration:'', category:'', description:'', variants:'' }
const EMPTY_INVENTORY = { name:'', brand:'', stock_current:'', stock_minimum:'', unit:'mL', unit_price:'', supplier:'' }
const SUBMIT_STYLE: React.CSSProperties = { width:'100%', padding:14, borderRadius:10, border:'none', marginTop:20, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }

export default function ServicesPage() {
  const [services,   setServices]   = useState<any[]>([])
  const [inventory,  setInventory]  = useState<any[]>([])
  const [loadingS,   setLoadingS]   = useState(true)
  const [loadingI,   setLoadingI]   = useState(true)

  const [showService, setShowService] = useState(false)
  const [showInv,     setShowInv]     = useState(false)
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE })
  const [invForm,     setInvForm]     = useState({ ...EMPTY_INVENTORY })
  const [saving,      setSaving]      = useState(false)

  const [toasts,  setToasts]  = useState<Toast[]>([])
  const toastId = useRef(0)

  function addToast(msg: string, type: 'success' | 'error') {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  function closeService() { setShowService(false); setServiceForm({ ...EMPTY_SERVICE }) }
  function closeInv()     { setShowInv(false);     setInvForm({ ...EMPTY_INVENTORY }) }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showService) closeService()
      if (showInv)     closeInv()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showService, showInv])

  function fetchServices() {
    createClient().from('services').select('*').order('name')
      .then(({ data }) => { setServices(data ?? []); setLoadingS(false) })
  }
  function fetchInventory() {
    createClient().from('inventory').select('*').order('name')
      .then(({ data }) => { setInventory(data ?? []); setLoadingI(false) })
  }
  useEffect(() => { fetchServices(); fetchInventory() }, [])

  async function saveService() {
    if (!serviceForm.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('services').insert({
      name: serviceForm.name, code: serviceForm.code, category: serviceForm.category,
      description: serviceForm.description, duration: serviceForm.duration,
      variants: serviceForm.variants,
      price_min: serviceForm.price_min ? Number(serviceForm.price_min) : null,
      price_max: serviceForm.price_max ? Number(serviceForm.price_max) : null,
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Servicio agregado correctamente', 'success')
    closeService(); fetchServices()
  }

  async function saveInventory() {
    if (!invForm.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('inventory').insert({
      name: invForm.name, brand: invForm.brand, unit: invForm.unit,
      supplier: invForm.supplier,
      stock_current: invForm.stock_current ? Number(invForm.stock_current) : 0,
      stock_minimum: invForm.stock_minimum ? Number(invForm.stock_minimum) : 0,
      unit_price:    invForm.unit_price    ? Number(invForm.unit_price)    : 0,
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Producto agregado correctamente', 'success')
    closeInv(); fetchInventory()
  }

  const srcServices  = services.length  > 0 && !loadingS ? services  : (!loadingS ? DEMO_SERVICES  : [])
  const srcInventory = inventory.length > 0 && !loadingI ? inventory : (!loadingI ? DEMO_INVENTORY : [])

  const BTN_OUTLINE: React.CSSProperties = { padding:'8px 16px', borderRadius:8, cursor:'pointer', background:'#1a1a1e', border:'1px solid rgba(201,168,76,0.3)', color:'#c9a84c', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }
  const BTN_GOLD:    React.CSSProperties = { padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }

  return (
    <div style={{ padding:24 }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#f0ede8' }}>Servicios e Inventario</div>
          <div style={{ fontSize:12, color:'#888580', marginTop:3 }}>
            {new Date().toLocaleDateString('es-AE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button style={BTN_OUTLINE} onClick={() => setShowService(true)}>+ Agregar Servicio</button>
          <button style={BTN_GOLD}    onClick={() => setShowInv(true)}>+ Agregar Inventario</button>
        </div>
      </div>

      {/* ── Services grid ── */}
      <div style={{ marginBottom:40 }}>
        {loadingS ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:20, height:180 }} className="skeleton" />)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {srcServices.map((s: any) => <ServiceCard key={s.id} s={s} />)}
          </div>
        )}
      </div>

      {/* ── Inventory table ── */}
      <div>
        {/* Section header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#f0ede8' }}>Inventario de Químicos</div>
            <div style={{ fontSize:12, color:'#888580', marginTop:2 }}>Niveles de stock de productos premium</div>
          </div>
          <button style={BTN_GOLD} onClick={() => setShowInv(true)}>+ Agregar Inventario</button>
        </div>

        <div className="glass" style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {['Producto','Marca','Stock','Unidad','Nivel'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingI ? (
                <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'#888580' }}>Cargando…</td></tr>
              ) : srcInventory.length === 0 ? (
                <tr><td colSpan={5} style={{ padding:48, textAlign:'center', color:'#888580', fontSize:13 }}>Sin productos en inventario</td></tr>
              ) : srcInventory.map((item: any) => {
                const isLow = (item.stock_current ?? 0) <= (item.stock_minimum ?? 0)
                return (
                  <tr key={item.id} className="row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'14px 16px', fontSize:13, fontWeight:500, color:'#f0ede8' }}>{item.name}</td>
                    <td style={{ padding:'14px 16px', fontSize:13, color:'#888580' }}>{item.brand || '—'}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: isLow ? '#ff4f4f' : '#f0ede8' }}>{item.stock_current ?? 0}</span>
                        {isLow && (
                          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(255,79,79,0.12)', border:'1px solid rgba(255,79,79,0.3)', color:'#ff4f4f' }}>▲ BAJO</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px', fontSize:13, color:'#888580' }}>{item.unit || 'mL'}</td>
                    <td style={{ padding:'14px 16px' }}>
                      <StockBar current={item.stock_current ?? 0} minimum={item.stock_minimum ?? 0} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Agregar Servicio ── */}
      {showService && (
        <SModal title="Agregar Nuevo Servicio" onClose={closeService}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div><MLabel>Nombre *</MLabel><MInput placeholder="Ceramic Coating" value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name:e.target.value})} /></div>
            <div><MLabel>Código</MLabel><MInput placeholder="CC·PRO" value={serviceForm.code} onChange={e => setServiceForm({...serviceForm, code:e.target.value})} /></div>
            <div><MLabel>Precio Mínimo AED *</MLabel><MInput type="number" min={0} placeholder="3500" value={serviceForm.price_min} onChange={e => setServiceForm({...serviceForm, price_min:e.target.value})} /></div>
            <div><MLabel>Precio Máximo AED</MLabel><MInput type="number" min={0} placeholder="8500" value={serviceForm.price_max} onChange={e => setServiceForm({...serviceForm, price_max:e.target.value})} /></div>
            <div><MLabel>Duración</MLabel><MInput placeholder="2-3 Days" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration:e.target.value})} /></div>
            <div><MLabel>Categoría</MLabel><MInput placeholder="Ceramic, PPF…" value={serviceForm.category} onChange={e => setServiceForm({...serviceForm, category:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>Descripción</MLabel><MTextarea rows={3} placeholder="Descripción del servicio…" value={serviceForm.description} onChange={e => setServiceForm({...serviceForm, description:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>Variantes (separadas por coma)</MLabel><MInput placeholder="Silver Shield, Gold Armor, Platinum Crystal" value={serviceForm.variants} onChange={e => setServiceForm({...serviceForm, variants:e.target.value})} /></div>
          </div>
          <button onClick={saveService} disabled={saving || !serviceForm.name.trim()} style={{ ...SUBMIT_STYLE, opacity:serviceForm.name.trim()?1:0.5, cursor:serviceForm.name.trim()?'pointer':'not-allowed' }}>
            {saving ? 'Guardando…' : 'Agregar Servicio'}
          </button>
        </SModal>
      )}

      {/* ── Modal: Agregar Inventario ── */}
      {showInv && (
        <SModal title="Agregar Producto" onClose={closeInv}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div><MLabel>Nombre *</MLabel><MInput placeholder="Ceramic Pro 9H" value={invForm.name} onChange={e => setInvForm({...invForm, name:e.target.value})} /></div>
            <div><MLabel>Marca</MLabel><MInput placeholder="Ceramic Pro" value={invForm.brand} onChange={e => setInvForm({...invForm, brand:e.target.value})} /></div>
            <div><MLabel>Stock Actual *</MLabel><MInput type="number" min={0} placeholder="340" value={invForm.stock_current} onChange={e => setInvForm({...invForm, stock_current:e.target.value})} /></div>
            <div><MLabel>Stock Mínimo</MLabel><MInput type="number" min={0} placeholder="100" value={invForm.stock_minimum} onChange={e => setInvForm({...invForm, stock_minimum:e.target.value})} /></div>
            <div>
              <MLabel>Unidad</MLabel>
              <MSelect value={invForm.unit} onChange={e => setInvForm({...invForm, unit:e.target.value})}>
                {['mL','L','unit','kg','g'].map(u => <option key={u} value={u}>{u}</option>)}
              </MSelect>
            </div>
            <div><MLabel>Precio Unitario AED</MLabel><MInput type="number" min={0} placeholder="0" value={invForm.unit_price} onChange={e => setInvForm({...invForm, unit_price:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>Proveedor</MLabel><MInput placeholder="Al Noor Supplies" value={invForm.supplier} onChange={e => setInvForm({...invForm, supplier:e.target.value})} /></div>
          </div>
          <button onClick={saveInventory} disabled={saving || !invForm.name.trim()} style={{ ...SUBMIT_STYLE, opacity:invForm.name.trim()?1:0.5, cursor:invForm.name.trim()?'pointer':'not-allowed' }}>
            {saving ? 'Guardando…' : 'Agregar Producto'}
          </button>
        </SModal>
      )}

      {/* ── Toasts ── */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', color:'#fff', background:t.type==='success'?'rgba(34,197,94,0.95)':'rgba(255,79,79,0.95)', border:`1px solid ${t.type==='success'?'rgba(34,197,94,0.4)':'rgba(255,79,79,0.4)'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
