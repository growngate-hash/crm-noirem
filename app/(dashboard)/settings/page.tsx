'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  User, Users, Plug, CreditCard, BarChart2,
  Save, Plus, Trash2, Check, X,
} from 'lucide-react'

type Section = 'profile' | 'team' | 'integrations' | 'plans' | 'billing'

const NAV: { key: Section; label: string; icon: any }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'team', label: 'Team & Roles', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Plug },
  { key: 'plans', label: 'Plans', icon: BarChart2 },
  { key: 'billing', label: 'Billing', icon: CreditCard },
]

const MOCK_TEAM = [
  { id: '1', name: 'Ahmed Al Mansouri', email: 'ahmed@noirem.ae', role: 'Admin' },
  { id: '2', name: 'Sara Khalid', email: 'sara@noirem.ae', role: 'Manager' },
  { id: '3', name: 'Khalid Hassan', email: 'khalid@noirem.ae', role: 'Technician' },
]

const MOCK_INVOICES = [
  { date: '2026-04-01', amount: 129, status: 'Paid' },
  { date: '2026-03-01', amount: 129, status: 'Paid' },
  { date: '2026-02-01', amount: 129, status: 'Paid' },
]

const INTEGRATIONS = [
  { key: 'whatsapp', name: 'WhatsApp Business', desc: 'Send automated messages to clients', color: '#22c55e', initials: 'WA' },
  { key: 'stripe', name: 'Stripe', desc: 'Accept online payments', color: '#818cf8', initials: 'ST' },
  { key: 'gcal', name: 'Google Calendar', desc: 'Sync bookings to calendar', color: '#00d4aa', initials: 'GC' },
  { key: 'gmail', name: 'Gmail', desc: 'Send invoices via email', color: '#ff4f4f', initials: 'GM' },
  { key: 'zapier', name: 'Zapier', desc: 'Connect 5,000+ apps', color: '#ffa800', initials: 'ZP' },
]

