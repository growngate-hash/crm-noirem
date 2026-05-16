'use client'
import { useState } from 'react'
import { X, BarChart2, Droplets, Settings } from 'lucide-react'

// ─── shared styles ─────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: '100%', background: '#1a1a1e', borderRadius: 8, padding: '10px 12px',
  color: '#f0ede8', fontSize: 13, fontFamily: 'Outfit,sans-serif', outline: 'none',
  boxSizing: 'border-box',
}
function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return <input {...props} onFocus={e => { setFoc(true); props.onFocus?.(e) }} onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, ...props.style }} />
}
function FSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [foc, setFoc] = useState(false)
  return <select {...props} onFocus={e => { setFoc(true); props.onFocus?.(e) }} onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', ...props.style }} />
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888580', marginBottom: 6 }}>{children}</label>
}

// ─── top-level tabs ────────────────────────────────────────────────────────────
const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Chart of Accounts', 'VAT Calculator', 'VIP Loyalty']

// ─── expense filter pills ──────────────────────────────────────────────────────
const EXP_FILTERS = ['All', 'Fixed', 'Variable', 'Operational']

// ─── category colours ──────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Fixed:       { bg: 'rgba(79,163,255,0.1)',   border: 'rgba(79,163,255,0.3)',   color: '#4fa3ff' },
  Variable:    { bg: 'rgba(201,168,76,0.12)',  border: 'rgba(201,168,76,0.3)',  color: '#c9a84c' },
  Operational: { bg: 'rgba(136,133,128,0.12)', border: 'rgba(136,133,128,0.3)', color: '#888580' },
}
function CatPill({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? CAT_STYLE['Operational']
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 10,
      fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {cat}
    </span>
  )
}

// ─── demo expense rows (sum = AED 81,850) ─────────────────────────────────────
type Expense = { id: number; date: string; description: string; category: string; subcat: string; amount: number; recurring: boolean }

const DEMO_EXPENSES: Expense[] = [
  { id:  1, date: '01/05/2026', description: 'Staff Salaries — May',          category: 'Fixed',       subcat: 'Payroll',     amount: 45000, recurring: true  },
  { id:  2, date: '01/05/2026', description: 'Office Rent — Business Bay',    category: 'Fixed',       subcat: 'Rent',        amount: 15000, recurring: true  },
  { id:  3, date: '01/05/2026', description: 'Fleet Insurance — 4 Vans',      category: 'Fixed',       subcat: 'Insurance',   amount:  8820, recurring: true  },
  { id:  4, date: '05/05/2026', description: 'Ceramic Pro 9H — Restock',      category: 'Variable',    subcat: 'Supplies',    amount:  2800, recurring: false },
  { id:  5, date: '07/05/2026', description: 'Van 02 Tyre Replacement',        category: 'Variable',    subcat: 'Fleet',       amount:  3200, recurring: false },
  { id:  6, date: '10/05/2026', description: 'Instagram Ads — May',           category: 'Variable',    subcat: 'Marketing',   amount:  1560, recurring: true  },
  { id:  7, date: '12/05/2026', description: 'Fuel — Fleet May',              category: 'Variable',    subcat: 'Fleet',       amount:  1000, recurring: true  },
  { id:  8, date: '01/05/2026', description: 'DEWA Electricity — May',        category: 'Operational', subcat: 'Utilities',   amount:  2470, recurring: true  },
  { id:  9, date: '01/05/2026', description: 'DEWA Water — May',              category: 'Operational', subcat: 'Utilities',   amount:   500, recurring: true  },
  { id: 10, date: '01/05/2026', description: 'Internet & Phone — May',        category: 'Operational', subcat: 'Utilities',   amount:   800, recurring: true  },
  { id: 11, date: '01/05/2026', description: 'Software Subscriptions',         category: 'Operational', subcat: 'Software',    amount:   700, recurring: true  },
  { id: 12, date: '14/05/2026', description: 'Staff Transport Allowance',      category: 'Fixed',       subcat: 'Payroll',     amount:     0, recurring: false },
  { id: 13, date: '08/05/2026', description: 'Microfiber Towels — 200 units', category: 'Variable',    subcat: 'Supplies',    amount:     0, recurring: false },
  { id: 14, date: '03/05/2026', description: 'Accountant — Monthly Retainer', category: 'Operational', subcat: 'Professional',amount:     0, recurring: true  },
  { id: 15, date: '15/05/2026', description: 'Miscellaneous Petty Cash',       category: 'Operational', subcat: 'Other',       amount:     0, recurring: false },
].map(e => ({ ...e, amount: e.amount }))

// zero-amount rows just fill the "15 items" count without changing totals
const DISPLAY_EXPENSES = DEMO_EXPENSES.filter(e => e.amount > 0)

const aed = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

// ─── modal ─────────────────────────────────────────────────────────────────────
const EMPTY_EXP = { description: '', category: 'Fixed', subcat: '', amount: '', recurring: false }

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_EXP })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
        padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Add Expense</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><FLabel>Description *</FLabel><FInput placeholder="e.g. Office Rent — June" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FLabel>Category</FLabel>
              <FSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
                <option value="Operational">Operational</option>
              </FSelect>
            </div>
            <div><FLabel>Sub-Category</FLabel><FInput placeholder="Payroll, Rent…" value={form.subcat} onChange={e => setForm({ ...form, subcat: e.target.value })} /></div>
          </div>
          <div><FLabel>Amount (AED) *</FLabel><FInput type="number" min={0} placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: '#c9a84c' }} />
            <span style={{ fontSize: 13, color: '#f0ede8' }}>Recurring monthly</span>
          </label>
        </div>
        <button disabled={!form.description.trim() || !form.amount}
          style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', marginTop: 22,
            background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 700,
            fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
            opacity: form.description.trim() && form.amount ? 1 : 0.5 }}>
          Save Expense
        </button>
      </div>
    </div>
  )
}

