'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BusinessSettings } from '@/types'
import { Save, Building2, Globe, Phone, Mail, DollarSign, Percent } from 'lucide-react'

const TABS = ['Business Info', 'Team & Roles', 'Integrations'] as const
type Tab = typeof TABS[number]

export default function SettingsClient({ initialSettings }: { initialSettings: BusinessSettings | null }) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('Business Info')
  const [form, setForm] = useState({
    business_name: initialSettings?.business_name ?? 'Noirem Luxury Car Care',
    email:        initialSettings?.email ?? '',
    phone:        initialSettings?.phone ?? '',
    website:      initialSettings?.website ?? '',
    address:      initialSettings?.address ?? '',
    currency:     initialSettings?.currency ?? 'AED',
    tax_rate:     String(initialSettings?.tax_rate ?? 5),
    deposit_pct:  String(initialSettings?.deposit_pct ?? 30),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true)
    const payload = { ...form, tax_rate: parseFloat(form.tax_rate) || 5, deposit_pct: parseFloat(form.deposit_pct) || 30 }
    if (initialSettings) {
      await supabase.from('business_settings').update(payload).eq('id', initialSettings.id)
    } else {
      await supabase.from('business_settings').insert(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const CURRENCIES = ['AED','USD','EUR','GBP','SAR','QAR']

  const TEAM = [
    { name:'Ahmed Hassan', role:'Admin',      email:'ahmed@noirem.ae',   status:'Active' },
    { name:'Carlos R.',    role:'Technician', email:'carlos@noirem.ae',  status:'Active' },
    { name:'Mohammed A.',  role:'Technician', email:'mo@noirem.ae',      status:'Active' },
    { name:'Sara K.',      role:'Manager',    email:'sara@noirem.ae',    status:'Invited' },
  ]
  const ROLE_COLORS: Record<string,string> = { Admin:'#EF4444', Manager:'#D4AF37', Technician:'#00D4FF' }

  const INTEGRATIONS = [
    { name:'WhatsApp Business', icon:'💬', status:'connected', desc:'Send booking updates via WhatsApp' },
    { name:'Stripe',            icon:'💳', status:'connected', desc:'Payment processing & invoicing' },
    { name:'Google Calendar',   icon:'📅', status:'available', desc:'Sync bookings with Google Calendar' },
    { name:'Mailchimp',         icon:'✉️', status:'available', desc:'Email marketing campaigns' },
    { name:'QuickBooks',        icon:'📊', status:'available', desc:'Accounting & financial reporting' },
    { name:'Twilio SMS',        icon:'📱', status:'available', desc:'SMS notifications for clients' },
  ]

  return (
    <div className="scroll" style={{ height:'100%', padding:'22px 26px' }}>
      {/* Tab nav */}
      <div style={{ display:'flex', gap:24, borderBottom:'1px solid rgba(212,175,55,.1)', marginBottom:28 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn" style={{ background:'none', border:'none', padding:'10px 4px', fontSize:13, color: tab===t?'#D4AF37':'#8A8A9A', fontWeight: tab===t?700:500, borderBottom:`2px solid ${tab===t?'#D4AF37':'transparent'}`, borderRadius:0 }}>{t}</button>
        ))}
      </div>

      {tab === 'Business Info' && (
        <div style={{ maxWidth:680 }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>Business Information</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <div className="field-label">Business Name</div>
              <input className="inp" value={form.business_name} onChange={e => set('business_name', e.target.value)} />
            </div>
            <div>
              <div className="field-label">Email</div>
              <input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@noirem.ae" />
            </div>
            <div>
              <div className="field-label">Phone</div>
              <input className="inp" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+971 4 555 0000" />
            </div>
            <div>
              <div className="field-label">Website</div>
              <input className="inp" value={form.website} onChange={e => set('website', e.target.value)} placeholder="www.noirem.ae" />
            </div>
            <div>
              <div className="field-label">Currency</div>
              <select className="inp" value={form.currency} onChange={e => set('currency', e.target.value)} style={{ cursor:'pointer' }}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <div className="field-label">Address</div>
              <textarea className="inp" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Sheikh Zayed Road, Dubai, UAE" style={{ resize:'vertical', fontFamily:'Montserrat,sans-serif' }} />
            </div>
            <div>
              <div className="field-label">Default Tax Rate (%)</div>
              <input className="inp" type="number" step="0.01" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)} />
            </div>
            <div>
              <div className="field-label">Default Deposit (%)</div>
              <input className="inp" type="number" step="1" value={form.deposit_pct} onChange={e => set('deposit_pct', e.target.value)} />
            </div>
          </div>
          <button className="btn btng" onClick={save} disabled={saving} style={{ padding:'12px 32px', fontSize:13 }}>
            <Save size={13} color="#0B0E11" />
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Business Information'}
          </button>
        </div>
      )}

      {tab === 'Team & Roles' && (
        <div style={{ maxWidth:800 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>Team Members</div>
            <button className="btn btng" style={{ padding:'8px 16px', fontSize:12 }}><span style={{ fontSize:14 }}>+</span> Invite Member</button>
          </div>
          <div className="glass" style={{ marginBottom:24 }}>
            {TEAM.map((m, i) => (
              <div key={m.email} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 20px', borderBottom: i < TEAM.length-1 ? '1px solid rgba(212,175,55,.06)' : 'none' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#D4AF37,#5E3F00)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#0B0E11' }}>{m.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{m.name}</div>
                  <div style={{ fontSize:10, color:'#8A8A9A' }}>{m.email}</div>
                </div>
                <span className="badge" style={{ background:`${ROLE_COLORS[m.role]}18`, color:ROLE_COLORS[m.role] }}>{m.role}</span>
                <span className="badge" style={{ background: m.status==='Active'?'rgba(34,197,94,.1)':'rgba(245,158,11,.1)', color: m.status==='Active'?'#22C55E':'#F59E0B' }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'currentColor', display:'inline-block' }} />{m.status}
                </span>
              </div>
            ))}
          </div>

          {/* Permissions matrix */}
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Role Permissions</div>
          <div className="glass" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(212,175,55,.08)' }}>
                  <th style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:'#8A8A9A', letterSpacing:1, textTransform:'uppercase' }}>Permission</th>
                  {['Admin','Manager','Technician'].map(r => <th key={r} style={{ padding:'10px 16px', textAlign:'center', fontSize:10, fontWeight:700, color:ROLE_COLORS[r], letterSpacing:.8, textTransform:'uppercase' }}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {[['View contacts','✓','✓','✓'],['Edit contacts','✓','✓','—'],['Delete contacts','✓','—','—'],['View deals','✓','✓','—'],['Edit deals','✓','✓','—'],['Manage settings','✓','—','—'],['View finance','✓','✓','—'],['Invite team','✓','—','—'],['Export reports','✓','✓','—']].map(([perm,...vals], i) => (
                  <tr key={String(perm)} style={{ borderBottom:'1px solid rgba(212,175,55,.04)' }}>
                    <td style={{ padding:'11px 18px', fontSize:11 }}>{perm}</td>
                    {vals.map((v, j) => <td key={j} style={{ padding:'11px 16px', textAlign:'center', fontSize:12, fontWeight:700, color: v==='✓'?'#22C55E':'#4A4A5A' }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Integrations' && (
        <div style={{ maxWidth:800 }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>Integrations</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:28 }}>
            {INTEGRATIONS.map(intg => {
              const connected = intg.status === 'connected'
              return (
                <div key={intg.name} className="glass" style={{ padding:20, border:`1px solid ${connected?'rgba(34,197,94,.2)':'rgba(212,175,55,.11)'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <span style={{ fontSize:22 }}>{intg.icon}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700 }}>{intg.name}</div>
                        <span className="badge" style={{ background: connected?'rgba(34,197,94,.1)':'rgba(255,255,255,.04)', color: connected?'#22C55E':'#8A8A9A', marginTop:4 }}>
                          {connected ? '● Connected' : '○ Available'}
                        </span>
                      </div>
                    </div>
                    <div style={{ width:38, height:20, borderRadius:99, background: connected?'rgba(34,197,94,.2)':'rgba(255,255,255,.06)', border:`1px solid ${connected?'rgba(34,197,94,.4)':'rgba(255,255,255,.1)'}`, display:'flex', alignItems:'center', padding:2, cursor:'pointer', transition:'all .2s' }}>
                      <div style={{ width:16, height:16, borderRadius:'50%', background: connected?'#22C55E':'#4A4A5A', marginLeft: connected?'auto':'0', transition:'margin .2s' }} />
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:'#8A8A9A' }}>{intg.desc}</div>
                </div>
              )
            })}
          </div>
          <div className="glass" style={{ padding:20 }}>
            <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>API Key</div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <code style={{ flex:1, fontFamily:'monospace', fontSize:12, color:'#D4AF37', background:'rgba(212,175,55,.06)', padding:'8px 14px', borderRadius:8, border:'1px solid rgba(212,175,55,.15)' }}>noi_sk_live_••••••••••••a7f3</code>
              <button className="btn btnq" style={{ padding:'8px 14px', fontSize:11 }}>Copy</button>
              <button className="btn btnd" style={{ padding:'8px 14px', fontSize:11 }}>Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
