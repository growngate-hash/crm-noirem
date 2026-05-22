// replace-compras-tab.mjs — replaces ComprasTab with the detailed purchase-invoice version
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const FILE  = resolve(__dir, 'app', '(dashboard)', 'finance', 'page.tsx')
const NL = '\r\n'

let src = readFileSync(FILE, 'utf8')

// ─── build the replacement ────────────────────────────────────────────────────
const NEW_TAB = `
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
    supabase.from('inventory').select('id, name, product_name').order('name').then(({ data }: any) => setInventoryItems(data ?? []))
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
    const { subtotalNeto, vat, total } = calcPurchaseTotals(purchaseForm.lines, purchaseForm.discount)
    const { data: invoice, error } = await supabase
      .from('purchase_invoices')
      .insert({
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
    const { data: invAccount } = await supabase.from('chart_of_accounts').select('id').eq('code', '1300').single()
    for (const line of purchaseForm.lines) {
      if (!line.description.trim()) continue
      const lineSubtotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0) - (parseFloat(line.discount) || 0)
      const accountId = line.account_id === 'inv-1300' ? (invAccount as any)?.id : (line.account_id || (invAccount as any)?.id)
      await supabase.from('purchase_invoice_lines').insert({
        purchase_invoice_id: invoice.id,
        inventory_item_id:   line.inventory_item_id || null,
        account_id:          accountId || null,
        description:         line.description,
        quantity:            parseFloat(line.quantity)   || 1,
        unit_price:          parseFloat(line.unit_price) || 0,
        discount:            parseFloat(line.discount)   || 0,
        subtotal:            lineSubtotal,
        account_type:        line.account_id === 'inv-1300' ? 'inventory' : 'expense',
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
          { label: 'IVA ACREDITABLE',     value: purchaseKPIs.ivaMTD,    color: '#06b6d4' },
        ] as const).map(kpi => (
          <div key={kpi.label} style={{ background: '#141416', border: \`1px solid \${kpi.color}30\`, borderRadius: 16, padding: 20 }}>
            <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ color: kpi.color, fontSize: 28, fontWeight: 900 }}>{aed(kpi.value)}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#f0ede8', fontSize: 16, fontWeight: 800 }}>
          Facturas de Compra
          <span style={{ color: '#666', fontSize: 13, fontWeight: 400, marginLeft: 8 }}>{purchaseInvoices.length} facturas</span>
        </div>
        <button onClick={() => setShowNewPurchase(true)}
          style={{ padding: '10px 20px', background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
          + NUEVA COMPRA
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888580', fontSize: 13 }}>Cargando...</div>
      ) : purchaseInvoices.length === 0 ? (
        <EmptyState icon="expense" title="Sin facturas de compra" subtitle="Registra las compras de productos a tus proveedores" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead>
              <tr style={{ background: '#1a1a1e' }}>
                {['N° FACTURA','PROVEEDOR','EMISIÓN','VENCIMIENTO','SUBTOTAL','IVA','TOTAL','ESTADO','ACCIONES'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#888', fontSize: 11, letterSpacing: '1px', borderBottom: '1px solid #2a2a30', fontFamily: 'Outfit,sans-serif', fontWeight: 700 }}>{h}</th>
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
                  ? { label: 'ANULADA',  color: '#666',    bg: '#2a2a30'   }
                  : isOverdue
                  ? { label: 'VENCIDA',  color: '#ef4444', bg: '#ef444420' }
                  : { label: 'PENDIENTE',color: '#f59e0b', bg: '#f59e0b20' }
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #1a1a1e' }}>
                    <td style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700, fontSize: 13 }}>{inv.invoice_number || inv.id.slice(0,8).toUpperCase()}</td>
                    <td style={{ padding: '12px 14px', color: '#f0ede8', fontSize: 13 }}>{inv.supplier_name || inv.contacts?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#888', fontSize: 12 }}>{inv.issue_date ? new Date(inv.issue_date + 'T12:00:00').toLocaleDateString('es-ES') : '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12 }}>
                      {inv.due_date ? (
                        <span style={{ color: isOverdue ? '#ef4444' : isDueSoon ? '#f59e0b' : '#888' }}>
                          {new Date(inv.due_date + 'T12:00:00').toLocaleDateString('es-ES')}{isOverdue ? ' ⚠' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#f0ede8', fontSize: 13 }}>AED {parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px', color: '#06b6d4', fontSize: 13 }}>AED {parseFloat(inv.tax || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px', color: '#c9a84c', fontSize: 13, fontWeight: 700 }}>AED {parseFloat(inv.total || 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, border: \`1px solid \${sc.color}40\`, borderRadius: 6, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewingPurchase(inv)}
                          style={{ padding: '5px 10px', background: '#2a2a30', border: '1px solid #3a3a40', borderRadius: 6, color: '#f0ede8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>VER</button>
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
          <div style={{ background: '#141416', border: '1px solid #2a2a30', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 4 }}>FACTURA DE COMPRA</div>
                <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800 }}>{viewingPurchase.invoice_number || viewingPurchase.id.slice(0,8).toUpperCase()}</div>
              </div>
              <button onClick={() => setViewingPurchase(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            {[
              { label: 'Proveedor',   value: viewingPurchase.supplier_name || viewingPurchase.contacts?.name || '—' },
              { label: 'Emisión', value: viewingPurchase.issue_date ? new Date(viewingPurchase.issue_date + 'T12:00:00').toLocaleDateString('es-ES') : '—' },
              { label: 'Vencimiento', value: viewingPurchase.due_date ? new Date(viewingPurchase.due_date + 'T12:00:00').toLocaleDateString('es-ES') : '—' },
              { label: 'Estado',      value: viewingPurchase.status?.toUpperCase() },
              { label: 'Subtotal',    value: 'AED ' + parseFloat(viewingPurchase.subtotal || 0).toFixed(2) },
              { label: 'IVA',         value: 'AED ' + parseFloat(viewingPurchase.tax || 0).toFixed(2) },
              { label: 'Total',       value: 'AED ' + parseFloat(viewingPurchase.total || 0).toFixed(2) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 12, color: '#888' }}>{row.label}</span>
                <span style={{ fontSize: 13, color: '#f0ede8', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            {viewingPurchase.notes && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: '#888580' }}>{viewingPurchase.notes}</div>
            )}
            <button onClick={() => setViewingPurchase(null)} style={{ width: '100%', marginTop: 20, padding: 12, background: '#2a2a30', border: 'none', borderRadius: 10, color: '#f0ede8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CERRAR</button>
          </div>
        </div>
      )}

      {/* MODAL Nueva Factura de Compra */}
      {showNewPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#141416', border: '1px solid #2a2a30', borderRadius: 16, padding: 32, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ color: '#c9a84c', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 6 }}>FACTURA DE COMPRA</div>
            <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Nueva Compra</div>

            {/* Proveedor + N° */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>PROVEEDOR</div>
                <select value={purchaseForm.supplier_id}
                  onChange={e => {
                    const contact = contacts.find((c: any) => c.id === e.target.value)
                    setPurchaseForm((p: any) => ({ ...p, supplier_id: e.target.value, supplier_name: contact?.name || '' }))
                  }}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                  <option value="">Seleccionar proveedor</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>N° FACTURA PROVEEDOR</div>
                <input value={purchaseForm.invoice_number}
                  onChange={e => setPurchaseForm((p: any) => ({...p, invoice_number: e.target.value}))}
                  placeholder="ej. FACT-2026-001"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA EMISIÓN</div>
                <input type="date" value={purchaseForm.issue_date}
                  onChange={e => setPurchaseForm((p: any) => ({...p, issue_date: e.target.value}))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>FECHA VENCIMIENTO</div>
                <input type="date" value={purchaseForm.due_date}
                  onChange={e => setPurchaseForm((p: any) => ({...p, due_date: e.target.value}))}
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
            </div>

            {/* Líneas */}
            <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 10 }}>PRODUCTOS / LÍNEAS</div>
            <div style={{ background: '#0d0d0f', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a1a1e' }}>
                    {['Descripción','Cuenta','Item Inv.','Cant.','P. Unit.','Desc.','Subtotal',''].map(h => (
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
                          <input value={line.description}
                            onChange={e => updatePurchaseLine(i, 'description', e.target.value)}
                            placeholder="Producto"
                            style={{ width: 120, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select value={line.account_id}
                            onChange={e => updatePurchaseLine(i, 'account_id', e.target.value)}
                            style={{ width: 160, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 11, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
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
                          <select value={line.inventory_item_id}
                            onChange={e => updatePurchaseLine(i, 'inventory_item_id', e.target.value)}
                            style={{ width: 120, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 11, outline: 'none', fontFamily: 'Outfit,sans-serif' }}>
                            <option value="">Sin item</option>
                            {inventoryItems.map((item: any) => <option key={item.id} value={item.id}>{item.product_name || item.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="1"
                            value={line.quantity}
                            onChange={e => updatePurchaseLine(i, 'quantity', e.target.value)}
                            style={{ width: 55, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0"
                            value={line.unit_price}
                            onChange={e => updatePurchaseLine(i, 'unit_price', e.target.value)}
                            style={{ width: 75, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0"
                            value={line.discount}
                            onChange={e => updatePurchaseLine(i, 'discount', e.target.value)}
                            placeholder="0"
                            style={{ width: 55, padding: '6px 8px', background: '#1a1a1e', border: '1px solid #2a2a30', borderRadius: 6, color: '#f0ede8', fontSize: 12, outline: 'none', fontFamily: 'Outfit,sans-serif' }} />
                        </td>
                        <td style={{ padding: '6px 8px', color: '#c9a84c', fontWeight: 700, fontSize: 12 }}>AED {lineTotal.toFixed(2)}</td>
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
              style={{ background: 'transparent', border: '1px dashed #2a2a30', borderRadius: 8, color: '#888', padding: '8px 16px', fontSize: 12, cursor: 'pointer', marginBottom: 20, width: '100%', fontFamily: 'Outfit,sans-serif' }}>
              + Agregar línea
            </button>

            {/* Descuento global + Totales */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>DESCUENTO GLOBAL (AED)</div>
                <input type="number" min="0"
                  value={purchaseForm.discount}
                  onChange={e => setPurchaseForm((p: any) => ({...p, discount: e.target.value}))}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
              </div>
              <div style={{ flex: 1, background: '#0d0d0f', borderRadius: 8, padding: '12px 16px' }}>
                {[
                  { label: 'Subtotal',   value: subtotalLineas,                         color: '#f0ede8', prefix: ''  },
                  { label: 'Descuento',  value: parseFloat(purchaseForm.discount) || 0, color: '#22c55e', prefix: '-' },
                  { label: 'VAT 5%',     value: formVAT,                                color: '#06b6d4', prefix: ''  },
                  { label: 'TOTAL',      value: formTotal,                              color: '#c9a84c', prefix: ''  },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: row.label === 'TOTAL' ? 'none' : '1px solid #1a1a1e', marginTop: row.label === 'TOTAL' ? 6 : 0 }}>
                    <span style={{ color: '#666', fontSize: 12 }}>{row.label}</span>
                    <span style={{ color: row.color, fontSize: 13, fontWeight: row.label === 'TOTAL' ? 800 : 600 }}>{row.prefix}AED {row.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>NOTAS</div>
              <input value={purchaseForm.notes}
                onChange={e => setPurchaseForm((p: any) => ({...p, notes: e.target.value}))}
                placeholder="Observaciones adicionales"
                style={{ width: '100%', padding: '10px 14px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNewPurchase(false)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
              <button onClick={handleSavePurchase} disabled={saving}
                style={{ flex: 2, padding: 13, background: '#c9a84c', color: '#0d0d0f', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit,sans-serif', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'GUARDANDO...' : 'GUARDAR FACTURA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL Pagar factura */}
      {payingPurchase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#141416', border: '1px solid #2a2a30', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 800 }}>Registrar Pago</div>
              <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                {payingPurchase.supplier_name || payingPurchase.contacts?.name || '—'} · AED {parseFloat(payingPurchase.total || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 6 }}>REFERENCIA DE PAGO *</div>
              <input value={payPurchaseForm.payment_reference}
                onChange={e => setPayPurchaseForm(p => ({...p, payment_reference: e.target.value}))}
                placeholder="ej. TRF-2026-001"
                style={{ width: '100%', padding: '12px 16px', background: '#0d0d0f', border: '1px solid #2a2a30', borderRadius: 8, color: '#f0ede8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 8 }}>PAGAR DESDE *</div>
              {bankAccounts.map((account: any) => {
                const color    = getBankColor(account.account_type)
                const selected = payPurchaseForm.bank_account_id === account.id
                return (
                  <div key={account.id}
                    onClick={() => setPayPurchaseForm(p => ({...p, bank_account_id: account.id}))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: selected ? color + '15' : '#0d0d0f', border: \`2px solid \${selected ? color : '#2a2a30'}\`, borderRadius: 10, cursor: 'pointer', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 4, background: color + '20', color, fontSize: 9, fontWeight: 800, fontFamily: 'Outfit,sans-serif' }}>
                        {getBankIcon(account.account_type, account.name)}
                      </span>
                      <div>
                        <div style={{ color: '#f0ede8', fontSize: 13, fontWeight: 600 }}>{account.name}</div>
                        <div style={{ color: '#666', fontSize: 11 }}>Saldo: AED {parseFloat(account.current_balance ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                    {selected && <span style={{ color, fontWeight: 800, fontSize: 18 }}>✓</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPayingPurchase(null)}
                style={{ flex: 1, padding: 13, background: 'transparent', border: '1px solid #2a2a30', borderRadius: 10, color: '#888', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>CANCELAR</button>
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

`.replace(/\n/g, NL)

// ─── replace existing ComprasTab ─────────────────────────────────────────────
const pattern = /\/\/[^\r\n]*COMPRAS TAB[^\r\n]*\r\nfunction ComprasTab\(\)[\s\S]*?(?=\r\nexport default function FinancePage\(\))/

if (!pattern.test(src)) {
  // fallback: just replace from function declaration
  const alt = /function ComprasTab\(\)[\s\S]*?(?=\r\nexport default function FinancePage\(\))/
  if (!alt.test(src)) {
    console.error('ComprasTab not found in file')
    process.exit(1)
  }
  src = src.replace(alt, NEW_TAB.replace(/^\r\n/, ''))
  console.log('[OK] Replaced via fallback pattern')
} else {
  src = src.replace(pattern, NEW_TAB.replace(/^\r\n/, ''))
  console.log('[OK] Replaced ComprasTab (with comment)')
}

writeFileSync(FILE, src, 'utf8')
console.log('Done.')
