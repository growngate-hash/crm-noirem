import { SupabaseClient } from '@supabase/supabase-js'

export async function getMonthlyExpenses(
  supabase: SupabaseClient,
  inicioMesStr: string,
  finMesStr: string
): Promise<{
  expensesAmt: number
  comprasAmt: number
  nominaAmt: number
  total: number
}> {
  const [{ data: gastos }, { data: compras }, { data: nomina }] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount')
      .gte('date', inicioMesStr)
      .lte('date', finMesStr),

    supabase
      .from('purchase_invoices')
      .select('subtotal, status, payment_date')
      .neq('status', 'anulada'),

    supabase
      .from('payroll_periods')
      .select('total_amount')
      .eq('status', 'paid')
      .gte('paid_at', inicioMesStr)
      .lte('paid_at', finMesStr + 'T23:59:59'),
  ])

  const expensesAmt = (gastos ?? [])
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

  const comprasAmt = (compras ?? [])
    .filter(p =>
      p.status === 'pagada' &&
      (p.payment_date ?? '') >= inicioMesStr &&
      (p.payment_date ?? '') <= finMesStr
    )
    .reduce((sum, p) => sum + Number(p.subtotal ?? 0), 0)

  const nominaAmt = (nomina ?? [])
    .reduce((sum, p) => sum + Number(p.total_amount ?? 0), 0)

  return {
    expensesAmt,
    comprasAmt,
    nominaAmt,
    total: expensesAmt + comprasAmt + nominaAmt,
  }
}
