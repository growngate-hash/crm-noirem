'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Eye, Pencil, BarChart2, Droplets, Settings } from 'lucide-react'

// ─── shared inputs ─────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: '100%', background: '#1a1a1e', borderRadius: 8, padding: '10px 12px',
  color: '#f0ede8', fontSize: 13, fontFamily: 'Outfit,sans-serif', outline: 'none', boxSizing: 'border-box',
}
function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return <input {...props}
    onFocus={e => { setFoc(true); props.onFocus?.(e) }}
    onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, ...props.style }} />
}
function FTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc, setFoc] = useState(false)
  return <textarea {...props}
    onFocus={e => { setFoc(true); props.onFocus?.(e) }}
    onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1px solid ${foc ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`, resize: 'vertical', minHeight: 72, ...props.style as any }} />
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888580', marginBottom: 6 }}>{children}</label>
}

type Toast = { id: number; msg: string; type: 'success' | 'error' | 'warn' }
let _toastId = 0

// ─── icon button ───────────────────────────────────────────────────────────────
function IconBtn({ onClick, danger = false, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a1a1e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
        border: `1px solid ${hov ? (danger ? '#ff4f4f' : '#c9a84c') : 'rgba(255,255,255,0.1)'}`,
        color: hov ? (danger ? '#ff4f4f' : '#c9a84c') : '#888580' }}>
      {children}
    </button>
  )
}

// ─── main tabs ─────────────────────────────────────────────────────────────────
const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Chart of Accounts', 'VAT Calculator', 'VIP Loyalty']

// ─── category pill ─────────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Fixed:       { bg: 'rgba(79,163,255,0.1)',    border: 'rgba(79,163,255,0.3)',    color: '#4fa3ff' },
  Variable:    { bg: 'rgba(201,168,76,0.12)',   border: 'rgba(201,168,76,0.3)',   color: '#c9a84c' },
  Operational: { bg: 'rgba(136,133,128,0.12)',  border: 'rgba(136,133,128,0.3)',  color: '#888580' },
}
function CatPill({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? CAT_STYLE['Operational']
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{cat}</span>
}

const aed = (v: number) => `AED ${(v ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

// ─── account type badge ────────────────────────────────────────────────────────
const ACC_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  'Credit Card': { bg: 'rgba(201,168,76,0.12)',  color: '#c9a84c', icon: '💳' },
  'Bank':        { bg: 'rgba(79,163,255,0.12)',  color: '#4fa3ff', icon: '🏦' },
  'Cash':        { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', icon: '💵' },
}
function AccTypeBadge({ type }: { type: string }) {
  const s = ACC_STYLE[type] ?? ACC_STYLE['Cash']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.icon} {type}
    </span>
  )
}

// ─── COSTS & EXPENSES TAB ──────────────────────────────────────────────────────
const EXP_FILTERS = ['All', 'Fixed', 'Variable', 'Operational']
const EMPTY_EXP = { description: '', category: 'Fixed', subcat: '', amount: '', recurring: false }

function CostsTab() {
  const [expenses,  setExpenses]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [expFilter, setExpFilter] = useState('All')
  const [showAdd,   setShowAdd]   = useState(false)
  const [form,      setForm]      = useState({ ...EMPTY_EXP })
  const [saving,    setSaving]    = useState(false)
  const [toasts,    setToasts]    = useState<Toast[]>([])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await createClient().from('expenses').select('*').order('date', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchExpenses() }, [])

  async function saveExpense() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const { error } = await createClient().from('expenses').insert({
      description: form.description, category: form.category,
      subcat: form.subcat, amount: Number(form.amount),
      recurring: form.recurring, date: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Gasto guardado', 'success')
    setShowAdd(false); setForm({ ...EMPTY_EXP }); fetchExpenses()
  }

  const displayed = expFilter === 'All' ? expenses : expenses.filter(e => e.category === expFilter)
  const total = displayed.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)

  // KPI totals from all expenses
  const totalRev  = 847250  // static headline figure
  const totalExp  = expenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const netProfit = totalRev - totalExp
  const margin    = totalRev > 0 ? ((netProfit / totalRev) * 100).toFixed(1) : '0.0'

  const fixed = expenses.filter((e: any) => e.category === 'Fixed').reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const variable = expenses.filter((e: any) => e.category === 'Variable').reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const operational = expenses.filter((e: any) => e.category === 'Operational').reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const expTotal = fixed + variable + operational || 1
  const fixedPct = Math.round((fixed / expTotal) * 100)
  const varPct   = Math.round((variable / expTotal) * 100)
  const opPct    = Math.round((operational / expTotal) * 100)

  return (
    <>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { dot: '#00d4aa', label: 'Total Revenue MTD',  value: aed(totalRev),  color: '#00d4aa' },
          { dot: '#ff4f4f', label: 'Total Expenses MTD', value: aed(totalExp),  color: '#ff4f4f' },
          { dot: '#c9a84c', label: 'Net Profit MTD',     value: aed(netProfit), color: '#c9a84c' },
          { dot: '#00d4aa', label: 'Profit Margin',      value: `${margin}%`,   color: '#00d4aa' },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#888580' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
        {[
          { icon: <BarChart2 size={14} color="#4fa3ff" />, iconBg: 'rgba(79,163,255,0.15)',   label: 'Fixed Costs',    sub: `${fixedPct}% of expenses`, value: aed(fixed),       bar: '#4fa3ff', pct: fixedPct },
          { icon: <Droplets  size={14} color="#c9a84c" />, iconBg: 'rgba(201,168,76,0.15)',  label: 'Variable Costs', sub: `${varPct}% of expenses`,   value: aed(variable),    bar: '#c9a84c', pct: varPct   },
          { icon: <Settings  size={14} color="#888580" />, iconBg: 'rgba(136,133,128,0.12)', label: 'Operational',    sub: `${opPct}% of expenses`,    value: aed(operational), bar: '#888580', pct: opPct    },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: k.iconBg, flexShrink: 0 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ede8' }}>{k.label}</div>
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
        {/* header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Expense Register</span>
            {!loading && (
              <span style={{ fontSize: 12, color: '#888580', background: '#1a1a1e', borderRadius: 99, padding: '2px 9px' }}>
                {expenses.length} item{expenses.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {EXP_FILTERS.map(f => (
                <button key={f} onClick={() => setExpFilter(f)}
                  style={{ padding: '5px 13px', borderRadius: 99, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', transition: 'all 0.15s',
                    fontWeight: expFilter === f ? 700 : 500,
                    background: expFilter === f ? '#c9a84c' : '#1a1a1e',
                    color:      expFilter === f ? '#0d0d0f' : '#888580',
                    border:     expFilter === f ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 12, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
              + Add Expense
            </button>
          </div>
        </div>

        {/* table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>Cargando…</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3a3836' }}>No hay gastos registrados</div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
              + Add Expense
            </button>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Date', 'Description', 'Category', 'Sub-Cat.', 'AED', 'Recur.'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888580', fontSize: 13 }}>Sin gastos en esta categoría</td></tr>
                ) : displayed.map((e: any) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: '#888580', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {e.date ? new Date(e.date).toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#f0ede8', fontWeight: 500 }}>{e.description}</td>
                    <td style={{ padding: '12px 16px' }}><CatPill cat={e.category ?? 'Operational'} /></td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888580' }}>{e.subcat ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#f0ede8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {aed(e.amount ?? 0)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {e.recurring
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 8px' }}>YES</span>
                        : <span style={{ fontSize: 10, color: '#888580' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: '#888580' }}>{displayed.length} row{displayed.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, color: '#888580' }}>Total:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f', fontVariantNumeric: 'tabular-nums' }}>{aed(total)}</span>
            </div>
          </>
        )}
      </div>

      {/* Add Expense modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }) }}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Add Expense</span>
              <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><FLabel>Description *</FLabel><FInput placeholder="e.g. Office Rent — June" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FLabel>Category</FLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Fixed', 'Variable', 'Operational'].map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                        style={{ padding: '6px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', flex: 1,
                          background: form.category === c ? '#c9a84c' : '#1a1a1e',
                          color:      form.category === c ? '#0d0d0f' : '#888580',
                          border:     form.category === c ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div><FLabel>Sub-Category</FLabel><FInput placeholder="Payroll, Rent…" value={form.subcat} onChange={e => setForm({ ...form, subcat: e.target.value })} /></div>
              </div>
              <div><FLabel>Amount (AED) *</FLabel><FInput type="number" min={0} placeholder="0" value={form.amount as any} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#c9a84c' }} />
                <span style={{ fontSize: 13, color: '#f0ede8' }}>Recurring monthly</span>
              </label>
            </div>
            <button onClick={saveExpense} disabled={saving || !form.description.trim() || !form.amount}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', marginTop: 22, background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: (form.description.trim() && form.amount) ? 1 : 0.5 }}>
              {saving ? 'Guardando…' : 'Save Expense'}
            </button>
          </div>
        </div>
      )}

      {/* toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'Outfit,sans-serif', color: '#fff',
            background: t.type === 'success' ? 'rgba(34,197,94,0.95)' : t.type === 'warn' ? 'rgba(251,191,36,0.95)' : 'rgba(255,79,79,0.95)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── BANKS TAB ─────────────────────────────────────────────────────────────────
const SEED_ACCOUNTS = [
  { name: 'Tarjeta de crédito empresarial', account_type: 'Credit Card', account_number: null, balance: 0 },
  { name: 'Banco 1',                         account_type: 'Bank',        account_number: null, balance: 0 },
  { name: 'Caja general',                    account_type: 'Cash',        account_number: null, balance: 0 },
  { name: 'Caja chica',                      account_type: 'Cash',        account_number: null, balance: 0 },
]
const EMPTY_ACC = { name: '', account_type: 'Bank', account_number: '', balance: '', notes: '' }

function BanksTab() {
  const [accounts,  setAccounts]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editAcc,   setEditAcc]   = useState<any | null>(null)
  const [form,      setForm]      = useState({ ...EMPTY_ACC })
  const [saving,    setSaving]    = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)
  const [toasts,    setToasts]    = useState<Toast[]>([])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function fetchAccounts() {
    setLoading(true)
    const sb = createClient()
    const { data: existing } = await sb.from('bank_accounts').select('*').order('created_at', { ascending: true })
    if (existing && existing.length > 0) {
      setAccounts(existing); setLoading(false); return
    }
    const { data: seeded } = await sb.from('bank_accounts').insert(SEED_ACCOUNTS).select()
    setAccounts(seeded ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  function openAdd() { setForm({ ...EMPTY_ACC }); setShowAdd(true) }

  function openEdit(acc: any) {
    setForm({ name: acc.name ?? '', account_type: acc.account_type ?? 'Bank', account_number: acc.account_number ?? '', balance: String(acc.balance ?? 0), notes: acc.notes ?? '' })
    setDelConfirm(false); setEditAcc(acc)
  }

  async function saveAdd() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('bank_accounts').insert({
      name: form.name, account_type: form.account_type, account_number: form.account_number || null,
      balance: Number(form.balance) || 0, notes: form.notes || null,
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Cuenta agregada', 'success'); setShowAdd(false); fetchAccounts()
  }

  async function saveEdit() {
    if (!editAcc || !form.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('bank_accounts').update({
      name: form.name, account_type: form.account_type, account_number: form.account_number || null,
      balance: Number(form.balance) || 0, notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editAcc.id)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Cuenta actualizada', 'success'); setEditAcc(null); fetchAccounts()
  }

  async function deleteAcc() {
    if (!editAcc) return
    const { error } = await createClient().from('bank_accounts').delete().eq('id', editAcc.id)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Cuenta eliminada', 'success'); setEditAcc(null); fetchAccounts()
  }

  const bankBal  = accounts.filter(a => a.account_type === 'Bank').reduce((s, a) => s + (a.balance ?? 0), 0)
  const cashBal  = accounts.filter(a => a.account_type === 'Cash').reduce((s, a) => s + (a.balance ?? 0), 0)
  const ccBal    = accounts.filter(a => a.account_type === 'Credit Card').reduce((s, a) => s + (a.balance ?? 0), 0)

  function balColor(v: number) { return v > 0 ? '#34d399' : v < 0 ? '#ff4f4f' : '#888580' }

  function AccModal({ title, onClose, onSave, saveLabel }: { title: string; onClose: () => void; onSave: () => void; saveLabel: string }) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
        <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><FLabel>Nombre de la Cuenta *</FLabel><FInput placeholder="e.g. Emirates NBD Cuenta Principal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <FLabel>Tipo de Cuenta *</FLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Bank', 'Credit Card', 'Cash'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, account_type: t })}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif',
                      background: form.account_type === t ? '#c9a84c' : '#1a1a1e',
                      color:      form.account_type === t ? '#0d0d0f' : '#888580',
                      border:     form.account_type === t ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                    {ACC_STYLE[t]?.icon} {t}
                  </button>
                ))}
              </div>
            </div>
            <div><FLabel>Número de Cuenta</FLabel><FInput placeholder="XXXX XXXX XXXX XXXX" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} style={{ fontFamily: 'monospace' }} /></div>
            <div><FLabel>Saldo Inicial (AED)</FLabel><FInput type="number" placeholder="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            <div><FLabel>Notas</FLabel><FTextarea placeholder="Observaciones opcionales…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          {/* delete confirm (edit only) */}
          {editAcc && delConfirm && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#ff4f4f' }}>¿Eliminar esta cuenta?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDelConfirm(false)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1e', color: '#888580', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>No</button>
                <button onClick={deleteAcc} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#ff4f4f', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>Sí, eliminar</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: editAcc ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: 22, gap: 10 }}>
            {editAcc && (
              <button onClick={() => setDelConfirm(true)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,79,79,0.3)', background: 'transparent', color: '#ff4f4f', fontSize: 12, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
                Eliminar Cuenta
              </button>
            )}
            <button onClick={onSave} disabled={saving || !form.name.trim()}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.5 }}>
              {saving ? 'Guardando…' : saveLabel}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8' }}>Accounts</div>
          <div style={{ fontSize: 12, color: '#888580', marginTop: 3 }}>Banks, credit cards &amp; petty cash</div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
          + Add Account
        </button>
      </div>

      {/* accounts table */}
      <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>Cargando…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Name', 'Account Type', 'Account Number', 'Balance', 'Reconciliation', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>No accounts found</td></tr>
              ) : accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  {/* name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#c9a84c', flexShrink: 0 }}>⊙</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8', cursor: 'pointer' }}>{acc.name}</span>
                    </div>
                  </td>
                  {/* type */}
                  <td style={{ padding: '12px 16px' }}><AccTypeBadge type={acc.account_type} /></td>
                  {/* account number */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#888580', fontFamily: 'monospace' }}>
                    {acc.account_number ?? '—'}
                  </td>
                  {/* balance */}
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: balColor(acc.balance ?? 0) }}>
                    {aed(acc.balance ?? 0)}
                  </td>
                  {/* reconciliation */}
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', background: '#1a1a1e', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c' }}>
                      Reconcile
                    </button>
                  </td>
                  {/* actions */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <IconBtn onClick={() => {}}><Eye size={11} /></IconBtn>
                      <IconBtn onClick={() => openEdit(acc)}><Pencil size={11} /></IconBtn>
                      <IconBtn danger onClick={() => { openEdit(acc); setDelConfirm(true) }}><X size={11} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { label: 'BANK BALANCE',  value: bankBal },
          { label: 'CASH ON HAND',  value: cashBal },
          { label: 'CREDIT CARDS',  value: ccBal   },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>{aed(k.value)}</div>
          </div>
        ))}
      </div>

      {/* modals */}
      {showAdd && (
        <AccModal title="Agregar Cuenta" onClose={() => setShowAdd(false)} onSave={saveAdd} saveLabel="Agregar Cuenta" />
      )}
      {editAcc && (
        <AccModal title="Editar Cuenta" onClose={() => { setEditAcc(null); setDelConfirm(false) }} onSave={saveEdit} saveLabel="Guardar Cambios" />
      )}

      {/* toasts */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: '12px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'Outfit,sans-serif', color: '#fff',
            background: t.type === 'success' ? 'rgba(34,197,94,0.95)' : t.type === 'warn' ? 'rgba(251,191,36,0.95)' : 'rgba(255,79,79,0.95)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}

// ─── placeholder ───────────────────────────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 0', color: '#888580' }}>
      <div style={{ fontSize: 36, filter: 'grayscale(1) opacity(0.3)' }}>🏗️</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 12 }}>Coming soon</div>
    </div>
  )
}

// ─── PAGE ──────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('Costs & Expenses')

  return (
    <div style={{ padding: 24 }}>
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede8' }}>Finance</div>
        <div style={{ fontSize: 12, color: '#888580', marginTop: 3 }}>
          {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* top tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {MAIN_TABS.map(tab => {
          const active = activeTab === tab
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                fontWeight: active ? 700 : 500,
                background: active ? '#c9a84c' : '#1a1a1e',
                color:      active ? '#0d0d0f' : '#888580',
                border:     active ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
              {tab}
            </button>
          )
        })}
      </div>

      {/* content */}
      {activeTab === 'Costs & Expenses'  && <CostsTab />}
      {activeTab === 'Banks'             && <BanksTab />}
      {activeTab === 'Chart of Accounts' && <ComingSoon label="Chart of Accounts" />}
      {activeTab === 'VAT Calculator'    && <ComingSoon label="VAT Calculator" />}
      {activeTab === 'VIP Loyalty'       && <ComingSoon label="VIP Loyalty" />}
    </div>
  )
}
