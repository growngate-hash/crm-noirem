'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealStage, Contact, Company } from '@/types'
import { X } from 'lucide-react'

interface Props {
  deal?: Deal | null
  stages: DealStage[]
  contacts: Contact[]
  companies: Company[]
  defaultStageId?: string
  onClose: () => void
  onSaved: () => void
}

export default function DealModal({ deal, stages, contacts, companies, defaultStageId, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!deal
  const [form, setForm] = useState({
    title: deal?.title ?? '',
    value: String(deal?.value ?? ''),
    stage_id: deal?.stage_id ?? defaultStageId ?? stages[0]?.id ?? '',
    contact_id: deal?.contact_id ?? '',
    company_id: deal?.company_id ?? '',
    probability: String(deal?.probability ?? '50'),
    close_date: deal?.close_date ?? '',
    notes: deal?.notes ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError('')
    const payload = {
      title: form.title,
      value: parseFloat(form.value) || 0,
      stage_id: form.stage_id || null,
      contact_id: form.contact_id || null,
      company_id: form.company_id || null,
      probability: parseInt(form.probability) || 50,
      close_date: form.close_date || null,
      notes: form.notes || null,
    }
    const { data: saved, error: err } = isEdit
      ? await supabase.from('deals').update(payload).eq('id', deal!.id).select().single()
      : await supabase.from('deals').insert(payload).select().single()
    if (err) { setError(err.message); setLoading(false); return }

    const stageName = stages.find(s => s.id === payload.stage_id)?.name ?? 'Unknown'
    await supabase.from('activities').insert({
      deal_id: (saved as Deal).id,
      contact_id: payload.contact_id,
      type: isEdit ? 'deal_moved' : 'deal_created',
      title: isEdit ? `Deal moved to ${stageName}: ${form.title}` : `Deal created: ${form.title}`,
    })
    onSaved(); onClose()
  }

  const selectedStage = stages.find(s => s.id === form.stage_id)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div className="glass" style={{ width:600, borderRadius:16, padding:32, border:'1px solid rgba(212,175,55,.2)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:26 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{isEdit ? 'Edit Deal' : 'New Deal'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16} color="#8A8A9A" /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={{ gridColumn:'1/-1' }}>
            <div className="field-label">Deal Title *</div>
            <input className="inp" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ceramic Coating — Sheikh Mohammed" />
          </div>
          <div>
            <div className="field-label">Value (AED)</div>
            <input className="inp" type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <div className="field-label">Stage</div>
            <select className="inp" value={form.stage_id} onChange={e => set('stage_id', e.target.value)} style={{ cursor:'pointer' }}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Contact</div>
            <select className="inp" value={form.contact_id} onChange={e => set('contact_id', e.target.value)} style={{ cursor:'pointer' }}>
              <option value="">— None —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Company</div>
            <select className="inp" value={form.company_id} onChange={e => set('company_id', e.target.value)} style={{ cursor:'pointer' }}>
              <option value="">— None —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label">Probability (%)</div>
            <input className="inp" type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} />
          </div>
          <div>
            <div className="field-label">Close Date</div>
            <input className="inp" type="date" value={form.close_date} onChange={e => set('close_date', e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom:24 }}>
          <div className="field-label">Notes</div>
          <textarea className="inp" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize:'vertical', fontFamily:'Montserrat,sans-serif' }} />
        </div>

        {error && <div style={{ fontSize:12, color:'#EF4444', marginBottom:14, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,.1)' }}>{error}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btnq" style={{ flex:1, padding:12 }} onClick={onClose}>Cancel</button>
          <button className="btn btng" style={{ flex:2, padding:12 }} onClick={save} disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Deal'}</button>
        </div>
      </div>
    </div>
  )
}
