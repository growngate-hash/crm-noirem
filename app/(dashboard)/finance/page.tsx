'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Eye, Pencil, BarChart2, Droplets, Settings } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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
const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Chart of Accounts', 'Impuestos']

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
  const [expenses,         setExpenses]         = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [expFilter,        setExpFilter]        = useState('All')
  const [showAdd,          setShowAdd]          = useState(false)
  const [form,             setForm]             = useState({ ...EMPTY_EXP })
  const [saving,           setSaving]           = useState(false)
  const [toasts,           setToasts]           = useState<Toast[]>([])
  const [financeKPIs,      setFinanceKPIs]      = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: '0.0',
    fixedCosts: { amount: 0, pct: 0 },
    variableCosts: { amount: 0, pct: 0 },
    operational: { amount: 0, pct: 0 },
  })
  const [cuentasContables,  setCuentasContables]  = useState<any[]>([])
  const [dropdownAbierto,   setDropdownAbierto]   = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any>(null)
  const [busqueda,           setBusqueda]           = useState('')

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

  async function fetchFinanceKPIs() {
    const supabase = createClient()
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    const inicioMesUTC = new Date(inicioMes.getTime() - 4 * 3600000).toISOString()
    const finMesUTC = new Date(finMes.getTime() - 4 * 3600000).toISOString()
    const inicioMesStr = inicioMes.toISOString().split('T')[0]
    const finMesStr = finMes.toISOString().split('T')[0]

    const [{ data: bookings }, { data: gastos }] = await Promise.all([
      supabase
        .from('bookings')
        .select('price, discount')
        .eq('status', 'completed')
        .gte('scheduled_at', inicioMesUTC)
        .lte('scheduled_at', finMesUTC),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('date', inicioMesStr)
        .lte('date', finMesStr),
    ])

    const totalRevenue = (bookings ?? []).reduce(
      (sum, b) => sum + ((b.price ?? 0) - (b.discount ?? 0)), 0
    )
    const totalExpenses = (gastos ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    const fixed = (gastos ?? []).filter(e => e.category === 'Fixed').reduce((s, e) => s + (e.amount ?? 0), 0)
    const variable = (gastos ?? []).filter(e => e.category === 'Variable').reduce((s, e) => s + (e.amount ?? 0), 0)
    const operational = (gastos ?? []).filter(e => e.category === 'Operational').reduce((s, e) => s + (e.amount ?? 0), 0)
    const expTotal = totalExpenses || 1

    setFinanceKPIs({
      totalRevenue, totalExpenses, netProfit, profitMargin,
      fixedCosts: { amount: fixed, pct: Math.round(fixed / expTotal * 100) },
      variableCosts: { amount: variable, pct: Math.round(variable / expTotal * 100) },
      operational: { amount: operational, pct: Math.round(operational / expTotal * 100) },
    })
  }

  async function fetchCuentasContables() {
    const { data } = await createClient()
      .from('chart_of_accounts')
      .select('id, code, name, type, level')
      .order('code', { ascending: true })
    setCuentasContables(data ?? [])
  }

  useEffect(() => {
    fetchExpenses()
    fetchFinanceKPIs()
    fetchCuentasContables()
  }, [])

  async function saveExpense() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const selectedAccount = cuentasContables.find(c => c.id === form.subcat)
    const payload: any = {
      description: form.description,
      category: form.category,
      subcat: selectedAccount?.name ?? (form.subcat || null),
      amount: Number(form.amount),
      recurring: form.recurring,
      date: new Date().toISOString().split('T')[0],
    }
    if (selectedAccount) payload.account_id = form.subcat
    const { error } = await createClient().from('expenses').insert(payload)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Gasto guardado', 'success')
    setShowAdd(false); setForm({ ...EMPTY_EXP })
    setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false)
    fetchExpenses(); fetchFinanceKPIs()
  }

  function getCuentasFiltradas(categoria: string): any[] {
    const typeMap: Record<string, string[]> = {
      'Fixed': ['Gasto', 'Costo de Ventas'],
      'Variable': ['Gasto', 'Costo de Ventas', 'Costo Produccion'],
      'Operational': ['Gasto', 'Costo Produccion'],
    }
    const tipos = typeMap[categoria] ?? ['Gasto']
    return cuentasContables.filter(c => tipos.includes(c.type) && c.level >= 2)
  }

  const displayed = expFilter === 'All' ? expenses : expenses.filter(e => e.category === expFilter)
  const total = displayed.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const { totalRevenue, totalExpenses, netProfit, profitMargin, fixedCosts, variableCosts, operational } = financeKPIs

  return (
    <>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { dot: '#00d4aa', label: 'Total Revenue MTD',  value: aed(totalRevenue),   color: '#00d4aa' },
          { dot: '#ff4f4f', label: 'Total Expenses MTD', value: aed(totalExpenses),  color: '#ff4f4f' },
          { dot: '#c9a84c', label: 'Net Profit MTD',     value: aed(netProfit),      color: '#c9a84c' },
          { dot: '#00d4aa', label: 'Profit Margin',      value: `${profitMargin}%`,  color: '#00d4aa' },
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
          { icon: <BarChart2 size={14} color="#4fa3ff" />, iconBg: 'rgba(79,163,255,0.15)',   label: 'Fixed Costs',    sub: `${fixedCosts.pct}% of expenses`,    value: aed(fixedCosts.amount),    bar: '#4fa3ff', pct: fixedCosts.pct    },
          { icon: <Droplets  size={14} color="#c9a84c" />, iconBg: 'rgba(201,168,76,0.15)',  label: 'Variable Costs', sub: `${variableCosts.pct}% of expenses`,  value: aed(variableCosts.amount), bar: '#c9a84c', pct: variableCosts.pct },
          { icon: <Settings  size={14} color="#888580" />, iconBg: 'rgba(136,133,128,0.12)', label: 'Operational',    sub: `${operational.pct}% of expenses`,    value: aed(operational.amount),   bar: '#888580', pct: operational.pct   },
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
          onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>Add Expense</span>
              <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><FLabel>Description *</FLabel><FInput placeholder="e.g. Office Rent — June" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

              {/* Category */}
              <div>
                <FLabel>Category</FLabel>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Fixed', 'Variable', 'Operational'].map(c => (
                    <button key={c} type="button"
                      onClick={() => {
                        setForm({ ...form, category: c, subcat: '' })
                        setCuentaSeleccionada(null)
                        setDropdownAbierto(false)
                        setBusqueda('')
                      }}
                      style={{ padding: '6px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', flex: 1,
                        background: form.category === c ? '#c9a84c' : '#1a1a1e',
                        color:      form.category === c ? '#0d0d0f' : '#888580',
                        border:     form.category === c ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-Categoría — custom dropdown */}
              <div>
                <FLabel>Sub-Categoría</FLabel>
                <div style={{ position: 'relative' }}>
                  {/* Trigger */}
                  <div onClick={() => setDropdownAbierto(p => !p)}
                    style={{ background: '#1a1a1e', borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      border: `1px solid ${dropdownAbierto ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                      color: cuentaSeleccionada ? '#f0ede8' : '#3a3836' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      {cuentaSeleccionada
                        ? <><span style={{ fontFamily: 'monospace', color: '#c9a84c', marginRight: 6 }}>{cuentaSeleccionada.code}</span>{cuentaSeleccionada.name}</>
                        : 'Seleccionar cuenta…'}
                    </span>
                    <span style={{ color: '#888580', fontSize: 10, flexShrink: 0, marginLeft: 8,
                      display: 'inline-block', transition: 'transform 0.2s',
                      transform: dropdownAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </div>

                  {/* Dropdown panel */}
                  {dropdownAbierto && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                      background: '#1a1a1e', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10,
                      maxHeight: 280, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

                      {/* Search */}
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <input autoFocus type="text" value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                          placeholder="🔍 Buscar cuenta…"
                          style={{ width: '100%', boxSizing: 'border-box', background: '#141416',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                            padding: '7px 10px', fontSize: 12, color: '#f0ede8',
                            outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                      </div>

                      {/* List */}
                      <div style={{ overflowY: 'auto', maxHeight: 220 }}>
                        {(() => {
                          const todas = getCuentasFiltradas(form.category)
                            .filter(c =>
                              c.name.toLowerCase().includes(busqueda.toLowerCase()) ||
                              c.code.includes(busqueda)
                            )
                          if (todas.length === 0) return (
                            <div style={{ padding: 20, textAlign: 'center', color: '#3a3836', fontSize: 12 }}>
                              No se encontraron cuentas
                            </div>
                          )
                          return (['Gasto', 'Costo de Ventas', 'Costo Produccion'] as const).map(tipo => {
                            const grupo = todas.filter(c => c.type === tipo)
                            if (grupo.length === 0) return null
                            const grupoLabel = tipo === 'Costo de Ventas' ? '💰 Costos de Ventas'
                              : tipo === 'Costo Produccion' ? '⚙️ Costos de Producción'
                              : '📋 Gastos'
                            return (
                              <div key={tipo}>
                                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700,
                                  color: '#888580', textTransform: 'uppercase', letterSpacing: '0.1em',
                                  background: '#141416', position: 'sticky', top: 0 }}>
                                  {grupoLabel}
                                </div>
                                {grupo.map((cuenta: any) => {
                                  const selected = cuentaSeleccionada?.id === cuenta.id
                                  return (
                                    <div key={cuenta.id}
                                      onClick={() => {
                                        setCuentaSeleccionada(cuenta)
                                        setForm(f => ({ ...f, subcat: cuenta.id }))
                                        setDropdownAbierto(false)
                                        setBusqueda('')
                                      }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? 'rgba(201,168,76,0.1)' : 'transparent' }}
                                      style={{ padding: cuenta.level === 2 ? '9px 14px' : '7px 14px 7px 28px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        background: selected ? 'rgba(201,168,76,0.1)' : 'transparent',
                                        transition: 'background 0.15s' }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#c9a84c', minWidth: 44, flexShrink: 0 }}>
                                        {cuenta.code}
                                      </span>
                                      <span style={{ color: '#3a3836', fontSize: 10 }}>—</span>
                                      <span style={{ fontSize: cuenta.level === 2 ? 13 : 12,
                                        fontWeight: cuenta.level === 2 ? 600 : 400,
                                        color: cuenta.level === 2 ? '#f0ede8' : '#c0bdb8', flex: 1 }}>
                                        {cuenta.name}
                                      </span>
                                      {selected && <span style={{ color: '#c9a84c', fontSize: 12, flexShrink: 0 }}>✓</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Click-outside backdrop */}
                  {dropdownAbierto && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                      onClick={() => { setDropdownAbierto(false); setBusqueda('') }} />
                  )}
                </div>
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

// ─── CHART OF ACCOUNTS ────────────────────────────────────────────────────────
const GROUP_CFG: Record<string, { color: string; icon: string }> = {
  '1': { color: '#00d4aa', icon: '▲' },
  '2': { color: '#ff4f4f', icon: '▼' },
  '3': { color: '#c9a84c', icon: '◆' },
  '4': { color: '#34d399', icon: '↑' },
  '5': { color: '#f87171', icon: '↓' },
  '6': { color: '#fb923c', icon: '🏷' },
  '7': { color: '#a78bfa', icon: '⚙' },
  '8': { color: '#38bdf8', icon: 'D' },
  '9': { color: '#f472b6', icon: 'A' },
}
const FILTER_TYPES   = ['All', 'Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Costo']
const COA_ALL_TYPES  = ['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Costo de Ventas', 'Costo Produccion', 'Orden Deudora', 'Orden Acreedora']
const EMPTY_COA      = { code: '', name: '', type: 'Activo', description: '', currency: 'AED' }
const COA_GROUPS     = ['1','2','3','4','5','6','7','8','9']

function hexRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${a})`
}

function ChartOfAccountsTab() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [typeFil,  setTypeFil]  = useState('All')
  const [expanded, setExpanded] = useState<Record<string,boolean>>({})
  const [hovL2,    setHovL2]    = useState<string|null>(null)
  const [hovL3,    setHovL3]    = useState<string|null>(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [form,     setForm]     = useState({ ...EMPTY_COA })
  const [saving,   setSaving]   = useState(false)
  const [toasts,   setToasts]   = useState<Toast[]>([])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function fetchAccounts() {
    setLoading(true)
    const { data } = await createClient().from('chart_of_accounts').select('*').order('code', { ascending: true })
    setAccounts(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchAccounts() }, [])

  function toggle(g: string) { setExpanded(p => ({ ...p, [g]: !p[g] })) }

  function suggestCode(parentCode: string): string {
    const depth = parentCode.split('.').length + 1
    const children = accounts.filter(a => a.code.split('.').length === depth && a.code.startsWith(parentCode + '.'))
    const maxN = children.length === 0 ? 0 : Math.max(...children.map(c => parseInt(c.code.split('.').pop() ?? '0') || 0))
    return `${parentCode}.${maxN + 1}`
  }

  async function saveAccount() {
    if (!form.code.trim() || !form.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('chart_of_accounts').insert({
      code: form.code.trim(), name: form.name.trim(), type: form.type,
      level: form.code.trim().split('.').length,
      description: form.description || null, currency: form.currency || 'AED',
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Cuenta creada', 'success')
    setShowAdd(false); setForm({ ...EMPTY_COA }); fetchAccounts()
  }

  // filtering
  const q        = search.toLowerCase()
  const filtered = accounts.filter(a => {
    const typeOk   = typeFil === 'All' || (typeFil === 'Costo' ? a.type?.startsWith('Costo') : a.type === typeFil)
    const searchOk = !q || a.name?.toLowerCase().includes(q) || a.code?.includes(q)
    return typeOk && searchOk
  })
  const isFiltering  = q.length > 0 || typeFil !== 'All'
  const activeGroups = new Set(filtered.map((a: any) => a.code.split('.')[0]))

  function l1(g: string)         { return accounts.find(a => a.code === g) }
  function l2s(g: string)        { return filtered.filter(a => { const p = a.code.split('.'); return p.length === 2 && p[0] === g }) }
  function l3s(l2code: string)   { return filtered.filter(a => { const p = a.code.split('.'); return p.length === 3 && p.slice(0,-1).join('.') === l2code }) }

  return (
    <div>
      {/* header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:'#f0ede8' }}>Plan de Cuentas</div>
          <div style={{ fontSize:12, color:'#888580', marginTop:3 }}>Estándar Internacional IFRS/NIIF</div>
        </div>
        <button onClick={() => { setForm({ ...EMPTY_COA }); setShowAdd(true) }}
          style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
          + Agregar Cuenta
        </button>
      </div>

      {/* search + type filter */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <FInput placeholder="Buscar cuenta por nombre o código…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:320, flex:'0 0 auto' }}/>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTER_TYPES.map(f => (
            <button key={f} onClick={() => setTypeFil(f)}
              style={{ padding:'5px 12px', borderRadius:99, fontSize:11, fontWeight: typeFil===f?700:500,
                fontFamily:'Outfit,sans-serif', cursor:'pointer', transition:'all 0.15s',
                background: typeFil===f?'#c9a84c':'#1a1a1e', color: typeFil===f?'#0d0d0f':'#888580',
                border: typeFil===f?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* accordion */}
      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'#888580', fontSize:13 }}>Cargando plan de cuentas…</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {COA_GROUPS.filter(g => !isFiltering || activeGroups.has(g)).map(g => {
            const cfg    = GROUP_CFG[g]
            const grp    = l1(g)
            const isOpen = isFiltering ? true : (expanded[g] ?? false)
            const subs   = l2s(g)
            const total  = filtered.filter(a => a.code !== g && (a.code.startsWith(g+'.') || a.code === g)).length

            return (
              <div key={g}>
                {/* ── group header ── */}
                <div onClick={() => !isFiltering && toggle(g)}
                  style={{ display:'flex', alignItems:'center', gap:10, background:'#1a1a1e',
                    borderLeft:`4px solid ${cfg.color}`, borderRadius: isOpen ? '8px 8px 0 0' : 8,
                    padding:'12px 16px', cursor: isFiltering ? 'default' : 'pointer', userSelect:'none' }}>
                  <span style={{ color:cfg.color, width:20, textAlign:'center', fontSize:13, flexShrink:0 }}>{cfg.icon}</span>
                  <span style={{ fontFamily:'monospace', color:'#888580', fontSize:12, flexShrink:0 }}>{g}</span>
                  <span style={{ fontWeight:700, color:'#f0ede8', fontSize:14, flex:1 }}>{grp?.name ?? `Grupo ${g}`}</span>
                  <span style={{ fontSize:11, color:'#888580', background:'rgba(255,255,255,0.06)', borderRadius:99, padding:'2px 8px', flexShrink:0 }}>
                    {total} cuentas
                  </span>
                  {!isFiltering && (
                    <span style={{ color:'#888580', fontSize:11, display:'inline-block', transition:'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none', flexShrink:0 }}>▸</span>
                  )}
                </div>

                {/* ── expanded body ── */}
                {isOpen && subs.length > 0 && (
                  <div style={{ background:'#141416', borderRadius:'0 0 8px 8px', border:`1px solid ${hexRgba(cfg.color,0.12)}`, borderTop:'none', overflow:'hidden' }}>
                    {subs.map(l2 => {
                      const sub3s = l3s(l2.code)
                      return (
                        <div key={l2.id}>
                          {/* level-2 row */}
                          <div onMouseEnter={() => setHovL2(l2.code)} onMouseLeave={() => setHovL2(null)}
                            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px 10px 32px',
                              borderLeft:`2px solid ${hexRgba(cfg.color,0.3)}`,
                              borderBottom:'1px solid rgba(255,255,255,0.04)',
                              background: hovL2===l2.code ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                            <span style={{ fontFamily:'monospace', color:'#888580', fontSize:11, flexShrink:0 }}>{l2.code}</span>
                            <span style={{ color:'#c0bdb8', fontSize:13, fontWeight:500, flex:1 }}>{l2.name}</span>
                            {hovL2 === l2.code && (
                              <button onClick={e => { e.stopPropagation(); setForm({ ...EMPTY_COA, code: suggestCode(l2.code), type: grp?.type ?? 'Activo' }); setShowAdd(true) }}
                                style={{ fontSize:11, color:'#c9a84c', background:'none', border:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif', padding:'2px 8px', whiteSpace:'nowrap', flexShrink:0 }}>
                                + Subcuenta
                              </button>
                            )}
                          </div>

                          {/* level-3 rows */}
                          {sub3s.map(l3 => (
                            <div key={l3.id} onMouseEnter={() => setHovL3(l3.id)} onMouseLeave={() => setHovL3(null)}
                              style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px 8px 52px',
                                borderLeft:'1px solid rgba(255,255,255,0.04)',
                                borderBottom:'1px solid rgba(255,255,255,0.03)',
                                background: hovL3===l3.id ? 'rgba(255,255,255,0.015)' : 'transparent',
                                transition:'background 0.1s' }}>
                              <span style={{ fontFamily:'monospace', color:'#3a3836', fontSize:11, flexShrink:0 }}>{l3.code}</span>
                              <span style={{ color:'#888580', fontSize:12, flex:1 }}>{l3.name}</span>
                              <span style={{ fontSize:12, color:cfg.color, fontVariantNumeric:'tabular-nums', flexShrink:0 }}>AED 0</span>
                              {hovL3 === l3.id && (
                                <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                                  <IconBtn onClick={() => {}}><Pencil size={9}/></IconBtn>
                                  <IconBtn danger onClick={() => {}}><X size={9}/></IconBtn>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Account modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => { setShowAdd(false); setForm({ ...EMPTY_COA }) }}>
          <div style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:28, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <span style={{ fontSize:16, fontWeight:700, color:'#f0ede8' }}>Nueva Cuenta Contable</span>
              <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_COA }) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', padding:4, display:'flex' }}><X size={18}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12 }}>
                <div>
                  <FLabel>Código *</FLabel>
                  <FInput placeholder="1.1.5" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={{ fontFamily:'monospace' }}/>
                </div>
                <div>
                  <FLabel>Nombre de la Cuenta *</FLabel>
                  <FInput placeholder="Ej: Cuentas por Cobrar Clientes" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>
                </div>
              </div>
              <div>
                <FLabel>Tipo *</FLabel>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {COA_ALL_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                      style={{ padding:'6px 12px', borderRadius:99, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif',
                        background: form.type===t?'#c9a84c':'#1a1a1e', color: form.type===t?'#0d0d0f':'#888580',
                        border: form.type===t?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <FLabel>Cuenta Padre</FLabel>
                <select value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ ...INP, border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer' }}>
                  <option value="">Sin cuenta padre (nivel raíz)</option>
                  {accounts.filter(a => a.level <= 2).map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <FLabel>Descripción</FLabel>
                <FTextarea placeholder="Descripción opcional de la cuenta…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/>
              </div>
              <div>
                <FLabel>Moneda</FLabel>
                <FInput placeholder="AED" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} style={{ maxWidth:120 }}/>
              </div>
            </div>
            <button onClick={saveAccount} disabled={saving || !form.code.trim() || !form.name.trim()}
              style={{ width:'100%', padding:14, borderRadius:10, border:'none', marginTop:22, background:'#c9a84c', color:'#0d0d0f', fontSize:14, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer',
                opacity: form.code.trim() && form.name.trim() ? 1 : 0.5 }}>
              {saving ? 'Creando…' : 'Crear Cuenta'}
            </button>
          </div>
        </div>
      )}

      {/* toasts */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', color:'#fff',
            background: t.type==='success'?'rgba(34,197,94,0.95)':t.type==='warn'?'rgba(251,191,36,0.95)':'rgba(255,79,79,0.95)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── IMPUESTOS TAB ────────────────────────────────────────────────────────────
const TAX_TYPES = ['Standard', 'Zero-rated', 'Exento', 'Municipal']
const TAX_TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  'Standard':   { bg: 'rgba(79,163,255,0.12)',   color: '#4fa3ff' },
  'Zero-rated': { bg: 'rgba(136,133,128,0.12)',  color: '#888580' },
  'Exento':     { bg: 'rgba(168,139,250,0.12)',  color: '#a78bfa' },
  'Municipal':  { bg: 'rgba(251,146,60,0.12)',   color: '#fb923c' },
}
const SEED_TAXES = [
  { name: 'IVA — UAE VAT',        code: 'VAT-AE-5',  rate: 5, type: 'Standard',   applies_to: 'Todos los servicios', is_active: true,  collected_mtd: 42362 },
  { name: 'VAT Zero-rated',       code: 'VAT-AE-0',  rate: 0, type: 'Zero-rated', applies_to: 'Exportaciones',       is_active: true,  collected_mtd: 0     },
  { name: 'Tarifa Municipal DXB', code: 'MUNI-DXB',  rate: 2, type: 'Municipal',  applies_to: 'Servicios de lujo',   is_active: false, collected_mtd: 0     },
]
const EMPTY_TAX = { name: '', code: '', rate: '', type: 'Standard', applies_to: '', is_active: true }

function TaxTypeBadge({ type }: { type: string }) {
  const s = TAX_TYPE_STYLE[type] ?? TAX_TYPE_STYLE['Standard']
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700, background:s.bg, color:s.color }}>{type}</span>
}
function TaxStatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700,
      background: active?'rgba(52,211,153,0.12)':'rgba(136,133,128,0.12)',
      color:      active?'#34d399':'#888580' }}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function ImpuestosTab() {
  const [taxes,   setTaxes]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTax, setEditTax] = useState<any|null>(null)
  const [form,    setForm]    = useState({ ...EMPTY_TAX })
  const [saving,  setSaving]  = useState(false)
  const [delConf, setDelConf] = useState(false)
  const [toasts,  setToasts]  = useState<Toast[]>([])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function fetchTaxes() {
    setLoading(true)
    const sb = createClient()
    const { data: existing } = await sb.from('taxes').select('*').order('created_at', { ascending: true })
    if (existing && existing.length > 0) { setTaxes(existing); setLoading(false); return }
    const { data: seeded } = await sb.from('taxes').insert(SEED_TAXES).select()
    setTaxes(seeded ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchTaxes() }, [])

  function openAdd() { setForm({ ...EMPTY_TAX }); setShowAdd(true) }

  function openEdit(t: any) {
    setForm({ name: t.name, code: t.code, rate: String(t.rate), type: t.type, applies_to: t.applies_to ?? '', is_active: t.is_active })
    setDelConf(false); setEditTax(t)
  }

  async function saveTax() {
    if (!form.name.trim() || !form.code.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), rate: Number(form.rate) || 0, type: form.type, applies_to: form.applies_to || null, is_active: form.is_active }
    const { error } = editTax
      ? await createClient().from('taxes').update(payload).eq('id', editTax.id)
      : await createClient().from('taxes').insert(payload)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(editTax ? 'Impuesto actualizado' : 'Impuesto creado', 'success')
    setShowAdd(false); setEditTax(null); setForm({ ...EMPTY_TAX }); fetchTaxes()
  }

  async function deleteTax() {
    if (!editTax) return
    const { error } = await createClient().from('taxes').delete().eq('id', editTax.id)
    if (error) { addToast(error.message, 'error'); return }
    addToast('Impuesto eliminado', 'success'); setEditTax(null); fetchTaxes()
  }

  async function toggleActive(t: any) {
    await createClient().from('taxes').update({ is_active: !t.is_active }).eq('id', t.id)
    fetchTaxes()
  }

  const activeCount    = taxes.filter(t => t.is_active).length
  const gravadosCount  = taxes.filter(t => t.is_active && t.type === 'Standard').length
  const recaudadoMTD   = taxes.reduce((s, t) => s + (t.collected_mtd ?? 0), 0)

  function TaxModal({ onClose }: { onClose: () => void }) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
        <div style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:28, width:'100%', maxWidth:480 }} onClick={e => e.stopPropagation()}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <span style={{ fontSize:16, fontWeight:700, color:'#f0ede8' }}>{editTax ? 'Editar Impuesto' : 'Nuevo Impuesto'}</span>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', padding:4, display:'flex' }}><X size={18}/></button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><FLabel>Nombre *</FLabel><FInput placeholder="IVA UAE" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
              <div><FLabel>Código *</FLabel><FInput placeholder="VAT-AE-5" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={{ fontFamily:'monospace', textTransform:'uppercase' }}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12 }}>
              <div><FLabel>Tasa %</FLabel><FInput type="number" min={0} max={100} step={0.1} placeholder="5" value={form.rate as any} onChange={e => setForm({ ...form, rate: e.target.value })}/></div>
              <div><FLabel>Aplica a</FLabel><FInput placeholder="Todos los servicios" value={form.applies_to} onChange={e => setForm({ ...form, applies_to: e.target.value })}/></div>
            </div>
            <div>
              <FLabel>Tipo</FLabel>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {TAX_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                    style={{ padding:'6px 14px', borderRadius:99, cursor:'pointer', fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif',
                      background: form.type===t?'#c9a84c':'#1a1a1e', color: form.type===t?'#0d0d0f':'#888580',
                      border: form.type===t?'1px solid #c9a84c':'1px solid rgba(255,255,255,0.1)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ width:16, height:16, accentColor:'#c9a84c' }}/>
              <span style={{ fontSize:13, color:'#f0ede8' }}>Activo</span>
            </label>
          </div>

          {/* delete confirm (edit only) */}
          {editTax && delConf && (
            <div style={{ marginTop:16, padding:12, background:'rgba(255,79,79,0.08)', border:'1px solid rgba(255,79,79,0.25)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'#ff4f4f' }}>¿Eliminar este impuesto?</span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setDelConf(false)} style={{ padding:'5px 12px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)', background:'#1a1a1e', color:'#888580', fontSize:11, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>No</button>
                <button onClick={deleteTax} style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#ff4f4f', color:'#fff', fontSize:11, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>Sí, eliminar</button>
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent: editTax ? 'space-between' : 'flex-end', alignItems:'center', marginTop:22, gap:10 }}>
            {editTax && (
              <button onClick={() => setDelConf(true)}
                style={{ padding:'9px 16px', borderRadius:8, border:'1px solid rgba(255,79,79,0.3)', background:'transparent', color:'#ff4f4f', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
                Eliminar
              </button>
            )}
            <button onClick={saveTax} disabled={saving || !form.name.trim() || !form.code.trim()}
              style={{ padding:'10px 24px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer',
                opacity: form.name.trim() && form.code.trim() ? 1 : 0.5 }}>
              {saving ? 'Guardando…' : editTax ? 'Guardar Cambios' : 'Crear Impuesto'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:700, color:'#f0ede8' }}>Gestión de Impuestos</div>
          <div style={{ fontSize:12, color:'#888580', marginTop:3 }}>Configura los impuestos aplicables a tus servicios</div>
        </div>
        <button onClick={openAdd}
          style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>
          + Nuevo Impuesto
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'IMPUESTOS ACTIVOS',  value: String(activeCount),          color:'#00d4aa' },
          { label:'SERVICIOS GRAVADOS', value: String(gravadosCount),         color:'#c9a84c' },
          { label:'RECAUDADO MTD',      value: aed(recaudadoMTD),            color:'#34d399' },
        ].map(k => (
          <div key={k.label} style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:16 }}>
            <div style={{ fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* taxes table */}
      <div style={{ background:'#141416', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {['Nombre','Código','Tasa %','Tipo','Aplica a','Estado','Acciones'].map(h => (
                <th key={h} style={{ padding:'10px 16px', fontSize:10, fontWeight:600, color:'#888580', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#888580', fontSize:13 }}>Cargando…</td></tr>
            ) : taxes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding:'60px 20px', textAlign:'center' }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#3a3836', marginBottom:14 }}>No hay impuestos configurados</div>
                  <button onClick={openAdd} style={{ padding:'9px 20px', borderRadius:8, border:'none', background:'#c9a84c', color:'#0d0d0f', fontSize:13, fontWeight:700, fontFamily:'Outfit,sans-serif', cursor:'pointer' }}>+ Nuevo Impuesto</button>
                </td>
              </tr>
            ) : taxes.map(t => (
              <tr key={t.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'background 0.1s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:'#f0ede8' }}>{t.name}</td>
                <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:12, color:'#c9a84c' }}>{t.code}</td>
                <td style={{ padding:'12px 16px', fontSize:14, fontWeight:700, color:'#f0ede8', fontVariantNumeric:'tabular-nums' }}>{t.rate}%</td>
                <td style={{ padding:'12px 16px' }}><TaxTypeBadge type={t.type}/></td>
                <td style={{ padding:'12px 16px', fontSize:12, color:'#888580' }}>{t.applies_to ?? '—'}</td>
                <td style={{ padding:'12px 16px' }}>
                  <button onClick={() => toggleActive(t)} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    <TaxStatusBadge active={t.is_active}/>
                  </button>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <IconBtn onClick={() => openEdit(t)}><Pencil size={11}/></IconBtn>
                    <IconBtn danger onClick={() => { openEdit(t); setDelConf(true) }}><X size={11}/></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* modal */}
      {(showAdd || editTax) && <TaxModal onClose={() => { setShowAdd(false); setEditTax(null); setDelConf(false) }}/>}

      {/* toasts */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', flexDirection:'column', gap:8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:600, fontFamily:'Outfit,sans-serif', color:'#fff',
            background: t.type==='success'?'rgba(34,197,94,0.95)':t.type==='warn'?'rgba(251,191,36,0.95)':'rgba(255,79,79,0.95)',
            boxShadow:'0 4px 20px rgba(0,0,0,0.4)', backdropFilter:'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
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
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('Costs & Expenses')

  return (
    <div style={{ padding: 24 }}>
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f0ede8' }}>{t('finance')}</div>
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
      {activeTab === 'Chart of Accounts' && <ChartOfAccountsTab />}
      {activeTab === 'Impuestos'          && <ImpuestosTab />}
    </div>
  )
}
