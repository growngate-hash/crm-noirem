// patch-vat-fta.mjs — VAT acreditable incluye todas las facturas recibidas (FTA UAE)
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
    console.error('  looking for: ' + JSON.stringify(old.slice(0, 120)))
    process.exit(1)
  }
  src = src.replace(old, neo)
  n++
  console.log(`[OK] ${label}`)
}

// ─── 1. Rename comprasPagadas → todasLasCompras in destructuring ──────────────
patch(
  'rename comprasPagadas in destructuring',
  `const [{ data: invoicesPagadas }, { data: gastos }, { data: comprasPagadas }] = await Promise.all([`,
  `const [{ data: invoicesPagadas }, { data: gastos }, { data: todasLasCompras }] = await Promise.all([`
)

// ─── 2. Replace MTD-pagadas-only query with all non-anuladas ──────────────────
patch(
  'purchase_invoices query: all non-anuladas',
  `      supabase` + NL +
  `        .from('purchase_invoices')` + NL +
  `        .select('subtotal, tax')` + NL +
  `        .eq('status', 'pagada')` + NL +
  `        .gte('payment_date', inicioMesStr)` + NL +
  `        .lte('payment_date', finMesStr),`,
  `      supabase` + NL +
  `        .from('purchase_invoices')` + NL +
  `        .select('subtotal, tax, status, created_at, payment_date')` + NL +
  `        .neq('status', 'anulada'),`
)

// ─── 3. Update calculations: vatPagadoMTD + comprasAmt ───────────────────────
patch(
  'vatPagadoMTD and comprasAmt use todasLasCompras',
  `    const vatPagadoMTD = (comprasPagadas ?? []).reduce((sum, p) => sum + Number(p.tax ?? 0), 0)` + NL +
  `    const vatNetoMTD = vatMTD - vatPagadoMTD` + NL +
  `    const expensesAmt  = (gastos ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)` + NL +
  `    const comprasAmt   = (comprasPagadas ?? []).reduce((sum, p) => sum + Number(p.subtotal ?? 0), 0)` + NL +
  `    const totalExpenses = expensesAmt + comprasAmt`,
  `    const vatPagadoMTD = (todasLasCompras ?? [])` + NL +
  `      .filter(p => (p.created_at ?? '') >= inicioMesStr)` + NL +
  `      .reduce((sum, p) => sum + Number(p.tax ?? 0), 0)` + NL +
  `    const vatNetoMTD = vatMTD - vatPagadoMTD` + NL +
  `    const expensesAmt  = (gastos ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0)` + NL +
  `    const comprasAmt   = (todasLasCompras ?? [])` + NL +
  `      .filter(p => p.status === 'pagada' && (p.payment_date ?? '') >= inicioMesStr && (p.payment_date ?? '') <= finMesStr)` + NL +
  `      .reduce((sum, p) => sum + Number(p.subtotal ?? 0), 0)` + NL +
  `    const totalExpenses = expensesAmt + comprasAmt`
)

writeFileSync(FILE, src, 'utf8')
console.log(`\nDone — ${n} patches applied.`)
