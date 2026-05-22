// patch-vat-decimals.mjs — VAT neto + 2-decimal formatting in finance/page.tsx
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
    console.error('  looking for: ' + JSON.stringify(old.slice(0, 100)))
    process.exit(1)
  }
  src = src.replace(old, neo)
  n++
  console.log(`[OK] ${label}`)
}

// ─── 1. Fix aed helper to show 2 decimals ─────────────────────────────────────
patch(
  'aed helper 2 decimals',
  `const aed = (v: number) => \`AED \${(v ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}\``,
  `const aed = (v: number) => \`AED \${(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``
)

// ─── 2. Add tax to comprasPagadas select ──────────────────────────────────────
patch(
  'comprasPagadas select includes tax',
  `        .from('purchase_invoices')` + NL +
  `        .select('subtotal')` + NL +
  `        .eq('status', 'pagada')` + NL +
  `        .gte('payment_date', inicioMesStr)` + NL +
  `        .lte('payment_date', finMesStr),`,
  `        .from('purchase_invoices')` + NL +
  `        .select('subtotal, tax')` + NL +
  `        .eq('status', 'pagada')` + NL +
  `        .gte('payment_date', inicioMesStr)` + NL +
  `        .lte('payment_date', finMesStr),`
)

// ─── 3. Add vatPagadoMTD + vatNetoMTD after vatMTD calculation ────────────────
patch(
  'add vatPagadoMTD and vatNetoMTD vars',
  `    const vatMTD = (invoicesPagadas ?? []).reduce(` + NL +
  `      (sum, inv) => sum + Number(inv.tax ?? 0), 0` + NL +
  `    )` + NL +
  `    const expensesAmt`,
  `    const vatMTD = (invoicesPagadas ?? []).reduce(` + NL +
  `      (sum, inv) => sum + Number(inv.tax ?? 0), 0` + NL +
  `    )` + NL +
  `    const vatPagadoMTD = (comprasPagadas ?? []).reduce((sum, p) => sum + Number(p.tax ?? 0), 0)` + NL +
  `    const vatNetoMTD = vatMTD - vatPagadoMTD` + NL +
  `    const expensesAmt`
)

// ─── 4. Add vatPagadoMTD/vatNetoMTD to initial state ─────────────────────────
patch(
  'financeKPIs initial state adds vat fields',
  `    totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: '0.0', vatMTD: 0,`,
  `    totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: '0.0', vatMTD: 0, vatPagadoMTD: 0, vatNetoMTD: 0,`
)

// ─── 5. Add vatPagadoMTD/vatNetoMTD to setFinanceKPIs call ───────────────────
patch(
  'setFinanceKPIs adds vat fields',
  `      totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD,`,
  `      totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD, vatPagadoMTD, vatNetoMTD,`
)

// ─── 6. Update destructuring to include new vat fields ───────────────────────
patch(
  'destructuring adds vatPagadoMTD and vatNetoMTD',
  `  const { totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD, fixedCosts, variableCosts, operational } = financeKPIs`,
  `  const { totalRevenue, totalExpenses, netProfit, profitMargin, vatMTD, vatPagadoMTD, vatNetoMTD, fixedCosts, variableCosts, operational } = financeKPIs`
)

// ─── 7. Replace 4-card grid (with VAT) → 3-card grid + standalone VAT breakdown card ─
const OLD_GRID =
  `      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 8 : 10, marginBottom: 10 }}>` + NL +
  `        {[` + NL +
  `          { dot: '#00d4aa', label: t('totalRevenueMTD'),  value: aed(totalRevenue),   color: '#00d4aa', sub: \`+ AED \${vatMTD.toFixed(0)} VAT\` },` + NL +
  `          { dot: '#ff4f4f', label: t('totalExpensesMTD'), value: aed(totalExpenses),  color: '#ff4f4f', sub: null },` + NL +
  `          { dot: '#c9a84c', label: t('netProfitMTD'),     value: aed(netProfit),      color: '#c9a84c', sub: null },` + NL +
  `          { dot: '#06b6d4', label: 'VAT POR PAGAR',       value: aed(vatMTD),         color: '#06b6d4', sub: 'a entregar al FTA' },` + NL +
  `        ].map(k => (` + NL +
  `          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: isMobile ? 12 : 16 }}>` + NL +
  `            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>` + NL +
  `              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />` + NL +
  `              <span style={{ fontSize: 11, color: '#888580' }}>{k.label}</span>` + NL +
  `            </div>` + NL +
  `            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>` + NL +
  `            {k.sub && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{k.sub}</div>}` + NL +
  `          </div>` + NL +
  `        ))}` + NL +
  `      </div>`

const NEW_GRID =
  `      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 8 : 10, marginBottom: 10 }}>` + NL +
  `        {[` + NL +
  `          { dot: '#00d4aa', label: t('totalRevenueMTD'),  value: aed(totalRevenue),   color: '#00d4aa', sub: null },` + NL +
  `          { dot: '#ff4f4f', label: t('totalExpensesMTD'), value: aed(totalExpenses),  color: '#ff4f4f', sub: null },` + NL +
  `          { dot: '#c9a84c', label: t('netProfitMTD'),     value: aed(netProfit),      color: '#c9a84c', sub: null },` + NL +
  `        ].map(k => (` + NL +
  `          <div key={k.label} style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: isMobile ? 12 : 16 }}>` + NL +
  `            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>` + NL +
  `              <span style={{ width: 7, height: 7, borderRadius: '50%', background: k.dot, flexShrink: 0 }} />` + NL +
  `              <span style={{ fontSize: 11, color: '#888580' }}>{k.label}</span>` + NL +
  `            </div>` + NL +
  `            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>` + NL +
  `            {k.sub && <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{k.sub}</div>}` + NL +
  `          </div>` + NL +
  `        ))}` + NL +
  `      </div>` + NL +
  `      <div style={{ background: '#141416', border: '1px solid #06b6d430', borderRadius: 16, padding: 20, marginBottom: 10 }}>` + NL +
  `        <div style={{ color: '#888', fontSize: 11, fontWeight: 700, letterSpacing: '2px', marginBottom: 8 }}>VAT POR PAGAR (FTA)</div>` + NL +
  `        <div style={{ color: '#06b6d4', fontSize: 28, fontWeight: 900, marginBottom: 12 }}>` + NL +
  `          AED {vatNetoMTD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` + NL +
  `        </div>` + NL +
  `        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid #2a2a30' }}>` + NL +
  `          <div style={{ display: 'flex', justifyContent: 'space-between' }}>` + NL +
  `            <span style={{ color: '#666', fontSize: 11 }}>VAT cobrado (ventas)</span>` + NL +
  `            <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>+ AED {vatMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` + NL +
  `          </div>` + NL +
  `          <div style={{ display: 'flex', justifyContent: 'space-between' }}>` + NL +
  `            <span style={{ color: '#666', fontSize: 11 }}>VAT pagado (compras)</span>` + NL +
  `            <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}>- AED {vatPagadoMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` + NL +
  `          </div>` + NL +
  `          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #2a2a30' }}>` + NL +
  `            <span style={{ color: '#888', fontSize: 11, fontWeight: 700 }}>Neto a pagar FTA</span>` + NL +
  `            <span style={{ color: '#06b6d4', fontSize: 12, fontWeight: 800 }}>AED {vatNetoMTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>` + NL +
  `          </div>` + NL +
  `        </div>` + NL +
  `      </div>`

patch('4-card grid → 3-card grid + VAT breakdown card', OLD_GRID, NEW_GRID)

writeFileSync(FILE, src, 'utf8')
console.log(`\nDone — ${n} patches applied.`)
