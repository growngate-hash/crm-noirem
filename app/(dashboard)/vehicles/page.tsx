'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const EMPTY_FORM = {
  contact_id: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  license_plate: '',
  vin: '',
  notes: '',
}

function ColorDot({ color }: { color: string }) {
  const colorMap: Record<string, string> = {
    black: '#1a1a1a',
    white: '#f0ede8',
    silver: '#c0c0c0',
    grey: '#888',
    gray: '#888',
    red: '#ff4f4f',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    orange: '#f97316',
    gold: '#c9a84c',
    brown: '#92400e',
  }
  const bg = colorMap[color?.toLowerCase()] ?? '#555'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: bg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{color || '—'}</span>
    </div>
  )
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  function fetchVehicles() {
    const supabase = createClient()
    supabase
      .from('vehicles')
      .select('*, contacts(name, tier)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVehicles(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchVehicles()
    const supabase = createClient()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
  }, [])

  async function saveVehicle() {
    if (!newVehicle.make.trim() || !newVehicle.model.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload: any = {
      make: newVehicle.make,
      model: newVehicle.model,
      year: Number(newVehicle.year),
      color: newVehicle.color,
      license_plate: newVehicle.license_plate,
      vin: newVehicle.vin,
      notes: newVehicle.notes,
    }
    if (newVehicle.contact_id) payload.contact_id = newVehicle.contact_id
    await supabase.from('vehicles').insert(payload)
    setSaving(false)
    setShowModal(false)
    setNewVehicle({ ...EMPTY_FORM })
    fetchVehicles()
  }

  async function deleteVehicle(id: string) {
    if (!confirm('Delete this vehicle?')) return
    const supabase = createClient()
    await supabase.from('vehicles').delete().eq('id', id)
    fetchVehicles()
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Vehicles</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{vehicles.length} registered</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Vehicle
        </button>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Vehicle', 'Year', 'Color', 'License Plate', 'Client', 'Added', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}><SkeletonTable rows={6} cols={7} /></td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                  No vehicles registered yet
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v.make} {v.model}</div>
                    {v.vin && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>VIN: {v.vin}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>{v.year ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}><ColorDot color={v.color ?? ''} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.08em' }}>
                      {v.license_plate ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.contacts?.name ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(v.created_at).toLocaleDateString('en-AE')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm"><Edit2 size={11} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteVehicle(v.id)}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Vehicle Modal */}
      {showModal && (
        <Modal title="New Vehicle" onClose={() => { setShowModal(false); setNewVehicle({ ...EMPTY_FORM }) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Client</label>
              <select className="inp" value={newVehicle.contact_id} onChange={(e) => setNewVehicle({ ...newVehicle, contact_id: e.target.value })}>
                <option value="">Select client…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Make *</label>
                <input className="inp" placeholder="Lamborghini" value={newVehicle.make} onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })} />
              </div>
              <div>
                <label className="label">Model *</label>
                <input className="inp" placeholder="Urus" value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Year</label>
                <input className="inp" type="number" min={1990} max={2030} value={newVehicle.year} onChange={(e) => setNewVehicle({ ...newVehicle, year: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Color</label>
                <input className="inp" placeholder="Black" value={newVehicle.color} onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">License Plate</label>
                <input className="inp" placeholder="DXB 12345" value={newVehicle.license_plate} onChange={(e) => setNewVehicle({ ...newVehicle, license_plate: e.target.value })} />
              </div>
              <div>
                <label className="label">VIN</label>
                <input className="inp" placeholder="VIN number" value={newVehicle.vin} onChange={(e) => setNewVehicle({ ...newVehicle, vin: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="inp" rows={2} placeholder="Additional notes…" value={newVehicle.notes} onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })} style={{ resize: 'vertical' }} />
            </div>
            <button className="btn btn-gold" onClick={saveVehicle} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saving ? 'Saving…' : 'Save Vehicle'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