// ─── placeholder panel for unbuilt tabs ───────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '80px 0', color: '#888580' }}>
      <div style={{ fontSize: 36, filter: 'grayscale(1) opacity(0.3)' }}>🏗️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12 }}>Coming soon</div>
    </div>
  )
}

// ─── Costs & Expenses tab ─────────────────────────────────────────────────────
function CostsTab() {
  const [expFilter, setExpFilter] = useState('All')
  const [showAdd, setShowAdd]     = useState(false)

  const displayed = expFilter === 'All' ? DISPLAY_EXPENSES : DISPLAY_EXPENSES.filter(e => e.category === expFilter)

  return (
    <>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { dot: '#00d4aa', label: 'Total Revenue MTD',   value: 'AED 847,250', color: '#00d4aa' },
          { dot: '#ff4f4f', label: 'Total Expenses MTD',  value: 'AED 81,850',  color: '#ff4f4f' },
          { dot: '#c9a84c', label: 'Net Profit MTD',      value: 'AED 765,400', color: '#c9a84c' },
          { dot: '#00d4aa', label: 'Profit Margin',       value: '90.3%',       color: '#00d4aa' },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#888580', fontWeight: 500 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* KPI row 2 — cost breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
        {[
          { icon: <BarChart2 size={14} color="#4fa3ff" />, iconBg: 'rgba(79,163,255,0.15)', label: 'Fixed Costs',    sub: '84% of expenses', value: 'AED 68,820', bar: '#4fa3ff', pct: 84 },
          { icon: <Droplets  size={14} color="#c9a84c"  />, iconBg: 'rgba(201,168,76,0.15)', label: 'Variable Costs', sub: '10% of expenses', value: 'AED 8,560',  bar: '#c9a84c', pct: 10 },
          { icon: <Settings  size={14} color="#888580"  />, iconBg: 'rgba(136,133,128,0.12)', label: 'Operational',   sub: '5% of expenses',  value: 'AED 4,470',  bar: '#888580', pct: 5  },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: k.iconBg, flexShrink: 0 }}>
                  {k.icon}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ede8', lineHeight: 1.3 }}>{k.label}</div>
                  <div style={{ fontSize: 10, color: '#888580' }}>{k.sub}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#c9a84c', whiteSpace: 'nowrap' }}>{k.value}</div>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: '#1a1a1e', overflow: 'hidden' }}>
              <div style={{ width: `${k.pct}%`, height: '100%', borderRadius: 2, background: k.bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* Expense Register */}
      <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {/* table header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Expense Register</span>
            <span style={{ fontSize: 12, color: '#888580', background: '#1a1a1e', borderRadius: 99, padding: '2px 9px' }}>
              {DISPLAY_EXPENSES.length} items
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* filter pills */}
            <div style={{ display: 'flex', gap: 6 }}>
              {EXP_FILTERS.map(f => (
                <button key={f} onClick={() => setExpFilter(f)}
                  style={{ padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: expFilter === f ? 700 : 500,
                    fontFamily: 'Outfit,sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                    background: expFilter === f ? '#c9a84c' : '#1a1a1e',
                    color:      expFilter === f ? '#0d0d0f' : '#888580',
                    border:     expFilter === f ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#c9a84c',
                color: '#0d0d0f', fontSize: 12, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5 }}>
              + Add Expense
            </button>
          </div>
        </div>

        {/* table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Date', 'Description', 'Category', 'Sub-Cat.', 'AED', 'Recur.'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#888580',
                  textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>
                  No expenses found
                </td>
              </tr>
            ) : (
              displayed.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: '#888580', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {e.date}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#f0ede8', fontWeight: 500 }}>
                    {e.description}
                  </td>
                  <td style={{ padding: '12px 16px' }}><CatPill cat={e.category} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#888580' }}>{e.subcat}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#f0ede8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    {aed(e.amount)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {e.recurring ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)',
                        border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 8px' }}>
                        YES
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: '#888580' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* table footer totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24,
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 12, color: '#888580' }}>
            {displayed.length} row{displayed.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 12, color: '#888580' }}>Total:</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f', fontVariantNumeric: 'tabular-nums' }}>
            {aed(displayed.reduce((s, e) => s + e.amount, 0))}
          </span>
        </div>
      </div>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </>
  )
}

// ─── page ──────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('Costs & Expenses')

  return (
    <div style={{ padding: 24 }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede8' }}>Finance</div>
          <div style={{ fontSize: 12, color: '#888580', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* top tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {MAIN_TABS.map(tab => {
          const active = activeTab === tab
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontFamily: 'Outfit,sans-serif',
                cursor: 'pointer', transition: 'all 0.15s',
                fontWeight:  active ? 700 : 500,
                background:  active ? '#c9a84c' : '#1a1a1e',
                color:       active ? '#0d0d0f' : '#888580',
                border:      active ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* tab content */}
      {activeTab === 'Costs & Expenses'  && <CostsTab />}
      {activeTab === 'Banks'             && <ComingSoon label="Banks" />}
      {activeTab === 'Chart of Accounts' && <ComingSoon label="Chart of Accounts" />}
      {activeTab === 'VAT Calculator'    && <ComingSoon label="VAT Calculator" />}
      {activeTab === 'VIP Loyalty'       && <ComingSoon label="VIP Loyalty" />}
    </div>
  )
}
