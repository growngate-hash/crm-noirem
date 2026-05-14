'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Search, Plus, X, Car, Calendar, MessageCircle, Phone, Pencil } from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ─── category badge ──────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { bg: string; border: string; color: string; icon?: string }> = {
  'Black Diamond': { bg:'rgba(201,168,76,0.15)', border:'rgba(201,168,76,0.4)', color:'#c9a84c', icon:'◆' },
  Platinum:        { bg:'rgba(229,228,226,0.1)',  border:'rgba(229,228,226,0.3)', color:'#e5e4e2' },
  VIP:             { bg:'rgba(79,163,255,0.1)',   border:'rgba(79,163,255,0.3)',  color:'#4fa3ff' },
}
function CategoryBadge({ tier }: { tier: string }) {
  const s = CAT_STYLE[tier] ?? CAT_STYLE.VIP
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:700, letterSpacing:'0.04em', background:s.bg, border:`1px solid ${s.border}`, color:s.color, whiteSpace:'nowrap' }}>
      {s.icon && <span>{s.icon}</span>}
      {tier.toUpperCase()}
    </span>
  )
}

// ─── action button ────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width:30, height:30, borderRadius:'50%', background:'#1a1a1e', border:`1px solid ${hov ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:hov ? '#c9a84c' : '#888580', transition:'all 0.15s', flexShrink:0 }}
    >
      {children}
    </button>
  )
}

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_CONTACTS = [
  { id:'d1', name:'Khalid Al Mansoori', tier:'Black Diamond', bookings:[{},{},{},{},{},{},{},{}], vehicles:[{ make:'Lamborghini', model:'Urus', license_plate:'DXB·1234', id:'v1', year:2023 }], total:94500 },
  { id:'d2', name:'Sara Bint Mohammed',  tier:'Platinum',      bookings:[{},{},{},{},{}],           vehicles:[{ make:'Range Rover',  model:'Vogue',  license_plate:'AUH·5678', id:'v2', year:2022 }], total:47200 },
  { id:'d3', name:'Mohammed Al Maktoum', tier:'Black Diamond', bookings:[{},{},{},{},{},{},{},{},{},{},{},{}], vehicles:[{ make:'Ferrari', model:'SF90', license_plate:'DXB·0001', id:'v3', year:2024 }], total:128000 },
  { id:'d4', name:'Fatima Al Zaabi',     tier:'VIP',           bookings:[{},{}],                    vehicles:[{ make:'Porsche',     model:'Cayenne', license_plate:'SHJ·9012', id:'v4', year:2021 }], total:18700 },
]

const TABS        = ['Todos', 'Clientes', 'Proveedores']
const TIER_PILLS  = ['All', 'Black Diamond', 'Platinum', 'VIP']
const TIER_OPTS   = ['Black Diamond', 'Platinum', 'VIP']
const EMPTY_FORM  = { name:'', email:'', phone:'', tier:'VIP', notes:'' }
const COL_HEADS   = ['Cliente', 'Categoría', 'Vehículo Principal', 'Matrícula', 'Gasto Total', 'Acciones']

