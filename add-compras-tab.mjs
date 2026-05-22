// add-compras-tab.mjs — patches finance/page.tsx to add the Compras tab
import { readFileSync, writeFileSync } from 'fs'

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dir = dirname(fileURLToPath(import.meta.url))
const FILE  = resolve(__dir, 'app', '(dashboard)', 'finance', 'page.tsx')

const NL = '\r\n'

let src = readFileSync(FILE, 'utf8')
let n = 0

function patch(label, old, neo) {
  if (!src.includes(old)) {
    console.error(`[FAIL] Not found: ${label}`)
    console.error('  expected: ' + JSON.stringify(old.slice(0, 80)))
    process.exit(1)
  }
  src = src.replace(old, neo)
  n++
  console.log(`[OK] ${label}`)
}

// ─── 1. Add 'Compras' to MAIN_TABS ───────────────────────────────────────────
patch(
  'MAIN_TABS',
  `const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Facturas']`,
  `const MAIN_TABS = ['Costs & Expenses', 'Banks', 'Facturas', 'Compras']`
)

// ─── 2. Add 'Compras' to TAB_LABELS ──────────────────────────────────────────
patch(
  'TAB_LABELS entry',
  `    'Facturas':         'Facturas',`,
  `    'Facturas':         'Facturas',` + NL +
  `    'Compras':          'Compras',`
)

// ─── 3. Add ComprasTab render in content section ──────────────────────────────
patch(
  'content render',
  `      {activeTab === 'Facturas'         && <CostsTab invoicesOnly />}`,
  `      {activeTab === 'Facturas'         && <CostsTab invoicesOnly />}` + NL +
  `      {activeTab === 'Compras'          && <ComprasTab />}`
)

