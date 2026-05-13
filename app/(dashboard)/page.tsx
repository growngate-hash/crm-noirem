'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { useLanguage } from '@/contexts/LanguageContext'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, Activity, ShoppingCart, Star, ChevronDown, Plus } from 'lucide-react'

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
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const TIER_GRAD: Record<string, string> = {
  'Ultra-VIP': 'linear-gradient(135deg,#00d4aa,#00a87e)',
  VIP: 'linear-gradient(135deg,#c9a84c,#a07830)',
  Standard: 'linear-gradient(135deg,#555,#333)',
}

const DEMO_BOOKINGS = [
  { id: 'd1', contacts: { name: 'Khalid Al Mansoori', tier: 'Ultra-VIP' }, services: { name: 'Full Detail' }, vehicles: { make: 'Lamborghini', model: 'Urus' }, price: 4200, status: 'Completed', created_at: new Date(Date.now() - 120000).toISOString() },
  { id: 'd2', contacts: { name: 'Sara Al Rashid', tier: 'VIP' }, services: { name: 'Paint Protection Film' }, vehicles: { make: 'Range Rover', model: 'Sport' }, price: 7800, status: 'Pending', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'd3', contacts: { name: 'Mohammed Hassan', tier: 'VIP' }, services: { name: 'Ceramic Coating' }, vehicles: { make: 'Ferrari', model: '488' }, price: 12500, status: 'In Progress', created_at: new Date(Date.now() - 7200000).toISOString() },
]

const DEMO_ACTIVITY = [
  { id: 'a1', name: 'Khalid Al Mansoori', desc: 'Full Detail completed', status: 'Completed', time: '2m ago' },
  { id: 'a2', name: 'Sara Al Rashid', desc: 'Paint Protection booked', status: 'Confirmed', time: '45m ago' },
  { id: 'a3', name: 'Mohammed Hassan', desc: 'Ceramic Coating started', status: 'In Progress', time: '1h ago' },
  { id: 'a4', name: 'System Alert', desc: 'Low stock: Ceramic Pro 9H', status: 'Pending', time: '3h ago' },
]

const PERIOD_OPTIONS = ['currentMonth', 'today', 'thisWeek', 'thisQuarter', 'thisYear'] as const
const STATUS_ACTIVE = ['Pending', 'Confirmed', 'In Progress']

const DOT_COLOR: Record<string, string> = {
  Completed: '#22c55e',
  'In Progress': '#818cf8',
  Confirmed: 'var(--cyan)',
  Cancelled: 'var(--red)',
  Pending: 'var(--gold)',
}

