'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Contact, Company } from '@/types'
import ContactModal from './ContactModal'
import ActivityTimeline from '@/components/activities/ActivityTimeline'
import { Search, Plus, Phone, MessageSquare, Edit2, Trash2, X, ChevronRight } from 'lucide-react'

const TIER_CFG = {
  'Black Diamond': { c:'#00D4FF', b:'rgba(0,212,255,.09)', i:'◆' },
  'Platinum':      { c:'#C8C8D7', b:'rgba(200,200,215,.08)', i:'◈' },
  'VIP':           { c:'#D4AF37', b:'rgba(212,175,55,.09)', i:'★' },
}

export default function ContactsClient({ initialContacts, companies }: { initialContacts: Contact[]; companies: Company[] }) {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [selContact, setSelContact] = useState<Contact | null>(null)
  const [delConfirm, setDelConfirm] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('contacts').select('*, company:companies(name)').order('created_at', { ascending:false })
    setContacts((data ?? []) as Contact[])
  }, [supabase])

  useEffect(() => {
    const channel = supabase.channel('contacts-list')
      .on('postgres_changes', { event:'*', schema:'public', table:'contacts' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, refresh])

  async function deleteContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setDelConfirm(null)
    if (selContact?.id === id) setSelContact(null)
    refresh()
  }

  const filtered = contacts.filter(c =>
    (tier === 'All' || c.tier === tier) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.plate ?? '').toLowerCase().includes(q.toLowerCase()) || (c.vehicle ?? '').toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <>
      {(showModal || editContact) && (
        <ContactModal
          contact={editContact}
          companies={companies}
          onClose={() => { setShowModal(false); setEditContact(null) }}
          onSaved={refresh}
        />
      )}

      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
        <div className="scroll" style={{ flex:1, padding:'22px 26px' }}>
          {/* Filters */}
          <div style={{ display:'flex', gap:10, marginBottom:18 }}>
            <div style={{ position:'relative', flex:1 }}>
              <Search size={13} color="#4A4A5A" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
              <input className="inp" style={{ paddingLeft:34 }} placeholder="Search name, plate or vehicle…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            {['All','Black Diamond','Platinum','VIP'].map(t => (
              <button key={t} onClick={() => setTier(t)} className="btn" style={{ padding:'8px 13px', fontSize:10, background: tier===t ? 'rgba(212,175,55,.14)' : 'rgba(255,255,255,.03)', color: tier===t ? '#D4AF37' : '#4A4A5A', border:`1px solid ${tier===t ? 'rgba(212,175,55,.3)' : 'rgba(255,255,255,.06)'}` }}>{t}</button>
            ))}
            <button className="btn btng" onClick={() => { setEditContact(null); setShowModal(true) }}><Plus size={12} color="#0B0E11" />Add Contact</button>
          </div>

          {/* Table */}
          <div className="glass">
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.6fr 110px 1fr 140px', gap:8, padding:'9px 18px', borderBottom:'1px solid rgba(212,175,55,.08)' }}>
              {['Client','Tier','Vehicle','Plate','Spend','Actions'].map(h => <div key={h} className="field-label" style={{ margin:0 }}>{h}</div>)}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding:'48px 0', textAlign:'center', color:'#4A4A5A', fontSize:12 }}>
                {q || tier !== 'All' ? 'No contacts match your filters' : 'No contacts yet — add your first one!'}
              </div>
            )}
            {filtered.map((c, i) => {
              const tc = TIER_CFG[c.tier]
              const isSel = selContact?.id === c.id
              return (
                <div key={c.id} onClick={() => setSelContact(isSel ? null : c)} className="row"
                  style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1.6fr 110px 1fr 140px', gap:8, alignItems:'center', padding:'13px 18px', borderBottom: i < filtered.length-1 ? '1px solid rgba(212,175,55,.04)' : 'none', background: isSel ? 'rgba(212,175,55,.04)' : 'transparent' }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:9, color:'#4A4A5A', marginTop:2 }}>{c.total_bookings} bookings</div>
                  </div>
                  <div><span className="badge" style={{ background:tc.b, color:tc.c }}>{tc.i} {c.tier}</span></div>
                  <div style={{ fontSize:11, color:'#8A8A9A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.vehicle || '—'}</div>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'#D4AF37', letterSpacing:.5 }}>{c.plate || '—'}</div>
                  <div style={{ fontSize:12, fontWeight:600 }}>AED {(c.lifetime_value ?? 0).toLocaleString()}</div>
                  <div style={{ display:'flex', gap:5 }} onClick={e => e.stopPropagation()}>
                    {c.phone && <button className="btn btnc" style={{ padding:'5px 8px' }} onClick={() => window.open(`tel:${c.phone}`)}><Phone size={11} color="#00D4FF" /></button>}
                    <button className="btn btnq" style={{ padding:'5px 8px' }} onClick={() => { setEditContact(c); setShowModal(false) }}><Edit2 size={11} color="#D4AF37" /></button>
                    {delConfirm === c.id ? (
                      <><button className="btn btnd" style={{ padding:'5px 8px', fontSize:10 }} onClick={() => deleteContact(c.id)}>Delete</button>
                        <button className="btn btnq" style={{ padding:'5px 8px' }} onClick={() => setDelConfirm(null)}><X size={11} /></button></>
                    ) : (
                      <button className="btn btnd" style={{ padding:'5px 8px' }} onClick={() => setDelConfirm(c.id)}><Trash2 size={11} /></button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        {selContact && (
          <div style={{ width:300, flexShrink:0, borderLeft:'1px solid rgba(212,175,55,.09)', background:'rgba(11,14,17,.95)', backdropFilter:'blur(18px)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'20px 20px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{selContact.name}</div>
                <span className="badge" style={{ background: TIER_CFG[selContact.tier].b, color: TIER_CFG[selContact.tier].c }}>
                  {TIER_CFG[selContact.tier].i} {selContact.tier}
                </span>
              </div>
              <button onClick={() => setSelContact(null)} style={{ background:'none', border:'none', cursor:'pointer', marginTop:2 }}><X size={15} color="#8A8A9A" /></button>
            </div>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(212,175,55,.07)' }}>
              {selContact.phone && <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:6 }}>📞 {selContact.phone}</div>}
              {selContact.email && <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:6 }}>✉️ {selContact.email}</div>}
              {selContact.vehicle && <div style={{ fontSize:11, color:'#D4AF37', marginBottom:4 }}>🚗 {selContact.vehicle}</div>}
              {selContact.plate && <div style={{ fontFamily:'monospace', fontSize:11, color:'#8A8A9A' }}>🪪 {selContact.plate}</div>}
            </div>
            <div className="scroll" style={{ flex:1, padding:'16px 20px' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:'#8A8A9A', textTransform:'uppercase', marginBottom:12 }}>Activity Timeline</div>
              <ActivityTimeline contactId={selContact.id} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