// ─── 4. Build the ComprasTab component string ─────────────────────────────────
const COMPRAS = `
// ─── COMPRAS TAB ─────────────────────────────────────────────────────────────
function ComprasTab() {
  const isMobile = useIsMobile()
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([])
  const [loading,          setLoading]          = useState(true)
  const [kpis,             setKpis]             = useState({ totalMTD: 0, pendiente: 0, ivaMTD: 0 })
  const [showNew,          setShowNew]          = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [payingPurchase,   setPayingPurchase]   = useState<any>(null)
  const [payRef,           setPayRef]           = useState('')
  const [payBankId,        setPayBankId]        = useState('')
  const [payError,         setPayError]         = useState('')
  const [paying,           setPaying]           = useState(false)
  const [bankAccounts,     setBankAccounts]     = useState<any[]>([])
  const [suppliers,        setSuppliers]        = useState<any[]>([])
  const [toasts,           setToasts]           = useState<Toast[]>([])
  const [purchaseForm,     setPurchaseForm]     = useState({
    supplier_id: '', supplier_name: '', invoice_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '', notes: '',
    lines: [{ description: '', quantity: '1', unit_price: '', discount: '0' }] as any[],
  })

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('purchase_invoices')
      .select('*, contacts(name)')
      .order('issue_date', { ascending: false })
    const rows = data ?? []
    setPurchaseInvoices(rows)
    const mtd        = rows.filter(r => r.issue_date >= firstOfMonth)
    const totalMTD   = mtd.reduce((s, r) => s + Number(r.subtotal ?? 0), 0)
    const ivaMTD     = mtd.reduce((s, r) => s + Number(r.tax    ?? 0), 0)
    const pendiente  = rows
      .filter(r => r.status === 'pendiente' || r.status === 'vencida')
      .reduce((s, r) => s + Number(r.total ?? 0), 0)
    setKpis({ totalMTD, pendiente, ivaMTD })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function updateLine(i: number, field: string, val: string) {
    setPurchaseForm(p => {
      const lines = [...p.lines]
      lines[i] = { ...lines[i], [field]: val }
      return { ...p, lines }
    })
  }

  function addLine() {
    setPurchaseForm(p => ({ ...p, lines: [...p.lines, { description: '', quantity: '1', unit_price: '', discount: '0' }] }))
  }

  function removeLine(i: number) {
    setPurchaseForm(p => ({ ...p, lines: p.lines.filter((_: any, idx: number) => idx !== i) }))
  }

  const lineSubtotals = purchaseForm.lines.map((l: any) => {
    const qty   = parseFloat(l.quantity  || '1')
    const price = parseFloat(l.unit_price|| '0')
    const disc  = parseFloat(l.discount  || '0')
    return qty * price * (1 - disc / 100)
  })
  const formSubtotal = lineSubtotals.reduce((s: number, v: number) => s + v, 0)
  const formVAT      = formSubtotal * 0.05
  const formTotal    = formSubtotal + formVAT

  async function handleSave() {
    if (!purchaseForm.invoice_number.trim()) { addToast('Introduce el número de factura', 'error'); return }
    if (!purchaseForm.issue_date)             { addToast('Introduce la fecha de emisión', 'error'); return }
    if (purchaseForm.lines.some((l: any) => !l.description.trim() || !l.unit_price)) {
      addToast('Completa todas las líneas de la factura', 'error'); return
    }
    setSaving(true)
    const supabase = createClient()
    const supplierName = purchaseForm.supplier_id
      ? (suppliers.find((s: any) => s.id === purchaseForm.supplier_id)?.name ?? '')
      : purchaseForm.supplier_name
    const { data: inv, error } = await supabase
      .from('purchase_invoices')
      .insert({
        supplier_id:    purchaseForm.supplier_id   || null,
        supplier_name:  supplierName,
        invoice_number: purchaseForm.invoice_number.trim(),
        issue_date:     purchaseForm.issue_date,
        due_date:       purchaseForm.due_date || null,
        subtotal:       formSubtotal,
        tax:            formVAT,
        total:          formTotal,
        status:         'pendiente',
        notes:          purchaseForm.notes.trim() || null,
      })
      .select()
      .single()
    if (error || !inv) { addToast('Error: ' + (error?.message ?? 'desconocido'), 'error'); setSaving(false); return }
    const lineRows = purchaseForm.lines.map((l: any, i: number) => ({
      purchase_invoice_id: inv.id,
      description:  l.description,
      quantity:     parseFloat(l.quantity  || '1'),
      unit_price:   parseFloat(l.unit_price|| '0'),
      discount:     parseFloat(l.discount  || '0'),
      subtotal:     lineSubtotals[i],
      account_type: 'expense',
    }))
    const { error: lineErr } = await supabase.from('purchase_invoice_lines').insert(lineRows)
    if (lineErr) { addToast('Error en líneas: ' + lineErr.message, 'error'); setSaving(false); return }
    addToast('Factura de compra registrada')
    setShowNew(false)
    setPurchaseForm({ supplier_id: '', supplier_name: '', invoice_number: '', issue_date: new Date().toISOString().slice(0, 10), due_date: '', notes: '', lines: [{ description: '', quantity: '1', unit_price: '', discount: '0' }] })
    load()
    setSaving(false)
  }

  async function openPayModal(inv: any) {
    const { data: banks } = await createClient().from('bank_accounts').select('*').eq('is_active', true).order('name')
    setBankAccounts(banks ?? [])
    setPayBankId('')
    setPayRef('')
    setPayError('')
    setPayingPurchase(inv)
  }

  async function confirmPay() {
    if (!payRef.trim()) { setPayError('Introduce la referencia del pago'); return }
    if (!payBankId)     { setPayError('Selecciona la cuenta bancaria');    return }
    setPaying(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_invoices')
      .update({ status: 'pagada', payment_reference: payRef.trim(), payment_date: new Date().toISOString().slice(0, 10), bank_account_id: payBankId })
      .eq('id', payingPurchase.id)
    if (error) { setPayError('Error: ' + error.message); setPaying(false); return }
    const bank = bankAccounts.find((b: any) => b.id === payBankId)
    if (bank) {
      const cur = parseFloat(bank.current_balance ?? bank.balance ?? 0)
      await supabase
        .from('bank_accounts')
        .update({ current_balance: cur - parseFloat(payingPurchase.total ?? 0), updated_at: new Date().toISOString() })
        .eq('id', payBankId)
    }
    addToast('Pago registrado correctamente')
    setPayingPurchase(null)
    setPaying(false)
    load()
  }

  async function handleVoid(inv: any) {
    if (!window.confirm('¿Anular esta factura de compra?')) return
    const { error } = await createClient()
      .from('purchase_invoices')
      .update({ status: 'anulada', voided_at: new Date().toISOString() })
      .eq('id', inv.id)
    if (error) { addToast('Error al anular', 'error'); return }
    addToast('Factura anulada')
    load()
  }

  const ST: Record<string, { bg: string; color: string }> = {
    pendiente: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
    pagada:    { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
    vencida:   { bg: 'rgba(255,79,79,0.15)',   color: '#ff4f4f' },
    anulada:   { bg: 'rgba(136,133,128,0.12)', color: '#888580' },
  }

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: '#888580', marginBottom: 8 }}>COMPRAS MTD</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0ede8' }}>{aed(kpis.totalMTD)}</div>
          <div style={{ fontSize: 11, color: '#888580', marginTop: 4 }}>subtotal sin VAT</div>
        </div>
        <div style={{ background: '#141416', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: '#ff4f4f', marginBottom: 8 }}>PENDIENTE DE PAGO</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0ede8' }}>{aed(kpis.pendiente)}</div>
          <div style={{ fontSize: 11, color: '#888580', marginTop: 4 }}>facturas por pagar</div>
        </div>
        <div style={{ background: '#141416', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '16px 20px', gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', color: '#06b6d4', marginBottom: 8 }}>IVA SOPORTADO MTD</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f0ede8' }}>{aed(kpis.ivaMTD)}</div>
          <div style={{ fontSize: 11, color: '#888580', marginTop: 4 }}>VAT pagado a proveedores</div>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ede8' }}>Facturas de Compra</div>
        <button onClick={async () => {
          const { data: sups } = await createClient().from('contacts').select('id, name').eq('type', 'supplier').order('name')
          setSuppliers(sups ?? [])
          setShowNew(true)
        }} style={{ padding: '8px 18px', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
          + NUEVA COMPRA
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888580', fontSize: 13 }}>Cargando...</div>
      ) : purchaseInvoices.length === 0 ? (
        <EmptyState icon="expense" title="Sin facturas de compra" subtitle="Registra tus primeras facturas de proveedor aquí" />
      ) : (
        <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 100px 110px 140px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: '#888580' }}>
              <div>PROVEEDOR</div><div>Nº FACTURA</div><div>FECHA</div><div>VENCIMIENTO</div><div>TOTAL</div><div>ESTADO</div>
            </div>
          )}
          {purchaseInvoices.map((inv: any, i: number) => {
            const isOverdue = inv.status === 'pendiente' && inv.due_date && new Date(inv.due_date) < new Date()
            const st        = isOverdue ? ST['vencida'] : (ST[inv.status] ?? ST['pendiente'])
            const label     = isOverdue ? 'VENCIDA' : inv.status.toUpperCase()
            return (
              <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1fr 1fr 90px 100px 110px 140px', padding: '12px 16px', borderBottom: i < purchaseInvoices.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8' }}>{inv.contacts?.name ?? inv.supplier_name ?? '—'}</div>
                  {isMobile && <div style={{ fontSize: 11, color: '#888580', marginTop: 2 }}>{inv.invoice_number} · {aed(Number(inv.total))}</div>}
                </div>
                {!isMobile && <div style={{ fontSize: 12, color: '#888580' }}>{inv.invoice_number}</div>}
                {!isMobile && <div style={{ fontSize: 12, color: '#888580' }}>{inv.issue_date ? new Date(inv.issue_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : '—'}</div>}
                {!isMobile && <div style={{ fontSize: 12, color: isOverdue ? '#ff4f4f' : '#888580' }}>{inv.due_date ? new Date(inv.due_date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</div>}
                {!isMobile && <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ede8' }}>{aed(Number(inv.total))}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{label}</span>
                  {(inv.status === 'pendiente' || isOverdue) && (
                    <button onClick={() => openPayModal(inv)} style={{ padding: '3px 10px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#c9a84c', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>PAGAR</button>
                  )}
                  {inv.status !== 'pagada' && inv.status !== 'anulada' && (
                    <button onClick={() => handleVoid(inv)} style={{ padding: '3px 10px', background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.2)', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#ff4f4f', cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>ANULAR</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Nueva Compra Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px' }}>FACTURAS DE COMPRA</div>
                <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Nueva Factura de Proveedor</div>
              </div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}><X size={20}/></button>
            </div>

            {/* Proveedor + Número */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>PROVEEDOR</div>
                <select value={purchaseForm.supplier_id} onChange={e => setPurchaseForm(p => ({ ...p, supplier_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: purchaseForm.supplier_id ? '#fff' : '#555', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                  <option value="">Seleccionar proveedor...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>Nº DE FACTURA *</div>
                <input value={purchaseForm.invoice_number} onChange={e => setPurchaseForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="ej. INV-2025-001"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA DE EMISIÓN *</div>
                <input type="date" value={purchaseForm.issue_date} onChange={e => setPurchaseForm(p => ({ ...p, issue_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA DE VENCIMIENTO</div>
                <input type="date" value={purchaseForm.due_date} onChange={e => setPurchaseForm(p => ({ ...p, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Líneas */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>LÍNEAS DE FACTURA</div>
              <div style={{ background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 10, overflow: 'hidden' }}>
                {!isMobile && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 72px 100px 72px 90px 32px', padding: '8px 12px', borderBottom: '1px solid #2a2a30', fontSize: 10, fontWeight: 700, letterSpacing: '1px', color: '#666' }}>
                    <div>DESCRIPCIÓN</div><div>CANT.</div><div>PRECIO</div><div>DCTO%</div><div style={{ textAlign: 'right' }}>SUBTOTAL</div><div></div>
                  </div>
                )}
                {purchaseForm.lines.map((line: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 72px 100px 72px 90px 32px', padding: '8px 12px', borderBottom: i < purchaseForm.lines.length - 1 ? '1px solid #1a1a1e' : 'none', gap: 6, alignItems: 'center' }}>
                    <input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Descripción del producto / servicio"
                      style={{ padding: '6px 10px', background: '#141416', border: '1px solid #2a2a30', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif', width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" min="0.001" step="0.001" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                      style={{ padding: '6px 10px', background: '#141416', border: '1px solid #2a2a30', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif', width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} placeholder="0.00"
                      style={{ padding: '6px 10px', background: '#141416', border: '1px solid #2a2a30', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif', width: '100%', boxSizing: 'border-box' }} />
                    <input type="number" min="0" max="100" value={line.discount} onChange={e => updateLine(i, 'discount', e.target.value)}
                      style={{ padding: '6px 10px', background: '#141416', border: '1px solid #2a2a30', borderRadius: 6, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif', width: '100%', boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#c9a84c', textAlign: 'right' }}>{aed(lineSubtotals[i] ?? 0)}</div>
                    {purchaseForm.lines.length > 1 ? (
                      <button onClick={() => removeLine(i)} style={{ width: 28, height: 28, background: 'none', border: '1px solid rgba(255,79,79,0.3)', borderRadius: 6, color: '#ff4f4f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14}/></button>
                    ) : <div/>}
                  </div>
                ))}
                <div style={{ padding: '8px 12px', borderTop: '1px solid #2a2a30' }}>
                  <button onClick={addLine} style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', padding: 0 }}>+ Añadir línea</button>
                </div>
              </div>
            </div>

            {/* Totales */}
            <div style={{ background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Subtotal</span>
                <span style={{ fontSize: 12, color: '#f0ede8', fontWeight: 600 }}>{aed(formSubtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#06b6d4' }}>VAT (5%)</span>
                <span style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600 }}>{aed(formVAT)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a30', paddingTop: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f0ede8' }}>TOTAL</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#c9a84c' }}>{aed(formTotal)}</span>
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOTAS</div>
              <textarea value={purchaseForm.notes} onChange={e => setPurchaseForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notas adicionales..."
                style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif', resize: 'vertical', minHeight: 72, boxSizing: 'border-box' }} />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 13, background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'GUARDANDO...' : 'REGISTRAR COMPRA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago */}
      {payingPurchase && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Registrar Pago</div>
              <button onClick={() => setPayingPurchase(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <div style={{ background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Proveedor</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ede8' }}>{payingPurchase.contacts?.name ?? payingPurchase.supplier_name ?? '—'}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 2 }}>Total a pagar</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ff4f4f' }}>{aed(Number(payingPurchase.total))}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>REFERENCIA DE PAGO *</div>
              <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Nº transferencia, cheque..."
                style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>CUENTA BANCARIA *</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bankAccounts.map((b: any) => {
                  const bal      = parseFloat(b.current_balance ?? b.balance ?? 0)
                  const afterPay = bal - parseFloat(payingPurchase.total ?? 0)
                  const sel      = payBankId === b.id
                  return (
                    <button key={b.id} onClick={() => setPayBankId(b.id)}
                      style={{ padding: '10px 14px', background: sel ? 'rgba(201,168,76,0.12)' : '#0d0d0f', border: \`1px solid \${sel ? '#c9a84c' : '#2a2a30'}\`, borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'Outfit,sans-serif' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ede8' }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>Saldo: {aed(bal)} → {aed(afterPay)}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            {payError && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,79,79,0.1)', border: '1px solid rgba(255,79,79,0.3)', borderRadius: 8, color: '#ff4f4f', fontSize: 12, marginBottom: 14 }}>{payError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayingPurchase(null)} style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={confirmPay} disabled={paying} style={{ flex: 2, padding: 13, background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: paying ? 0.6 : 1 }}>
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

`.replace(/\n/g, NL)

// ─── 5. Insert ComprasTab before the export default ──────────────────────────
patch(
  'insert ComprasTab',
  `export default function FinancePage() {`,
  COMPRAS + `export default function FinancePage() {`
)

writeFileSync(FILE, src, 'utf8')
console.log(`\nDone — ${n} patches applied.`)
