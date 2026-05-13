'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Plus, Trash2, CheckCircle, Calendar } from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const TIER_GRAD: Record<string, string> = {
  'Ultra-VIP': 'linear-gradient(135deg,#00d4aa,#00a87e)',
  VIP: 'linear-gradient(135deg,#c9a84c,#a07830)',
  Standard: 'linear-gradient(135deg,#555,#333)',
}

const STATUS_TABS = ['All', 'Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled']

const EMPTY_BOOKING = {
  contact_id: '',
  vehicle_id: '',
  service_id: '',
  scheduled_at: '',
  technician: '',
  price: 0,
  notes: '',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [newBooking, setNewBooking] = useState({ ...EMPTY_BOOKING })
  const [saving, setSaving] = useState(false)

  const filteredVehicles = vehicles.filter(
    (v) => !newBooking.contact_id || v.contact_id === newBooking.contact_id
  )

  function fetchBookings() {
    const supabase = createClient()
    supabase
      .from('bookings')
      .select('*, contacts(name,tier), vehicles(make,model,license_plate), services(name)')
      .order('scheduled_at', { ascending: false })
      .then(({ data }) => {
        setBookings(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchBookings()
    const supabase = createClient()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
    supabase.from('vehicles').select('id, make, model, license_plate, contact_id').then(({ data }) => setVehicles(data ?? []))
    supabase.from('services').select('id, name, price').then(({ data }) => setServices(data ?? []))
  }, [])

  async function markComplete(bookingId: string, price: number, contactId: string) {
    const supabase = createClient()
    await supabase.from('bookings').update({ status: 'Completed' }).eq('id', bookingId)
    const invNum = `INV-${Date.now().toString().slice(-6)}`
    await supabase.from('invoices').insert({
      booking_id: bookingId,
      contact_id: contactId,
      amount: price,
      invoice_number: invNum,
      status: 'Draft',
    })
    fetchBookings()
  }

  async function deleteBooking(id: string) {
    if (!confirm('Delete this booking?')) return
    const supabase = createClient()
    await supabase.from('bookings').delete().eq('id', id)
    fetchBookings()
  }

  async function saveBooking() {
    if (!newBooking.contact_id || !newBooking.scheduled_at) return
    setSaving(true)
    const supabase = createClient()
    const payload: any = {
      contact_id: newBooking.contact_id,
      scheduled_at: newBooking.scheduled_at,
      technician: newBooking.technician,
      price: Number(newBooking.price),
      notes: newBooking.notes,
      status: 'Pending',
    }
    if (newBooking.vehicle_id) payload.vehicle_id = newBooking.vehicle_id
    if (newBooking.service_id) payload.service_id = newBooking.service_id
    await supabase.from('bookings').insert(payload)
    setSaving(false)
    setShowModal(false)
    setNewBooking({ ...EMPTY_BOOKING })
    fetchBookings()
  }

  const displayed = statusFilter === 'All'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter)

  const counts: Record<string, number> = {}
  STATUS_TABS.forEach((s) => {
    counts[s] = s === 'All' ? bookings.length : bookings.filter((b) => b.status === s).length
  })

  return (
    <div style={{ padding: 24 }}>
      {/* Status filter tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              className={`tab-btn${statusFilter === s ? ' tab-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s} {counts[s] > 0 && <span style={{ opacity: 0.6 }}>({counts[s]})</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Booking
        </button>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Client', 'Vehicle', 'Service', 'Date / Time', 'Technician', 'Price', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><SkeletonTable rows={6} cols={8} /></td></tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                  No bookings found
                </td>
              </tr>
            ) : (
              displayed.map((b) => {
                const name = b.contacts?.name ?? 'Unknown'
                const tier = b.contacts?.tier ?? 'Standard'
                const canComplete = b.status === 'Pending' || b.status === 'Confirmed' || b.status === 'In Progress'
                return (
                  <tr key={b.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: TIER_GRAD[tier] ?? TIER_GRAD.Standard, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {initials(name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13 }}>{name}</div>
                          <StatusBadge status={tier} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {b.vehicles ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{b.vehicles.make} {b.vehicles.model}</div>
                          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{b.vehicles.license_plate}</div>
                        </div>
                      ) : <span style={{ color: 'var(--text2)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {b.scheduled_at ? (
                        <div>
                          <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={11} color="var(--text2)" />
                            {new Date(b.scheduled_at).toLocaleDateString('en-AE')}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                            {new Date(b.scheduled_at).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{b.technician ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{fmt(b.price ?? 0)}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={b.status ?? 'Pending'} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                        {canComplete && (
                          <button
                            className="btn btn-cyan btn-sm"
                            onClick={() => markComplete(b.id, b.price ?? 0, b.contact_id)}
                            title="Mark Complete"
                          >
                            <CheckCircle size={11} /> Done
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteBooking(b.id)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <Modal title="New Booking" onClose={() => { setShowModal(false); setNewBooking({ ...EMPTY_BOOKING }) }} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Client *</label>
              <select
                className="inp"
                value={newBooking.contact_id}
                onChange={(e) => setNewBooking({ ...newBooking, contact_id: e.target.value, vehicle_id: '' })}
              >
                <option value="">Select client…</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Vehicle</label>
              <select
                className="inp"
                value={newBooking.vehicle_id}
                onChange={(e) => setNewBooking({ ...newBooking, vehicle_id: e.target.value })}
                disabled={!newBooking.contact_id}
              >
                <option value="">Select vehicle…</option>
                {filteredVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} — {v.license_plate}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Service</label>
              <select
                className="inp"
                value={newBooking.service_id}
                onChange={(e) => {
                  const svc = services.find((s) => s.id === e.target.value)
                  setNewBooking({ ...newBooking, service_id: e.target.value, price: svc?.price ?? newBooking.price })
                }}
              >
                <option value="">Select service…</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Scheduled At *</label>
              <input
                className="inp"
                type="datetime-local"
                value={newBooking.scheduled_at}
                onChange={(e) => setNewBooking({ ...newBooking, scheduled_at: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">Technician</label>
                <input className="inp" placeholder="Ahmed Al Mansouri" value={newBooking.technician} onChange={(e) => setNewBooking({ ...newBooking, technician: e.target.value })} />
              </div>
              <div>
                <label className="label">Price (AED)</label>
                <input className="inp" type="number" min={0} value={newBooking.price} onChange={(e) => setNewBooking({ ...newBooking, price: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="inp" rows={3} placeholder="Special instructions…" value={newBooking.notes} onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })} style={{ resize: 'vertical' }} />
            </div>

            <button className="btn btn-gold" onClick={saveBooking} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saving ? 'Saving…' : 'Save Booking'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