// Profile section
function ProfileSection() {
  const [form, setForm] = useState({
    businessName: 'Noirem Dubai',
    country: 'UAE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    language: 'EN',
  })
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Business Profile</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>General settings for your CRM</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label">Business Name</label>
          <input className="inp" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="label">Country</label>
            <select className="inp" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="UAE">United Arab Emirates</option>
              <option value="SA">Saudi Arabia</option>
              <option value="KW">Kuwait</option>
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="inp" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="AED">AED — UAE Dirham</option>
              <option value="SAR">SAR — Saudi Riyal</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="inp" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
              <option value="Europe/London">Europe/London (UTC+0)</option>
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select className="inp" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="EN">English</option>
              <option value="ES">Spanish</option>
              <option value="AR">Arabic</option>
            </select>
          </div>
        </div>
        <button className="btn btn-gold" onClick={save} style={{ width: 160, justifyContent: 'center', marginTop: 8 }}>
          {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}

// Team section
function TeamSection() {
  const [team, setTeam] = useState(MOCK_TEAM)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: '', role: 'Technician' })
  function removeTeam(id: string) { setTeam(team.filter((m) => m.id !== id)) }
  function sendInvite() {
    setTeam([...team, { id: Date.now().toString(), name: invite.email.split('@')[0], email: invite.email, role: invite.role }])
    setInvite({ email: '', role: 'Technician' })
    setShowInvite(false)
  }
  const ROLE_COLOR: Record<string, string> = { Admin: 'var(--gold)', Manager: 'var(--cyan)', Technician: 'var(--text2)' }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Team & Roles</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{team.length} members</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowInvite(true)}><Plus size={13} /> Invite Member</button>
      </div>
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Email', 'Role', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{m.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{m.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="badge" style={{ background: `${ROLE_COLOR[m.role]}18`, color: ROLE_COLOR[m.role], border: `1px solid ${ROLE_COLOR[m.role]}30` }}>{m.role}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button className="btn btn-danger btn-sm" onClick={() => removeTeam(m.id)}><Trash2 size={11} /> Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showInvite && (
        <Modal title="Invite Team Member" onClose={() => setShowInvite(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Email Address</label>
              <input className="inp" type="email" placeholder="colleague@noirem.ae" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="inp" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Technician">Technician</option>
              </select>
            </div>
            <button className="btn btn-gold" onClick={sendInvite} style={{ width: '100%', justifyContent: 'center' }}>
              Send Invite
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// Integrations section
function IntegrationsSection() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ whatsapp: true, stripe: false, gcal: true, gmail: false, zapier: false })
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Integrations</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>Connect third-party tools</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {INTEGRATIONS.map((int) => (
          <div key={int.key} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${int.color}18`, border: `1px solid ${int.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: int.color, flexShrink: 0 }}>
              {int.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{int.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{int.desc}</div>
            </div>
            <button
              onClick={() => setEnabled({ ...enabled, [int.key]: !enabled[int.key] })}
              style={{
                width: 42, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                background: enabled[int.key] ? 'var(--gold)' : 'var(--bg3)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: enabled[int.key] ? 22 : 3, width: 16, height: 16,
                borderRadius: '50%', background: enabled[int.key] ? '#000' : 'var(--text2)', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Plans section
function PlansSection() {
  const plans = [
    { name: 'Starter', price: '$49', period: '/mo', features: ['Up to 100 contacts', '1 user', 'Basic reports', 'Email support'], cta: 'Select Plan', ctaClass: 'btn btn-ghost', highlight: false },
    { name: 'Pro', price: '$129', period: '/mo', features: ['Unlimited contacts', '5 users', 'Advanced reports', 'All integrations', 'Priority support'], cta: 'Current Plan', ctaClass: 'btn btn-gold', highlight: true },
    { name: 'Enterprise', price: '$349', period: '/mo', features: ['Unlimited everything', 'Unlimited users', 'Custom reports', 'Dedicated manager', 'SLA guarantee'], cta: 'Contact Sales', ctaClass: 'btn btn-ghost', highlight: false },
  ]
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Plans</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>Choose the plan that fits your business</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {plans.map((p) => (
          <div
            key={p.name}
            className="glass"
            style={{ padding: 24, border: p.highlight ? '1px solid var(--gold-b)' : undefined, position: 'relative' }}
          >
            {p.highlight && (
              <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Current
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 20 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: p.highlight ? 'var(--gold)' : 'var(--text)' }}>{p.price}</span>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>{p.period}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Check size={12} color="var(--cyan)" />
                  {f}
                </div>
              ))}
            </div>
            <button className={p.ctaClass} style={{ width: '100%', justifyContent: 'center' }}>{p.cta}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Billing section
function BillingSection() {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Billing</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 24 }}>Manage your subscription and payment method</div>

      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Current Subscription</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Pro Plan</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>$129 / month · Renews June 1, 2026</div>
          </div>
          <span className="badge status-completed">Active</span>
        </div>
      </div>

      <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Payment Method</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>VISA</div>
            <div>
              <div style={{ fontSize: 13 }}>•••• •••• •••• 4242</div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>Expires 12/2028</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Update</button>
        </div>
      </div>

      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Invoice History
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date', 'Amount', 'Status', 'Download'].map((h) => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map((inv, i) => (
              <tr key={i} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{new Date(inv.date).toLocaleDateString('en-AE', { year: 'numeric', month: 'long' })}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>${inv.amount}</td>
                <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status} /></td>
                <td style={{ padding: '12px 16px' }}>
                  <button className="btn btn-ghost btn-sm">PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('profile')

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection />
      case 'team': return <TeamSection />
      case 'integrations': return <IntegrationsSection />
      case 'plans': return <PlansSection />
      case 'billing': return <BillingSection />
    }
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', gap: 24 }}>
      {/* Left sidebar nav */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((item) => {
            const Icon = item.icon
            const active = activeSection === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500,
                  background: active ? 'var(--gold-dim)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--text2)',
                  textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right content */}
      <div className="scroll" style={{ flex: 1, paddingRight: 4 }}>
        {renderContent()}
      </div>
    </div>
  )
}