export default function DashboardPage() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('currentMonth')
  const [showPeriod, setShowPeriod] = useState(false)
  const [toast, setToast] = useState('')
  const periodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('*, contacts(*), vehicles(*), services(*)').order('created_at', { ascending: false }),
      supabase.from('inventory').select('*'),
    ]).then(([{ data: b }, { data: inv }]) => {
      setBookings(b ?? [])
      setInventory(inv ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) setShowPeriod(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const completed = bookings.filter((b) => b.status === 'Completed')
  const totalRevenue = completed.reduce((s, b) => s + (b.price ?? 0), 0)
  const totalProfit = totalRevenue * 0.65
  const totalExpenses = totalRevenue * 0.35
  const lowStock = inventory.filter((i) => (i.stock_current ?? 0) <= (i.stock_minimum ?? 0)).length
  const now = new Date()
  const mtd = completed.filter((b) => {
    const d = new Date(b.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const revenueMTD = mtd.reduce((s, b) => s + (b.price ?? 0), 0)
  const activeBookings = bookings.filter((b) => STATUS_ACTIVE.includes(b.status)).length
  const avgOrderValue = completed.length ? totalRevenue / completed.length : 0

  const displayBookings = loading ? [] : (bookings.length > 0 ? bookings.slice(0, 10) : DEMO_BOOKINGS)
  const displayActivity = loading ? [] : (bookings.length > 0 ? bookings.slice(0, 5).map(b => ({
    id: b.id, name: b.contacts?.name ?? 'Unknown', desc: `${b.services?.name ?? 'Service'} — ${b.status}`, status: b.status, time: timeAgo(b.created_at),
  })) : DEMO_ACTIVITY)

  // Row 1 card data
  const row1 = [
    {
      key: 'totalProfit', label: t('totalProfit'), color: 'var(--cyan)',
      iconBg: 'rgba(0,212,170,0.1)', icon: TrendingUp,
      aed: bookings.length === 0 ? 'AED' : null,
      value: bookings.length === 0 ? '0.00' : fmt(totalProfit).replace('AED ', ''),
      valueFull: bookings.length === 0 ? 'AED 0.00' : fmt(totalProfit),
      sub: `— ${bookings.length === 0 ? 'AED 0.00' : fmt(totalProfit)} este mes`,
    },
    {
      key: 'totalRevenue', label: t('totalRevenue'), color: 'var(--cyan)',
      iconBg: 'rgba(0,212,170,0.1)', icon: DollarSign,
      value: bookings.length === 0 ? '0.00' : fmt(totalRevenue).replace('AED ', ''),
      valueFull: bookings.length === 0 ? 'AED 0.00' : fmt(totalRevenue),
      sub: `— ${bookings.length === 0 ? 'AED 0.00' : fmt(totalRevenue)} este mes`,
    },
    {
      key: 'totalExpenses', label: t('totalExpenses'), color: 'var(--red)',
      iconBg: 'rgba(255,79,79,0.1)', icon: TrendingDown,
      value: bookings.length === 0 ? '0.00' : fmt(totalExpenses).replace('AED ', ''),
      valueFull: bookings.length === 0 ? 'AED 0.00' : fmt(totalExpenses),
      sub: `— ${bookings.length === 0 ? 'AED 0.00' : fmt(totalExpenses)} este mes`,
    },
    {
      key: 'lowStockAlerts', label: t('lowStockAlerts'), color: 'var(--gold)',
      iconBg: 'rgba(201,168,76,0.12)', iconChar: '◆',
      value: String(lowStock), valueFull: String(lowStock),
      sub: `— ${t('allInStock')}`,
      bigNum: true,
    },
  ]

  // Row 2 card data (with fallback demo values)
  const row2 = [
    { key: 'revenueMTD', label: t('revenueMTD'), value: bookings.length > 0 ? fmt(revenueMTD) : 'AED 847K', delta: '↑ +18.4%', deltaSub: 'vs mes anterior', deltaColor: '#34d399' },
    { key: 'activeBookings', label: t('activeBookings'), value: bookings.length > 0 ? String(activeBookings) : '23', delta: '↑ +3', deltaSub: 'desde ayer', deltaColor: '#34d399' },
    { key: 'avgOrderValue', label: t('avgOrderValue'), value: bookings.length > 0 ? fmt(avgOrderValue) : 'AED 2,890', delta: '↑ +6.2%', deltaSub: 'vs mes anterior', deltaColor: '#34d399' },
    { key: 'csatScore', label: t('csatScore'), value: '4.93', valueSuffix: ' / 5', delta: '↑ +0.07', deltaSub: 'este trimestre', deltaColor: '#34d399' },
  ]

  return (
    <div style={{ padding: 24, minHeight: '100%' }}>

      {/* Period + Add Chart buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <div ref={periodRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPeriod(!showPeriod)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'var(--bg3)', border: '1px solid var(--gold-b)',
              color: 'var(--gold)', fontSize: 12, fontWeight: 600,
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {t(period as any)} <ChevronDown size={12} />
          </button>
          {showPeriod && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 200,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 4, minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setShowPeriod(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '8px 14px',
                    background: p === period ? 'var(--gold-dim)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: 12, fontWeight: p === period ? 600 : 400,
                    color: p === period ? 'var(--gold)' : 'var(--text2)',
                    borderRadius: 7, fontFamily: 'Outfit, sans-serif',
                    transition: 'all 0.12s',
                  }}
                >
                  {t(p as any)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => showToast(t('comingSoon') + ' ✨')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
            background: 'var(--gold)', border: 'none',
            color: '#0d0d0f', fontSize: 12, fontWeight: 700,
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          <Plus size={13} /> {t('addChart')}
        </button>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {row1.map((card) => (
          <div key={card.key} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 16px',
          }}>
            {/* Label + icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {card.label}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: card.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {card.iconChar
                  ? <span style={{ fontSize: 14, color: card.color }}>{card.iconChar}</span>
                  : card.icon && <card.icon size={14} color={card.color} strokeWidth={2} />
                }
              </div>
            </div>

            {/* Value */}
            {card.bigNum ? (
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{card.value}</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: card.color }}>AED</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</span>
              </div>
            )}

            {/* Sub */}
            <div style={{ fontSize: 10, color: '#3a3836', marginTop: 6 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* KPI Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {row2.map((card) => (
          <div key={card.key} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 16px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{card.value}</span>
              {card.valueSuffix && <span style={{ fontSize: 14, color: 'var(--text2)' }}>{card.valueSuffix}</span>}
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: card.deltaColor }}>{card.delta}</span>
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>{card.deltaSub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: 2 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>

        {/* Recent Bookings */}
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('recentBookings')}</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{t('last10')}</span>
          </div>

          {loading ? (
            <SkeletonTable rows={3} cols={5} />
          ) : (
            <div className="scroll" style={{ maxHeight: 360 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[t('client'), t('service'), t('vehicle'), t('amount'), t('status')].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayBookings.map((b) => {
                    const name = b.contacts?.name ?? 'Unknown'
                    const tier = b.contacts?.tier ?? 'Standard'
                    const bg = TIER_GRAD[tier] ?? TIER_GRAD.Standard
                    return (
                      <tr key={b.id} className="row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {initials(name)}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text2)' }}>
                          {b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{fmt(b.price ?? 0)}</td>
                        <td style={{ padding: '10px 16px' }}><StatusBadge status={b.status ?? 'Pending'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('activityFeed')}</div>
          </div>
          <div className="scroll" style={{ flex: 1, padding: '8px 0' }}>
            {loading ? (
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />)}
              </div>
            ) : displayActivity.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', gap: 12, padding: '12px 18px',
                borderBottom: idx < displayActivity.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                  background: DOT_COLOR[item.status] ?? 'var(--text2)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.desc}</div>
                  <div style={{ fontSize: 10, color: '#444' }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--bg3)', border: '1px solid var(--gold-b)',
          borderRadius: 10, padding: '12px 18px',
          color: 'var(--text)', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
