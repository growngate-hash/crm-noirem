'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { Search, Plus, X, Car, Calendar, Trash2, Edit2 } from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const TIER_GRAD: Record<string, string> = {
  'Ultra-VIP': 'linear-gradient(135deg,#00d4aa,#00a87e)',
  VIP: 'linear-gradient(135deg,#c9a84c,#a07830)',
  Standard: 'linear-gradient(135deg,#555,#333)',
}

const TIER_OPTIONS = ['Standard', 'VIP', 'Ultra-VIP']
const EMPTY_FORM = { name: '', email: '', phone: '', tier: 'Standard', notes: '' }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('All')
  const [selectedContact, setSelectedContact] = useState<any | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newContact, setNewContact] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  function fetchContacts() {
    const supabase = createClient()
    supabase
      .from('contacts')
      .select('*, vehicles(*), bookings(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setContacts(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchContacts() }, [])

  const filtered = contacts.filter((c) => {
    const matchSearch =
      search === '' ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const matchTier = tierFilter === 'All' || c.tier === tierFilter
    return matchSearch && matchTier
  })

  async function saveContact() {
    if (!newContact.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('contacts').insert({ ...newContact })
    setSaving(false)
    setShowNewModal(false)
    setNewContact({ ...EMPTY_FORM })
    fetchContacts()
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact?')) return
    const supabase = createClient()
    await supabase.from('contacts').delete().eq('id', id)
    if (selectedContact?.id === id) setSelectedContact(null)
    fetchContacts()
  }

  const drawerContact = selectedContact
    ? (contacts.find((c) => c.id === selectedContact.id) ?? selectedContact)
    : null

  return (
    <div style={{ padding: 24, height: '100%', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} color="var(--text2)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            className="inp"
            style={{ paddingLeft: 32 }}
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="inp"
          style={{ width: 160 }}
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="All">All Tiers</option>
          {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-gold" onClick={() => setShowNewModal(true)}>
          <Plus size={14} /> New Contact
        </button>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Contact', 'Email', 'Phone', 'Tier', 'Vehicles', 'Last Activity', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <SkeletonTable rows={6} cols={7} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                  No contacts found
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const lastBooking = [...(c.bookings ?? [])].sort((a: any, b: any) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]
                return (
                  <tr
                    key={c.id}
                    className="row-hover"
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setSelectedContact(c)}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: TIER_GRAD[c.tier] ?? TIER_GRAD.Standard, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {initials(c.name ?? '?')}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{c.email ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{c.phone ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={c.tier ?? 'Standard'} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>{(c.vehicles ?? []).length}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                      {lastBooking ? new Date(lastBooking.created_at).toLocaleDateString('en-AE') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedContact(c)}>
                          <Edit2 size={11} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteContact(c.id)}>
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

      {/* Right Drawer */}
      {drawerContact && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }}
            onClick={() => setSelectedContact(null)}
          />
          <div
            className="glass"
            style={{ position: 'fixed', top: 0, right: 0, width: 340, height: '100vh', zIndex: 500, borderRadius: '14px 0 0 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
              <button
                onClick={() => setSelectedContact(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: TIER_GRAD[drawerContact.tier] ?? TIER_GRAD.Standard, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {initials(drawerContact.name ?? '?')}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{drawerContact.name}</div>
                  <StatusBadge status={drawerContact.tier ?? 'Standard'} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{drawerContact.email ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>{drawerContact.phone ?? '—'}</div>
            </div>

            <div className="scroll" style={{ flex: 1, padding: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Vehicles
                </div>
                {(drawerContact.vehicles ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>No vehicles registered</div>
                ) : (
                  (drawerContact.vehicles ?? []).map((v: any) => (
                    <div key={v.id} className="glass" style={{ padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Car size={14} color="var(--gold)" />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{v.make} {v.model}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>{v.license_plate ?? ''}{v.year ? ` · ${v.year}` : ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Recent Bookings
                </div>
                {(drawerContact.bookings ?? []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>No bookings yet</div>
                ) : (
                  [...(drawerContact.bookings ?? [])]
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5)
                    .map((bk: any) => (
                      <div key={bk.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{fmt(bk.price ?? 0)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Calendar size={10} />
                            {new Date(bk.created_at).toLocaleDateString('en-AE')}
                          </div>
                        </div>
                        <StatusBadge status={bk.status ?? 'Pending'} />
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Contact Modal */}
      {showNewModal && (
        <Modal title="New Contact" onClose={() => { setShowNewModal(false); setNewContact({ ...EMPTY_FORM }) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Full Name *</label>
              <input className="inp" placeholder="John Doe" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="inp" type="email" placeholder="john@example.com" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="inp" placeholder="+971 50 000 0000" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Tier</label>
              <select className="inp" value={newContact.tier} onChange={(e) => setNewContact({ ...newContact, tier: e.target.value })}>
                {TIER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="inp" rows={3} placeholder="Additional notes…" value={newContact.notes} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} style={{ resize: 'vertical' }} />
            </div>
            <button className="btn btn-gold" onClick={saveContact} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
