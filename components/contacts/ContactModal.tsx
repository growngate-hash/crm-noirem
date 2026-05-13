'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact, Company, Tier } from '@/types'
import { X } from 'lucide-react'

const TIERS: { v: Tier; icon: string; color: string; bg: string }[] = [
  { v:'Black Diamond', icon:'◆', color:'#00D4FF', bg:'rgba(0,212,255,.09)' },
  { v:'Platinum',      icon:'◈', color:'#C8C8D7', bg:'rgba(200,200,215,.08)' },
  { v:'VIP',           icon:'★', color:'#D4AF37', bg:'rgba(212,175,55,.09)' },
]

interface Props {
  contact?: Contact | null
  companies: Company[]
  onClose: () => void
  onSaved: () => void
}

export default function ContactModal({ contact, companies, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!contact
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    tier: (contact?.tier ?? 'VIP') as Tier,
    vehicle: contact?.vehicle ?? '',
    plate: contact?.plate ?? '',
    address: contact?.address ?? '',
    notes: contact?.notes ?? '',
    company_id: contact?.company_id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    const payload = { ...form, company_id: form.company_id || null }
    const { error } = isEdit
      ? await supabase.from('contacts').update(payload).eq('id', contact!.id)
      : await supabase.from('contacts').insert(payload)
    if (error) { setError(error.message); setLoading(false); return }
    if (!isEdit) {
      const { data: nc } = await supabase.from('contacts').select('id').order('created_at', { ascending:false }).limit(1).single()
      if (nc) await supabase.from('activities').insert({ contact_id: nc.id, type:'contact_created', title:`Contact created: ${form.name}` })
    }
    onSaved()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div className="glass" style={{ width:600, borderRadius:16, padding:32, border:'1px solid rgba(212,175,55,.2)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:26 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{isEdit ? 'Edit Contact' : 'Add New Contact'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16} color="#8A8A9A" /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div>
            <div className="field-label">Name *</div>
            <input className="inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sheikh Mohammed" />
          </div>
          <div>
            <div className="field-label">Phone</div>
            <input className="inp" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 50 123 4567" />
          </div>
          <div>
            <div className="field-label">Email</div>
            <input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@example.com" />
          </div>
          <div>
            <div className="field-label">Company</div>
            <select className="inp" value={form.company_id} onChange={e => set('company_id', e.target.value)} style={{ cursor:'pointer' }}>
              <option value="">— None —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Vehicle</div>
            <input className="inp" value={form.vehicle} onChange={e => set('vehicle', e.target.value)} placeholder="Lamborghini Revuelto" />
          </div>
          <div>
            <div className="field-label">Plate</div>
            <input className="inp" value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="M-11234" style={{ fontFamily:'monospace', letterSpacing:.5 }} />
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div className="field-label">Tier / Category</div>
          <div style={{ display:'flex', gap:8 }}>
            {TIERS.map(t => {
              const on = form.tier === t.v
              return (
                <button key={t.v} onClick={() => set('tier', t.v)} className="btn" style={{ flex:1, padding:'10px', fontSize:11, fontWeight: on?700:500, background: on ? t.bg : 'rgba(255,255,255,.03)', color: on ? t.color : '#4A4A5A', border:`1px solid ${on ? t.color : 'rgba(255,255,255,.06)'}`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <span>{t.icon}</span>{t.v}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div className="field-label">Address</div>
          <input className="inp" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dubai, UAE" />
        </div>
        <div style={{ marginBottom:24 }}>
          <div className="field-label">Notes</div>
          <textarea className="inp" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any important details…" style={{ resize:'vertical', fontFamily:'Montserrat,sans-serif' }} />
        </div>

        {error && <div style={{ fontSize:12, color:'#EF4444', marginBottom:14, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)' }}>{error}</div>}

        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btnq" style={{ flex:1, padding:12 }} onClick={onClose}>Cancel</button>
          <button className="btn btng" style={{ flex:2, padding:12 }} onClick={save} disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}
