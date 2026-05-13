'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BookingFormProps {
  onSave: () => void
  onCancel: () => void
}

export default function BookingForm({ onSave, onCancel }: BookingFormProps) {
  const [contacts, setContacts] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_id: '',
    vehicle_id: '',
    service_id: '',
    scheduled_at: '',
    technician: '',
    price: '',
    notes: '',
    status: 'Pending',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
    supabase.from('vehicles').select('id, make, model, license_plate, contact_id').then(({ data }) => setVehicles(data ?? []))
    supabase.from('services').select('id, name, price').then(({ data }) => setServices(data ?? []))
  }, [])

  function handleContactChange(contactId: string) {
    setForm(f => ({ ...f, contact_id: contactId, vehicle_id: '' }))
    setFilteredVehicles(vehicles.filter(v => v.contact_id === contactId))
  }

  function handleServiceChange(serviceId: string) {
    const svc = services.find(s => s.id === serviceId)
    setForm(f => ({ ...f, service_id: serviceId, price: svc?.price?.toString() ?? f.price }))
  }

  async function handleSave() {
    if (!form.contact_id) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('bookings').insert({
      contact_id: form.contact_id,
      vehicle_id: form.vehicle_id || null,
      service_id: form.service_id || null,
      scheduled_at: form.scheduled_at || null,
      technician: form.technician || null,
      price: parseFloat(form.price) || 0,
      notes: form.notes || null,
      status: 'Pending',
    })
    setSaving(false)
    onSave()
  }

  const inp: React.CSSProperties = { marginBottom: 14 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={inp}>
        <label className="label">Client *</label>
        <select className="inp" value={form.contact_id} onChange={e => handleContactChange(e.target.value)}>
          <option value="">Select client…</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={inp}>
        <label className="label">Vehicle</label>
        <select className="inp" value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))} disabled={!form.contact_id}>
          <option value="">Select vehicle…</option>
          {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.license_plate}</option>)}
        </select>
      </div>

      <div style={inp}>
        <label className="label">Service</label>
        <select className="inp" value={form.service_id} onChange={e => handleServiceChange(e.target.value)}>
          <option value="">Select service…</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name} — AED {s.price}</option>)}
        </select>
      </div>

      <div style={inp}>
        <label className="label">Date & Time</label>
        <input className="inp" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...inp }}>
        <div>
          <label className="label">Technician</label>
          <input className="inp" placeholder="Name" value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} />
        </div>
        <div>
          <label className="label">Price AED</label>
          <input className="inp" type="number" placeholder="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>
      </div>

      <div style={inp}>
        <label className="label">Notes</label>
        <textarea className="inp" placeholder="Additional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 72, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-gold" onClick={handleSave} disabled={saving || !form.contact_id}>
          {saving ? 'Saving…' : 'Create Booking'}
        </button>
      </div>
    </div>
  )
}
