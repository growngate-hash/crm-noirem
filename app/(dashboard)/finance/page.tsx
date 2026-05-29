'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTimezone } from '@/hooks/useTimezone'
import { X, Eye, Pencil, BarChart2, Droplets, Settings } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createNotification } from '@/utils/createNotification'
import { getMonthlyExpenses } from '@/utils/getMonthlyExpenses'
import { useIsMobile } from '@/hooks/useIsMobile'
import { EmptyState } from '@/components/ui/EmptyState'
import { InvoiceViewer } from '@/components/finance/InvoiceViewer'

// â”€â”€â”€ shared inputs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const INP: React.CSSProperties = {
  width: '100%', background: '#FFFFFF', borderRadius: 8, padding: '10px 12px',
  color: '#0B2A4A', fontSize: 13, fontFamily: 'Outfit,sans-serif', outline: 'none', boxSizing: 'border-box',
}
function FInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false)
  return <input {...props}
    onFocus={e => { setFoc(true); props.onFocus?.(e) }}
    onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1.5px solid ${foc ? '#3DD9D6' : '#F0EFEA'}`, ...props.style }} />
}
function FTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc, setFoc] = useState(false)
  return <textarea {...props}
    onFocus={e => { setFoc(true); props.onFocus?.(e) }}
    onBlur={e => { setFoc(false); props.onBlur?.(e) }}
    style={{ ...INP, border: `1.5px solid ${foc ? '#3DD9D6' : '#F0EFEA'}`, resize: 'vertical', minHeight: 72, ...props.style as any }} />
}
function FLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A5852', marginBottom: 6 }}>{children}</label>
}

type Toast = { id: number; msg: string; type: 'success' | 'error' | 'warn' }
let _toastId = 0

// â”€â”€â”€ icon button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function IconBtn({ onClick, danger = false, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 26, height: 26, borderRadius: '50%', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
        border: `1px solid ${hov ? (danger ? '#D9533D' : '#F5B544') : '#F0EFEA'}`,
        color: hov ? (danger ? '#D9533D' : '#F5B544') : '#5A5852' }}>
      {children}
    </button>
  )
}

// â”€â”€â”€ main tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Facturas', 'Compras']

// â”€â”€â”€ category pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CAT_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  Fixed:       { bg: 'rgba(79,163,255,0.1)',    border: 'rgba(79,163,255,0.3)',    color: '#3DD9D6' },
  Variable:    { bg: '#E6F0FA',                  border: '#CBD8E8',                color: '#0B2A4A' },
  Operational: { bg: 'rgba(136,133,128,0.12)',  border: 'rgba(136,133,128,0.3)',  color: '#5A5852' },
}
function CatPill({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? CAT_STYLE['Operational']
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{cat}</span>
}

const aed = (v: number) => `AED ${(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// â”€â”€â”€ account type badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACC_STYLE: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  'Credit Card': { bg: '#E6F0FA', border: '#CBD8E8', color: '#0B2A4A', icon: 'CC' },
  'Bank':        { bg: '#E6F0FA', border: '#CBD8E8', color: '#0B2A4A', icon: 'BK' },
  'Cash':        { bg: '#E6F0FA', border: '#CBD8E8', color: '#0B2A4A', icon: 'CA' },
}
function AccTypeBadge({ type }: { type: string }) {
  const s = ACC_STYLE[type] ?? ACC_STYLE['Cash']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
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
  const tz = useTimezone()
  const [expenses,         setExpenses]         = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [expFilter,        setExpFilter]        = useState('All')
  const [showAdd,          setShowAdd]          = useState(false)
  const [form,             setForm]             = useState({ ...EMPTY_EXP })
  const [saving,           setSaving]           = useState(false)
  const [toasts,           setToasts]           = useState<Toast[]>([])
  const [financeKPIs,      setFinanceKPIs]      = useState({
    totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: '0.0', vatMTD: 0, vatPagadoMTD: 0, vatNetoMTD: 0,
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
  const [payrollPeriods, setPayrollPeriods] = useState<{
    id: string
    name: string
    start_date: string
    end_date: string
    total_amount: number
    paid_at: string
  }[]>([])

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
    if (!transactionId.trim()) {
      setPaymentError('Debes ingresar el ID de la transacción')
      return
    }
    if (!selectedBankAccount) {
      setPaymentError('Debes seleccionar dónde ingresó el dinero')
      return
    }
    const supabase = createClient()
    const { data: invData, error } = await supabase
      .from('invoices')
      .update({
        status: 'pagada',
        transaction_id: transactionId.trim(),
        paid_at: new Date().toISOString(),
        bank_account_id: selectedBankAccount,
      })
      .eq('id', selectedInvoice.id)
      .select()
    if (error) {
      setPaymentError('Error: ' + error.message)
      return
    }
    const bank = bankAccounts.find(b => b.id === selectedBankAccount)
    if (bank) {
      const currentBalance = parseFloat(bank.current_balance ?? bank.balance ?? 0)
      const invoiceTotal   = parseFloat(selectedInvoice.total || 0)
      const { error: bankError } = await supabase
        .from('bank_accounts')
        .update({
          current_balance: currentBalance + invoiceTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBankAccount)
    }
    addToast('Pago registrado correctamente', 'success')
    setShowPaymentModal(false)
    fetchInvoices()
    fetchFinanceKPIs()
  }

  async function handleVoidInvoice() {
    if (!voidReason.trim()) { addToast('Debes ingresar el motivo de anulación', 'error'); return }
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
    // Month boundaries anchored to the Dubai calendar (UTC+4)
    const ahoraLocal = tz.getToday()
    const y  = ahoraLocal.getFullYear()
    const m  = ahoraLocal.getMonth()
    const mm = String(m + 1).padStart(2, '0')
    const lastDayMes = new Date(y, m + 1, 0).getDate()
    const { start: inicioMesUTC } = tz.dayRange(new Date(y, m, 1))
    const { end:   finMesUTC }    = tz.dayRange(new Date(y, m, lastDayMes))
    const inicioMesStr = `${y}-${mm}-01`
    const finMesStr    = `${y}-${mm}-${String(lastDayMes).padStart(2, '0')}`

    const [{ data: invoicesPagadas }, { data: gastos }, { data: todasLasCompras }] = await Promise.all([
      supabase
        .from('invoices')
        .select('subtotal, tax, total')
        .eq('status', 'pagada')
        .gte('paid_at', inicioMesUTC)
        .lte('paid_at', finMesUTC),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('date', inicioMesStr)
        .lte('date', finMesStr),
      supabase
        .from('purchase_invoices')
        .select('subtotal, tax, status, created_at, payment_date')
        .neq('status', 'anulada'),
    ])

    const totalRevenue = (invoicesPagadas ?? []).reduce(
      (sum, inv) => sum + Number(inv.subtotal ?? 0), 0
    )
    const vatMTD = (invoicesPagadas ?? []).reduce(
      (sum, inv) => sum + Number(inv.tax ?? 0), 0
    )
    const vatPagadoMTD = (todasLasCompras ?? [])
      .filter(p => (p.created_at ?? '') >= inicioMesStr)
      .reduce((sum, p) => sum + Number(p.tax ?? 0), 0)
    const vatNetoMTD = vatMTD - vatPagadoMTD
    const { expensesAmt, comprasAmt, nominaAmt, total: totalExpenses } =
      await getMonthlyExpenses(supabase, inicioMesStr, finMesStr)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0
      ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

    const fixed = (gastos ?? []).filter(e => e.category === 'Fixed').reduce((s, e) => s + (e.amount ?? 0), 0)
    const variable = (gastos ?? []).filter(e => e.category === 'Variable').reduce((s, e) => s + (e.amount ?? 0), 0)
    const operational = (gastos ?? []).filter(e => e.category === 'Operational').reduce((s, e) => s + (e.amount ?? 0), 0)
    const expTotal = totalExpenses || 1

    setFinanceKPIs({
      totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD, vatPagadoMTD, vatNetoMTD,
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
    const sb = createClient()
    const { data } = await sb
      .from('invoices')
      .select('id, invoice_no, subtotal, discount, tax, total, status, issued_at, due_at, paid_at, transaction_id, void_reason, voided_at, contact_id, contacts(name, email, phone)')
      .order('created_at', { ascending: false })
      .limit(20)
    setInvoices(data ?? [])
  }

  async function fetchPayroll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('payroll_periods')
      .select('id, name, start_date, end_date, total_amount, paid_at')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
    setPayrollPeriods(data ?? [])
  }

  useEffect(() => {
    fetchExpenses()
    fetchFinanceKPIs()
    fetchCuentasContables()
    fetchInvoices()
    fetchPayroll()
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
      message: `${form.description || form.category}${form.amount ? ` · AED ${form.amount}` : ''}`,
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
  const { totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD, vatPagadoMTD, vatNetoMTD, fixedCosts, variableCosts, operational } = financeKPIs

  return (
    <>
      {/* â”€â”€ SECCIÓN GASTOS (oculta en tab Facturas) â”€â”€ */}
      {!invoicesOnly && <>
      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 10 }}>
        {[
          { dot: '#3DD9D6', label: t('totalRevenueMTD'),  value: aed(totalRevenue),   color: '#0B6B69', sub: null },
          { dot: '#D9533D', label: t('totalExpensesMTD'), value: aed(totalExpenses),  color: '#D9533D', sub: null },
          { dot: '#0B2A4A', label: t('netProfitMTD'),     value: aed(netProfit),      color: '#0B2A4A', sub: null },
        ].map(k => (
          <div key={k.label} style={{ background: '#FFFFFF', border: '1px solid #0B2A4A', borderRadius: 12, padding: isMobile ? 12 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#5A5852' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid #0B2A4A', borderRadius: 16, padding: 20, marginBottom: 10 }}>
        <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>VAT POR PAGAR (FTA)</div>
        <div style={{ color: '#0B2A4A', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
          AED {vatNetoMTD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid #F0EFEA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A8A6A0', fontSize: 11 }}>VAT cobrado (ventas)</span>
            <span style={{ color: '#1A6B40', fontSize: 11, fontWeight: 700 }}>+ AED {vatMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A8A6A0', fontSize: 11 }}>VAT pagado (compras)</span>
            <span style={{ color: '#D9533D', fontSize: 11, fontWeight: 700 }}>- AED {vatPagadoMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #F0EFEA' }}>
            <span style={{ color: '#5A5852', fontSize: 11, fontWeight: 700 }}>Neto a pagar FTA</span>
            <span style={{ color: '#0B2A4A', fontSize: 12, fontWeight: 800 }}>AED {vatNetoMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 22 }}>
        {[
          { icon: <BarChart2 size={14} color="#3DD9D6" />, iconBg: 'rgba(79,163,255,0.15)',   label: t('fixedCosts'),    sub: `${fixedCosts.pct}% of expenses`,    value: aed(fixedCosts.amount),    bar: '#3DD9D6', pct: fixedCosts.pct    },
          { icon: <Droplets  size={14} color="#0B2A4A" />, iconBg: 'rgba(201,168,76,0.15)',  label: t('variableCosts'), sub: `${variableCosts.pct}% of expenses`,  value: aed(variableCosts.amount), bar: '#0B2A4A', pct: variableCosts.pct },
          { icon: <Settings  size={14} color="#5A5852" />, iconBg: 'rgba(136,133,128,0.12)', label: t('operational'),   sub: `${operational.pct}% of expenses`,    value: aed(operational.amount),   bar: '#0B2A4A', pct: operational.pct   },
        ].map(k => (
          <div key={k.label} style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: k.iconBg, flexShrink: 0 }}>{k.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0B2A4A' }}>{k.label}</div>
                  <div style={{ fontSize: 10, color: '#5A5852' }}>{k.sub}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0B2A4A', whiteSpace: 'nowrap' }}>{k.value}</div>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: '#F0EFEA', overflow: 'hidden' }}>
              <div style={{ width: `${k.pct}%`, height: '100%', borderRadius: 2, background: k.bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* Expense Register */}
      <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 12, overflow: 'hidden' }}>
        {/* header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F0EFEA', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0B2A4A' }}>{t('expenseRegister')}</span>
            {!loading && (
              <span style={{ fontSize: 12, color: '#5A5852', background: '#FFFFFF', borderRadius: 99, padding: '2px 9px' }}>
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
                    background: expFilter === f ? '#F5B544' : '#FFFFFF',
                    color:      expFilter === f ? '#0d0d0f' : '#5A5852',
                    border:     expFilter === f ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#F5B544', color: '#FAFAF7', fontSize: 12, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
              + {t('addExpense')}
            </button>
          </div>
        </div>

        {/* table */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#5A5852', fontSize: 13 }}>{t('loading')}</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '0 16px' }}>
            <EmptyState
              icon="expense"
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
              <div style={{ padding: 32, textAlign: 'center', color: '#5A5852', fontSize: 13 }}>{t('noExpensesInCat')}</div>
            ) : displayed.map((e: any) => (
              <div key={e.id} style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#0B2A4A', fontWeight: 600, fontSize: 14, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <CatPill cat={e.category ?? 'Operational'} />
                    {e.subcat && <span style={{ color: '#5A5852', fontSize: 11 }}>{e.subcat}</span>}
                    {e.recurring && <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 6px' }}>REC</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#ff4f4f', fontWeight: 700, fontSize: 15 }}>{aed(e.amount ?? 0)}</div>
                  <div style={{ color: '#5A5852', fontSize: 11, marginTop: 3 }}>
                    {e.date ? new Date(e.date + 'T00:00:00+04:00').toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                  </div>
                  {e.receipt_url && (
                    <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                      title="Ver comprobante" style={{ color: '#0B2A4A', fontSize: 16, textDecoration: 'none', display: 'inline-block', marginTop: 4 }}>
                      VER SOPORTE
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid #F0EFEA' }}>
              <span style={{ fontSize: 12, color: '#5A5852' }}>Total:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f' }}>{aed(total)}</span>
            </div>
          </div>
        ) : (
          /* â”€â”€ Desktop: expense table â”€â”€ */
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
                    {['Date', 'Description', 'Category', 'Cuenta Contable', 'AED', 'Recur.', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#5A5852', fontSize: 13 }}>{t('noExpensesInCat')}</td></tr>
                  ) : displayed.map((e: any) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #F0EFEA', transition: 'background 0.1s' }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 16px', fontSize: 11, color: '#5A5852', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {e.date ? new Date(e.date + 'T00:00:00+04:00').toLocaleDateString('en-AE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#0B2A4A', fontWeight: 500 }}>{e.description}</td>
                      <td style={{ padding: '12px 16px' }}><CatPill cat={e.category ?? 'Operational'} /></td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#5A5852' }}>
                        {e.account?.code
                          ? <><span style={{ color: '#0B2A4A', fontWeight: 600, fontFamily: 'monospace', marginRight: 4 }}>{e.account.code}</span>{e.account.name}</>
                          : e.subcat ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#0B2A4A', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {aed(e.amount ?? 0)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {e.recurring
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 99, padding: '2px 8px' }}>YES</span>
                          : <span style={{ fontSize: 10, color: '#5A5852' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {e.receipt_url && (
                          <a href={e.receipt_url} target="_blank" rel="noopener noreferrer"
                            title="Ver comprobante"
                            style={{ color: '#0B2A4A', fontSize: 17, textDecoration: 'none', lineHeight: 1 }}>
                            VER SOPORTE
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: '1px solid #F0EFEA' }}>
              <span style={{ fontSize: 12, color: '#5A5852' }}>{displayed.length} row{displayed.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 12, color: '#5A5852' }}>Total:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ff4f4f', fontVariantNumeric: 'tabular-nums' }}>{aed(total)}</span>
            </div>
          </>
        )}
      </div>

      </>}

      {/* SECCIÓN FACTURAS */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: 16, marginTop: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0B2A4A' }}>
              {lang === 'es' ? 'Facturas Generadas' : 'Generated Invoices'}
            </span>
            <span style={{ background: '#E6F0FA', border: '1px solid #CBD8E8', color: '#0B2A4A', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              {invoices.length}
            </span>
          </div>
          <button onClick={fetchInvoices} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#5A5852', fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
            {lang === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {/* Tabla / vacío */}
        {invoices.length === 0 ? (
          <EmptyState
            icon="invoice"
            title="Sin facturas generadas"
            subtitle="Las facturas se generan automáticamente al completar una reserva"
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
                         :                               { color: '#5A5852', bg: 'rgba(136,133,128,0.1)', border: '#88858055', label: inv.status   }
                return (
                  <div key={inv.id} style={{ background: '#FFFFFF', border: `1px solid ${inv.status === 'anulada' ? 'rgba(239,68,68,0.2)' : '#F0EFEA'}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', color: '#0B2A4A', fontWeight: 700, fontSize: 13 }}>{inv.invoice_no}</div>
                        <div style={{ color: '#5A5852', fontSize: 12, marginTop: 2 }}>{(inv as any).contacts?.name ?? '—'}</div>
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
                          <div style={{ color: '#5A5852', fontSize: 9, fontWeight: 700, letterSpacing: '1px', marginBottom: 3 }}>{f.label}</div>
                          <div style={{ color: f.label === 'TOTAL' ? (inv.status === 'anulada' ? '#ef4444' : '#0B2A4A') : '#0B2A4A', fontWeight: f.label === 'TOTAL' ? 800 : 600, fontSize: f.label === 'TOTAL' ? 14 : 12 }}>{f.value}</div>
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
                      <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5852', padding: '4px 0 8px' }}>
                        Ref: {inv.transaction_id}
                      </div>
                    )}
                    {inv.status === 'anulada' && inv.void_reason && (
                      <div style={{ fontSize: 11, color: '#ef444480', padding: '4px 0 8px', fontStyle: 'italic' }}>
                        Motivo: {inv.void_reason}
                      </div>
                    )}
                    <button onClick={() => setViewingInvoice(inv)}
                      style={{ width: '100%', padding: '8px 0', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: '#0B2A4A', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
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
                    <th key={h} style={{ fontSize: 10, fontWeight: 500, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0 10px', textAlign: 'left', borderBottom: '1px solid #F0EFEA' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices
                  .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
                  .map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F0EFEA' }}>
                    <td style={{ padding: '12px 0', fontFamily: 'monospace', fontSize: 12, color: '#0B2A4A', fontWeight: 600 }}>{inv.invoice_no}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, color: '#0B2A4A' }}>{(inv as any).contacts?.name ?? '—'}</td>
                    <td style={{ padding: '12px 8px', fontSize: 12, color: '#5A5852' }}>AED {Number(inv.subtotal ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', fontSize: 12, color: '#5A5852' }}>AED {Number(inv.tax ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', fontSize: 13, fontWeight: 700, color: '#0B2A4A' }}>AED {Number(inv.total ?? 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {(() => {
                        const sc = inv.status === 'pagada'     ? { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Pagada'     }
                                 : inv.status === 'por_cobrar' ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Por Cobrar' }
                                 : inv.status === 'anulada'    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Anulada'    }
                                 :                               { color: '#5A5852', bg: 'rgba(136,133,128,0.1)', label: inv.status   }
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
                          style={{ padding: '4px 10px', background: '#F0EFEA', border: '1px solid #3a3a40', color: '#0B2A4A', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
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
                          <span style={{ fontSize: 10, color: '#5A5852' }}>#{inv.transaction_id}</span>
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
                  <td colSpan={4} style={{ padding: '12px 0', fontSize: 12, color: '#5A5852', borderTop: '1px solid #F0EFEA' }}>
                    {invoices.length} {lang === 'es' ? 'facturas' : 'invoices'}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: 800, color: '#0B2A4A', borderTop: '1px solid #F0EFEA' }}>
                    AED {invoices.filter(inv => inv.status !== 'anulada').reduce((sum, inv) => sum + Number(inv.total ?? 0), 0).toFixed(2)}
                  </td>
                  <td colSpan={2} style={{ borderTop: '1px solid #F0EFEA' }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Gastos de Personal ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5A5852',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Gastos de Personal
            </div>
            <div style={{ fontSize: 13, color: '#5A5852' }}>
              Nómina pagada registrada en contabilidad
            </div>
          </div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#0B2A4A',
            fontFamily: 'monospace'
          }}>
            Total: {payrollPeriods
              .reduce((s, p) => s + p.total_amount, 0)
              .toLocaleString('es', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {payrollPeriods.length === 0 ? (
          <div style={{
            padding: '32px', textAlign: 'center',
            color: '#5A5852', fontSize: 13,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10, border: '1px solid #F0EFEA'
          }}>
            No hay nóminas pagadas registradas.
          </div>
        ) : (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '1px solid #F0EFEA',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
                  {['Período', 'Fechas', 'Fecha pago', 'Cuenta contable', 'Total'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 10, fontWeight: 600, color: '#5A5852',
                      letterSpacing: '0.5px', textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollPeriods.map((p, i) => (
                  <tr key={p.id} style={{
                    borderBottom: i < payrollPeriods.length - 1
                      ? '1px solid #F0EFEA' : 'none'
                  }}>
                    <td style={{ padding: '12px 16px', fontSize: 13,
                      fontWeight: 600, color: '#0B2A4A' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12,
                      color: '#5A5852', fontFamily: 'monospace' }}>
                      {new Date(p.start_date + 'T12:00:00').toLocaleDateString('es',
                        { day: '2-digit', month: 'short' })}
                      {' → '}
                      {new Date(p.end_date + 'T12:00:00').toLocaleDateString('es',
                        { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12,
                      color: '#5A5852', fontFamily: 'monospace' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es',
                        { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: '#E6F0FA', color: '#0B2A4A',
                        border: '1px solid #0B2A4A',
                        padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 600, fontFamily: 'monospace'
                      }}>
                        5120 Nómina
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13,
                      fontWeight: 700, color: '#0B2A4A', fontFamily: 'monospace' }}>
                      {p.total_amount.toLocaleString('es', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); resetReceiptState(); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0B2A4A' }}>{t('addExpense')}</span>
              <button onClick={() => { setShowAdd(false); setForm({ ...EMPTY_EXP }); resetReceiptState(); setCuentaSeleccionada(null); setBusqueda(''); setDropdownAbierto(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5852', padding: 4, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><FLabel>Description *</FLabel><FInput placeholder="e.g. Office Rent — June" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

              {/* Cuenta contable */}
              <div>
                <FLabel>CUENTA CONTABLE</FLabel>
                <select
                  value={form.account_id}
                  onChange={e => setForm(p => ({ ...p, account_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: form.account_id ? '#0B2A4A' : '#3a3836', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
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
                        background: form.category === c ? '#F5B544' : '#FFFFFF',
                        color:      form.category === c ? '#0d0d0f' : '#5A5852',
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
                    style={{ background: '#FFFFFF', borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      border: `1px solid ${dropdownAbierto ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
                      color: cuentaSeleccionada ? '#0B2A4A' : '#3a3836' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                      {cuentaSeleccionada
                        ? <><span style={{ fontFamily: 'monospace', color: '#0B2A4A', marginRight: 6 }}>{cuentaSeleccionada.code}</span>{cuentaSeleccionada.name}</>
                        : 'Seleccionar cuenta…'}
                    </span>
                    <span style={{ color: '#5A5852', fontSize: 10, flexShrink: 0, marginLeft: 8,
                      display: 'inline-block', transition: 'transform 0.2s',
                      transform: dropdownAbierto ? 'rotate(180deg)' : 'rotate(0deg)' }}>â–¾</span>
                  </div>

                  {/* Dropdown panel */}
                  {dropdownAbierto && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                      background: '#FFFFFF', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10,
                      maxHeight: 280, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

                      {/* Search */}
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid #F0EFEA' }}>
                        <input autoFocus type="text" value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                          placeholder="ðŸ” Buscar cuenta…"
                          style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                            padding: '7px 10px', fontSize: 12, color: '#0B2A4A',
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
                              : tipo === 'Costo Produccion' ? 'Costos de Producción'
                              : 'Gastos'
                            return (
                              <div key={tipo}>
                                <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700,
                                  color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.1em',
                                  background: '#FFFFFF', position: 'sticky', top: 0 }}>
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
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0EFEA' }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected ? 'rgba(201,168,76,0.1)' : 'transparent' }}
                                      style={{ padding: cuenta.level === 2 ? '9px 14px' : '7px 14px 7px 28px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        background: selected ? 'rgba(201,168,76,0.1)' : 'transparent',
                                        transition: 'background 0.15s' }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#0B2A4A', minWidth: 44, flexShrink: 0 }}>
                                        {cuenta.code}
                                      </span>
                                      <span style={{ color: '#3a3836', fontSize: 10 }}>—</span>
                                      <span style={{ fontSize: cuenta.level === 2 ? 13 : 12,
                                        fontWeight: cuenta.level === 2 ? 600 : 400,
                                        color: cuenta.level === 2 ? '#0B2A4A' : '#c0bdb8', flex: 1 }}>
                                        {cuenta.name}
                                      </span>
                                      {selected && <span style={{ color: '#0B2A4A', fontSize: 12, flexShrink: 0 }}>✓</span>}
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
                  border: `2px dashed ${receiptFile ? '#F5B544' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: receiptFile ? 'rgba(201,168,76,0.06)' : 'transparent',
                  transition: 'all 0.2s', gap: 8,
                }}>
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="preview" style={{ maxHeight: 110, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }} />
                  ) : receiptFile ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>[doc]</div>
                      <div style={{ color: '#0B2A4A', fontSize: 12, fontWeight: 600 }}>{receiptFile.name}</div>
                      <div style={{ color: '#5A5852', fontSize: 11 }}>{(receiptFile.size / 1024).toFixed(0)} KB</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>[+]</div>
                      <div style={{ color: '#5A5852', fontSize: 12 }}>Toca para adjuntar factura o recibo</div>
                      <div style={{ color: '#3a3836', fontSize: 11, marginTop: 2 }}>JPG, PNG o PDF · Máx 5MB</div>
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
                <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#F5B544' }} />
                <span style={{ fontSize: 13, color: '#0B2A4A' }}>{t('recurringMonthly')}</span>
              </label>
            </div>
            <button onClick={saveExpense} disabled={saving || uploadingReceipt || !form.description.trim() || !form.amount}
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', marginTop: 22, background: '#F5B544', color: '#FAFAF7', fontSize: 14, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: (form.description.trim() && form.amount && !saving && !uploadingReceipt) ? 1 : 0.5 }}>
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
            style={{ background: '#FFFFFF', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            
            <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>Anular Factura</div>
            <div style={{ color: '#5A5852', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
              {voidingInvoice.invoice_no} · AED {Number(voidingInvoice.total ?? 0).toFixed(2)}
            </div>
            <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>Esta acción no se puede deshacer</div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A5852', marginBottom: 6 }}>
                MOTIVO DE ANULACIÓN *
              </label>
              <textarea autoFocus value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3}
                placeholder="ej. Error en el monto, servicio cancelado, duplicado..."
                style={{ width: '100%', padding: '12px 16px', background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setVoidingInvoice(null); setVoidReason('') }}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
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
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}
            onClick={e => e.stopPropagation()}>
            
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2A4A', textAlign: 'center', marginBottom: 6 }}>
              {lang === 'es' ? 'Confirmar Pago' : 'Confirm Payment'}
            </div>
            <div style={{ fontSize: 12, color: '#5A5852', textAlign: 'center', marginBottom: 24 }}>
              {selectedInvoice?.invoice_no} · AED {Number(selectedInvoice?.total ?? 0).toFixed(2)}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A5852', marginBottom: 6 }}>
                ID DE TRANSACCIÓN *
              </label>
              <input autoFocus type="text" value={transactionId}
                onChange={e => { setTransactionId(e.target.value); setPaymentError('') }}
                onKeyDown={e => e.key === 'Enter' && confirmPayment()}
                placeholder="ej. TXN-123456 / REF-789"
                style={{ width: '100%', boxSizing: 'border-box', background: '#FFFFFF', border: `1px solid ${paymentError ? '#ff4f4f' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0B2A4A', outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
              {paymentError && <div style={{ fontSize: 11, color: '#ff4f4f', marginTop: 5 }}>{paymentError}</div>}
              <div style={{ fontSize: 11, color: '#3a3836', marginTop: 6 }}>Este ID quedará registrado como comprobante del pago</div>
            </div>
            {/* Selector cuenta bancaria */}
            {bankAccounts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5A5852', marginBottom: 10 }}>INGRESO A *</div>
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
                          background: sel ? color + '15' : '#FAFAF7',
                          border: `2px solid ${sel ? color : '#F0EFEA'}`,
                          borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ padding: '6px 10px', borderRadius: 6,
                            background: color + '20',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: color }}>
                            {icon}
                          </div>
                          <div>
                            <div style={{ color: '#0B2A4A', fontSize: 13, fontWeight: 700 }}>{account.name}</div>
                            <div style={{ color: '#A8A6A0', fontSize: 11 }}>Saldo: AED {bal.toFixed(2)}</div>
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
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
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
  { name: 'Tarjeta de crédito empresarial', account_type: 'Credit Card', account_number: null, balance: 0 },
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
  return '#F5B544'
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
  const [editingBank,  setEditingBank]  = useState<any | null>(null)
  const [editBankForm, setEditBankForm] = useState({ name: '', account_type: '', account_number: '', currency: 'AED', notes: '' })
  const [savingBank,      setSavingBank]      = useState(false)
  const [showNewBankAccount, setShowNewBankAccount] = useState(false)
  const [newBankForm,    setNewBankForm]    = useState({ name: '', account_type: 'Bank', account_number: '', currency: 'AED', notes: '' })
  const [savingNewBank,  setSavingNewBank]  = useState(false)
  const isMobile = useIsMobile()

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

  async function handleSaveNewBank() {
    if (!newBankForm.name.trim()) { addToast('El nombre es obligatorio', 'error'); return }
    setSavingNewBank(true)
    const { error } = await createClient().from('bank_accounts').insert({
      name: newBankForm.name.trim(),
      account_type: newBankForm.account_type,
      account_number: newBankForm.account_number.trim() || null,
      currency: newBankForm.currency,
      notes: newBankForm.notes.trim() || null,
      current_balance: 0,
      is_active: true,
    })
    setSavingNewBank(false)
    if (error) { addToast('Error: ' + error.message, 'error'); return }
    addToast('Cuenta bancaria creada', 'success')
    setShowNewBankAccount(false)
    setNewBankForm({ name: '', account_type: 'Bank', account_number: '', currency: 'AED', notes: '' })
    fetchAccounts()
  }

  async function handleSaveBank() {
    if (!editBankForm.name.trim()) { addToast('El nombre es obligatorio', 'error'); return }
    setSavingBank(true)
    const { error } = await createClient().from('bank_accounts').update({
      name: editBankForm.name.trim(),
      account_type: editBankForm.account_type,
      account_number: editBankForm.account_number.trim() || null,
      currency: editBankForm.currency,
      notes: editBankForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', editingBank.id)
    setSavingBank(false)
    if (error) { addToast('Error al guardar: ' + error.message, 'error'); return }
    addToast('Cuenta actualizada correctamente', 'success')
    setEditingBank(null)
    fetchAccounts()
  }

  const bankBal  = accounts.filter(a => a.account_type === 'Bank').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)
  const cashBal  = accounts.filter(a => a.account_type === 'Cash').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)
  const ccBal    = accounts.filter(a => a.account_type === 'Credit Card').reduce((s, a) => s + parseFloat(a.current_balance ?? a.balance ?? 0), 0)

  function balColor(v: number) { return v > 0 ? '#0B2A4A' : v < 0 ? '#D9533D' : '#5A5852' }

  function AccModal({ title, onClose, onSave, saveLabel }: { title: string; onClose: () => void; onSave: () => void; saveLabel: string }) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0B2A4A' }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A5852', padding: 4, display: 'flex' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><FLabel>{t('name')} *</FLabel><FInput placeholder="e.g. Emirates NBD Cuenta Principal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <FLabel>{t('accountType')} *</FLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Bank', 'Credit Card', 'Cash'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, account_type: t })}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif',
                      background: form.account_type === t ? '#F5B544' : '#FFFFFF',
                      color:      form.account_type === t ? '#0d0d0f' : '#5A5852',
                      border:     form.account_type === t ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.1)' }}>
                    {ACC_STYLE[t]?.icon} {t}
                  </button>
                ))}
              </div>
            </div>
            <div><FLabel>{t('accountNumber')}</FLabel><FInput placeholder="XXXX XXXX XXXX XXXX" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} style={{ fontFamily: 'monospace' }} /></div>
            <div><FLabel>{t('balance')} (AED)</FLabel><FInput type="number" placeholder="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} /></div>
            <div><FLabel>{t('notes')}</FLabel><FTextarea placeholder="Observaciones opcionales…" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          {/* delete confirm (edit only) */}
          {editAcc && delConfirm && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#ff4f4f' }}>{t('confirmRemove')}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDelConfirm(false)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: '#FFFFFF', color: '#5A5852', fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>{t('no')}</button>
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
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#F5B544', color: '#FAFAF7', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', opacity: form.name.trim() ? 1 : 0.5 }}>
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
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0B2A4A' }}>{t('accounts')}</div>
          <div style={{ fontSize: 12, color: '#5A5852', marginTop: 3 }}>{t('bankSubtitle')}</div>
        </div>
        <button onClick={openAdd}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#F5B544', color: '#FAFAF7', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', cursor: 'pointer' }}>
          + {t('addAccount')}
        </button>
      </div>

      {/* accounts table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#5A5852', fontSize: 13 }}>{t('loading')}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F0EFEA' }}>
                {[t('name'), t('accountType'), t('accountNumber'), t('balance'), t('reconciliation'), t('actions')].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#5A5852', fontSize: 13 }}>{t('noAccountsFound')}</td></tr>
              ) : accounts.map(acc => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #F0EFEA', transition: 'background 0.1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = '#FAFAF7')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  {/* name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#0B2A4A', flexShrink: 0 }}>âŠ™</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0B2A4A', cursor: 'pointer' }}>{acc.name}</span>
                    </div>
                  </td>
                  {/* type */}
                  <td style={{ padding: '12px 16px' }}><AccTypeBadge type={acc.account_type} /></td>
                  {/* account number */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#5A5852', fontFamily: 'monospace' }}>
                    {acc.account_number ?? '—'}
                  </td>
                  {/* balance */}
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: balColor(parseFloat(acc.current_balance ?? acc.balance ?? 0)) }}>
                    {aed(parseFloat(acc.current_balance ?? acc.balance ?? 0))}
                  </td>
                  {/* reconciliation */}
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'Outfit,sans-serif', cursor: 'pointer', background: '#FFFFFF', border: '1px solid #0B2A4A', color: '#0B2A4A' }}>
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
          <div key={k.label} style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#5A5852', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.value >= 0 ? '#0B2A4A' : '#D9533D' }}>{aed(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Separador CUENTAS BANCARIAS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
        <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '2px' }}>CUENTAS BANCARIAS</div>
        <div style={{ flex: 1, height: 1, background: '#F0EFEA' }} />
      </div>
      {/* Grid de cuentas bancarias */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: 16,
        marginTop: 0,
        marginBottom: 24,
      }}>
        {accounts.map(account => {
          const color   = getBankColor(account.account_type)
          const balance = parseFloat(account.current_balance ?? account.balance ?? 0)
          return (
            <div key={account.id} style={{
              background: '#FFFFFF',
              border: '1px solid #0B2A4A',
              borderRadius: 12,
              padding: 20,
              position: 'relative',
              transition: 'border-color 0.2s',
            }}>
              {/* Botón editar */}
              <button
                onClick={() => {
                  setEditingBank(account)
                  setEditBankForm({
                    name: account.name || '',
                    account_type: account.account_type || 'Bank',
                    account_number: account.account_number || '',
                    currency: account.currency || 'AED',
                    notes: account.notes || '',
                  })
                }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'transparent',
                  border: '1px solid #F0EFEA',
                  borderRadius: 6,
                  color: '#5A5852',
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                  fontFamily: 'Outfit,sans-serif',
                }}
              >EDITAR</button>
              {/* Header: badge tipo + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  padding: '5px 10px', borderRadius: 6,
                  background: '#0B2A4A',
                  border: '1px solid #0B2A4A',
                  color: '#FFFFFF',
                  fontSize: 9, fontWeight: 800, letterSpacing: '1px', flexShrink: 0,
                }}>
                  {getBankIcon(account.account_type, account.name)}
                </div>
                <div style={{
                  color: '#0B2A4A', fontSize: 14, fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  paddingRight: 40,
                }}>{account.name}</div>
              </div>
              {/* Saldo */}
              <div style={{ color: '#5A5852', fontSize: 10, fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>SALDO ACTUAL</div>
              <div style={{
                color: balance > 0 ? '#F5B544' : balance < 0 ? '#D9533D' : '#A8A6A0',
                fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 12,
              }}>AED {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F0EFEA' }}>
                <span style={{ color: '#A8A6A0', fontSize: 11 }}>
                  {account.currency || 'AED'}
                  {account.account_number ? ` · ****${account.account_number.slice(-4)}` : ''}
                </span>
                <span style={{
                  background: balance > 0 ? '#E6F4EE' : '#F0EFEA',
                  color: balance > 0 ? '#1A6B40' : '#5A5852',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {balance > 0 ? 'ACTIVO' : 'SIN MOVIMIENTOS'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* modals */}
      {showAdd && (
        <AccModal title={t('addAccount')} onClose={() => setShowAdd(false)} onSave={saveAdd} saveLabel={t('addAccount')} />
      )}
      {editAcc && (
        <AccModal title={`${t('edit')} ${t('accounts')}`} onClose={() => { setEditAcc(null); setDelConfirm(false) }} onSave={saveEdit} saveLabel={t('saveChanges')} />
      )}

      {/* edit bank modal */}
      {editingBank && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 700,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }} onClick={() => setEditingBank(null)}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #F0EFEA',
            borderRadius: 16,
            padding: 32,
            width: '100%', maxWidth: 460,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0B2A4A', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 6 }}>CUENTA BANCARIA</div>
            <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Editar Cuenta</div>
            {/* Nombre */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOMBRE *</div>
              <input
                value={editBankForm.name}
                onChange={e => setEditBankForm(p => ({...p, name: e.target.value}))}
                placeholder="ej. Emirates NBD"
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }}
              />
            </div>
            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>TIPO DE CUENTA</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {([
                  { value: 'Cash',        label: 'Efectivo / Caja',     color: '#22c55e' },
                  { value: 'Bank',        label: 'Cuenta Bancaria',     color: '#0B2A4A' },
                  { value: 'Transfer',    label: 'Transfer / IBAN',     color: '#3b82f6' },
                  { value: 'Credit Card', label: 'Tarjeta de Credito',  color: '#ef4444' },
                ] as const).map(type => (
                  <button key={type.value}
                    onClick={() => setEditBankForm(p => ({...p, account_type: type.value}))}
                    style={{
                      padding: '10px 14px',
                      background: editBankForm.account_type === type.value ? type.color + '20' : '#FAFAF7',
                      border: `2px solid ${editBankForm.account_type === type.value ? type.color : '#F0EFEA'}`,
                      borderRadius: 8,
                      color: editBankForm.account_type === type.value ? type.color : '#A8A6A0',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'Outfit,sans-serif',
                    }}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Numero de cuenta */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NUMERO DE CUENTA / IBAN <span style={{ color: '#555', marginLeft: 4 }}>(opcional)</span></div>
              <input
                value={editBankForm.account_number}
                onChange={e => setEditBankForm(p => ({...p, account_number: e.target.value}))}
                placeholder="ej. AE07 0331 2345 6789 0123 456"
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>
            {/* Moneda */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>MONEDA</div>
              <select
                value={editBankForm.currency}
                onChange={e => setEditBankForm(p => ({...p, currency: e.target.value}))}
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}
              >
                <option value="AED">AED - Dirham Emirati</option>
                <option value="USD">USD - Dolar Americano</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - Libra Esterlina</option>
              </select>
            </div>
            {/* Notas */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOTAS <span style={{ color: '#555' }}>(opcional)</span></div>
              <input
                value={editBankForm.notes}
                onChange={e => setEditBankForm(p => ({...p, notes: e.target.value}))}
                placeholder="ej. Cuenta principal de operaciones"
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }}
              />
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setEditingBank(null)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #F0EFEA', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}
              >CANCELAR</button>
              <button
                onClick={handleSaveBank}
                disabled={savingBank || !editBankForm.name.trim()}
                style={{ flex: 2, padding: 13, background: '#F5B544', color: '#FAFAF7', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: savingBank || !editBankForm.name.trim() ? 0.6 : 1 }}
              >{savingBank ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>
            </div>
          </div>
        </div>
      )}
      {/* nueva cuenta bancaria modal */}
      {showNewBankAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowNewBankAccount(false)}>
          <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 16, padding: 32, width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0B2A4A', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 6 }}>CUENTA BANCARIA</div>
            <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nueva Cuenta</div>
            {/* Nombre */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOMBRE *</div>
              <input value={newBankForm.name} onChange={e => setNewBankForm(p => ({...p, name: e.target.value}))} placeholder="ej. Emirates NBD"
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            {/* Tipo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>TIPO DE CUENTA</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {([
                  { value: 'Cash',        label: 'Efectivo / Caja',    color: '#22c55e' },
                  { value: 'Bank',        label: 'Cuenta Bancaria',    color: '#0B2A4A' },
                  { value: 'Transfer',    label: 'Transfer / IBAN',    color: '#3b82f6' },
                  { value: 'Credit Card', label: 'Tarjeta de Crédito', color: '#ef4444' },
                ] as const).map(type => (
                  <button key={type.value} onClick={() => setNewBankForm(p => ({...p, account_type: type.value}))}
                    style={{ padding: '10px 14px', background: newBankForm.account_type === type.value ? type.color + '20' : '#FAFAF7', border: `2px solid ${newBankForm.account_type === type.value ? type.color : '#F0EFEA'}`, borderRadius: 8, color: newBankForm.account_type === type.value ? type.color : '#A8A6A0', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontFamily: 'Outfit,sans-serif' }}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Número */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NÚMERO DE CUENTA / IBAN <span style={{ color: '#555', marginLeft: 4 }}>(opcional)</span></div>
              <input value={newBankForm.account_number} onChange={e => setNewBankForm(p => ({...p, account_number: e.target.value}))} placeholder="ej. AE07 0331 2345 6789 0123 456"
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
            </div>
            {/* Moneda */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>MONEDA</div>
              <select value={newBankForm.currency} onChange={e => setNewBankForm(p => ({...p, currency: e.target.value}))}
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1.5px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                <option value="AED">AED — Dirham Emiratí</option>
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Libra Esterlina</option>
              </select>
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewBankAccount(false)} style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #F0EFEA', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={handleSaveNewBank} disabled={savingNewBank || !newBankForm.name.trim()} style={{ flex: 2, padding: 13, background: '#F5B544', color: '#FAFAF7', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: savingNewBank || !newBankForm.name.trim() ? 0.6 : 1 }}>
                {savingNewBank ? 'GUARDANDO...' : 'CREAR CUENTA'}
              </button>
            </div>
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

// â”€â”€â”€ PAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── COMPRAS TAB ─────────────────────────────────────────────────────────────
function ComprasTab() {
  const isMobile = useIsMobile()

  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([])
  const [purchaseKPIs,     setPurchaseKPIs]     = useState({ totalMTD: 0, pendiente: 0, ivaMTD: 0 })
  const [loading,          setLoading]          = useState(true)
  const [showNewPurchase,  setShowNewPurchase]  = useState(false)
  const [viewingPurchase,  setViewingPurchase]  = useState<any>(null)
  const [payingPurchase,   setPayingPurchase]   = useState<any>(null)
  const [purchaseForm,     setPurchaseForm]     = useState<any>({
    supplier_id: '', supplier_name: '', invoice_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '', discount: 0, notes: '',
    lines: [{ description: '', account_id: '', inventory_item_id: '', quantity: 1, unit_price: 0, discount: 0, account_type: 'inventory' }]
  })
  const [payPurchaseForm,  setPayPurchaseForm]  = useState({ payment_reference: '', bank_account_id: '' })
  const [contacts,         setContacts]         = useState<any[]>([])
  const [inventoryItems,   setInventoryItems]   = useState<any[]>([])
  const [expenseAccounts,  setExpenseAccounts]  = useState<any[]>([])
  const [bankAccounts,     setBankAccounts]     = useState<any[]>([])
  const [saving,           setSaving]           = useState(false)
  const [paying,           setPaying]           = useState(false)
  const [toasts,           setToasts]           = useState<Toast[]>([])

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }
  const showToast = addToast

  async function loadBankAccounts() {
    const { data } = await createClient().from('bank_accounts').select('*').eq('is_active', true).order('name')
    setBankAccounts(data ?? [])
  }

  async function loadPurchaseInvoices() {
    setLoading(true)
    const supabase = createClient()
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data } = await supabase
      .from('purchase_invoices')
      .select('*, contacts:supplier_id(name)')
      .order('created_at', { ascending: false })
    const rows = data ?? []
    setPurchaseInvoices(rows)
    const mtd       = rows.filter((i: any) => i.created_at >= startOfMonth && i.status !== 'anulada')
    const pendientes = rows.filter((i: any) => i.status === 'pendiente')
    setPurchaseKPIs({
      totalMTD:  mtd.reduce((s: number, i: any) => s + parseFloat(i.subtotal ?? 0), 0),
      pendiente: pendientes.reduce((s: number, i: any) => s + parseFloat(i.total ?? 0), 0),
      ivaMTD:    mtd.reduce((s: number, i: any) => s + parseFloat(i.tax ?? 0), 0),
    })
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    loadPurchaseInvoices()
    loadBankAccounts()
    supabase.from('contacts').select('id, name').order('name').then(({ data }: any) => setContacts(data ?? []))
    supabase.from('inventory_items').select('id, name, stock_qty, unit').order('name').then(({ data }: any) => setInventoryItems(data ?? []))
    supabase.from('chart_of_accounts').select('id, code, name, account_type').eq('account_type', 'expense').order('code').then(({ data }: any) => setExpenseAccounts(data ?? []))
  }, [])

  const calcPurchaseTotals = (lines: any[], discount: any) => {
    const subtotalLineas = lines.reduce((s: number, l: any) =>
      s + ((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0) - (parseFloat(l.discount) || 0)), 0)
    const subtotalNeto = subtotalLineas - (parseFloat(discount) || 0)
    const vat   = subtotalNeto * 0.05
    const total = subtotalNeto + vat
    return { subtotalLineas, subtotalNeto, vat, total }
  }

  const updatePurchaseLine = (index: number, field: string, value: any) => {
    setPurchaseForm((p: any) => {
      const lines = [...p.lines]
      lines[index] = { ...lines[index], [field]: value }
      return { ...p, lines }
    })
  }

  async function handleSavePurchase() {
    const validLines = purchaseForm.lines.filter((l: any) => l.description.trim())
    if (validLines.length === 0) { showToast('Agrega al menos un producto', 'error'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('No autenticado', 'error'); setSaving(false); return }
    const { subtotalNeto, vat, total } = calcPurchaseTotals(purchaseForm.lines, purchaseForm.discount)
    const { data: invoice, error } = await supabase
      .from('purchase_invoices')
      .insert({
        user_id:        user.id,
        supplier_id:    purchaseForm.supplier_id   || null,
        supplier_name:  purchaseForm.supplier_name,
        invoice_number: purchaseForm.invoice_number,
        issue_date:     purchaseForm.issue_date,
        due_date:       purchaseForm.due_date      || null,
        status:         'pendiente',
        subtotal:       subtotalNeto,
        discount:       parseFloat(purchaseForm.discount) || 0,
        tax:            vat,
        total:          total,
        notes:          purchaseForm.notes,
      })
      .select()
      .single()
    if (error || !invoice) { showToast('Error: ' + (error?.message ?? ''), 'error'); setSaving(false); return }
    const { data: invAccount } = await supabase.from('chart_of_accounts').select('id').eq('code', '1300').eq('user_id', user.id).single()
    for (const line of purchaseForm.lines) {
      if (!line.description.trim()) continue
      const lineSubtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0) - (parseFloat(line.discount) || 0)
      const accountId = line.account_id === 'inv-1300' ? (invAccount as any)?.id : (line.account_id || (invAccount as any)?.id)
      await supabase.from('purchase_invoice_lines').insert({
        user_id:             user.id,
        purchase_invoice_id: invoice.id,
        inventory_item_id:   line.inventory_item_id || null,
        account_id:          accountId || null,
        description:         line.description,
        quantity:            parseFloat(line.quantity)   || 1,
        unit_price:          parseFloat(line.unit_price) || 0,
        discount:            parseFloat(line.discount)   || 0,
        subtotal:            lineSubtotal,
        account_type:        line.inventory_item_id ? 'inventory' : 'expense',
      })
    }
    showToast('Factura de compra registrada', 'success')
    setShowNewPurchase(false)
    setPurchaseForm({
      supplier_id: '', supplier_name: '', invoice_number: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '', discount: 0, notes: '',
      lines: [{ description: '', account_id: '', inventory_item_id: '', quantity: 1, unit_price: 0, discount: 0, account_type: 'inventory' }]
    })
    await loadPurchaseInvoices()
    setSaving(false)
  }

  async function confirmPayPurchase() {
    if (!payPurchaseForm.payment_reference.trim()) { showToast('Ingresa la referencia de pago', 'error'); return }
    if (!payPurchaseForm.bank_account_id)          { showToast('Selecciona la cuenta de pago',   'error'); return }
    setPaying(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_invoices')
      .update({
        status:            'pagada',
        payment_date:      new Date().toISOString(),
        payment_reference: payPurchaseForm.payment_reference,
        bank_account_id:   payPurchaseForm.bank_account_id,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', payingPurchase.id)
    if (error) { showToast('Error: ' + error.message, 'error'); setPaying(false); return }
    const bank = bankAccounts.find((b: any) => b.id === payPurchaseForm.bank_account_id)
    const newBalance = parseFloat(bank?.current_balance ?? 0) - parseFloat(payingPurchase.total ?? 0)
    await supabase.from('bank_accounts')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', payPurchaseForm.bank_account_id)
    showToast('Pago registrado correctamente', 'success')
    setPayingPurchase(null)
    setPaying(false)
    await loadPurchaseInvoices()
    await loadBankAccounts()
  }

  const { subtotalLineas, vat: formVAT, total: formTotal } = calcPurchaseTotals(purchaseForm.lines, purchaseForm.discount)

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {([
          { label: 'COMPRAS MTD',         value: purchaseKPIs.totalMTD,  color: '#ef4444' },
          { label: 'PENDIENTE POR PAGAR', value: purchaseKPIs.pendiente, color: '#f59e0b' },
          { label: 'IVA ACREDITABLE',     value: purchaseKPIs.ivaMTD,    color: '#0B2A4A' },
        ] as const).map(kpi => (
          <div key={kpi.label} style={{ background: '#FFFFFF', border: `1px solid ${kpi.color}30`, borderRadius: 16, padding: 20 }}>
            <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ color: kpi.color, fontSize: 28, fontWeight: 900 }}>{aed(kpi.value)}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#0B2A4A', fontSize: 16, fontWeight: 800 }}>
          Facturas de Compra
          <span style={{ color: '#A8A6A0', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>{purchaseInvoices.length} facturas</span>
        </div>
        <button onClick={() => setShowNewPurchase(true)}
          style={{ padding: '10px 20px', background: '#F5B544', color: '#FAFAF7', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
          + NUEVA COMPRA
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#5A5852', fontSize: 13 }}>Cargando...</div>
      ) : purchaseInvoices.length === 0 ? (
        <EmptyState icon="expense" title="Sin facturas de compra" subtitle="Registra las compras de productos a tus proveedores" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ background: '#FFFFFF' }}>
                {['N° FACTURA','PROVEEDOR','EMISIÓN','VENCIMIENTO','SUBTOTAL','IVA','TOTAL','ESTADO','ACCIONES'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#5A5852', fontSize: 11, letterSpacing: '1px', borderBottom: '1px solid #F0EFEA', fontFamily: 'Outfit,sans-serif', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchaseInvoices.map((inv: any) => {
                const isOverdue = inv.status === 'pendiente' && inv.due_date && new Date(inv.due_date) < new Date()
                const isDueSoon = inv.status === 'pendiente' && inv.due_date && new Date(inv.due_date) <= new Date(Date.now() + 7*24*60*60*1000)
                const sc = inv.status === 'pagada'
                  ? { label: 'PAGADA',   color: '#22c55e', bg: '#22c55e20' }
                  : inv.status === 'anulada'
                  ? { label: 'ANULADA',  color: '#A8A6A0',    bg: '#F0EFEA'   }
                  : isOverdue
                  ? { label: 'VENCIDA',  color: '#ef4444', bg: '#ef444420' }
                  : { label: 'PENDIENTE',color: '#f59e0b', bg: '#f59e0b20' }
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #1a1a1e' }}>
                    <td style={{ padding: '12px 14px', color: '#0B2A4A', fontWeight: 700, fontSize: 13 }}>{inv.invoice_number || inv.id.slice(0,8).toUpperCase()}</td>
                    <td style={{ padding: '12px 14px', color: '#0B2A4A', fontSize: 13 }}>{inv.supplier_name || inv.contacts?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#5A5852', fontSize: 12 }}>{inv.issue_date ? new Date(inv.issue_date + 'T00:00:00+04:00').toLocaleDateString('en-AE') : '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      {inv.due_date ? (
                        <span style={{ color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#5A5852' }}>
                          {new Date(inv.due_date + 'T00:00:00+04:00').toLocaleDateString('en-AE')}{isOverdue ? ' ⚠' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#0B2A4A', fontSize: 13 }}>AED {parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px', color: '#0B2A4A', fontSize: 13 }}>AED {parseFloat(inv.tax || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px', color: '#0B2A4A', fontSize: 13, fontWeight: 700 }}>AED {parseFloat(inv.total || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}40`, borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewingPurchase(inv)}
                          style={{ padding: '5px 10px', background: '#F0EFEA', border: '1px solid #3a3a40', borderRadius: 6, color: '#0B2A4A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>VER</button>
                        {inv.status === 'pendiente' && (
                          <button onClick={() => { setPayingPurchase(inv); setPayPurchaseForm({ payment_reference: '', bank_account_id: '' }) }}
                            style={{ padding: '5px 10px', background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 6, color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>PAGAR</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VER modal */}
      {viewingPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ color: '#0B2A4A', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 4 }}>FACTURA DE COMPRA</div>
                <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800 }}>{viewingPurchase.invoice_number || viewingPurchase.id.slice(0,8).toUpperCase()}</div>
              </div>
              <button onClick={() => setViewingPurchase(null)} style={{ background: 'none', border: 'none', color: '#5A5852', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {[
              { label: 'Proveedor',   value: viewingPurchase.supplier_name || viewingPurchase.contacts?.name || '—' },
              { label: 'Emisión', value: viewingPurchase.issue_date ? new Date(viewingPurchase.issue_date + 'T00:00:00+04:00').toLocaleDateString('en-AE') : '—' },
              { label: 'Vencimiento', value: viewingPurchase.due_date ? new Date(viewingPurchase.due_date + 'T00:00:00+04:00').toLocaleDateString('en-AE') : '—' },
              { label: 'Estado',      value: viewingPurchase.status?.toUpperCase() },
              { label: 'Subtotal',    value: 'AED ' + parseFloat(viewingPurchase.subtotal || 0).toFixed(2) },
              { label: 'IVA',         value: 'AED ' + parseFloat(viewingPurchase.tax || 0).toFixed(2) },
              { label: 'Total',       value: 'AED ' + parseFloat(viewingPurchase.total || 0).toFixed(2) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: '#5A5852' }}>{row.label}</span>
                <span style={{ fontSize: 13, color: '#0B2A4A', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            {viewingPurchase.notes && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: '#5A5852' }}>{viewingPurchase.notes}</div>
            )}
            <button onClick={() => setViewingPurchase(null)} style={{ width: '100%', marginTop: 20, padding: 12, background: '#F0EFEA', border: 'none', borderRadius: 10, color: '#0B2A4A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CERRAR</button>
          </div>
        </div>
      )}

      {/* MODAL Nueva Factura de Compra */}
      {showNewPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 16, padding: 32, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ color: '#0B2A4A', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 6 }}>FACTURA DE COMPRA</div>
            <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nueva Compra</div>

            {/* Proveedor + N° */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>PROVEEDOR</div>
                <select value={purchaseForm.supplier_id}
                  onChange={e => {
                    const contact = contacts.find((c: any) => c.id === e.target.value)
                    setPurchaseForm((p: any) => ({ ...p, supplier_id: e.target.value, supplier_name: contact?.name || '' }))
                  }}
                  style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                  <option value="">Seleccionar proveedor</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>N° FACTURA PROVEEDOR</div>
                <input value={purchaseForm.invoice_number}
                  onChange={e => setPurchaseForm((p: any) => ({...p, invoice_number: e.target.value}))}
                  placeholder="ej. FACT-2026-001"
                  style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA EMISIÓN</div>
                <input type="date" value={purchaseForm.issue_date}
                  onChange={e => setPurchaseForm((p: any) => ({...p, issue_date: e.target.value}))}
                  style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
              <div>
                <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA VENCIMIENTO</div>
                <input type="date" value={purchaseForm.due_date}
                  onChange={e => setPurchaseForm((p: any) => ({...p, due_date: e.target.value}))}
                  style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Líneas */}
            <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>PRODUCTOS / LÍNEAS</div>
            <div style={{ background: '#FAFAF7', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FFFFFF' }}>
                    {['Producto','Cuenta','Cant.','P. Unit.','Desc.','Subtotal',''].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontSize: 10, letterSpacing: '1px', fontFamily: 'Outfit,sans-serif', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchaseForm.lines.map((line: any, i: number) => {
                    const lineTotal = (parseFloat(line.quantity)||0) * (parseFloat(line.unit_price)||0) - (parseFloat(line.discount)||0)
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #1a1a1e' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <select
                              value={line.inventory_item_id}
                              onChange={e => {
                                const item = inventoryItems.find((it: any) => it.id === e.target.value)
                                updatePurchaseLine(i, 'inventory_item_id', e.target.value)
                                updatePurchaseLine(i, 'description', item?.name || '')
                              }}
                              style={{ width: 180, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 6, color: '#0B2A4A', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                              <option value="">Seleccionar producto...</option>
                              {inventoryItems.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}{' '}({item.stock_qty ?? 0} {item.unit || 'u'})
                                </option>
                              ))}
                            </select>
                            {line.inventory_item_id && (
                              <input
                                value={line.description}
                                onChange={e => updatePurchaseLine(i, 'description', e.target.value)}
                                placeholder="Descripción adicional"
                                style={{ width: 180, padding: '4px 8px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 6, color: '#5A5852', fontSize: 11, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select value={line.account_id}
                            onChange={e => updatePurchaseLine(i, 'account_id', e.target.value)}
                            style={{ width: 160, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 6, color: '#0B2A4A', fontSize: 11, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                            <option value="">Cuenta...</option>
                            <optgroup label="INVENTARIO">
                              <option value="inv-1300">1300 — Inventario</option>
                            </optgroup>
                            <optgroup label="COSTO SERVICIOS">
                              {expenseAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </optgroup>
                          </select>
                        </td>
                        
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="1"
                            value={line.quantity}
                            onChange={e => updatePurchaseLine(i, 'quantity', e.target.value)}
                            style={{ width: 55, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 6, color: '#0B2A4A', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0"
                            value={line.unit_price}
                            onChange={e => updatePurchaseLine(i, 'unit_price', e.target.value)}
                            style={{ width: 75, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 6, color: '#0B2A4A', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0"
                            value={line.discount}
                            onChange={e => updatePurchaseLine(i, 'discount', e.target.value)}
                            placeholder="0"
                            style={{ width: 55, padding: '6px 8px', background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 6, color: '#0B2A4A', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px', color: '#0B2A4A', fontWeight: 700, fontSize: 12 }}>AED {lineTotal.toFixed(2)}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {purchaseForm.lines.length > 1 && (
                            <button onClick={() => setPurchaseForm((p: any) => ({ ...p, lines: p.lines.filter((_: any, idx: number) => idx !== i) }))}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, fontFamily: 'Outfit,sans-serif' }}>×</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Añadir línea */}
            <button
              onClick={() => setPurchaseForm((p: any) => ({ ...p, lines: [...p.lines, { description: '', account_id: '', inventory_item_id: '', quantity: 1, unit_price: 0, discount: 0, account_type: 'inventory' }] }))}
              style={{ background: 'transparent', border: '1px dashed #2a2a30', borderRadius: 8, color: '#5A5852', padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginBottom: 20, width: '100%', fontFamily: 'Outfit,sans-serif' }}>
              + Agregar línea
            </button>

            {/* Descuento global + Totales */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>DESCUENTO GLOBAL (AED)</div>
                <input type="number" min="0"
                  value={purchaseForm.discount}
                  onChange={e => setPurchaseForm((p: any) => ({...p, discount: e.target.value}))}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
              <div style={{ flex: 1, background: '#FAFAF7', borderRadius: 8, padding: '12px 16px' }}>
                {[
                  { label: 'Subtotal',   value: subtotalLineas,                         color: '#0B2A4A', prefix: ''  },
                  { label: 'Descuento',  value: parseFloat(purchaseForm.discount) || 0, color: '#22c55e', prefix: '-' },
                  { label: 'VAT 5%',     value: formVAT,                                color: '#0B2A4A', prefix: ''  },
                  { label: 'TOTAL',      value: formTotal,                              color: '#0B2A4A', prefix: ''  },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: row.label === 'TOTAL' ? 'none' : '1px solid #1a1a1e', marginTop: row.label === 'TOTAL' ? 6 : 0 }}>
                    <span style={{ color: '#A8A6A0', fontSize: 12 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 13, fontWeight: row.label === 'TOTAL' ? 800 : 600 }}>{row.prefix}AED {row.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOTAS</div>
              <input value={purchaseForm.notes}
                onChange={e => setPurchaseForm((p: any) => ({...p, notes: e.target.value}))}
                placeholder="Observaciones adicionales"
                style={{ width: '100%', padding: '10px 14px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewPurchase(false)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #F0EFEA', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={handleSavePurchase} disabled={saving}
                style={{ flex: 2, padding: 13, background: '#F5B544', color: '#FAFAF7', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'GUARDANDO...' : 'GUARDAR FACTURA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Pagar factura */}
      {payingPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #F0EFEA', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ color: '#0B2A4A', fontSize: 20, fontWeight: 800 }}>Registrar Pago</div>
              <div style={{ color: '#A8A6A0', fontSize: 13, marginTop: 4 }}>
                {payingPurchase.supplier_name || payingPurchase.contacts?.name || '—'} · AED {parseFloat(payingPurchase.total || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>REFERENCIA DE PAGO *</div>
              <input value={payPurchaseForm.payment_reference}
                onChange={e => setPayPurchaseForm(p => ({...p, payment_reference: e.target.value}))}
                placeholder="ej. TRF-2026-001"
                style={{ width: '100%', padding: '12px 16px', background: '#FAFAF7', border: '1px solid #F0EFEA', borderRadius: 8, color: '#0B2A4A', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#5A5852', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>PAGAR DESDE *</div>
              {bankAccounts.map((account: any) => {
                const color    = getBankColor(account.account_type)
                const selected = payPurchaseForm.bank_account_id === account.id
                return (
                  <div key={account.id}
                    onClick={() => setPayPurchaseForm(p => ({...p, bank_account_id: account.id}))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: selected ? color + '15' : '#FAFAF7', border: `2px solid ${selected ? color : '#F0EFEA'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 4, background: color + '20', color, fontSize: 9, fontWeight: 800, fontFamily: 'Outfit,sans-serif' }}>
                        {getBankIcon(account.account_type, account.name)}
                      </span>
                      <div>
                        <div style={{ color: '#0B2A4A', fontSize: 13, fontWeight: 600 }}>{account.name}</div>
                        <div style={{ color: '#A8A6A0', fontSize: 11 }}>Saldo: AED {parseFloat(account.current_balance ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                    {selected && <span style={{ color, fontWeight: 800, fontSize: 18 }}>✓</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayingPurchase(null)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #F0EFEA', borderRadius: 10, color: '#5A5852', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={confirmPayPurchase} disabled={paying}
                style={{ flex: 2, padding: 13, background: '#22c55e', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: paying ? 0.6 : 1 }}>
                {paying ? 'PROCESANDO...' : 'CONFIRMAR PAGO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
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


export default function FinancePage() {
  const { t } = useLanguage()
  const tz = useTimezone()
  const [activeTab, setActiveTab] = useState('Costs & Expenses')
  const TAB_LABELS: Record<string, string> = {
    'Costs & Expenses': t('costsExpenses'),
    'Banks':            t('banks'),
    'Facturas':         'Facturas',
    'Compras':          'Compras',
  }

  return (
    <div style={{ padding: 24 }}>
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0B2A4A' }}>{t('finance')}</div>
        <div style={{ fontSize: 12, color: '#5A5852', marginTop: 3 }}>
          {tz.getToday().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                background: active ? '#F5B544' : '#FFFFFF',
                color:      active ? '#0d0d0f' : '#5A5852',
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
      {activeTab === 'Compras'          && <ComprasTab />}
    </div>
  )
}
