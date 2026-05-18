'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, Plus, X } from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────
function formatAED(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
const fmt = formatAED

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours} hr`
  return `Hace ${days} día${days > 1 ? 's' : ''}`
}

function initials(n: string) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── constants ───────────────────────────────────────────────────────────────
const TIER_GRAD: Record<string, string> = {
  'Ultra-VIP': 'linear-gradient(135deg,#00d4aa,#00a87e)',
  VIP: 'linear-gradient(135deg,#c9a84c,#a07830)',
  Standard: 'linear-gradient(135deg,#555,#333)',
}
const DOT_COLOR: Record<string, string> = {
  completed: '#22c55e', in_progress: '#818cf8', confirmed: '#00d4aa',
  cancelled: '#ff4f4f', pending: '#c9a84c',
  Completed: '#22c55e', 'In Progress': '#818cf8', Confirmed: '#00d4aa',
  Cancelled: '#ff4f4f', Pending: '#c9a84c',
}
const CHART_OPTIONS = [
  { id: 'sales',    emoji: '📊', label: 'Total de ventas' },
  { id: 'flow',     emoji: '📈', label: 'Flujo de transacciones' },
  { id: 'expenses', emoji: '🔵', label: 'Distribución de gastos' },
  { id: 'products', emoji: '☰',  label: 'Productos más vendidos' },
  { id: 'clients',  emoji: '☰',  label: 'Mejores clientes' },
]
const PERIOD_OPTIONS = [
  { key: 'today',        label: 'Hoy' },
  { key: 'thisWeek',     label: 'Esta Semana' },
  { key: 'currentMonth', label: 'Mes Actual' },
  { key: 'thisQuarter',  label: 'Este Trimestre' },
  { key: 'thisYear',     label: 'Este Año' },
]
const GOLD = '#c9a84c'
const CHART_COLORS = [GOLD, '#00d4aa', '#ff4f4f', '#818cf8', '#ffa800']

// ─── demo chart data ──────────────────────────────────────────────────────────
const DEMO_SALES    = [{m:'Ene',v:45000},{m:'Feb',v:52000},{m:'Mar',v:48000},{m:'Abr',v:61000},{m:'May',v:73000},{m:'Jun',v:68000}]
const DEMO_FLOW     = [{d:'Lun',n:5},{d:'Mar',n:8},{d:'Mié',n:3},{d:'Jue',n:9},{d:'Vie',n:7},{d:'Sáb',n:4},{d:'Dom',n:2}]
const DEMO_EXPENSES = [{name:'Materiales',value:35},{name:'Mano de obra',value:40},{name:'Marketing',value:15},{name:'Otros',value:10}]
const DEMO_PRODUCTS = [{name:'Ceramic Coating',v:85000},{name:'Full Detail',v:62000},{name:'PPF',v:54000},{name:'Corrección',v:38000},{name:'Tintado',v:22000}]
const DEMO_CLIENTS  = [{name:'Khalid Al Mansoori',v:45000},{name:'Mohammed Al Maktoum',v:38000},{name:'Sara Al Rashid',v:29000},{name:'Ahmed Hassan',v:24000},{name:'Fatima Al Zaabi',v:18000}]

const tooltipStyle = { background:'#141416', border:'1px solid rgba(201,168,76,0.25)', borderRadius:8, fontSize:11, color:'#f0ede8' }

// ─── chart widget ─────────────────────────────────────────────────────────────
function ChartWidget({ id, onRemove }: { id: string; onRemove: () => void }) {
  const opt = CHART_OPTIONS.find(c => c.id === id)!
  return (
    <div className="glass" style={{ padding:'18px 20px', position:'relative' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{opt.emoji} {opt.label}</div>
        <button onClick={onRemove} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:4, display:'flex' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ height:200 }}>
        {id === 'sales' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_SALES} margin={{top:0,right:0,bottom:0,left:0}}>
              <XAxis dataKey="m" tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[fmt(v),'Revenue']} />
              <Bar dataKey="v" fill={GOLD} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {id === 'flow' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={DEMO_FLOW} margin={{top:0,right:0,bottom:0,left:0}}>
              <XAxis dataKey="d" tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[v,'Bookings']} />
              <Line dataKey="n" stroke="#00d4aa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {id === 'expenses' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={DEMO_EXPENSES} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                {DEMO_EXPENSES.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[`${v}%`,'Share']} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {id === 'products' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEMO_PRODUCTS} layout="vertical" margin={{top:0,right:0,bottom:0,left:80}}>
              <XAxis type="number" tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'#888580'}} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v:any)=>[fmt(v),'Revenue']} />
              <Bar dataKey="v" fill={GOLD} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {id === 'clients' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
            {DEMO_CLIENTS.map((c, i) => {
              const pct = Math.round(c.v / DEMO_CLIENTS[0].v * 100)
              return (
                <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:`${GOLD}20`, border:`1px solid ${GOLD}40`, fontSize:9, fontWeight:700, color:GOLD, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:GOLD, flexShrink:0 }}>{fmt(c.v)}</span>
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:GOLD, borderRadius:2 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI skeleton ────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 16px', height:108 }}>
      <div style={{ height:10, width:'60%', borderRadius:4, marginBottom:14,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
      <div style={{ height:28, width:'75%', borderRadius:6, marginBottom:10,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
      <div style={{ height:8, width:'50%', borderRadius:4,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
    </div>
  )
}

function KpiSkeleton2() {
  return (
    <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 16px', height:88 }}>
      <div style={{ height:8, width:'55%', borderRadius:4, marginBottom:12,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
      <div style={{ height:22, width:'65%', borderRadius:6, marginBottom:8,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
      <div style={{ height:8, width:'45%', borderRadius:4,
        background:'linear-gradient(90deg,#1a1a1e 25%,#212126 50%,#1a1a1e 75%)',
        backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }} />
    </div>
  )
}

// ─── dropdown shared style ───────────────────────────────────────────────────
const dropdownStyle: React.CSSProperties = {
  position:'absolute', top:'110%', right:0, zIndex:300,
  background:'#141416', border:'1px solid rgba(201,168,76,0.25)',
  borderRadius:10, minWidth:200,
  boxShadow:'0 12px 32px rgba(0,0,0,0.5)',
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useLanguage()

  // ── KPI state ──
  const [kpis, setKpis] = useState({
    totalProfit: 0, totalRevenue: 0, totalExpenses: 0,
    lowStockAlerts: 0, revenueMTD: 0, activeBookings: 0,
    avgOrderValue: 0, csatScore: 0, deltaRevenue: 0,
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // ── UI state ──
  const [period, setPeriod] = useState('currentMonth')
  const [periodView, setPeriodView] = useState<'list'|'custom'>('list')
  const [showPeriod, setShowPeriod] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedLabel, setAppliedLabel] = useState('Mes Actual')
  const [showAddChart, setShowAddChart] = useState(false)
  const [activeCharts, setActiveCharts] = useState<string[]>([])
  const [toast, setToast] = useState('')

  const periodRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // ── data fetch ──
  async function fetchDashboardData() {
    const supabase = createClient()
    const ahora = new Date()

    // Month boundaries in Dubai (UTC+4)
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
    const inicioMesUTC = new Date(inicioMes.getTime() - 4 * 3600000).toISOString()
    const finMesUTC = new Date(finMes.getTime() - 4 * 3600000).toISOString()
    const inicioMesStr = inicioMes.toISOString().split('T')[0]
    const finMesStr = finMes.toISOString().split('T')[0]

    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)
    const inicioMesAnteriorStr = inicioMesAnterior.toISOString().split('T')[0]
    const finMesAnteriorStr = finMesAnterior.toISOString().split('T')[0]

    const [
      { data: bookingsTodos },
      { data: bookingsMes },
      { data: bookingsMesAnterior },
      { data: allExpenses },
      { data: bookingsActivos },
      { data: inventario },
      { data: bookingsRecientes },
    ] = await Promise.all([
      // All-time completed bookings → total revenue (same source as finance module)
      supabase.from('bookings').select('price, discount').eq('status', 'completed'),

      // Completed bookings this month → revenueMTD (identical to finance KPI query)
      supabase.from('bookings').select('price, discount').eq('status', 'completed')
        .gte('scheduled_at', inicioMesUTC).lte('scheduled_at', finMesUTC),

      // Completed bookings previous month → delta
      supabase.from('bookings').select('price, discount').eq('status', 'completed')
        .gte('scheduled_at', new Date(inicioMesAnterior.getTime() - 4 * 3600000).toISOString())
        .lte('scheduled_at', new Date(finMesAnterior.getTime() - 4 * 3600000).toISOString()),

      // All-time expenses (same table as finance module)
      supabase.from('expenses').select('amount'),

      // Active bookings
      supabase.from('bookings').select('id').in('status', ['confirmed', 'in_progress', 'pending']),

      // Inventory for low-stock check
      supabase.from('inventory_items').select('stock_qty, min_stock'),

      // Recent bookings for table
      supabase
        .from('bookings')
        .select('id, price, discount, status, scheduled_at, created_at, contacts(full_name, tier), vehicles(make, model), services(name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const calcRevenue = (rows: any[]) =>
      (rows ?? []).reduce((sum, b) => sum + ((b.price ?? 0) - (b.discount ?? 0)), 0)

    // Revenue from bookings — exactly like finance module's fetchFinanceKPIs()
    const totalRevenue   = calcRevenue(bookingsTodos ?? [])
    const revenueMTD     = calcRevenue(bookingsMes ?? [])
    const revenuePrevMes = calcRevenue(bookingsMesAnterior ?? [])

    // Expenses all-time
    const totalExpenses = (allExpenses ?? []).reduce((sum, g) => sum + (g.amount ?? 0), 0)

    const totalProfit  = totalRevenue - totalExpenses
    const deltaRevenue = revenuePrevMes > 0
      ? +((revenueMTD - revenuePrevMes) / revenuePrevMes * 100).toFixed(1)
      : 0

    // Avg ticket = all-time revenue / all completed bookings
    const avgOrderValue = (bookingsTodos?.length ?? 0) > 0
      ? totalRevenue / bookingsTodos!.length : 0

    const lowStockAlerts = (inventario ?? []).filter(
      i => (i.stock_qty ?? 0) <= (i.min_stock ?? 0) && (i.min_stock ?? 0) > 0
    ).length

    // CSAT — optional table
    let csatScore = 0
    try {
      const { data: reviews } = await supabase
        .from('reviews').select('rating').gte('created_at', inicioMesUTC)
      if (reviews && reviews.length > 0) {
        csatScore = reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / reviews.length
      }
    } catch { /* table may not exist yet */ }

    setKpis({
      totalRevenue, totalExpenses, totalProfit,
      lowStockAlerts, revenueMTD,
      activeBookings: bookingsActivos?.length ?? 0,
      avgOrderValue, csatScore, deltaRevenue,
    })

    // Recent bookings
    setRecentBookings(bookingsRecientes ?? [])

    // Activity feed — try activity_log first, fall back to bookings
    try {
      const { data: activities, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && activities && activities.length > 0) {
        setActivityFeed(activities)
      } else {
        buildActivityFromBookings(bookingsRecientes ?? [])
      }
    } catch {
      buildActivityFromBookings(bookingsRecientes ?? [])
    }

    setLoading(false)
  }

  function buildActivityFromBookings(rows: any[]) {
    setActivityFeed(
      rows.slice(0, 8).map(b => ({
        id: b.id,
        name: b.contacts?.full_name ?? b.contacts?.name ?? 'Cliente',
        desc: `${b.services?.name ?? 'Servicio'} — ${b.status ?? 'pending'}`,
        status: b.status ?? 'pending',
        time: b.updated_at ?? b.created_at,
      }))
    )
  }

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ── close dropdowns on outside click ──
  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setShowPeriod(false); setPeriodView('list')
      }
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setShowAddChart(false)
      }
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  function openPeriod() { setShowAddChart(false); setShowPeriod(p => !p); setPeriodView('list') }
  function openAddChart() { setShowPeriod(false); setShowAddChart(p => !p) }
  function selectPeriod(key: string, label: string) { setPeriod(key); setAppliedLabel(label); setShowPeriod(false); setPeriodView('list') }
  function applyCustom() {
    if (!customFrom || !customTo) return
    setPeriod('custom'); setAppliedLabel(`${customFrom} → ${customTo}`)
    setShowPeriod(false); setPeriodView('list')
  }
  function addChart(id: string) { if (!activeCharts.includes(id)) setActiveCharts(p => [...p, id]); setShowAddChart(false) }
  function removeChart(id: string) { setActiveCharts(p => p.filter(c => c !== id)) }

  // ── KPI row data ──
  const row1 = [
    { key:'totalProfit',   label:t('totalProfit'),    color: kpis.totalProfit >= 0 ? 'var(--cyan)' : 'var(--red)', iconBg:'rgba(0,212,170,0.1)',   icon: kpis.totalProfit >= 0 ? TrendingUp : TrendingDown,
      value: formatAED(kpis.totalProfit), sub:`— ${formatAED(kpis.revenueMTD)} ingresos este mes` },
    { key:'totalRevenue',  label:t('totalRevenue'),   color:'var(--cyan)', iconBg:'rgba(0,212,170,0.1)',   icon:DollarSign,
      value: formatAED(kpis.totalRevenue),  sub:`— ${formatAED(kpis.revenueMTD)} este mes` },
    { key:'totalExpenses', label:t('totalExpenses'),  color:'var(--red)',  iconBg:'rgba(255,79,79,0.1)',   icon:TrendingDown,
      value: formatAED(kpis.totalExpenses), sub:'— gastos acumulados' },
    { key:'lowStock',      label:t('lowStockAlerts'), color:'var(--gold)', iconBg:'rgba(201,168,76,0.12)', iconChar:'◆', value: String(kpis.lowStockAlerts), bigNum: true,
      sub: kpis.lowStockAlerts === 0 ? `— ${t('allInStock')}` : `— ${kpis.lowStockAlerts} items bajo mínimo` },
  ]
  const row2 = [
    { key:'mtd',  label:t('revenueMTD'),     value: formatAED(kpis.revenueMTD),
      delta: kpis.deltaRevenue >= 0 ? `↑ +${kpis.deltaRevenue}%` : `↓ ${kpis.deltaRevenue}%`,
      deltaPos: kpis.deltaRevenue >= 0, sub:'vs mes anterior' },
    { key:'act',  label:t('activeBookings'), value: String(kpis.activeBookings), delta:'reservas activas', deltaPos:true, sub:'confirmadas / en curso' },
    { key:'avg',  label:t('avgOrderValue'),  value: formatAED(kpis.avgOrderValue), delta:'ticket promedio', deltaPos:true, sub:'sobre bookings completados' },
    { key:'csat', label:t('csatScore'),
      value: kpis.csatScore > 0 ? `${kpis.csatScore.toFixed(2)} / 5` : 'Sin datos',
      delta:'este trimestre', deltaPos:true, sub:'valoración clientes' },
  ]

  function optStyle(active: boolean): React.CSSProperties {
    return {
      display:'block', width:'100%', textAlign:'left', border:'none', cursor:'pointer',
      padding:'10px 16px', fontSize:13, fontFamily:'Outfit,sans-serif',
      background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
      color: active ? GOLD : '#888580',
      borderLeft: active ? `2px solid ${GOLD}` : '2px solid transparent',
      transition:'all 0.12s',
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-pad" style={{ padding:24, minHeight:'100%' }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>

      {/* ── top action bar ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginBottom:20 }}>

        {/* Period */}
        <div ref={periodRef} style={{ position:'relative' }}>
          <button onClick={openPeriod}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer', background:'var(--bg3)', border:`1px solid ${GOLD}40`, color:GOLD, fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif' }}>
            {appliedLabel} <ChevronDown size={12} />
          </button>

          {showPeriod && (
            <div style={dropdownStyle}>
              {periodView === 'list' ? (
                <div style={{ padding:4 }}>
                  {PERIOD_OPTIONS.map(p => (
                    <button key={p.key} onClick={() => selectPeriod(p.key, p.label)}
                      style={optStyle(period === p.key)}
                      onMouseEnter={e => { if (period !== p.key) { (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' } }}
                      onMouseLeave={e => { if (period !== p.key) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}>
                      {p.label}
                    </button>
                  ))}
                  <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'4px 0' }} />
                  <button onClick={() => setPeriodView('custom')} style={optStyle(period === 'custom')}
                    onMouseEnter={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' } }}
                    onMouseLeave={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}>
                    Rango Personalizado
                  </button>
                </div>
              ) : (
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12, minWidth:240 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Rango Personalizado</div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Desde</label>
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                      style={{ width:'100%', background:'#1a1a1e', border:`1px solid ${GOLD}40`, borderRadius:8, padding:'8px 12px', color:'#f0ede8', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Hasta</label>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                      style={{ width:'100%', background:'#1a1a1e', border:`1px solid ${GOLD}40`, borderRadius:8, padding:'8px 12px', color:'#f0ede8', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }} />
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    <button onClick={applyCustom} disabled={!customFrom || !customTo}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor: customFrom && customTo ? 'pointer' : 'not-allowed', background: customFrom && customTo ? GOLD : `${GOLD}40`, color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif' }}>
                      Aplicar
                    </button>
                    <button onClick={() => { setShowPeriod(false); setPeriodView('list') }}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', background:'transparent', color:'var(--text2)', fontSize:12, fontFamily:'Outfit,sans-serif' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Chart */}
        <div ref={chartRef} style={{ position:'relative' }}>
          <button onClick={openAddChart}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer', background:GOLD, border:'none', color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif' }}>
            <Plus size={13} /> {t('addChart')}
          </button>
          {showAddChart && (
            <div style={dropdownStyle}>
              <div style={{ padding:4 }}>
                {CHART_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => addChart(opt.id)}
                    style={{ ...optStyle(activeCharts.includes(opt.id)), display:'flex', alignItems:'center', gap:10 }}
                    onMouseEnter={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' } }}
                    onMouseLeave={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}>
                    <span style={{ fontSize:15 }}>{opt.emoji}</span>
                    <span>{opt.label}</span>
                    {activeCharts.includes(opt.id) && <span style={{ marginLeft:'auto', fontSize:10, color:GOLD }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="kpi-grid-4" style={{ marginBottom:12 }}>
        {loading
          ? [0,1,2,3].map(i => <KpiSkeleton key={i} />)
          : row1.map(card => (
            <div key={card.key} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{card.label}</div>
                <div style={{ width:28, height:28, borderRadius:8, background:card.iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {card.iconChar
                    ? <span style={{ fontSize:14, color:card.color }}>{card.iconChar}</span>
                    : card.icon && <card.icon size={14} color={card.color} strokeWidth={2} />}
                </div>
              </div>
              {card.bigNum
                ? <div style={{ fontSize:36, fontWeight:800, color:'var(--text)', lineHeight:1 }}>{card.value}</div>
                : <div style={{ fontSize:22, fontWeight:800, color:card.color, lineHeight:1 }}>{card.value}</div>
              }
              <div style={{ fontSize:10, color:'#3a3836', marginTop:6 }}>{card.sub}</div>
            </div>
          ))
        }
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="kpi-grid-4" style={{ marginBottom:16 }}>
        {loading
          ? [0,1,2,3].map(i => <KpiSkeleton2 key={i} />)
          : row2.map(card => (
            <div key={card.key} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 16px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{card.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:6 }}>{card.value}</div>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, color: card.deltaPos ? '#34d399' : '#ff4f4f' }}>{card.delta}</span>
                <span style={{ fontSize:10, color:'var(--text2)' }}>{card.sub}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Chart widgets ── */}
      {mounted && activeCharts.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns: activeCharts.length === 1 ? '1fr' : 'repeat(2,1fr)', gap:14, marginBottom:16 }}>
          {activeCharts.map(id => <ChartWidget key={id} id={id} onRemove={() => removeChart(id)} />)}
        </div>
      )}

      {/* ── Bottom: Recent Bookings + Activity Feed ── */}
      <div className="bottom-grid">

        {/* Recent Bookings */}
        <div className="glass" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{t('recentBookings')}</div>
            <span style={{ fontSize:11, color:'var(--text2)' }}>{t('last10')}</span>
          </div>
          {loading ? <SkeletonTable rows={3} cols={5} /> : recentBookings.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:6 }}>No hay reservas registradas aún</div>
              <div style={{ fontSize:12, color:'var(--text2)', marginBottom:20 }}>Las reservas aparecerán aquí una vez que las crees</div>
              <a href="/bookings" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:8, background:GOLD, color:'#0d0d0f', fontSize:12, fontWeight:700, textDecoration:'none', fontFamily:'Outfit,sans-serif' }}>
                → Crear primera reserva
              </a>
            </div>
          ) : (
            <div className="scroll" style={{ maxHeight:360 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {[t('client'), t('service'), t('vehicle'), t('amount'), t('status')].map(h => (
                      <th key={h} style={{ padding:'10px 16px', fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map(b => {
                    const name = b.contacts?.full_name ?? b.contacts?.name ?? 'Cliente'
                    const bg = TIER_GRAD[b.contacts?.tier ?? 'Standard'] ?? TIER_GRAD.Standard
                    const amount = (b.price ?? 0) - (b.discount ?? 0)
                    return (
                      <tr key={b.id} className="row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding:'10px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials(name)}</div>
                            <span style={{ fontSize:12, fontWeight:600 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                        <td style={{ padding:'10px 16px', fontSize:11, color:'var(--text2)' }}>
                          {b.vehicles ? `${b.vehicles.make ?? ''} ${b.vehicles.model ?? ''}`.trim() || '—' : '—'}
                        </td>
                        <td style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'var(--gold)' }}>{formatAED(amount)}</td>
                        <td style={{ padding:'10px 16px' }}><StatusBadge status={b.status ?? 'pending'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{t('activityFeed')}</div>
          </div>
          <div className="scroll" style={{ flex:1, padding:'8px 0' }}>
            {loading
              ? <div style={{ padding:'12px 18px', display:'flex', flexDirection:'column', gap:14 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:36, borderRadius:8 }} />)}
                </div>
              : activityFeed.length === 0
                ? <div style={{ padding:'32px 18px', textAlign:'center', fontSize:12, color:'var(--text2)' }}>Sin actividad reciente</div>
                : activityFeed.map((item, idx) => (
                  <div key={item.id ?? idx} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom: idx < activityFeed.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:4, background:DOT_COLOR[item.status] ?? 'var(--text2)' }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{item.name}</div>
                      <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</div>
                      <div style={{ fontSize:10, color:'#444' }}>{item.time ? timeAgo(item.time) : ''}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'var(--bg3)', border:`1px solid ${GOLD}40`, borderRadius:10, padding:'12px 18px', color:'var(--text)', fontSize:13, fontWeight:500, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
