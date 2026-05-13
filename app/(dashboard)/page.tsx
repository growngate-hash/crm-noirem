'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Calendar, Activity, ShoppingCart, Star
} from 'lucide-react'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const TIER_COLORS: Record<string, string> = {
  'Ultra-VIP': 'linear-gradient(135deg,#00d4aa,#00a87e)',
  VIP: 'linear-gradient(135deg,#c9a84c,#a07830)',
  Standard: 'linear-gradient(135deg,#555,#333)',
}

const STATUS_ACTIVE = ['Pending', 'Confirmed', 'In Progress']

export default function DashboardPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('bookings')
        .select('*, contacts(*), vehicles(*), services(*)')
        .order('created_at', { ascending: false }),
      supabase.from('inventory').select('*'),
    ]).then(([{ data: b }, { data: inv }]) => {
      setBookings(b ?? [])
      setInventory(inv ?? [])
      setLoading(false)
    })
  }, [])

  const completed = bookings.filter((b) => b.status === 'Completed')
  const totalRevenue = completed.reduce((s, b) => s + (b.price ?? 0), 0)
  const totalProfit = totalRevenue * 0.65
  const totalExpenses = totalRevenue * 0.35

  const lowStock = inventory.filter(
    (i) => (i.stock_current ?? 0) <= (i.stock_minimum ?? 0)
  ).length

  const now = new Date()
  const mtdBookings = completed.filter((b) => {
    const d = new Date(b.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const revenueMTD = mtdBookings.reduce((s, b) => s + (b.price ?? 0), 0)
  const activeBookings = bookings.filter((b) => STATUS_ACTIVE.includes(b.status)).length
  const avgOrderValue = completed.length ? totalRevenue / completed.length : 0

  const recentBookings = bookings.slice(0, 10)
  const activityFeed = bookings.slice(0, 5)

  return (
    <div style={{ padding: 24, height: '100%' }}>
      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KpiCard label="Total Profit" value={fmt(totalProfit)} color="var(--cyan)" icon={TrendingUp} sub="Est. 65% margin" />
        <KpiCard label="Total Revenue" value={fmt(totalRevenue)} color="var(--cyan)" icon={DollarSign} />
        <KpiCard label="Total Expenses" value={fmt(totalExpenses)} color="var(--red)" icon={TrendingDown} sub="Est. 35% costs" />
        <KpiCard label="Low Stock Alerts" value={lowStock} color="var(--gold)" icon={AlertTriangle} sub="Items below minimum" />
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiCard label="Revenue MTD" value={fmt(revenueMTD)} color="var(--cyan)" icon={Calendar} />
        <KpiCard label="Active Bookings" value={activeBookings} color="var(--gold)" icon={Activity} />
        <KpiCard label="Avg Order Value" value={fmt(avgOrderValue)} color="var(--gold)" icon={ShoppingCart} />
        <KpiCard label="CSAT Score" value="4.9 / 5.0" color="var(--cyan)" icon={Star} sub="Customer satisfaction" />
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginTop: 16 }}>
        {/* Left: Recent Bookings Table */}
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Recent Bookings</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Last 10</span>
          </div>
          {loading ? (
            <SkeletonTable rows={6} cols={5} />
          ) : recentBookings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No bookings yet</div>
          ) : (
            <div className="scroll" style={{ maxHeight: 420 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Client', 'Service', 'Vehicle', 'Amount', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => {
                    const name = b.contacts?.name ?? 'Unknown'
                    const tier = b.contacts?.tier ?? 'Standard'
                    const bg = TIER_COLORS[tier] ?? TIER_COLORS.Standard
                    return (
                      <tr key={b.id} className="row-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(name)}
                            </div>
                            <span style={{ fontSize: 13 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text2)' }}>
                          {b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{fmt(b.price ?? 0)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <StatusBadge status={b.status ?? 'Pending'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Activity Feed */}
        <div className="glass" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Activity Feed</div>
          </div>
          <div className="scroll" style={{ flex: 1, padding: 16 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12, marginTop: 40 }}>No activity yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activityFeed.map((b, idx) => {
                  const name = b.contacts?.name ?? 'Unknown'
                  const service = b.services?.name ?? 'Service'
                  const dotColor =
                    b.status === 'Completed' ? '#22c55e' :
                    b.status === 'In Progress' ? '#818cf8' :
                    b.status === 'Cancelled' ? 'var(--red)' : 'var(--gold)'
                  return (
                    <div key={b.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                      {/* vertical line */}
                      {idx < activityFeed.length - 1 && (
                        <div style={{ position: 'absolute', left: 5, top: 12, bottom: 0, width: 1, background: 'var(--border)' }} />
                      )}
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 2, position: 'relative', zIndex: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600 }}>{name}</span>
                          <span style={{ color: 'var(--text2)' }}> — {service}</span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>
                          {timeAgo(b.created_at)} · <StatusBadge status={b.status ?? 'Pending'} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
