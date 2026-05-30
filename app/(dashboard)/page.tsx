'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTimezone } from '@/hooks/useTimezone'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonTable } from '@/components/ui/SkeletonLoader'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, Plus, X } from 'lucide-react'
import { getMonthlyExpenses } from '@/utils/getMonthlyExpenses'

// ─── helpers ────────────────────────────────────────────────────────────────
function formatAED(value: number): string {
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${Math.round(value).toLocaleString('en-AE')}`
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
  'Ultra-VIP': 'linear-gradient(135deg,#3DD9D6,#2BB8B5)',
  VIP: 'linear-gradient(135deg,#F5B544,#D4952A)',
  Standard: 'linear-gradient(135deg,#888,#666)',
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
const GOLD = '#F5B544'
const CHART_COLORS = [GOLD, '#00d4aa', '#ff4f4f', '#818cf8', '#ffa800']

// ─── demo chart data ──────────────────────────────────────────────────────────
const DEMO_SALES    = [{m:'Ene',v:45000},{m:'Feb',v:52000},{m:'Mar',v:48000},{m:'Abr',v:61000},{m:'May',v:73000},{m:'Jun',v:68000}]
const DEMO_FLOW     = [{d:'Lun',n:5},{d:'Mar',n:8},{d:'Mié',n:3},{d:'Jue',n:9},{d:'Vie',n:7},{d:'Sáb',n:4},{d:'Dom',n:2}]
const DEMO_EXPENSES = [{name:'Materiales',value:35},{name:'Mano de obra',value:40},{name:'Marketing',value:15},{name:'Otros',value:10}]
const DEMO_PRODUCTS = [{name:'Ceramic Coating',v:85000},{name:'Full Detail',v:62000},{name:'PPF',v:54000},{name:'Corrección',v:38000},{name:'Tintado',v:22000}]
const DEMO_CLIENTS  = [{name:'Khalid Al Mansoori',v:45000},{name:'Mohammed Al Maktoum',v:38000},{name:'Sara Al Rashid',v:29000},{name:'Ahmed Hassan',v:24000},{name:'Fatima Al Zaabi',v:18000}]

const tooltipStyle = { background:'#FFFFFF', border:'1px solid #F0EFEA', borderRadius:8, fontSize:11, color:'#0B2A4A' }

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
  background:'#FFFFFF', border:'1px solid #F0EFEA',
  borderRadius:10, minWidth:200,
  boxShadow:'0 8px 24px rgba(11,42,74,0.08)',
  color:'#0B2A4A',
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t, lang } = useLanguage()
  const tz = useTimezone()

  // ── KPI state ──
  const [kpis, setKpis] = useState({
    totalProfit: 0, totalRevenue: 0, totalExpenses: 0,
    lowStockAlerts: 0, revenueMTD: 0, vatMTD: 0, activeBookings: 0,
    avgOrderValue: 0, csatScore: 0, deltaRevenue: 0,
  })
  const [recentBookings,  setRecentBookings]  = useState<any[]>([])
  const [bookingsHoy,     setBookingsHoy]     = useState<any[]>([])
  const [bookingsManana,  setBookingsManana]  = useState<any[]>([])
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
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
    // Month boundaries anchored to the Dubai calendar (UTC+4)
    const ahoraLocal = tz.getToday()
    const y  = ahoraLocal.getFullYear()
    const m  = ahoraLocal.getMonth()        // 0-indexed
    const mm = String(m + 1).padStart(2, '0')

    const lastDayMes         = new Date(y, m + 1, 0).getDate()
    const { start: inicioMesUTC } = tz.dayRange(new Date(y, m, 1))
    const { end:   finMesUTC }    = tz.dayRange(new Date(y, m, lastDayMes))
    const inicioMesStr = `${y}-${mm}-01`
    const finMesStr    = `${y}-${mm}-${String(lastDayMes).padStart(2, '0')}`

    const mAnt  = m === 0 ? 11 : m - 1
    const yAnt  = m === 0 ? y - 1 : y
    const mmAnt = String(mAnt + 1).padStart(2, '0')
    const lastDayAnt = new Date(yAnt, mAnt + 1, 0).getDate()
    const { start: inicioMesAnteriorUTC } = tz.dayRange(new Date(yAnt, mAnt, 1))
    const { end:   finMesAnteriorUTC }    = tz.dayRange(new Date(yAnt, mAnt, lastDayAnt))

    // ── Invoice KPIs (critical — isolated so bookings errors never block these) ──
    const [
      { data: invoicesPagadas },
      { data: invoicesMes },
      { data: invoicesMesAnterior },
      { data: inventario },
    ] = await Promise.all([
      supabase.from('invoices').select('subtotal, tax, total').eq('status', 'pagada'),
      supabase.from('invoices').select('subtotal, tax, total, paid_at').eq('status', 'pagada')
        .gte('paid_at', inicioMesUTC).lte('paid_at', finMesUTC),
      supabase.from('invoices').select('subtotal, tax, total, paid_at').eq('status', 'pagada')
        .gte('paid_at', inicioMesAnteriorUTC).lte('paid_at', finMesAnteriorUTC),
      supabase.from('inventory_items').select('id, name, stock_qty, min_stock, unit, brand'),
    ])

    // ── Bookings (optional — failures don't block KPIs) ──
    let activeBookings = 0
    try {
      const { data: activos } = await supabase
        .from('bookings').select('id').in('status', ['confirmed', 'in_progress', 'pending'])
      activeBookings = activos?.length ?? 0
    } catch { /* bookings table may not exist */ }
    let localHoy:  any[] = []
    let localMana: any[] = []
    try {
      const hoy    = tz.getToday()
      const manana = new Date(hoy)
      manana.setDate(hoy.getDate() + 1)
      const { start: startHoy,  end: endHoy  } = tz.dayRange(hoy)
      const { start: startMana, end: endMana  } = tz.dayRange(manana)

      const { data: bHoy } = await supabase
        .from('bookings')
        .select('id, status, scheduled_at, created_at, contacts(full_name), vehicles(make, model), services(name)')
        .gte('scheduled_at', startHoy)
        .lte('scheduled_at', endHoy)
        .order('scheduled_at', { ascending: true })

      const { data: bMana } = await supabase
        .from('bookings')
        .select('id, status, scheduled_at, created_at, contacts(full_name), vehicles(make, model), services(name)')
        .gte('scheduled_at', startMana)
        .lte('scheduled_at', endMana)
        .order('scheduled_at', { ascending: true })

      localHoy  = bHoy  ?? []
      localMana = bMana ?? []
      setBookingsHoy(localHoy)
      setBookingsManana(localMana)
    } catch { /* bookings schema may differ */ }

    const { total: totalExpenses } = await getMonthlyExpenses(supabase, inicioMesStr, finMesStr)

    const calcRevenue = (rows: any[]) =>
      (rows ?? []).reduce((sum, inv) => sum + Number(inv.subtotal ?? 0), 0)
    const calcVAT = (rows: any[]) =>
      (rows ?? []).reduce((sum, inv) => sum + Number(inv.tax ?? 0), 0)

    // Revenue = subtotal (excl. VAT — VAT is not income)
    const totalRevenue   = calcRevenue(invoicesPagadas ?? [])
    const revenueMTD     = calcRevenue(invoicesMes ?? [])
    const revenuePrevMes = calcRevenue(invoicesMesAnterior ?? [])
    const vatMTD         = calcVAT(invoicesMes ?? [])

    // Profit = subtotal revenue – expenses (VAT excluded from both sides)
    const totalProfit = totalRevenue - totalExpenses
    const deltaRevenue = revenuePrevMes > 0
      ? +((revenueMTD - revenuePrevMes) / revenuePrevMes * 100).toFixed(1)
      : 0

    // Avg ticket = all-time revenue / all paid invoices
    const avgOrderValue = (invoicesPagadas?.length ?? 0) > 0
      ? totalRevenue / invoicesPagadas!.length : 0

    const lowItems = (inventario ?? []).filter(
      i => (i.stock_qty ?? 0) <= (i.min_stock ?? 0) && (i.min_stock ?? 0) > 0
    )
    const lowStockAlerts = lowItems.length
    setLowStockItems(lowItems)

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
      lowStockAlerts, revenueMTD, vatMTD,
      activeBookings,
      avgOrderValue, csatScore, deltaRevenue,
    })

    // Recent bookings (combined for activity feed fallback)
    const todasReservas = [...localHoy, ...localMana]
    setRecentBookings(todasReservas)

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
        buildActivityFromBookings(todasReservas)
      }
    } catch {
      buildActivityFromBookings(todasReservas)
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
  }, [])

  useEffect(() => {
    if (!tz.ready) return
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tz.ready])

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
    { key:'totalProfit',   label:t('totalProfit'),    color: kpis.totalProfit >= 0 ? '#1F8F5C' : '#D9533D', iconBg:'rgba(0,212,170,0.1)',   icon: kpis.totalProfit >= 0 ? TrendingUp : TrendingDown,
      value: formatAED(kpis.totalProfit), sub:`— ${formatAED(kpis.revenueMTD)} ingresos este mes` },
    { key:'totalRevenue',  label:t('totalRevenue'),   color:'#1F5A9B', iconBg:'rgba(0,212,170,0.1)',   icon:DollarSign,
      value: formatAED(kpis.totalRevenue),  sub:`sin VAT · ${formatAED(kpis.revenueMTD)} este mes` },
    { key:'totalExpenses', label:t('totalExpenses'),  color:'#D9533D',  iconBg:'rgba(255,79,79,0.1)',   icon:TrendingDown,
      value: formatAED(kpis.totalExpenses), sub:'— gastos acumulados' },
    { key:'lowStock',      label:t('lowStockAlerts'), color:'var(--gold)', iconBg:'var(--gold-dim)', iconChar:'◆', value: String(kpis.lowStockAlerts), bigNum: true,
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

  const hoyDisplay    = tz.ready ? tz.getToday() : new Date()
  const mananaDisplay = new Date(hoyDisplay)
  mananaDisplay.setDate(hoyDisplay.getDate() + 1)
  const formatearFecha = (date: Date) =>
    date.toLocaleDateString(lang === 'es' ? 'es-AE' : 'en-AE', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dubai',
    })

  function optStyle(active: boolean): React.CSSProperties {
    return {
      display:'block', width:'100%', textAlign:'left', border:'none', cursor:'pointer',
      padding:'10px 16px', fontSize:13, fontFamily:'Outfit,sans-serif',
      background: active ? '#E6F0FA' : 'transparent',
      color: active ? '#0B2A4A' : '#5A5852',
      borderLeft: active ? '2px solid #0B2A4A' : '2px solid transparent',
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
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>

      {/* ── top action bar ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginBottom:20 }}>

        {/* Period */}
        <div ref={periodRef} style={{ position:'relative' }}>
          <button onClick={openPeriod}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer', background:'var(--bg3)', border:'1px solid #0B2A4A', color:'#0B2A4A', fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif' }}>
            {appliedLabel} <ChevronDown size={12} />
          </button>

          {showPeriod && (
            <div style={dropdownStyle}>
              {periodView === 'list' ? (
                <div style={{ padding:4 }}>
                  {PERIOD_OPTIONS.map(p => (
                    <button key={p.key} onClick={() => selectPeriod(p.key, p.label)}
                      style={optStyle(period === p.key)}
                      onMouseEnter={e => { if (period !== p.key) { (e.currentTarget as HTMLElement).style.background = '#FAFAF7'; (e.currentTarget as HTMLElement).style.color = '#0B2A4A' } }}
                      onMouseLeave={e => { if (period !== p.key) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5A5852' } }}>
                      {p.label}
                    </button>
                  ))}
                  <div style={{ height:1, background:'#F0EFEA', margin:'4px 0' }} />
                  <button onClick={() => setPeriodView('custom')} style={optStyle(period === 'custom')}
                    onMouseEnter={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = '#FAFAF7'; (e.currentTarget as HTMLElement).style.color = '#0B2A4A' } }}
                    onMouseLeave={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5A5852' } }}>
                    Rango Personalizado
                  </button>
                </div>
              ) : (
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12, minWidth:240 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Rango Personalizado</div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Desde</label>
                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                      style={{ width:'100%', background:'#FFFFFF', border:'1px solid #F0EFEA', borderRadius:8, padding:'8px 12px', color:'#0B2A4A', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Hasta</label>
                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                      style={{ width:'100%', background:'#FFFFFF', border:'1px solid #F0EFEA', borderRadius:8, padding:'8px 12px', color:'#0B2A4A', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }} />
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
                    onMouseEnter={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = '#FAFAF7'; (e.currentTarget as HTMLElement).style.color = '#0B2A4A' } }}
                    onMouseLeave={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#5A5852' } }}>
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
          : row1.map(card => {
            if (card.key === 'lowStock') {
              const count = kpis.lowStockAlerts
              const hasAlerts = count > 0
              return (
                <div key="lowStock" style={{
                  background: hasAlerts ? 'rgba(239,68,68,0.08)' : 'var(--bg2)',
                  border: `1px solid ${hasAlerts ? '#ef4444' : 'var(--border-cyan)'}`,
                  borderRadius: 12, padding: '18px 16px',
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }}>
                  {hasAlerts && (
                    <div style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 10, height: 10, background: '#ef4444',
                      borderRadius: '50%', animation: 'pulse 1.5s infinite',
                    }} />
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, color: hasAlerts ? '#991B1B' : 'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      {card.label}
                    </div>
                    <div style={{ width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
                      background: hasAlerts ? 'rgba(239,68,68,0.15)' : card.iconBg,
                      border: `1px solid ${hasAlerts ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
                    }}>
                      <span style={{ fontSize:14, color: hasAlerts ? '#991B1B' : undefined }}>{hasAlerts ? '⚠️' : '📦'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:36, fontWeight:800, color: hasAlerts ? '#7F1D1D' : 'var(--text)', lineHeight:1 }}>
                    {count}
                  </div>
                  <div style={{ fontSize:13, color: hasAlerts ? '#7F1D1D' : '#5A5852', marginTop:6 }}>
                    {count === 0 ? `— ${t('allInStock')}` : `— ${count} producto${count !== 1 ? 's' : ''} bajo mínimo`}
                  </div>
                </div>
              )
            }
            return (
              <div key={card.key} style={{ background:'var(--bg2)', border:'1px solid var(--border-cyan)', borderRadius:12, padding:'18px 16px', boxShadow:'var(--shadow)' }}>
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
                <div style={{ fontSize:13, color:'#5A5852', marginTop:6 }}>{card.sub}</div>
              </div>
            )
          })
        }
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="kpi-grid-4" style={{ marginBottom:16 }}>
        {loading
          ? [0,1,2,3].map(i => <KpiSkeleton2 key={i} />)
          : row2.map(card => (
            <div key={card.key} style={{ background:'var(--bg3)', border:'1px solid var(--border-cyan)', borderRadius:12, padding:'16px 16px', boxShadow:'var(--shadow)' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{card.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:6 }}>{card.value}</div>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, color: card.deltaPos ? '#1A6B40' : '#ff4f4f' }}>{card.delta}</span>
                <span style={{ fontSize:13, color:'var(--text2)' }}>{card.sub}</span>
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

        {/* Reservas de Hoy y Mañana */}
        <div className="glass" style={{ overflow:'hidden', border:'1px solid var(--border-cyan)', boxShadow:'var(--shadow)' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Reservas de Hoy y Mañana</div>
          </div>
          {loading ? <SkeletonTable rows={3} cols={5} /> : (
            <div className="scroll" style={{ maxHeight:420, padding:'16px 0' }}>

              {/* ── Grupo HOY ── */}
              <div style={{ marginBottom:20, padding:'0 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #F0EFEA' }}>
                  Hoy — {formatearFecha(hoyDisplay)}
                </div>
                {bookingsHoy.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px 0', color:'#0B2A4A', fontSize:15, fontWeight:500 }}>
                    Sin reservas para hoy
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {[t('client'), t('service'), t('vehicle'), t('amount'), t('status')].map(h => (
                          <th key={h} style={{ padding:'8px 12px', fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsHoy.map(b => {
                        const name = b.contacts?.full_name ?? b.contacts?.name ?? 'Cliente'
                        const bg   = TIER_GRAD[b.contacts?.tier ?? 'Standard'] ?? TIER_GRAD.Standard
                        const amount = (b.price ?? 0) - (b.discount ?? 0)
                        return (
                          <tr key={b.id} className="row-hover" style={{ borderBottom:'1px solid #F0EFEA' }}>
                            <td style={{ padding:'9px 12px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:28, height:28, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials(name)}</div>
                                <span style={{ fontSize:12, fontWeight:600 }}>{name}</span>
                              </div>
                            </td>
                            <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                            <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text2)' }}>
                              {b.vehicles ? `${b.vehicles.make ?? ''} ${b.vehicles.model ?? ''}`.trim() || '—' : '—'}
                            </td>
                            <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color:'var(--gold)' }}>{formatAED(amount)}</td>
                            <td style={{ padding:'9px 12px' }}><StatusBadge status={b.status ?? 'pending'} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* ── Grupo MAÑANA ── */}
              <div style={{ padding:'0 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#5A5852', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12, paddingBottom:8, borderBottom:'1px solid #F0EFEA' }}>
                  Mañana — {formatearFecha(mananaDisplay)}
                </div>
                {bookingsManana.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'20px 0', color:'#0B2A4A', fontSize:15, fontWeight:500 }}>
                    Sin reservas para mañana
                  </div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {[t('client'), t('service'), t('vehicle'), t('amount'), t('status')].map(h => (
                          <th key={h} style={{ padding:'8px 12px', fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookingsManana.map(b => {
                        const name = b.contacts?.full_name ?? b.contacts?.name ?? 'Cliente'
                        const bg   = TIER_GRAD[b.contacts?.tier ?? 'Standard'] ?? TIER_GRAD.Standard
                        const amount = (b.price ?? 0) - (b.discount ?? 0)
                        return (
                          <tr key={b.id} className="row-hover" style={{ borderBottom:'1px solid #F0EFEA' }}>
                            <td style={{ padding:'9px 12px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <div style={{ width:28, height:28, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials(name)}</div>
                                <span style={{ fontSize:12, fontWeight:600 }}>{name}</span>
                              </div>
                            </td>
                            <td style={{ padding:'9px 12px', fontSize:12, color:'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                            <td style={{ padding:'9px 12px', fontSize:11, color:'var(--text2)' }}>
                              {b.vehicles ? `${b.vehicles.make ?? ''} ${b.vehicles.model ?? ''}`.trim() || '—' : '—'}
                            </td>
                            <td style={{ padding:'9px 12px', fontSize:12, fontWeight:700, color:'var(--gold)' }}>{formatAED(amount)}</td>
                            <td style={{ padding:'9px 12px' }}><StatusBadge status={b.status ?? 'pending'} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Productos Bajos de Stock */}
        <div className="glass" style={{ display:'flex', flexDirection:'column', overflow:'hidden', border: kpis.lowStockAlerts > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-cyan)', boxShadow:'var(--shadow)' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>Productos Bajos de Stock</div>
              <div style={{ fontSize:11, color:'var(--text2)', marginTop:2 }}>Inventario que requiere reposición</div>
            </div>
            {kpis.lowStockAlerts > 0 && (
              <span style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700 }}>
                {kpis.lowStockAlerts} alerta{kpis.lowStockAlerts !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="scroll" style={{ flex:1, padding:'8px 12px' }}>
            {loading
              ? <div style={{ padding:'12px 6px', display:'flex', flexDirection:'column', gap:10 }}>
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:64, borderRadius:10 }} />)}
                </div>
              : lowStockItems.length === 0
                ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 18px', textAlign:'center' }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Todo en orden</div>
                    <div style={{ fontSize:12, color:'var(--text2)' }}>Todos los productos están sobre el nivel mínimo</div>
                  </div>
                : <>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, paddingBottom:8 }}>
                      {lowStockItems.map(item => {
                        const stock = item.stock_qty ?? 0
                        const minLevel = item.min_stock ?? 1
                        const stockPercent = Math.min((stock / minLevel) * 100, 100)
                        const isCritical = stock === 0
                        return (
                          <div key={item.id} style={{
                            background: isCritical ? 'rgba(239,68,68,0.06)' : 'var(--bg3)',
                            border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                            borderRadius:10, padding:'12px 14px',
                            display:'flex', alignItems:'center', gap:12,
                          }}>
                            <div style={{
                              width:34, height:34, borderRadius:8, flexShrink:0,
                              background: isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)',
                              border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                              display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
                            }}>
                              {isCritical ? '🚨' : '⚠️'}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {item.name ?? '—'}
                                </div>
                                <div style={{ fontSize:12, fontWeight:800, color: isCritical ? '#ef4444' : '#f59e0b', flexShrink:0, marginLeft:8 }}>
                                  {stock} {item.unit || 'u'}
                                </div>
                              </div>
                              <div style={{ height:3, background:'var(--border)', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                                <div style={{ height:'100%', width:`${stockPercent}%`, background: isCritical ? '#ef4444' : '#f59e0b', borderRadius:2, transition:'width 0.3s' }} />
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#555' }}>
                                <span>{item.brand || '—'}</span>
                                <span>Mín: {minLevel} {item.unit || 'u'}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <a href="/services" style={{ display:'block', textAlign:'center', padding:'9px', background:'transparent', border:'1px solid #0B2A4A', borderRadius:8, color:'#0B2A4A', fontSize:11, fontWeight:700, textDecoration:'none', letterSpacing:'1px' }}>
                      VER INVENTARIO COMPLETO →
                    </a>
                  </>
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
