'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { DollarSign, TrendingUp, TrendingDown, Clock, Send, CheckCircle } from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

const STATUS_TABS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

export default function FinancePage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')

  function fetchInvoices() {
    const supabase = createClient()
    supabase
      .from('invoices')
      .select('*, contacts(name), bookings(price)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchInvoices() }, [])

  async function updateStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('invoices').update({ status }).eq('id', id)
    fetchInvoices()
  }

  const paidInvoices = invoices.filter((i) => i.status === 'Paid')
  const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalExpenses = totalRevenue * 0.35
  const netProfit = totalRevenue - totalExpenses
  const pendingCount = invoices.filter((i) => i.status !== 'Paid').length

  const displayed = statusFilter === 'All'
    ? invoices
    : invoices.filter((i) => i.status === statusFilter)

  return (
    <div style={{ padding: 24 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total Revenue" value={fmt(totalRevenue)} color="var(--cyan)" icon={DollarSign} sub="Paid invoices" />
        <KpiCard label="Total Expenses" value={fmt(totalExpenses)} color="var(--red)" icon={TrendingDown} sub="Est. 35% costs" />
        <KpiCard label="Net Profit" value={fmt(netProfit)} color="var(--gold)" icon={TrendingUp} sub="Revenue − Expenses" />
        <KpiCard label="Pending Invoices" value={pendingCount} color="#888580" icon={Clock} sub="Unpaid" />
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            className={`tab-btn${statusFilter === s ? ' tab-active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Invoices table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Invoice #', 'Client', 'Amount', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><SkeletonTable rows={6} cols={6} /></td></tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                  No invoices found
                </td>
              </tr>
            ) : (
              displayed.map((inv) => (
                <tr key={inv.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--gold)' }}>
                    {inv.invoice_number ?? `INV-${inv.id?.slice(-6)?.toUpperCase()}`}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{inv.contacts?.name ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{fmt(inv.amount ?? 0)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status ?? 'Draft'} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(inv.created_at).toLocaleDateString('en-AE')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'Draft' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(inv.id, 'Sent')}>
                          <Send size={11} /> Send
                        </button>
                      )}
                      {(inv.status === 'Sent' || inv.status === 'Overdue') && (
                        <button className="btn btn-cyan btn-sm" onClick={() => updateStatus(inv.id, 'Paid')}>
                          <CheckCircle size={11} /> Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
