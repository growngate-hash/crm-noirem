'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Search, X, Car, Calendar, MessageCircle, Phone, Pencil, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { EmptyState } from '@/components/ui/EmptyState'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
const initials = (n: string) => n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

// ─── category badge ───────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { bg: string; border: string; color: string; icon?: string }> = {
  'Black Diamond': { bg:'rgba(201,168,76,0.15)', border:'rgba(201,168,76,0.4)',  color:'#c9a84c', icon:'◆' },
  Platinum:        { bg:'rgba(229,228,226,0.1)',  border:'rgba(229,228,226,0.3)', color:'#e5e4e2', icon:'◆' },
  VIP:             { bg:'rgba(79,163,255,0.1)',   border:'rgba(79,163,255,0.3)',  color:'#4fa3ff', icon:'★' },
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

// ─── vehicles cell ────────────────────────────────────────────────────────────
function VehiclesCell({ vehicles }: { vehicles: any[] }) {
  const [showTip, setShowTip] = useState(false)
  if (!vehicles || vehicles.length === 0) return <span style={{ color:'#3a3836' }}>—</span>
  const first = vehicles[0]
  const rest  = vehicles.slice(1)
  const label = `${first.make ?? ''} ${first.model ?? ''} · ${first.license_plate ?? '—'}`
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize:12, color:'#888580', whiteSpace:'nowrap' }}>{label.trim()}</span>
      {rest.length > 0 && (
        <div style={{ position:'relative' }} onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.4)', color:'#c9a84c', cursor:'default', whiteSpace:'nowrap' }}>+{rest.length} más</span>
          {showTip && (
            <div style={{ position:'absolute', left:0, top:'calc(100% + 6px)', zIndex:200, background:'#1a1a1e', border:'1px solid rgba(201,168,76,0.3)', borderRadius:8, padding:'8px 12px', minWidth:180, boxShadow:'0 4px 20px rgba(0,0,0,0.5)' }}>
              {rest.map((v: any) => (
                <div key={v.id} style={{ fontSize:11, color:'#f0ede8', padding:'3px 0', whiteSpace:'nowrap' }}>
                  {v.make} {v.model} · <span style={{ color:'#c9a84c', fontFamily:'monospace' }}>{v.license_plate ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── phone cell (WhatsApp) ────────────────────────────────────────────────────
function PhoneCell({ phone }: { phone?: string }) {
  if (!phone) return <span style={{ color:'#3a3836' }}>—</span>
  const clean = phone.replace(/\D/g, '')
  return (
    <a href={`https://wa.me/${clean}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      style={{ display:'inline-flex', alignItems:'center', gap:5, color:'#25D366', fontSize:12, textDecoration:'none', whiteSpace:'nowrap' }}
    >
      <MessageCircle size={12} />
      {phone}
    </a>
  )
}

// ─── address cell (truncated + tooltip) ───────────────────────────────────────
function AddressCell({ address }: { address?: string }) {
  const [showTip, setShowTip] = useState(false)
  if (!address) return <span style={{ color:'#3a3836' }}>—</span>
  const truncated = address.length > 30 ? address.slice(0, 30) + '…' : address
  return (
    <div style={{ position:'relative' }} onMouseEnter={() => address.length > 30 && setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <span style={{ fontSize:12, color:'#888580', cursor:address.length > 30 ? 'help' : 'default' }}>{truncated}</span>
      {showTip && (
        <div style={{ position:'absolute', left:0, top:'calc(100% + 6px)', zIndex:200, background:'#1a1a1e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'8px 12px', minWidth:200, maxWidth:320, boxShadow:'0 4px 20px rgba(0,0,0,0.5)', fontSize:11, color:'#f0ede8', lineHeight:1.5, whiteSpace:'normal' }}>
          {address}
        </div>
      )}
    </div>
  )
}

// ─── action button ────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width:30, height:30, borderRadius:'50%', background:'#1a1a1e', border:`1px solid ${hov ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:hov ? '#c9a84c' : '#888580', transition:'all 0.15s', flexShrink:0 }}
    >
      {children}
    </button>
  )
}

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
function MLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'#888580', marginBottom:6 }}>{children}</label>
}

// ─── tier picker ──────────────────────────────────────────────────────────────
const TIER_ICONS: Record<string, string> = { 'Black Diamond':'◆', Platinum:'◆', VIP:'★' }
function TierPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display:'flex', gap:8 }}>
      {['Black Diamond','Platinum','VIP'].map(t => {
        const active = value === t
        return (
          <button key={t} type="button" onClick={() => onChange(t)}
            style={{ flex:1, padding:'9px 4px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'Outfit,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.15s', background:active ? '#c9a84c' : '#1a1a1e', color:active ? '#0d0d0f' : '#888580', border:active ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}
          >
            <span style={{ fontSize:10 }}>{TIER_ICONS[t]}</span> {t}
          </button>
        )
      })}
    </div>
  )
}

// ─── modal wrapper ────────────────────────────────────────────────────────────
function ContactModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:28, width:'100%', maxWidth:520, position:'relative', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <span style={{ fontSize:18, fontWeight:700, color:'#f0ede8' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', padding:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────
type Toast = { id: number; msg: string; type: 'success' | 'error' }


const TIER_PILLS = ['All','Black Diamond','Platinum','VIP']

const EMPTY_CLIENT   = { name:'', phone:'', email:'', vehicle_type:'', license_plate:'', tier:'VIP', address:'', notes:'' }
const EMPTY_PROVIDER = { name:'', phone:'', email:'', supplier_type:'', address:'', notes:'' }

const SUBMIT_STYLE: React.CSSProperties = { width:'100%', padding:14, borderRadius:10, border:'none', marginTop:20, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', transition:'opacity 0.15s', cursor:'pointer' }

export default function ContactsPage() {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const [contacts,         setContacts]         = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [search,           setSearch]           = useState('')
  const [tierFilter,       setTierFilter]       = useState('All')
  const [activeTab,        setActiveTab]        = useState<'clients'|'suppliers'>('clients')
  const [drawer,           setDrawer]           = useState<any | null>(null)
  const [selectedContact,  setSelectedContact]  = useState<any | null>(null)

  // add modals
  const [showClient,   setShowClient]   = useState(false)
  const [showProvider, setShowProvider] = useState(false)
  const [clientForm,   setClientForm]   = useState({ ...EMPTY_CLIENT })
  const [providerForm, setProviderForm] = useState({ ...EMPTY_PROVIDER })

  // edit modal
  const [editContact,      setEditContact]      = useState<any | null>(null)
  const [editForm,         setEditForm]         = useState<any>({})
  const [showDeleteConfirm,setShowDeleteConfirm] = useState(false)
  const [deleting,         setDeleting]         = useState(false)

  const [saving,  setSaving]  = useState(false)
  const [toasts,  setToasts]  = useState<Toast[]>([])
  const toastId = useRef(0)

  function addToast(msg: string, type: 'success' | 'error') {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  function closeClient()   { setShowClient(false);   setClientForm({ ...EMPTY_CLIENT }) }
  function closeProvider() { setShowProvider(false);  setProviderForm({ ...EMPTY_PROVIDER }) }
  function closeEdit()     { setEditContact(null);    setEditForm({}); setShowDeleteConfirm(false) }

  // open edit modal pre-filled
  function openEdit(c: any) {
    setEditContact(c)
    if (c.tipo === 'proveedor') {
      setEditForm({ name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', supplier_type: c.supplier_type ?? '', address: c.address ?? '', notes: c.notes ?? '' })
    } else {
      setEditForm({ name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', vehicle_type: c.vehicle_type ?? '', license_plate: c.license_plate ?? '', tier: c.tier ?? 'VIP', address: c.address ?? '', notes: c.notes ?? '' })
    }
  }

  // escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return }
      if (editContact)  { closeEdit(); return }
      if (showClient)   { closeClient(); return }
      if (showProvider) { closeProvider(); return }
      if (drawer)       { setDrawer(null); return }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showClient, showProvider, editContact, showDeleteConfirm, drawer])

  // ── fetch with tab filter ──────────────────────────────────────────────────
  async function fetchContacts(tab?: string) {
    const curTab = tab ?? activeTab
    setLoading(true)
    const sb = createClient()
    let q = sb.from('contacts').select('*, vehicles(id,make,model,license_plate), bookings(id,total_price)').order('created_at', { ascending: false })
    if (curTab === 'clients')    q = q.eq('tipo', 'cliente')
    if (curTab === 'suppliers') q = q.eq('tipo', 'proveedor')
    const { data } = await q
    setContacts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchContacts(activeTab) }, [activeTab])

  // ── save new client ────────────────────────────────────────────────────────
  async function saveClient() {
    if (!clientForm.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('contacts').insert({ name:clientForm.name, phone:clientForm.phone, email:clientForm.email, tier:clientForm.tier, address:clientForm.address, notes:clientForm.notes, vehicle_type:clientForm.vehicle_type, license_plate:clientForm.license_plate, tipo:'cliente' })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('clientAdded'), 'success')
    closeClient(); fetchContacts()
  }

  // ── save new provider ──────────────────────────────────────────────────────
  async function saveProvider() {
    if (!providerForm.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('contacts').insert({ name:providerForm.name, phone:providerForm.phone, email:providerForm.email, address:providerForm.address, notes:providerForm.notes, supplier_type:providerForm.supplier_type, tipo:'proveedor' })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('supplierAdded'), 'success')
    closeProvider(); fetchContacts()
  }

  // ── save edit ──────────────────────────────────────────────────────────────
  async function saveEdit() {
    if (!editForm.name?.trim() || !editContact) return
    setSaving(true)
    const payload: any = { name:editForm.name, phone:editForm.phone, email:editForm.email, address:editForm.address, notes:editForm.notes, updated_at:new Date().toISOString() }
    if (editContact.tipo === 'proveedor') {
      payload.supplier_type = editForm.supplier_type
    } else {
      payload.vehicle_type = editForm.vehicle_type
      payload.license_plate = editForm.license_plate
      payload.tier = editForm.tier
    }
    const { error } = await createClient().from('contacts').update(payload).eq('id', editContact.id)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('changesSaved'), 'success')
    setContacts(prev => prev.map(c => c.id === editContact.id ? { ...c, ...payload } : c))
    closeEdit()
  }

  // ── delete contact ─────────────────────────────────────────────────────────
  async function deleteContact() {
    if (!editContact) return
    setDeleting(true)
    const { error } = await createClient().from('contacts').update({ deleted_at: new Date().toISOString() }).eq('id', editContact.id)
    setDeleting(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('contactDeleted'), 'success')
    setContacts(prev => prev.filter(c => c.id !== editContact.id))
    closeEdit()
  }

  // ── display data ───────────────────────────────────────────────────────────
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name?.toLowerCase().includes(q)
    const matchTier   = tierFilter === 'All' || c.tier === tierFilter
    return matchSearch && matchTier
  })

  const emptyMsg    = activeTab === 'suppliers' ? t('noSuppliersYet') : t('noClientsYet')
  const emptyAction = activeTab === 'suppliers'
    ? <button onClick={() => setShowProvider(true)} style={{ marginTop:12, padding:'8px 20px', borderRadius:8, border:'1px solid rgba(201,168,76,0.3)', background:'#1a1a1e', color:'#c9a84c', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>+ {t('addSupplier')}</button>
    : <button onClick={() => setShowClient(true)}   style={{ marginTop:12, padding:'8px 20px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>+ {t('addClient')}</button>

  return (
    <div className="page-pad" style={{ padding:24, minHeight:'100%' }}>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:20 }}>
        {(['clients', 'suppliers'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ background:'transparent', border:'none', cursor:'pointer', padding:'10px 18px', fontSize:14, fontFamily:'Outfit,sans-serif', fontWeight:activeTab===tab?600:400, color:activeTab===tab?'#c9a84c':'#888580', borderBottom:`2px solid ${activeTab===tab?'#c9a84c':'transparent'}`, marginBottom:-1, transition:'all 0.15s' }}
          >
            {t(tab === 'clients' ? 'clients' : 'suppliers')}
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:160, maxWidth:300 }}>
          <Search size={13} color="#888580" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
          <input className="inp" style={{ paddingLeft:30, fontSize:12 }} placeholder={t('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:6 }}>
            {(activeTab === 'suppliers' ? ['All'] : TIER_PILLS).map(pill => {
              const isActive = tierFilter === pill
              return (
                <button key={pill} onClick={() => setTierFilter(pill)}
                  style={{ padding:'6px 14px', borderRadius:99, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif', transition:'all 0.15s', background:isActive?'#c9a84c':'rgba(201,168,76,0.12)', color:isActive?'#0d0d0f':'#c9a84c', border:isActive?'none':'1px solid rgba(201,168,76,0.3)' }}
                >
                  {pill}
                </button>
              )
            })}
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
          {!isMobile && (
            <button onClick={() => setShowProvider(true)}
              style={{ padding:'8px 16px', borderRadius:8, cursor:'pointer', background:'#1a1a1e', border:'1px solid rgba(201,168,76,0.3)', color:'#c9a84c', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}
            >
              + {t('addSupplier')}
            </button>
          )}
          <button onClick={() => activeTab === 'suppliers' ? setShowProvider(true) : setShowClient(true)}
            style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', whiteSpace:'nowrap' }}
          >
            + {isMobile ? t(activeTab === 'suppliers' ? 'addSupplier' : 'addClient') : t('addClient')}
          </button>
        </div>
      </div>

      {/* ── Mobile: tier pills row ── */}
      {isMobile && activeTab !== 'suppliers' && (
        <div className="tabs-scroll" style={{ marginBottom:12 }}>
          {TIER_PILLS.map(pill => {
            const isActive = tierFilter === pill
            return (
              <button key={pill} onClick={() => setTierFilter(pill)}
                style={{ padding:'6px 14px', borderRadius:99, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif', flexShrink:0, background:isActive?'#c9a84c':'rgba(201,168,76,0.12)', color:isActive?'#0d0d0f':'#c9a84c', border:isActive?'none':'1px solid rgba(201,168,76,0.3)' }}
              >
                {pill}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Content: Cards (mobile) / Table (desktop) ── */}
      {isMobile ? (
        <div>
          {loading ? (
            <div style={{ padding:40, textAlign:'center', color:'#888580', fontSize:13 }}>Cargando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={activeTab === 'suppliers' ? 'supplier' : 'contact'}
              title={activeTab === 'suppliers' ? 'No hay proveedores aún' : 'No hay contactos aún'}
              subtitle={activeTab === 'suppliers' ? 'Agrega tu primer proveedor para gestionar tus compras' : 'Agrega tu primer cliente para comenzar a gestionar tus relaciones'}
              actionLabel={activeTab === 'suppliers' ? '+ AGREGAR PROVEEDOR' : '+ AGREGAR CLIENTE'}
              onAction={() => activeTab === 'suppliers' ? setShowProvider(true) : setShowClient(true)}
            />
          ) : filtered.map(c => {
            const bkCount   = (c.bookings ?? []).length
            const totalSpent = c.total ?? (c.bookings ?? []).reduce((s: number, b: any) => s + (b.total_price ?? 0), 0)
            return (
              <div key={c.id} onClick={() => setSelectedContact(c)}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', marginBottom:8, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, cursor:'pointer', transition:'border-color 0.15s', active:{borderColor:'#c9a84c'} } as any}
              >
                <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#c9a84c,#8b6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#000', flexShrink:0 }}>
                  {initials(c.name ?? '?')}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#f0ede8', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {c.phone && <span style={{ fontSize:11, color:'#888580', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.phone}</span>}
                    {!c.phone && c.email && <span style={{ fontSize:11, color:'#888580', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</span>}
                  </div>
                </div>
                <div style={{ flexShrink:0 }}>
                  {c.tipo === 'proveedor'
                    ? <span style={{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'rgba(79,163,255,0.1)', border:'1px solid rgba(79,163,255,0.3)', color:'#4fa3ff' }}>PROV</span>
                    : <CategoryBadge tier={c.tier ?? 'VIP'} />
                  }
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Desktop table ── */
        <div className="glass table-wrap" style={{ overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                {activeTab === 'suppliers' ? (
                  [t('client'), t('category'), t('supplierType'), t('phone'), t('totalSpent'), t('actions')].map(h => (
                    <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))
                ) : (
                  [t('client'), t('category'), t('phone'), 'Dirección', 'Vehículos', t('totalSpent'), t('actions')].map(h => (
                    <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeTab === 'clients' ? 7 : 6}><SkeletonTable rows={4} cols={activeTab === 'clients' ? 7 : 6} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'clients' ? 7 : 6}>
                    <EmptyState
                      icon={activeTab === 'suppliers' ? 'supplier' : 'contact'}
                      title={activeTab === 'suppliers' ? 'No hay proveedores aún' : 'No hay contactos aún'}
                      subtitle={activeTab === 'suppliers' ? 'Agrega tu primer proveedor para gestionar tus compras' : 'Agrega tu primer cliente para comenzar a gestionar tus relaciones'}
                      actionLabel={activeTab === 'suppliers' ? '+ AGREGAR PROVEEDOR' : '+ AGREGAR CLIENTE'}
                      onAction={() => activeTab === 'suppliers' ? setShowProvider(true) : setShowClient(true)}
                    />
                  </td>
                </tr>
              ) : filtered.map(c => {
                const bkCount    = (c.bookings ?? []).length
                const totalSpent = c.total ?? (c.bookings ?? []).reduce((s: number, b: any) => s + (b.total_price ?? 0), 0)
                const vehicles   = c.vehicles ?? []
                return (
                  <tr key={c.id} className="row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' }} onClick={() => setDrawer(c)}>
                    {/* CLIENTE */}
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ fontSize:14, fontWeight:600, color:'#f0ede8', marginBottom:3 }}>{c.name}</div>
                      {activeTab !== 'suppliers' && (
                        <div style={{ fontSize:11, color:'#888580' }}>{bkCount} {bkCount===1?t('booking'):t('bookings2')}</div>
                      )}
                    </td>
                    {/* CATEGORÍA */}
                    <td style={{ padding:'14px 16px' }}>
                      {activeTab === 'suppliers'
                        ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:'rgba(79,163,255,0.1)', border:'1px solid rgba(79,163,255,0.3)', color:'#4fa3ff' }}>{t('suppliers').toUpperCase()}</span>
                        : <CategoryBadge tier={c.tier ?? 'VIP'} />
                      }
                    </td>
                    {activeTab === 'suppliers' ? (
                      <>
                        <td style={{ padding:'14px 16px', fontSize:13, color: c.supplier_type ? '#f0ede8' : '#3a3836' }}>{c.supplier_type || '—'}</td>
                        <td style={{ padding:'14px 16px', fontSize:13, color: c.phone ? '#f0ede8' : '#3a3836' }}>{c.phone || '—'}</td>
                      </>
                    ) : (
                      <>
                        {/* TELÉFONO */}
                        <td style={{ padding:'14px 16px' }}><PhoneCell phone={c.phone} /></td>
                        {/* DIRECCIÓN */}
                        <td style={{ padding:'14px 16px' }}><AddressCell address={c.address} /></td>
                        {/* VEHÍCULOS */}
                        <td style={{ padding:'14px 16px' }}><VehiclesCell vehicles={vehicles} /></td>
                      </>
                    )}
                    {/* GASTO TOTAL */}
                    <td style={{ padding:'14px 16px', fontSize:13, fontWeight:600, color:'#f0ede8' }}>{fmt(totalSpent)}</td>
                    {/* ACCIONES */}
                    <td style={{ padding:'14px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:6 }}>
                        <ActionBtn><MessageCircle size={13} /></ActionBtn>
                        <ActionBtn><Phone size={13} /></ActionBtn>
                        <ActionBtn onClick={() => openEdit(c)}><Pencil size={13} /></ActionBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
                  {drawer.tipo === 'proveedor'
                    ? <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#888580' }}>PROVEEDOR</span>
                    : <CategoryBadge tier={drawer.tier ?? 'VIP'} />
                  }
                </div>
              </div>
              {drawer.email && <div style={{ fontSize:12, color:'#888580', marginBottom:3 }}>{drawer.email}</div>}
              {drawer.phone && <div style={{ fontSize:12, color:'#888580' }}>{drawer.phone}</div>}
            </div>
            <div className="scroll" style={{ flex:1, padding:20 }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{t('vehicles')}</div>
                {(drawer.vehicles ?? []).length === 0
                  ? <div style={{ fontSize:12, color:'#888580' }}>{t('noVehiclesReg')}</div>
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
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{t('lastBookings')}</div>
                {(drawer.bookings ?? []).length === 0
                  ? <div style={{ fontSize:12, color:'#888580' }}>{t('noBookingsYet2')}</div>
                  : [...(drawer.bookings ?? [])].sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 5).map((bk: any, i: number) => (
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

      {/* ── Mobile bottom-sheet: Contact detail ── */}
      {selectedContact && (
        <>
          <div onClick={() => setSelectedContact(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:501, background:'var(--bg2)', borderTop:'2px solid #c9a84c', borderRadius:'20px 20px 0 0', padding:'0 20px 32px', maxHeight:'80vh', overflowY:'auto' }}>
            {/* handle */}
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.15)' }} />
            </div>
            {/* header */}
            <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'linear-gradient(135deg,#c9a84c,#8b6914)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'#000', flexShrink:0 }}>
                {initials(selectedContact.name ?? '?')}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#f0ede8', marginBottom:5 }}>{selectedContact.name}</div>
                {selectedContact.tipo === 'proveedor'
                  ? <span style={{ fontSize:9, fontWeight:700, padding:'3px 9px', borderRadius:99, background:'rgba(79,163,255,0.1)', border:'1px solid rgba(79,163,255,0.3)', color:'#4fa3ff' }}>PROVEEDOR</span>
                  : <CategoryBadge tier={selectedContact.tier ?? 'VIP'} />
                }
              </div>
              <button onClick={() => setSelectedContact(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#888580', cursor:'pointer', padding:6 }}>
                <X size={18} />
              </button>
            </div>
            {/* fields */}
            {[
              { label: t('phone'),   value: selectedContact.phone },
              { label: t('email'),   value: selectedContact.email },
              { label: t('address'), value: selectedContact.address },
              selectedContact.tipo !== 'proveedor'
                ? { label: t('vehicleType'),  value: selectedContact.vehicle_type }
                : { label: t('supplierType'), value: selectedContact.supplier_type },
              selectedContact.tipo !== 'proveedor'
                ? { label: t('licensePlate'), value: selectedContact.license_plate }
                : null,
              { label: t('notes'),   value: selectedContact.notes },
            ].filter(Boolean).map((f: any) => f.value ? (
              <div key={f.label} style={{ marginBottom:14, padding:'10px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{f.label}</div>
                <div style={{ fontSize:13, color:'#f0ede8', fontWeight:500 }}>{f.value}</div>
              </div>
            ) : null)}
            {/* action buttons */}
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              {selectedContact.phone && (
                <a href={`tel:${selectedContact.phone}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', borderRadius:10, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', textDecoration:'none' }}>
                  <Phone size={15} /> LLAMAR
                </a>
              )}
              <button onClick={() => { openEdit(selectedContact); setSelectedContact(null) }} style={{ flex:1, padding:'13px 0', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'var(--bg3)', color:'#f0ede8', fontSize:14, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                EDITAR
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Agregar Cliente ── */}
      {showClient && (
        <ContactModal title={t('addNewClient')} onClose={closeClient}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div><MLabel>{t('name')} *</MLabel><MInput placeholder="Ahmed Al Rashid" value={clientForm.name} onChange={e => setClientForm({...clientForm, name:e.target.value})} /></div>
            <div><MLabel>{t('phone')}</MLabel><MInput placeholder="+971 50 000 0000" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone:e.target.value})} /></div>
            <div><MLabel>{t('email')}</MLabel><MInput type="email" placeholder="ahmed@example.ae" value={clientForm.email} onChange={e => setClientForm({...clientForm, email:e.target.value})} /></div>
            <div><MLabel>{t('vehicleType')}</MLabel><MInput placeholder="ej. Bugatti Chiron" value={clientForm.vehicle_type} onChange={e => setClientForm({...clientForm, vehicle_type:e.target.value})} /></div>
            <div><MLabel>{t('licensePlate')}</MLabel><MInput placeholder="ej. M-00007" value={clientForm.license_plate} onChange={e => setClientForm({...clientForm, license_plate:e.target.value})} /></div>
            <div><MLabel>{t('category')}</MLabel><TierPicker value={clientForm.tier} onChange={v => setClientForm({...clientForm, tier:v})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>{t('address')}</MLabel><MInput placeholder="Dubai, UAE" value={clientForm.address} onChange={e => setClientForm({...clientForm, address:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>{t('notes')}</MLabel><MTextarea rows={3} placeholder="..." value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes:e.target.value})} /></div>
          </div>
          <button onClick={saveClient} disabled={saving || !clientForm.name.trim()} style={{ ...SUBMIT_STYLE, opacity:clientForm.name.trim()?1:0.5, cursor:clientForm.name.trim()?'pointer':'not-allowed' }}>
            {saving ? t('saving') : t('addClient')}
          </button>
        </ContactModal>
      )}

      {/* ── Modal: Agregar Proveedor ── */}
      {showProvider && (
        <ContactModal title={t('addNewSupplier')} onClose={closeProvider}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div><MLabel>{t('name')} *</MLabel><MInput placeholder="Al Noor Supplies" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name:e.target.value})} /></div>
            <div><MLabel>{t('phone')}</MLabel><MInput placeholder="+971 50 000 0000" value={providerForm.phone} onChange={e => setProviderForm({...providerForm, phone:e.target.value})} /></div>
            <div><MLabel>{t('email')}</MLabel><MInput type="email" placeholder="contact@supplier.ae" value={providerForm.email} onChange={e => setProviderForm({...providerForm, email:e.target.value})} /></div>
            <div><MLabel>{t('supplierType')}</MLabel><MInput placeholder="ej. Químicos" value={providerForm.supplier_type} onChange={e => setProviderForm({...providerForm, supplier_type:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>{t('address')}</MLabel><MInput placeholder="Dubai, UAE" value={providerForm.address} onChange={e => setProviderForm({...providerForm, address:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><MLabel>{t('notes')}</MLabel><MTextarea rows={3} placeholder="..." value={providerForm.notes} onChange={e => setProviderForm({...providerForm, notes:e.target.value})} /></div>
          </div>
          <button onClick={saveProvider} disabled={saving || !providerForm.name.trim()} style={{ ...SUBMIT_STYLE, opacity:providerForm.name.trim()?1:0.5, cursor:providerForm.name.trim()?'pointer':'not-allowed' }}>
            {saving ? t('saving') : t('addSupplier')}
          </button>
        </ContactModal>
      )}

      {/* ── Modal: Editar Contacto ── */}
      {editContact && (
        <ContactModal title={editContact.tipo === 'proveedor' ? t('editSupplier') : t('editClient')} onClose={closeEdit}>
          {editContact.tipo === 'proveedor' ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div><MLabel>Nombre *</MLabel><MInput value={editForm.name ?? ''} onChange={e => setEditForm({...editForm, name:e.target.value})} /></div>
              <div><MLabel>Teléfono</MLabel><MInput value={editForm.phone ?? ''} onChange={e => setEditForm({...editForm, phone:e.target.value})} /></div>
              <div><MLabel>Correo</MLabel><MInput type="email" value={editForm.email ?? ''} onChange={e => setEditForm({...editForm, email:e.target.value})} /></div>
              <div><MLabel>Tipo de Proveedor</MLabel><MInput value={editForm.supplier_type ?? ''} onChange={e => setEditForm({...editForm, supplier_type:e.target.value})} /></div>
              <div style={{ gridColumn:'1 / -1' }}><MLabel>Dirección</MLabel><MInput value={editForm.address ?? ''} onChange={e => setEditForm({...editForm, address:e.target.value})} /></div>
              <div style={{ gridColumn:'1 / -1' }}><MLabel>Notas</MLabel><MTextarea rows={3} value={editForm.notes ?? ''} onChange={e => setEditForm({...editForm, notes:e.target.value})} /></div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div><MLabel>Nombre *</MLabel><MInput value={editForm.name ?? ''} onChange={e => setEditForm({...editForm, name:e.target.value})} /></div>
              <div><MLabel>Teléfono</MLabel><MInput value={editForm.phone ?? ''} onChange={e => setEditForm({...editForm, phone:e.target.value})} /></div>
              <div><MLabel>Correo</MLabel><MInput type="email" value={editForm.email ?? ''} onChange={e => setEditForm({...editForm, email:e.target.value})} /></div>
              <div><MLabel>Tipo de Vehículo</MLabel><MInput value={editForm.vehicle_type ?? ''} onChange={e => setEditForm({...editForm, vehicle_type:e.target.value})} /></div>
              <div><MLabel>Matrícula</MLabel><MInput placeholder="ej. M-00007" value={editForm.license_plate ?? ''} onChange={e => setEditForm({...editForm, license_plate:e.target.value})} /></div>
              <div><MLabel>Categoría</MLabel><TierPicker value={editForm.tier ?? 'VIP'} onChange={v => setEditForm({...editForm, tier:v})} /></div>
              <div style={{ gridColumn:'1 / -1' }}><MLabel>Dirección</MLabel><MInput value={editForm.address ?? ''} onChange={e => setEditForm({...editForm, address:e.target.value})} /></div>
              <div style={{ gridColumn:'1 / -1' }}><MLabel>Notas</MLabel><MTextarea rows={3} value={editForm.notes ?? ''} onChange={e => setEditForm({...editForm, notes:e.target.value})} /></div>
            </div>
          )}

          {/* Delete confirmation inline */}
          {showDeleteConfirm && (
            <div style={{ marginTop:20, padding:16, borderRadius:10, background:'rgba(255,79,79,0.08)', border:'1px solid rgba(255,79,79,0.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <AlertTriangle size={15} color="#ff4f4f" />
                <span style={{ fontSize:13, fontWeight:600, color:'#ff4f4f' }}>{t('deleteContactQ')}</span>
              </div>
              <div style={{ fontSize:12, color:'#888580', marginBottom:14 }}>{t('irreversible')}</div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowDeleteConfirm(false)} style={{ flex:1, padding:'9px 0', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#888580', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                  {t('cancel')}
                </button>
                <button onClick={deleteContact} disabled={deleting} style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', background:'#ff4f4f', color:'#fff', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                  {deleting ? t('deleting') : `${t('yes')}, ${t('delete').toLowerCase()}`}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display:'flex', gap:10, marginTop:20, alignItems:'center' }}>
            {!showDeleteConfirm && (
              <button onClick={() => setShowDeleteConfirm(true)} style={{ padding:'12px 16px', borderRadius:10, border:'1px solid rgba(255,79,79,0.3)', background:'transparent', color:'#ff4f4f', fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer', whiteSpace:'nowrap' }}>
                {t('deleteContact')}
              </button>
            )}
            <button onClick={closeEdit} style={{ flex:1, padding:14, borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#888580', fontSize:14, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
              {t('cancel')}
            </button>
            <button onClick={saveEdit} disabled={saving || !editForm.name?.trim()} style={{ flex:2, padding:14, borderRadius:10, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:editForm.name?.trim()?'pointer':'not-allowed', opacity:editForm.name?.trim()?1:0.5 }}>
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </ContactModal>
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
