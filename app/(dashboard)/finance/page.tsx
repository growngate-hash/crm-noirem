'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Eye, Pencil, BarChart2, Droplets, Settings } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createNotification } from '@/utils/createNotification'
import { useIsMobile } from '@/hooks/useIsMobile'
import { EmptyState } from '@/components/ui/EmptyState'
import { InvoiceViewer } from '@/components/finance/InvoiceViewer'

// â”€â”€â”€ shared inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ icon button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ main tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Facturas']

// â”€â”€â”€ category pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ account type badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACC_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  'Credit Card': { bg: 'rgba(201,168,76,0.12)',  color: '#c9a84c', icon: 'CC' },
  'Bank':        { bg: 'rgba(79,163,255,0.12)',  color: '#4fa3ff', icon: 'BK' },
  'Cash':        { bg: 'rgba(52,211,153,0.12)',  color: '#34d399', icon: 'CA' },
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

// â”€â”€â”€ COSTS & EXPENSES TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EXP_FILTERS = ['All', 'Fixed', 'Variable', 'Operational']
const EMPTY_EXP = { description: '', category: 'Fixed', subcat: '', amount: '', recurring: false, account_id: '' }

function CostsTab({ invoicesOnly = false }: { invoicesOnly?: boolean }) {
  const { t, lang } = useLanguage()
  const isMobile = useIsMobile()
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
  const [expenseAccounts,   setExpenseAccounts]   = useState<any[]>([])
  const [dropdownAbierto,   setDropdownAbierto]   = useState(false)
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<any>(null)
  const [busqueda,           setBusqueda]           = useState('')
  const [invoices,           setInvoices]           = useState<any[]>([])
  const [invoiceFilter,      setInvoiceFilter]      = useState('all')
  const [showPaymentModal,   setShowPaymentModal]   = useState(false)
  const [selectedInvoice,    setSelectedInvoice]    = useState<any>(null)
  const [transactionId,      setTransactionId]      = useState('')
  const [paymentError,       setPaymentError]       = useState('')
  const [viewingInvoice,     setViewingInvoice]     = useState<any>(null)
  const [voidingInvoice,     setVoidingInvoice]     = useState<any>(null)
  const [voidReason,         setVoidReason]         = useState('')
  const [voiding,            setVoiding]            = useState(false)
  const [receiptFile,        setReceiptFile]        = useState<File | null>(null)
  const [receiptPreview,     setReceiptPreview]     = useState<string | null>(null)
  const [uploadingReceipt,   setUploadingReceipt]   = useState(false)
  const [bankAccounts,       setBankAccounts]       = useState<any[]>([])
  const [selectedBankAccount, setSelectedBankAccount] = useState('')

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { addToast('El archivo no debe superar 5MB', 'error'); return }
    setReceiptFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setReceiptPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview(null)
    }
  }

  async function uploadReceipt(): Promise<string | null> {
    if (!receiptFile) return null
    setUploadingReceipt(true)
    const supabase = createClient()
    const fileName = `${Date.now()}-${receiptFile.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage
      .from('expense-receipts')
      .upload(fileName, receiptFile, { cacheControl: '3600', upsert: false })
    setUploadingReceipt(false)
    if (error) { addToast('Error al subir el archivo', 'error'); return null }
    const { data: { publicUrl } } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(fileName)
    return publicUrl
  }

  function resetReceiptState() {
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  async function handleMarkAsPaid(inv: any) {
    const { data: banks } = await createClient()
      .from('bank_accounts')
      .select('*')
      .order('name')
    setBankAccounts(banks ?? [])
    setSelectedBankAccount('')
    setSelectedInvoice(inv)
    setTransactionId('')
    setPaymentError('')
    setShowPaymentModal(true)
  }

  async function confirmPayment() {
    if (!transactionId.trim()) { setPaymentError('Debes ingresar el ID de la transacciÃ³n'); return }
    if (!selectedBankAccount) { setPaymentError('Debes seleccionar una cuenta bancaria'); return }
    const supabase = createClient()
    const { error } = await supabase.from('invoices').update({
      status: 'pagada',
      transaction_id: transactionId.trim(),
      paid_at: new Date().toISOString(),
      bank_account_id: selectedBankAccount,
    }).eq('id', selectedInvoice.id)
    if (error) { setPaymentError('Error al actualizar la factura'); return }
    const bank = bankAccounts.find(b => b.id === selectedBankAccount)
    if (bank) {
      const newBal = (parseFloat(bank.current_balance ?? bank.balance ?? 0)) + parseFloat(selectedInvoice.total || 0)
      await supabase.from('bank_accounts').update({
        current_balance: newBal,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedBankAccount)
    }
    addToast('Pago registrado correctamente', 'success')
    setShowPaymentModal(false)
    fetchInvoices()
    fetchFinanceKPIs()
  }

  async function handleVoidInvoice() {
    if (!voidReason.trim()) { addToast('Debes ingresar el motivo de anulaciÃ³n', 'error'); return }
    setVoiding(true)
    const { error } = await createClient().from('invoices').update({
      status: 'anulada',
      void_reason: voidReason.trim(),
      voided_at: new Date().toISOString(),
    }).eq('id', voidingInvoice.id)
    setVoiding(false)
    if (error) { addToast('Error al anular factura', 'error'); return }
    addToast('Factura anulada correctamente', 'success')
    setVoidingInvoice(null)
    setVoidReason('')
    fetchInvoices()
    fetchFinanceKPIs()
  }

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await createClient()
      .from('expenses')
      .select('*, account:account_id(code, name)')
      .order('date', { ascending: false })
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

    const [{ data: invoicesPagadas }, { data: gastos }] = await Promise.all([
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'pagada')
        .gte('paid_at', inicioMesUTC)
        .lte('paid_at', finMesUTC),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('date', inicioMesStr)
        .lte('date', finMesStr),
    ])

    const totalRevenue = (invoicesPagadas ?? []).reduce(
      (sum, inv) => sum + Number(inv.total ?? 0), 0
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

  async function fetchInvoices() {
    const { data } = await createClient()
      .from('invoices')
      .select('id, invoice_no, subtotal, discount, tax, total, status, issued_at, due_at, paid_at, transaction_id, void_reason, voided_at, contact_id, contacts(name, email, phone)')
      .order('created_at', { ascending: false })
      .limit(20)
    setInvoices(data ?? [])
  }

  useEffect(() => {
    fetchExpenses()
    fetchFinanceKPIs()
    fetchCuentasContables()
    fetchInvoices()
    createClient()
      .from('chart_of_accounts')
      .select('id, code, name, type')
      .eq('is_active', true)
      .order('code')
      .then(({ data }) => setExpenseAccounts(data ?? []))
  }, [])

  async function saveExpense() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const receiptUrl = await uploadReceipt()
    const selectedAccount = cuentasContables.find(c => c.id === form.subcat)
    const payload: any = {
      description: form.description,
      category: form.category,
      subcat: selectedAccount?.name ?? (form.subcat || null),
      amount: Number(form.amount),
      recurring: form.recurring,
      date: new Date().toISOString().split('T')[0],
      receipt_url: receiptUrl,
      account_id: form.account_id || (selectedAccount ? form.subcat : null) || null,
    }
    const { error } = await createClient().from('expenses').insert(payload)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('expenseAdded'), 'success')
    createNotification({
      type: 'payment',
      title: 'Gasto registrado',
      message: `${form.description || form.category}${form.amount ? ` Â· AED ${form.amount}` : ''}`,
    })
    setShowAdd(false); setForm({ ...EMPTY_EXP })
    resetReceiptState()
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
      {/* â”€â”€ SECCIÃ“N GASTOS (oculta en tab Facturas) â”€â”€ */}
      {!invoicesOnly && <>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 10, marginBottom: 10 }}>
        {[
          { dot: '#00d4aa', label: t('totalRevenueMTD'),  value: aed(totalRevenue),   color: '#00d4aa' },
          { dot: '#ff4f4f', label: t('totalExpensesMTD'), value: aed(totalExpenses),  color: '#ff4f4f' },
          { dot: '#c9a84c', label: t('netProfitMTD'),     value: aed(netProfit),      color: '#c9a84c' },
          { dot: '#00d4aa', label: t('profitMargin'),      value: `${profitMargin}%`,  color: '#00d4aa' },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: isMobile ? 12 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#888580' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 22 }}>
        {[
          { icon: <BarChart2 size={14} color="#4fa3ff" />, iconBg: 'rgba(79,163,255,0.15)',   label: t('fixedCosts'),    sub: `${fixedCosts.pct}% of expenses`,    value: aed(fixedCosts.amount),    bar: '#4fa3ff', pct: fixedCosts.pct    },
          { icon: <Droplets  size={14} color="#c9a84c" />, iconBg: 'rgba(201,168,76,0.15)',  label: t('variableCosts'), sub: `${variableCosts.pct}% of expenses`,  value: aed(variableCosts.amount), bar: '#c9a84c', pct: variableCosts.pct },
          { icon: <Settings  size={14} color="#888580" />, iconBg: 'rgba(136,133,128,0.12)', label: t('operational'),   sub: `${operational.pct}% of expenses`,    value: aed(operational.amount),   bar: '#888580', pct: operational.pct   },
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
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>{t('expenseRegister')}</span>
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
              + {t('addExpense')}
            </button>
          </div>
        </div>

        {/* table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>{t('loading')}</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '0 16px' }}>
            <EmptyState
              icon="ðŸ’¸"
              title="Sin gastos registrados"
              subtitle="Registra los gastos del negocio para controlar tu rentabilidad"
              actionLabel="+ AGREGAR GASTO"
              onAction={() => setShowAdd(true)}
            />
          </div>
        ) : isMobile ? (
          /* â”€â”€ Mobile: expense cards â”€â”€ */
          <div style={{ padding: '12px 12px 16px' }}>
            {displayed.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#888580', fontSize: 13 }}>{t('noExpensesInCat')}</div>
            ) : displayed.map((e: any) => (
              <div key={e.id} style={{ background: '#1a1a1f', border: '1px solid #2a2a30', borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f0ede8', fontWeight: 600, fontSize: 14, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <CatPill cat={e.category ?? 'Operational'} />
                    {e.subcat && <span style={{ color: '#888580', fontSize: 11 }}>{e.subcat}</span>}
                    {e.recurring && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 6px' }}>REC</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#ff4f4f', fontWeight: 700, fontSize: 15 }}>{aed(e.amount ?? 0)}</div>
                  <div style={{ color: '#888580', fontSize: 11, marginTop: 3 }}>
                    {e.date ? new Date(e.date).toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'â€”'}
                  </div>
                  {e.receipt_url && (
                    <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                      title="Ver comprobante" style={{ color: '#c9a84c', fontSize: 16, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                      VER SOPORTE
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: '#888580' }}>Total:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f' }}>{aed(total)}</span>
            </div>
          </div>
        ) : (
          /* â”€â”€ Desktop: expense table â”€â”€ */
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Date', 'Description', 'Category', 'Cuenta Contable', 'AED', 'Recur.', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#888580', fontSize: 13 }}>{t('noExpensesInCat')}</td></tr>
                  ) : displayed.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#888580', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {e.date ? new Date(e.date).toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'â€”'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#f0ede8', fontWeight: 500 }}>{e.description}</td>
                      <td style={{ padding: '12px 16px' }}><CatPill cat={e.category ?? 'Operational'} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#888580' }}>
                        {e.account?.code
                          ? <><span style={{ color: '#c9a84c', fontFamily: 'monospace', marginRight: 4 }}>{e.account.code}</span>{e.account.name}</>
                          : e.subcat ?? 'â€”'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#f0ede8', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {aed(e.amount ?? 0)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {e.recurring
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 8px' }}>YES</span>
                          : <span style={{ fontSize: 10, color: '#888580' }}>â€”</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {e.receipt_url && (
                          <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                            title="Ver comprobante"
                            style={{ color: '#c9a84c', fontSize: 17, textDecoration: 'none', lineHeight: 1 }}>
                            VER SOPORTE
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 12, color: '#888580' }}>{displayed.length} row{displayed.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, color: '#888580' }}>Total:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f', fontVariantNumeric: 'tabular-nums' }}>{aed(total)}</span>
            </div>
          </>
        )}
      </div>

      </>}

      {/* SECCIÃ“N FACTURAS */}
      <div style={{ background: '#141416', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: 16, marginTop: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f0ede8' }}>
              {lang === 'es' ? 'Facturas Generadas' : 'Generated Invoices'}
            </span>
            <span style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              {invoices.length}
            </span>
          </div>
          <button onClick={fetchInvoices} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#888580', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
            {lang === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {/* Tabla / vacÃ­o */}
        {invoices.length === 0 ? (
          <EmptyState
            icon="ðŸ§¾"
            title="Sin facturas generadas"
            subtitle="Las facturas se generan automÃ¡ticamente al completar una reserva"
          />
        ) : isMobile ? (
          /* â”€â”€ Mobile: invoice cards â”€â”€ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invoices
              .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
              .map((inv: any) => {
                const sc = inv.status === 'pagada'     ? { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: '#22c55e55', label: 'Pagada'     }
                         : inv.status === 'por_cobrar' ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: '#f59e0b55', label: 'Por Cobrar' }
                         : inv.status === 'anulada'    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: '#ef444455', label: 'Anulada'    }
                         :                               { color: '#888580', bg: 'rgba(136,133,128,0.1)', border: '#88858055', label: inv.status   }
                return (
                  <div key={inv.id} style={{ background: '#1a1a1f', border: `1px solid ${inv.status === 'anulada' ? 'rgba(239,68,68,0.2)' : '#2a2a30'}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', color: '#c9a84c', fontWeight: 700, fontSize: 13 }}>{inv.invoice_no}</div>
                        <div style={{ color: '#888580', fontSize: 12, marginTop: 2 }}>{(inv as any).contacts?.name ?? 'â€”'}</div>
                      </div>
                      <span style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {sc.label}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'SUBTOTAL', value: `AED ${Number(inv.subtotal ?? 0).toFixed(2)}` },
                        { label: 'VAT',      value: `AED ${Number(inv.tax ?? 0).toFixed(2)}` },
                        { label: 'TOTAL',    value: `AED ${Number(inv.total ?? 0).toFixed(2)}` },
                      ].map(f => (
                        <div key={f.label} style={{ textAlign: 'center' }}>
                          <div style={{ color: '#888580', fontSize: 9, fontWeight: 700, letterSpacing: '1px', marginBottom: 3 }}>{f.label}</div>
                          <div style={{ color: f.label === 'TOTAL' ? (inv.status === 'anulada' ? '#ef4444' : '#00d4aa') : '#f0ede8', fontWeight: f.label === 'TOTAL' ? 800 : 600, fontSize: f.label === 'TOTAL' ? 14 : 12 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    {inv.status === 'por_cobrar' && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <button onClick={() => handleMarkAsPaid(inv)}
                          style={{ flex: 1, padding: '9px 0', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                          MARCAR PAGADA
                        </button>
                        <button onClick={() => { setVoidingInvoice(inv); setVoidReason('') }}
                          style={{ padding: '9px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                          ANULAR
                        </button>
                      </div>
                    )}
                    {inv.status === 'pagada' && inv.transaction_id && (
                      <div style={{ textAlign: 'center', fontSize: 11, color: '#888580', padding: '4px 0 8px' }}>
                        Ref: {inv.transaction_id}
                      </div>
                    )}
                    {inv.status === 'anulada' && inv.void_reason && (
                      <div style={{ fontSize: 11, color: '#ef444480', padding: '4px 0 8px', fontStyle: 'italic' }}>
                        Motivo: {inv.void_reason}
                      </div>
                    )}
                    <button onClick={() => setViewingInvoice(inv)}
                      style={{ width: '100%', padding: '8px 0', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                      VER FACTURA
                    </button>
                  </div>
                )
              })}
          </div>
        ) : (
          /* â”€â”€ Desktop: invoice table â”€â”€ */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  {['FACTURA #','CLIENTE','SUBTOTAL','VAT','TOTAL','ESTADO','ACCIONES'].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 500, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
                  .map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 0', fontFamily: 'monospace', fontSize: 12, color: '#c9a84c', fontWeight: 600 }}>{inv.invoice_no}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#f0ede8' }}>{(inv as any).contacts?.name ?? 'â€”'}</td>
                    <td style={{ padding: '12px 8px', fontSize: 12, color: '#888580' }}>AED {Number(inv.subtotal ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', fontSize: 12, color: '#888580' }}>AED {Number(inv.tax ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, fontWeight: 700, color: '#00d4aa' }}>AED {Number(inv.total ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {(() => {
                        const sc = inv.status === 'pagada'     ? { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Pagada'     }
                                 : inv.status === 'por_cobrar' ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Por Cobrar' }
                                 : inv.status === 'anulada'    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Anulada'    }
                                 :                               { color: '#888580', bg: 'rgba(136,133,128,0.1)', label: inv.status   }
                        return (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => setViewingInvoice(inv)}
                          style={{ padding: '4px 10px', background: '#2a2a30', border: '1px solid #3a3a40', color: '#f0ede8', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                          VER
                        </button>
                        {inv.status === 'por_cobrar' && (
                          <button onClick={() => handleMarkAsPaid(inv)}
                            style={{ padding: '4px 10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                            MARCAR PAGADA
                          </button>
                        )}
                        {inv.status === 'por_cobrar' && (
                          <button onClick={() => { setVoidingInvoice(inv); setVoidReason('') }}
                            style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                            ANULAR
                          </button>
                        )}
                        {inv.status === 'pagada' && inv.transaction_id && (
                          <span style={{ fontSize: 10, color: '#888580' }}>#{inv.transaction_id}</span>
                        )}
                        {inv.status === 'anulada' && inv.void_reason && (
                          <span style={{ fontSize: 10, color: '#ef444480', fontStyle: 'italic' }} title={inv.void_reason}>Anulada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ padding: '12px 0', fontSize: 12, color: '#888580', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {invoices.length} {lang === 'es' ? 'facturas' : 'invoices'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: 800, color: '#00d4aa', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    AED {invoices.filter(inv => inv.status !== 'anulada').reduce((sum, inv) => sum + Number(inv.total ?? 0), 0).toFixed(2)}
                  </td>
                  <td colSpan={2} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); resetReceiptState(); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#f0ede8' }}>{t('addExpense')}</span>
              <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); resetReceiptState(); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', padding: 4, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><FLabel>Description *</FLabel><FInput placeholder="e.g. Office Rent â€” June" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

              {/* Cuenta contable */}
              <div>
                <FLabel>CUENTA CONTABLE</FLabel>
                <select
                  value={form.account_id}
                  onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: form.account_id ? '#f0ede8' : '#3a3836', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
                >
                  <option value="">Seleccionar cuenta contable</option>
                    {expenseAccounts.filter(a => a.type === 'expense').length > 0 && (
                      <optgroup label="GASTOS">
                        {expenseAccounts.filter(a => a.type === 'expense').map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {expenseAccounts.filter(a => a.type === 'asset').length > 0 && (
                      <optgroup label="ACTIVOS">
                        {expenseAccounts.filter(a => a.type === 'asset').map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {expenseAccounts.filter(a => !['expense', 'asset'].includes(a.type)).length > 0 && (
                      <optgroup label="OTROS">
                        {expenseAccounts.filter(a => !['expense', 'asset'].includes(a.type)).map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </optgroup>
                    )}
                </select>
              </div>

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

              {/* Sub-CategorÃ­a â€” custom dropdown */}
              <div>
                <FLabel>Sub-CategorÃ­a</FLabel>
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
                        : 'Seleccionar cuentaâ€¦'}
                    </span>
                    <span style={{ color: '#888580', fontSize: 10, flexShrink: 0, marginLeft: 8,
                      display: 'inline-block', transition: 'transform 0.2s',
                      transform: dropdownAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>â–¾</span>
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
                          placeholder="ðŸ” Buscar cuentaâ€¦"
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
                            const grupoLabel = tipo === 'Costo de Ventas' ? 'Costos de Ventas'
                              : tipo === 'Costo Produccion' ? 'Costos de ProducciÃ³n'
                              : 'Gastos'
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
                                      <span style={{ color: '#3a3836', fontSize: 10 }}>â€”</span>
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

              {/* Soporte / Comprobante */}
              <div>
                <FLabel>Soporte / Comprobante <span style={{ color: '#3a3836', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></FLabel>
                <label htmlFor="receipt-upload" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: receiptFile ? 12 : 20,
                  border: `2px dashed ${receiptFile ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: receiptFile ? 'rgba(201,168,76,0.06)' : 'transparent',
                  transition: 'all 0.2s', gap: 8,
                }}>
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="preview" style={{ maxHeight: 110, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
                  ) : receiptFile ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>[doc]</div>
                      <div style={{ color: '#c9a84c', fontSize: 12, fontWeight: 600 }}>{receiptFile.name}</div>
                      <div style={{ color: '#888580', fontSize: 11 }}>{(receiptFile.size / 1024).toFixed(0)} KB</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>[+]</div>
                      <div style={{ color: '#888580', fontSize: 12 }}>Toca para adjuntar factura o recibo</div>
                      <div style={{ color: '#3a3836', fontSize: 11, marginTop: 2 }}>JPG, PNG o PDF Â· MÃ¡x 5MB</div>
                    </div>
                  )}
                </label>
                <input id="receipt-upload" type="file" accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleReceiptChange} style={{ display: 'none' }} />
                {receiptFile && (
                  <button type="button" onClick={() => resetReceiptState()}
                    style={{ marginTop: 6, background: 'transparent', border: 'none', color: '#ff4f4f', fontSize: 12, cursor: 'pointer', padding: '2px 0', fontFamily: 'Outfit,sans-serif' }}>
                    Quitar archivo
                  </button>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#c9a84c' }} />
                <span style={{ fontSize: 13, color: '#f0ede8' }}>{t('recurringMonthly')}</span>
              </label>
            </div>
            <button onClick={saveExpense} disabled={saving || uploadingReceipt || !form.description.trim() || !form.amount}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', marginTop: 22, background: '#c9a84c', color: '#0d0d0f', fontSize: 14, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: (form.description.trim() && form.amount && !saving && !uploadingReceipt) ? 1 : 0.5 }}>
              {uploadingReceipt ? 'Subiendo archivo...' : saving ? t('saving') : t('saveExpenseBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Modal anular factura */}
      {voidingInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => { setVoidingInvoice(null); setVoidReason('') }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#141416', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            
            <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Anular Factura</div>
            <div style={{ color: '#888580', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
              {voidingInvoice.invoice_no} Â· AED {Number(voidingInvoice.total ?? 0).toFixed(2)}
            </div>
            <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>Esta acciÃ³n no se puede deshacer</div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888580', marginBottom: 6 }}>
                MOTIVO DE ANULACIÃ“N *
              </label>
              <textarea autoFocus value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3}
                placeholder="ej. Error en el monto, servicio cancelado, duplicado..."
                style={{ width: '100%', padding: '12px 16px', background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setVoidingInvoice(null); setVoidReason('') }}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888580', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                CANCELAR
              </button>
              <button onClick={handleVoidInvoice} disabled={voiding || !voidReason.trim()}
                style={{ flex: 1, padding: 13, background: '#ef4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: voiding || !voidReason.trim() ? 0.6 : 1, fontFamily: 'Outfit,sans-serif' }}>
                {voiding ? 'ANULANDO...' : 'ANULAR FACTURA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar pago */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowPaymentModal(false)}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}
            onClick={e => e.stopPropagation()}>
            
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f0ede8', textAlign: 'center', marginBottom: 6 }}>
              {lang === 'es' ? 'Confirmar Pago' : 'Confirm Payment'}
            </div>
            <div style={{ fontSize: 12, color: '#888580', textAlign: 'center', marginBottom: 24 }}>
              {selectedInvoice?.invoice_no} Â· AED {Number(selectedInvoice?.total ?? 0).toFixed(2)}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888580', marginBottom: 6 }}>
                ID DE TRANSACCIÃ“N *
              </label>
              <input autoFocus type="text" value={transactionId}
                onChange={e => { setTransactionId(e.target.value); setPaymentError('') }}
                onKeyDown={e => e.key === 'Enter' && confirmPayment()}
                placeholder="ej. TXN-123456 / REF-789"
                style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1e', border: `1px solid ${paymentError ? '#ff4f4f' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f0ede8', outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
              {paymentError && <div style={{ fontSize: 11, color: '#ff4f4f', marginTop: 5 }}>{paymentError}</div>}
              <div style={{ fontSize: 11, color: '#3a3836', marginTop: 6 }}>Este ID quedarÃ¡ registrado como comprobante del pago</div>
            </div>
            {/* Selector cuenta bancaria */}
            {bankAccounts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888580', marginBottom: 10 }}>INGRESO A *</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bankAccounts.map(account => {
                    const sel = selectedBankAccount === account.id
                    const icon = getBankIcon(account.account_type, account.name)
                    const color = getBankColor(account.account_type)
                    const bal = parseFloat(account.current_balance ?? account.balance ?? 0)
                    return (
                      <div key={account.id} onClick={() => { setSelectedBankAccount(account.id); setPaymentError('') }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px',
                          background: sel ? color + '15' : '#0d0d0f',
                          border: `2px solid ${sel ? color : '#2a2a30'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ padding: '6px 10px', borderRadius: 6,
                            background: color + '20',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: color }}>
                            {icon}
                          </div>
                          <div>
                            <div style={{ color: '#f0ede8', fontSize: 13, fontWeight: 700 }}>{account.name}</div>
                            <div style={{ color: '#666', fontSize: 11 }}>Saldo: AED {bal.toFixed(2)}</div>
                          </div>
                        </div>
                        {sel && <span style={{ color: color, fontSize: 16, fontWeight: 800 }}>+</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPaymentModal(false)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888580', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={confirmPayment}
                style={{ flex: 1, padding: 13, background: '#22c55e', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                {lang === 'es' ? 'Confirmar Pago' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice PDF Viewer */}
      {viewingInvoice && <InvoiceViewer invoice={viewingInvoice} onClose={() => setViewingInvoice(null)} />}

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

// â”€â”€â”€ BANKS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SEED_ACCOUNTS = [
  { name: 'Tarjeta de crÃ©dito empresarial', account_type: 'Credit Card', account_number: null, balance: 0 },
  { name: 'Banco 1',                         account_type: 'Bank',        account_number: null, balance: 0 },
  { name: 'Caja general',                    account_type: 'Cash',        account_number: null, balance: 0 },
  { name: 'Caja chica',                      account_type: 'Cash',        account_number: null, balance: 0 },
]
const EMPTY_ACC = { name: '', account_type: 'Bank', account_number: '', balance: '', notes: '' }

function getBankIcon(accountType: string, name: string): string {
  const t = (accountType || '').toLowerCase()
  const n = (name || '').toLowerCase()
  if (t === 'cash' || n.includes('caja') || n.includes('efectivo')) return 'EFECTIVO'
  if (t === 'credit card' || t === 'credit_card' || n.includes('tarjeta')) return 'TARJETA'
  if (t === 'transfer' || n.includes('transferencia') || n.includes('iban')) return 'TRANSFER'
  return 'BANCO'
}
function getBankColor(accountType: string): string {
  const t = (accountType || '').toLowerCase()
  if (t === 'cash') return '#22c55e'
  if (t === 'credit card' || t === 'credit_card') return '#ef4444'
  if (t === 'transfer') return '#3b82f6'
  return '#c9a84c'
}
function BanksTab() {
  const { t } = useLanguage()
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
    const { data: existing } = await sb.from('bank_accounts').select('*').eq('is_active', true).order('name')
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
      balance: Number(form.balance) || 0, current_balance: Number(form.balance) || 0, notes: form.notes || null,
    })
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('accountAdded'), 'success'); setShowAdd(false); fetchAccounts()
  }

  async function saveEdit() {
    if (!editAcc || !form.name.trim()) return
    setSaving(true)
    const { error } = await createClient().from('bank_accounts').update({
      name: form.name, account_type: form.account_type, account_number: form.account_number || null,
      balance: Number(form.balance) || 0, current_balance: Number(form.balance) || 0, notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editAcc.id)
    setSaving(false)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('accountUpdated'), 'success'); setEditAcc(null); fetchAccounts()
  }

  async function deleteAcc() {
    if (!editAcc) return
    const { error } = await createClient().from('bank_accounts').delete().eq('id', editAcc.id)
    if (error) { addToast(error.message, 'error'); return }
    addToast(t('accountDeleted'), 'success'); setEditAcc(null); fetchAccounts()
  }

  const bankBal  = accounts.filter(a => a.account_type === 'Bank').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)
  const cashBal  = accounts.filter(a => a.account_type === 'Cash').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)
  const ccBal    = accounts.filter(a => a.account_type === 'Credit Card').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)

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
            <div><FLabel>{t('name')} *</FLabel><FInput placeholder="e.g. Emirates NBD Cuenta Principal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <FLabel>{t('accountType')} *</FLabel>
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
            <div><FLabel>{t('accountNumber')}</FLabel><FInput placeholder="XXXX XXXX XXXX XXXX" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} style={{ fontFamily: 'monospace' }} /></div>
            <div><FLabel>{t('balance')} (AED)</FLabel><FInput type="number" placeholder="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            <div><FLabel>{t('notes')}</FLabel><FTextarea placeholder="Observaciones opcionalesâ€¦" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          {/* delete confirm (edit only) */}
          {editAcc && delConfirm && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#ff4f4f' }}>{t('confirmRemove')}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDelConfirm(false)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#1a1a1e', color: '#888580', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>{t('no')}</button>
                <button onClick={deleteAcc} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#ff4f4f', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>{t('yes')}, {t('delete')}</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: editAcc ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: 22, gap: 10 }}>
            {editAcc && (
              <button onClick={() => setDelConfirm(true)}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid rgba(255,79,79,0.3)', background: 'transparent', color: '#ff4f4f', fontSize: 12, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
                {t('delete')}
              </button>
            )}
            <button onClick={onSave} disabled={saving || !form.name.trim()}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.5 }}>
              {saving ? 'Guardandoâ€¦' : saveLabel}
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
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8' }}>{t('accounts')}</div>
          <div style={{ fontSize: 12, color: '#888580', marginTop: 3 }}>{t('bankSubtitle')}</div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#c9a84c', color: '#0d0d0f', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
          + {t('addAccount')}
        </button>
      </div>

      {/* accounts table */}
      <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>{t('loading')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[t('name'), t('accountType'), t('accountNumber'), t('balance'), t('reconciliation'), t('actions')].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#888580', fontSize: 13 }}>{t('noAccountsFound')}</td></tr>
              ) : accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  {/* name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#c9a84c', flexShrink: 0 }}>âŠ™</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8', cursor: 'pointer' }}>{acc.name}</span>
                    </div>
                  </td>
                  {/* type */}
                  <td style={{ padding: '12px 16px' }}><AccTypeBadge type={acc.account_type} /></td>
                  {/* account number */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#888580', fontFamily: 'monospace' }}>
                    {acc.account_number ?? 'â€”'}
                  </td>
                  {/* balance */}
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: balColor(parseFloat(acc.current_balance ?? acc.balance ?? 0)) }}>
                    {aed(parseFloat(acc.current_balance ?? acc.balance ?? 0))}
                  </td>
                  {/* reconciliation */}
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', background: '#1a1a1e', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c' }}>
                      {t('reconcile')}
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
          { label: t('bankBalance'),  value: bankBal },
          { label: t('cashOnHand'),   value: cashBal },
          { label: t('creditCards'),  value: ccBal   },
        ].map(k => (
          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#34d399' }}>{aed(k.value)}</div>
          </div>
        ))}
      </div>

      {/* modals */}
      {showAdd && (
        <AccModal title={t('addAccount')} onClose={() => setShowAdd(false)} onSave={saveAdd} saveLabel={t('addAccount')} />
      )}
      {editAcc && (
        <AccModal title={`${t('edit')} ${t('accounts')}`} onClose={() => { setEditAcc(null); setDelConfirm(false) }} onSave={saveEdit} saveLabel={t('saveChanges')} />
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

// â”€â”€â”€ PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function FinancePage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('Costs & Expenses')
  const TAB_LABELS: Record<string, string> = {
    'Costs & Expenses': t('costsExpenses'),
    'Banks':            t('banks'),
    'Facturas':         'Facturas',
  }

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
      <div className="tabs-scroll" style={{ marginBottom: 22 }}>
        {MAIN_TABS.map(tab => {
          const active = activeTab === tab
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                fontWeight: active ? 700 : 500,
                background: active ? '#c9a84c' : '#1a1a1e',
                color:      active ? '#0d0d0f' : '#888580',
                border:     active ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      {/* content */}
      {activeTab === 'Costs & Expenses' && <CostsTab />}
      {activeTab === 'Banks'            && <BanksTab />}
      {activeTab === 'Facturas'         && <CostsTab invoicesOnly />}
    </div>
  )
}
