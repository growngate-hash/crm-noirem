'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Plus, Trash2, Edit2, Clock, Tag } from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

const EMPTY_SERVICE = { name: '', category: '', price: 0, duration: 60, description: '', active: true }
const EMPTY_INVENTORY = { name: '', sku: '', stock_current: 0, stock_minimum: 0, unit_price: 0 }

export default function ServicesPage() {
  const [tab, setTab] = useState<'services' | 'inventory'>('services')

  // Services state
  const [services, setServices] = useState<any[]>([])
  const [loadingS, setLoadingS] = useState(true)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [newService, setNewService] = useState({ ...EMPTY_SERVICE })
  const [savingS, setSavingS] = useState(false)

  // Inventory state
  const [inventory, setInventory] = useState<any[]>([])
  const [loadingI, setLoadingI] = useState(true)
  const [showInvModal, setShowInvModal] = useState(false)
  const [newInv, setNewInv] = useState({ ...EMPTY_INVENTORY })
  const [savingI, setSavingI] = useState(false)

  function fetchServices() {
    const supabase = createClient()
    supabase.from('services').select('*').order('name').then(({ data }) => {
      setServices(data ?? [])
      setLoadingS(false)
    })
  }

  function fetchInventory() {
    const supabase = createClient()
    supabase.from('inventory').select('*').order('name').then(({ data }) => {
      setInventory(data ?? [])
      setLoadingI(false)
    })
  }

  useEffect(() => {
    fetchServices()
    fetchInventory()
  }, [])

  async function saveService() {
    if (!newService.name.trim()) return
    setSavingS(true)
    const supabase = createClient()
    await supabase.from('services').insert({ ...newService, price: Number(newService.price), duration: Number(newService.duration) })
    setSavingS(false)
    setShowServiceModal(false)
    setNewService({ ...EMPTY_SERVICE })
    fetchServices()
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service?')) return
    const supabase = createClient()
    await supabase.from('services').delete().eq('id', id)
    fetchServices()
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('services').update({ active: !current }).eq('id', id)
    fetchServices()
  }

  async function saveInventory() {
    if (!newInv.name.trim()) return
    setSavingI(true)
    const supabase = createClient()
    await supabase.from('inventory').insert({
      name: newInv.name,
      sku: newInv.sku,
      stock_current: Number(newInv.stock_current),
      stock_minimum: Number(newInv.stock_minimum),
      unit_price: Number(newInv.unit_price),
    })
    setSavingI(false)
    setShowInvModal(false)
    setNewInv({ ...EMPTY_INVENTORY })
    fetchInventory()
  }

  async function deleteInventory(id: string) {
    if (!confirm('Delete this item?')) return
    const supabase = createClient()
    await supabase.from('inventory').delete().eq('id', id)
    fetchInventory()
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Tabs + action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 0 }}>
          <button className={`tab-btn${tab === 'services' ? ' tab-active' : ''}`} onClick={() => setTab('services')}>Services</button>
          <button className={`tab-btn${tab === 'inventory' ? ' tab-active' : ''}`} onClick={() => setTab('inventory')}>Inventory</button>
        </div>
        {tab === 'services' ? (
          <button className="btn btn-gold" onClick={() => setShowServiceModal(true)}><Plus size={14} /> New Service</button>
        ) : (
          <button className="btn btn-gold" onClick={() => setShowInvModal(true)}><Plus size={14} /> New Item</button>
        )}
      </div>

      {/* Services tab */}
      {tab === 'services' && (
        loadingS ? (
          <div className="glass" style={{ padding: 20 }}><SkeletonTable rows={4} cols={3} /></div>
        ) : services.length === 0 ? (
          <div className="glass" style={{ padding: 60, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No services configured yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {services.map((s) => (
              <div key={s.id} className="glass" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {s.category && (
                      <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag size={9} /> {s.category}
                      </div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(s.id, s.active)}
                    style={{ flexShrink: 0, background: s.active ? 'rgba(34,197,94,0.15)' : 'rgba(136,133,128,0.15)', border: `1px solid ${s.active ? 'rgba(34,197,94,0.3)' : 'rgba(136,133,128,0.3)'}`, borderRadius: 99, padding: '3px 10px', color: s.active ? '#22c55e' : 'var(--text2)', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {s.active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {s.description && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{s.description}</div>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)' }}>{fmt(s.price ?? 0)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {s.duration ?? 60} min
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}><Edit2 size={11} /> Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteService(s.id)}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'SKU', 'Stock', 'Min', 'Status', 'Unit Price', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingI ? (
                <tr><td colSpan={7}><SkeletonTable rows={5} cols={7} /></td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No inventory items</td></tr>
              ) : (
                inventory.map((item) => {
                  const isLow = (item.stock_current ?? 0) <= (item.stock_minimum ?? 0)
                  return (
                    <tr key={item.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>{item.sku ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: isLow ? 'var(--red)' : 'var(--text)' }}>{item.stock_current ?? 0}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>{item.stock_minimum ?? 0}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {isLow ? (
                          <span className="badge status-cancelled">Low Stock</span>
                        ) : (
                          <span className="badge status-completed">OK</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{fmt(item.unit_price ?? 0)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm"><Edit2 size={11} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteInventory(item.id)}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Service Modal */}
      {showServiceModal && (
        <Modal title="New Service" onClose={() => { setShowServiceModal(false); setNewService({ ...EMPTY_SERVICE }) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Service Name *</label>
              <input className="inp" placeholder="Full Detail Package" value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <input className="inp" placeholder="Detailing, PPF, Ceramic…" value={newService.category} onChange={(e) => setNewService({ ...newService, category: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Price (AED)</label>
                <input className="inp" type="number" min={0} value={newService.price} onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input className="inp" type="number" min={15} step={15} value={newService.duration} onChange={(e) => setNewService({ ...newService, duration: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="inp" rows={3} placeholder="Service description…" value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="label" style={{ marginBottom: 0 }}>Active</label>
              <button
                onClick={() => setNewService({ ...newService, active: !newService.active })}
                style={{ background: newService.active ? 'rgba(34,197,94,0.15)' : 'rgba(136,133,128,0.15)', border: `1px solid ${newService.active ? 'rgba(34,197,94,0.3)' : 'rgba(136,133,128,0.3)'}`, borderRadius: 99, padding: '4px 12px', color: newService.active ? '#22c55e' : 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {newService.active ? 'Active' : 'Inactive'}
              </button>
            </div>
            <button className="btn btn-gold" onClick={saveService} disabled={savingS} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {savingS ? 'Saving…' : 'Save Service'}
            </button>
          </div>
        </Modal>
      )}

      {/* New Inventory Modal */}
      {showInvModal && (
        <Modal title="New Inventory Item" onClose={() => { setShowInvModal(false); setNewInv({ ...EMPTY_INVENTORY }) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Item Name *</label>
              <input className="inp" placeholder="Ceramic Coat Pro 9H" value={newInv.name} onChange={(e) => setNewInv({ ...newInv, name: e.target.value })} />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="inp" placeholder="CC-PRO-9H" value={newInv.sku} onChange={(e) => setNewInv({ ...newInv, sku: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Stock Current</label>
                <input className="inp" type="number" min={0} value={newInv.stock_current} onChange={(e) => setNewInv({ ...newInv, stock_current: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Stock Minimum</label>
                <input className="inp" type="number" min={0} value={newInv.stock_minimum} onChange={(e) => setNewInv({ ...newInv, stock_minimum: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="label">Unit Price (AED)</label>
              <input className="inp" type="number" min={0} value={newInv.unit_price} onChange={(e) => setNewInv({ ...newInv, unit_price: Number(e.target.value) })} />
            </div>
            <button className="btn btn-gold" onClick={saveInventory} disabled={savingI} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {savingI ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
