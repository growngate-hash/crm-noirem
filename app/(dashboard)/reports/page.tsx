'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
const PIE_COLORS = ['#c9a84c', '#00d4aa', '#ff4f4f', '#818cf8', '#ffa800']

const PERIODS: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '12m', days: 365 },
]

function subDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('30d')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('bookings')
      .select('*, services(name)')
      .order('scheduled_at')
      .then(({ data }) => {
        setBookings(data ?? [])
        setLoading(false)
      })
  }, [])

  const periodDays = PERIODS.find((p) => p.label === period)?.days ?? 30
  const cutoff = subDays(periodDays)

  const inPeriod = bookings.filter(
    (b) => b.status === 'Completed' && new Date(b.scheduled_at ?? b.created_at) >= cutoff
  )

  // Revenue over time
  const byDate: Record<string, number> = {}
  inPeriod.forEach((b) => {
    const d = new Date(b.scheduled_at ?? b.created_at).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })
    byDate[d] = (byDate[d] ?? 0) + (b.price ?? 0)
  })
  const revenueData = Object.entries(byDate).map(([date, revenue]) => ({ date, revenue }))

  // Revenue by service
  const byService: Record<string, number> = {}
  inPeriod.forEach((b) => {
    const name = b.services?.name ?? 'Other'
    byService[name] = (byService[name] ?? 0) + (b.price ?? 0)
  })
  const pieData = Object.entries(byService).map(([name, value]) => ({ name, value }))

  // Top 5 services
  const top5 = [...pieData].sort((a, b) => b.value - a.value).slice(0, 5)
  const maxService = top5[0]?.value ?? 1

  // Total revenue
  const totalRev = inPeriod.reduce((s, b) => s + (b.price ?? 0), 0)

  // Funnel data (estimated)
  const funnel = [
    { label: 'Inquiries', count: Math.round(inPeriod.length * 2.8) },
    { label: 'Quotes', count: Math.round(inPeriod.length * 1.9) },
    { label: 'Bookings', count: bookings.filter((b) => new Date(b.scheduled_at ?? b.created_at) >= cutoff).length },
    { label: 'Completed', count: inPeriod.length },
    { label: 'Repeat', count: Math.round(inPeriod.length * 0.4) },
  ]
  const maxFunnel = funnel[0]?.count ?? 1

  const chartTooltipStyle = {
    background: '#1a1a1e',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    color: '#f0ede8',
    fontSize: 12,
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Reports & Analytics</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Total revenue in period: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(totalRev)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.label)}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  background: period === p.label ? 'var(--gold)' : 'transparent',
                  color: period === p.label ? '#000' : 'var(--text2)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1, 2].map((i) => (
            <div key={i} className="glass skeleton" style={{ height: 260, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Revenue over time */}
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Revenue Over Time</div>
              {revenueData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 12 }}>No completed bookings in this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData}>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text2)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text2)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value: any) => [fmt(value), 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#c9a84c" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue by service */}
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Revenue by Service</div>
              {pieData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 12 }}>No data in this period</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => [fmt(v), 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pieData.slice(0, 5).map((entry, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                        <div style={{ fontSize: 11, flex: 1, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{fmt(entry.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Top 5 + Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top 5 services */}
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Top Services by Revenue</div>
              {top5.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'center', padding: 20 }}>No data</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {top5.map((s, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12 }}>{s.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{fmt(s.value)}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(s.value / maxService) * 100}%`, background: 'var(--gold)', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conversion funnel */}
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Conversion Funnel</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {funnel.map((step, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{step.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{step.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(step.count / maxFunnel) * 100}%`,
                          background: `linear-gradient(90deg, var(--cyan), var(--gold))`,
                          borderRadius: 99,
                          opacity: 1 - idx * 0.12,
                          transition: 'width 0.5s',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