export default function ContactsPage() {
  const [contacts,  setContacts]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [tierFilter,setTierFilter]= useState('All')
  const [activeTab, setActiveTab] = useState('Todos')
  const [drawer,    setDrawer]    = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ ...EMPTY_FORM })
  const [saving,    setSaving]    = useState(false)

  function fetchContacts() {
    createClient()
      .from('contacts')
      .select('*, vehicles(*), bookings(id,price,status,created_at)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setContacts(data ?? []); setLoading(false) })
  }
  useEffect(() => { fetchContacts() }, [])

  const source = contacts.length > 0 ? contacts : DEMO_CONTACTS

  const filtered = source.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name?.toLowerCase().includes(q)
    const matchTier   = tierFilter === 'All' || c.tier === tierFilter
    return matchSearch && matchTier
  })

  async function saveContact() {
    if (!form.name.trim()) return
    setSaving(true)
    await createClient().from('contacts').insert({ ...form })
    setSaving(false); setShowModal(false); setForm({ ...EMPTY_FORM }); fetchContacts()
  }

  return (
    <div style={{ padding:24, minHeight:'100%' }}>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:20, gap:0 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background:'transparent', border:'none', cursor:'pointer',
              padding:'10px 18px', fontSize:14, fontFamily:'Outfit,sans-serif',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#c9a84c' : '#888580',
              borderBottom: `2px solid ${activeTab === tab ? '#c9a84c' : 'transparent'}`,
              marginBottom:-1, transition:'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:180, maxWidth:300 }}>
          <Search size={13} color="#888580" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input className="inp" style={{ paddingLeft:30, fontSize:12 }} placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Tier pills */}
        <div style={{ display:'flex', gap:6 }}>
          {TIER_PILLS.map(pill => {
            const isActive = tierFilter === pill
            return (
              <button
                key={pill}
                onClick={() => setTierFilter(pill)}
                style={{
                  padding:'6px 14px', borderRadius:99, cursor:'pointer',
                  fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif',
                  background: isActive ? '#c9a84c' : 'rgba(201,168,76,0.12)',
                  color: isActive ? '#0d0d0f' : '#c9a84c',
                  border: isActive ? 'none' : '1px solid rgba(201,168,76,0.3)',
                  transition:'all 0.15s',
                }}
              >
                {pill}
              </button>
            )
          })}
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowModal(true)}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#c9a84c', color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap', marginLeft:'auto' }}
        >
          <Plus size={14} /> Agregar Cliente
        </button>
      </div>

      {/* ── Table ── */}
      <div className="glass" style={{ overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {COL_HEADS.map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><SkeletonTable rows={4} cols={6} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:48, textAlign:'center', color:'#888580', fontSize:13 }}>No se encontraron clientes</td></tr>
            ) : filtered.map(c => {
              const primaryVehicle = (c.vehicles ?? [])[0]
              const vehicleName    = primaryVehicle ? `${primaryVehicle.make} ${primaryVehicle.model}` : '—'
              const plate          = primaryVehicle?.license_plate ?? '—'
              const bookingCount   = (c.bookings ?? []).length
              const totalSpent     = c.total ?? (c.bookings ?? []).reduce((s: number, b: any) => s + (b.price ?? 0), 0)

              return (
                <tr
                  key={c.id}
                  className="row-hover"
                  style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }}
                  onClick={() => setDrawer(c)}
                >
                  {/* Cliente */}
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'#f0ede8', marginBottom:3 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:'#888580' }}>{bookingCount} {bookingCount === 1 ? 'reserva' : 'reservas'}</div>
                  </td>

                  {/* Categoría */}
                  <td style={{ padding:'14px 16px' }}>
                    <CategoryBadge tier={c.tier ?? 'VIP'} />
                  </td>

                  {/* Vehículo Principal */}
                  <td style={{ padding:'14px 16px', fontSize:13, color:'#888580' }}>
                    {vehicleName}
                  </td>

                  {/* Matrícula */}
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ fontFamily:'monospace', fontSize:12, color:'#c9a84c', fontWeight:600 }}>
                      {plate}
                    </span>
                  </td>

                  {/* Gasto Total */}
                  <td style={{ padding:'14px 16px', fontSize:13, fontWeight:600, color:'#f0ede8' }}>
                    {fmt(totalSpent)}
                  </td>

                  {/* Acciones */}
                  <td style={{ padding:'14px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', gap:6 }}>
                      <ActionBtn><MessageCircle size={13} /></ActionBtn>
                      <ActionBtn><Phone size={13} /></ActionBtn>
                      <ActionBtn onClick={() => setDrawer(c)}><Pencil size={13} /></ActionBtn>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <>
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:400 }} onClick={() => setDrawer(null)} />
          <div className="glass" style={{ position:'fixed', top:0, right:0, width:340, height:'100vh', zIndex:500, borderRadius:'14px 0 0 14px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)', position:'relative' }}>
              <button onClick={() => setDrawer(null)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'#888580', cursor:'pointer', padding:4 }}>
                <X size={16} />
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#c9a84c,#8b6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#000', flexShrink:0 }}>
                  {initials(drawer.name ?? '?')}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#f0ede8', marginBottom:6 }}>{drawer.name}</div>
                  <CategoryBadge tier={drawer.tier ?? 'VIP'} />
                </div>
              </div>
              {drawer.email && <div style={{ fontSize:12, color:'#888580', marginBottom:3 }}>{drawer.email}</div>}
              {drawer.phone && <div style={{ fontSize:12, color:'#888580' }}>{drawer.phone}</div>}
            </div>

            <div className="scroll" style={{ flex:1, padding:20 }}>
              {/* Vehicles */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Vehículos</div>
                {(drawer.vehicles ?? []).length === 0
                  ? <div style={{ fontSize:12, color:'#888580' }}>Sin vehículos registrados</div>
                  : (drawer.vehicles ?? []).map((v: any) => (
                    <div key={v.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, marginBottom:8 }}>
                      <Car size={14} color="#c9a84c" />
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#f0ede8' }}>{v.make} {v.model}</div>
                        <div style={{ fontSize:10, color:'#888580', fontFamily:'monospace' }}>{v.license_plate ?? ''}{v.year ? ` · ${v.year}` : ''}</div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Bookings */}
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Últimas Reservas</div>
                {(drawer.bookings ?? []).length === 0
                  ? <div style={{ fontSize:12, color:'#888580' }}>Sin reservas aún</div>
                  : [...(drawer.bookings ?? [])]
                      .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
                      .slice(0, 5)
                      .map((bk: any, i: number) => (
                        <div key={bk.id ?? i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:'#f0ede8' }}>{fmt(bk.price ?? 0)}</div>
                            {bk.created_at && (
                              <div style={{ fontSize:10, color:'#888580', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                                <Calendar size={9} /> {new Date(bk.created_at).toLocaleDateString('es-AE')}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', color:'#22c55e' }}>
                            {bk.status ?? 'Pending'}
                          </span>
                        </div>
                      ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal nuevo contacto ── */}
      {showModal && (
        <Modal title="Agregar Cliente" onClose={() => { setShowModal(false); setForm({ ...EMPTY_FORM }) }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label className="label">Nombre Completo *</label>
              <input className="inp" placeholder="Ahmed Al Rashid" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="inp" type="email" placeholder="ahmed@example.ae" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="inp" placeholder="+971 50 000 0000" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="inp" value={form.tier} onChange={e => setForm({...form, tier:e.target.value})}>
                {TIER_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea className="inp" rows={3} placeholder="Preferencias, notas…" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} style={{ resize:'vertical' }} />
            </div>
            <button
              onClick={saveContact}
              disabled={saving || !form.name.trim()}
              style={{ width:'100%', padding:'10px 0', borderRadius:8, border:'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', marginTop:4, opacity: form.name.trim() ? 1 : 0.5 }}
            >
              {saving ? 'Guardando…' : 'Guardar Cliente'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
