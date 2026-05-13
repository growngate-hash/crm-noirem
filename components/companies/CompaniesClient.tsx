'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types'
import { Search, Plus, Edit2, Trash2, X, Building2, Globe, Phone, Mail } from 'lucide-react'
import ActivityTimeline from '@/components/activities/ActivityTimeline'

interface Props { initialCompanies: Company[] }

function CompanyModal({ company, onClose, onSaved }: { company?: Company | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const isEdit = !!company
  const [form, setForm] = useState({ name: company?.name ?? '', industry: company?.industry ?? '', phone: company?.phone ?? '', email: company?.email ?? '', website: company?.website ?? '', address: company?.address ?? '', notes: company?.notes ?? '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    const { error } = isEdit
      ? await supabase.from('companies').update(form).eq('id', company!.id)
      : await supabase.from('companies').insert(form)
    if (error) { setError(error.message); setLoading(false); return }
    onSaved(); onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.72)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div className="glass" style={{ width:580, borderRadius:16, padding:32, border:'1px solid rgba(212,175,55,.2)', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:26 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{isEdit ? 'Edit Company' : 'Add Company'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={16} color="#8A8A9A" /></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div><div className="field-label">Company Name *</div><input className="inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Noirem Group" /></div>
          <div><div className="field-label">Industry</div><input className="inp" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Automotive" /></div>
          <div><div className="field-label">Phone</div><input className="inp" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 4 555 0000" /></div>
          <div><div className="field-label">Email</div><input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.ae" /></div>
          <div><div className="field-label">Website</div><input className="inp" value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.company.ae" /></div>
          <div><div className="field-label">Address</div><input className="inp" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Dubai, UAE" /></div>
        </div>
        <div style={{ marginBottom:24 }}><div className="field-label">Notes</div><textarea className="inp" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize:'vertical', fontFamily:'Montserrat,sans-serif' }} /></div>
        {error && <div style={{ fontSize:12, color:'#EF4444', marginBottom:14, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,.1)' }}>{error}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btnq" style={{ flex:1, padding:12 }} onClick={onClose}>Cancel</button>
          <button className="btn btng" style={{ flex:2, padding:12 }} onClick={save} disabled={loading}>{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Company'}</button>
        </div>
      </div>
    </div>
  )
}

export default function CompaniesClient({ initialCompanies }: Props) {
  const supabase = createClient()
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [q, setQ] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCo, setEditCo] = useState<Company | null>(null)
  const [selCo, setSelCo] = useState<Company | null>(null)
  const [delConfirm, setDelConfirm] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending:false })
    setCompanies(data ?? [])
  }, [supabase])

  async function deleteCo(id: string) {
    await supabase.from('companies').delete().eq('id', id)
    setDelConfirm(null)
    if (selCo?.id === id) setSelCo(null)
    refresh()
  }

  const filtered = companies.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.industry ?? '').toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      {(showModal || editCo) && <CompanyModal company={editCo} onClose={() => { setShowModal(false); setEditCo(null) }} onSaved={refresh} />}
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
        <div className="scroll" style={{ flex:1, padding:'22px 26px' }}>
          <div style={{ display:'flex', gap:10, marginBottom:18 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={13} color="#4A4A5A" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
              <input className="inp" style={{ paddingLeft:34 }} placeholder="Search companies…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <button className="btn btng" onClick={() => { setEditCo(null); setShowModal(true) }}><Plus size={12} color="#0B0E11" />Add Company</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filtered.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 0', color:'#4A4A5A', fontSize:12 }}>
                {q ? 'No companies match your search' : 'No companies yet — add your first one!'}
              </div>
            )}
            {filtered.map(co => (
              <div key={co.id} className="glass row" onClick={() => setSelCo(selCo?.id === co.id ? null : co)}
                style={{ padding:20, cursor:'pointer', border: selCo?.id === co.id ? '1px solid rgba(212,175,55,.3)' : '1px solid rgba(212,175,55,.11)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:'rgba(212,175,55,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Building2 size={17} color="#D4AF37" strokeWidth={1.6} />
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{co.name}</div>
                      {co.industry && <div style={{ fontSize:10, color:'#8A8A9A' }}>{co.industry}</div>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:5 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btnq" style={{ padding:'4px 7px' }} onClick={() => { setEditCo(co); setShowModal(false) }}><Edit2 size={10} /></button>
                    {delConfirm === co.id
                      ? <><button className="btn btnd" style={{ padding:'4px 7px', fontSize:10 }} onClick={() => deleteCo(co.id)}>Del</button><button className="btn btnq" style={{ padding:'4px 7px' }} onClick={() => setDelConfirm(null)}><X size={10} /></button></>
                      : <button className="btn btnd" style={{ padding:'4px 7px' }} onClick={() => setDelConfirm(co.id)}><Trash2 size={10} /></button>
                    }
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {co.phone && <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:11, color:'#8A8A9A' }}><Phone size={10} color="#8A8A9A" />{co.phone}</div>}
                  {co.email && <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:11, color:'#8A8A9A' }}><Mail size={10} color="#8A8A9A" />{co.email}</div>}
                  {co.website && <div style={{ display:'flex', gap:7, alignItems:'center', fontSize:11, color:'#00D4FF' }}><Globe size={10} color="#00D4FF" />{co.website}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selCo && (
          <div style={{ width:300, flexShrink:0, borderLeft:'1px solid rgba(212,175,55,.09)', background:'rgba(11,14,17,.95)', backdropFilter:'blur(18px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'20px 20px 0', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontSize:14, fontWeight:700 }}>{selCo.name}</div>
              <button onClick={() => setSelCo(null)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={15} color="#8A8A9A" /></button>
            </div>
            <div className="scroll" style={{ flex:1, padding:'14px 20px' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:'#8A8A9A', textTransform:'uppercase', marginBottom:12 }}>Activity Timeline</div>
              <ActivityTimeline companyId={selCo.id} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
