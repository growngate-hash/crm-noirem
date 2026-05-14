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
const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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
const STATUS_ACTIVE = ['Pending', 'Confirmed', 'In Progress']
const GOLD = '#c9a84c'
const CHART_COLORS = [GOLD, '#00d4aa', '#ff4f4f', '#818cf8', '#ffa800']

// ─── demo data ───────────────────────────────────────────────────────────────
const DEMO_BOOKINGS = [
  { id:'d1', contacts:{name:'Khalid Al Mansoori',tier:'Ultra-VIP'}, services:{name:'Full Detail'}, vehicles:{make:'Lamborghini',model:'Urus'}, price:4200, status:'Completed', created_at:new Date(Date.now()-120000).toISOString() },
  { id:'d2', contacts:{name:'Sara Al Rashid',tier:'VIP'}, services:{name:'Paint Protection Film'}, vehicles:{make:'Range Rover',model:'Sport'}, price:7800, status:'Pending', created_at:new Date(Date.now()-3600000).toISOString() },
  { id:'d3', contacts:{name:'Mohammed Hassan',tier:'VIP'}, services:{name:'Ceramic Coating'}, vehicles:{make:'Ferrari',model:'488'}, price:12500, status:'In Progress', created_at:new Date(Date.now()-7200000).toISOString() },
]
const DEMO_ACTIVITY = [
  { id:'a1', name:'Khalid Al Mansoori', desc:'Full Detail completed', status:'Completed', time:'2m ago' },
  { id:'a2', name:'Sara Al Rashid', desc:'Paint Protection booked', status:'Confirmed', time:'45m ago' },
  { id:'a3', name:'Mohammed Hassan', desc:'Ceramic Coating started', status:'In Progress', time:'1h ago' },
  { id:'a4', name:'System Alert', desc:'Low stock: Ceramic Pro 9H', status:'Pending', time:'3h ago' },
]
const DEMO_SALES    = [{m:'Ene',v:45000},{m:'Feb',v:52000},{m:'Mar',v:48000},{m:'Abr',v:61000},{m:'May',v:73000},{m:'Jun',v:68000}]
const DEMO_FLOW     = [{d:'Lun',n:5},{d:'Mar',n:8},{d:'Mié',n:3},{d:'Jue',n:9},{d:'Vie',n:7},{d:'Sáb',n:4},{d:'Dom',n:2}]
const DEMO_EXPENSES = [{name:'Materiales',value:35},{name:'Mano de obra',value:40},{name:'Marketing',value:15},{name:'Otros',value:10}]
const DEMO_PRODUCTS = [{name:'Ceramic Coating',v:85000},{name:'Full Detail',v:62000},{name:'PPF',v:54000},{name:'Corrección',v:38000},{name:'Tintado',v:22000}]
const DEMO_CLIENTS  = [{name:'Khalid Al Mansoori',v:45000},{name:'Mohammed Al Maktoum',v:38000},{name:'Sara Al Rashid',v:29000},{name:'Ahmed Hassan',v:24000},{name:'Fatima Al Zaabi',v:18000}]

// ─── tooltip style ────────────────────────────────────────────────────────────
const tooltipStyle = { background:'#141416', border:'1px solid rgba(201,168,76,0.25)', borderRadius:8, fontSize:11, color:'#f0ede8' }

// ─── chart widgets ────────────────────────────────────────────────────────────
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

  // data
  const [bookings, setBookings] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // period dropdown
  const [period, setPeriod] = useState('currentMonth')
  const [periodView, setPeriodView] = useState<'list'|'custom'>('list')
  const [showPeriod, setShowPeriod] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appliedLabel, setAppliedLabel] = useState('Mes Actual')

  // add chart dropdown
  const [showAddChart, setShowAddChart] = useState(false)
  const [activeCharts, setActiveCharts] = useState<string[]>([])

  // toast
  const [toast, setToast] = useState('')

  const periodRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    Promise.all([
      supabase.from('bookings').select('*, contacts(*), vehicles(*), services(*)').order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*'),
    ]).then(([{ data: b }, { data: inv }]) => {
      setBookings(b ?? [])
      setInventory(inv ?? [])
      setLoading(false)
    })
  }, [])

  // close dropdowns on outside click
  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setShowPeriod(false)
        setPeriodView('list')
      }
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setShowAddChart(false)
      }
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  function openPeriod() {
    setShowAddChart(false)
    setShowPeriod(p => !p)
    setPeriodView('list')
  }
  function openAddChart() {
    setShowPeriod(false)
    setShowAddChart(p => !p)
  }

  function selectPeriod(key: string, label: string) {
    setPeriod(key)
    setAppliedLabel(label)
    setShowPeriod(false)
    setPeriodView('list')
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    const label = `${customFrom} → ${customTo}`
    setPeriod('custom')
    setAppliedLabel(label)
    setShowPeriod(false)
    setPeriodView('list')
  }

  function addChart(id: string) {
    if (!activeCharts.includes(id)) setActiveCharts(prev => [...prev, id])
    setShowAddChart(false)
  }
  function removeChart(id: string) { setActiveCharts(prev => prev.filter(c => c !== id)) }

  // ── kpi calcs ────────────────────────────────────────────────────────────
  const completed    = bookings.filter(b => b.status === 'Completed')
  const totalRevenue = completed.reduce((s, b) => s + (b.price ?? 0), 0)
  const totalProfit  = totalRevenue * 0.65
  const totalExpenses= totalRevenue * 0.35
  const lowStock     = inventory.filter(i => (i.stock_qty ?? 0) <= (i.min_stock ?? 0)).length
  const now          = new Date()
  const mtd          = completed.filter(b => { const d = new Date(b.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
  const revenueMTD   = mtd.reduce((s, b) => s + (b.price ?? 0), 0)
  const activeBookN  = bookings.filter(b => STATUS_ACTIVE.includes(b.status)).length
  const avgOrder     = completed.length ? totalRevenue / completed.length : 0

  const displayBookings = loading ? [] : (bookings.length > 0 ? bookings.slice(0, 10) : DEMO_BOOKINGS)
  const displayActivity = loading ? [] : (bookings.length > 0
    ? bookings.slice(0, 5).map(b => ({ id: b.id, name: b.contacts?.name ?? 'Unknown', desc: `${b.services?.name ?? 'Service'} — ${b.status}`, status: b.status, time: timeAgo(b.created_at) }))
    : DEMO_ACTIVITY)

  const row1 = [
    { key:'totalProfit',   label:t('totalProfit'),   color:'var(--cyan)', iconBg:'rgba(0,212,170,0.1)',   icon:TrendingUp,  value: bookings.length>0 ? fmt(totalProfit).replace('AED ','') : '0.00',   sub:`— ${bookings.length>0?fmt(totalProfit):'AED 0.00'} este mes` },
    { key:'totalRevenue',  label:t('totalRevenue'),  color:'var(--cyan)', iconBg:'rgba(0,212,170,0.1)',   icon:DollarSign,  value: bookings.length>0 ? fmt(totalRevenue).replace('AED ','') : '0.00',  sub:`— ${bookings.length>0?fmt(totalRevenue):'AED 0.00'} este mes` },
    { key:'totalExpenses', label:t('totalExpenses'), color:'var(--red)',  iconBg:'rgba(255,79,79,0.1)',   icon:TrendingDown, value: bookings.length>0 ? fmt(totalExpenses).replace('AED ','') : '0.00', sub:`— ${bookings.length>0?fmt(totalExpenses):'AED 0.00'} este mes` },
    { key:'lowStock',      label:t('lowStockAlerts'),color:'var(--gold)', iconBg:'rgba(201,168,76,0.12)', iconChar:'◆',     value: String(lowStock), bigNum: true, sub:`— ${t('allInStock')}` },
  ]
  const row2 = [
    { key:'mtd',  label:t('revenueMTD'),    value: bookings.length>0 ? fmt(revenueMTD) : 'AED 847K', delta:'↑ +18.4%', sub:'vs mes anterior' },
    { key:'act',  label:t('activeBookings'),value: bookings.length>0 ? String(activeBookN) : '23',   delta:'↑ +3',     sub:'desde ayer' },
    { key:'avg',  label:t('avgOrderValue'), value: bookings.length>0 ? fmt(avgOrder) : 'AED 2,890',  delta:'↑ +6.2%',  sub:'vs mes anterior' },
    { key:'csat', label:t('csatScore'),     value:'4.93', suffix:' / 5', delta:'↑ +0.07', sub:'este trimestre' },
  ]

  // ── opt-item style fn ─────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:24, minHeight:'100%' }}>

      {/* ── top action bar ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginBottom:20 }}>

        {/* Period button */}
        <div ref={periodRef} style={{ position:'relative' }}>
          <button
            onClick={openPeriod}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer', background:'var(--bg3)', border:`1px solid ${GOLD}40`, color:GOLD, fontSize:12, fontWeight:600, fontFamily:'Outfit,sans-serif' }}
          >
            {appliedLabel} <ChevronDown size={12} />
          </button>

          {showPeriod && (
            <div style={dropdownStyle}>
              {periodView === 'list' ? (
                /* list view */
                <div style={{ padding:4 }}>
                  {PERIOD_OPTIONS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => selectPeriod(p.key, p.label)}
                      style={optStyle(period === p.key)}
                      onMouseEnter={e => { if (period !== p.key) (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' }}
                      onMouseLeave={e => { if (period !== p.key) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'4px 0' }} />
                  <button
                    onClick={() => setPeriodView('custom')}
                    style={optStyle(period === 'custom')}
                    onMouseEnter={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' } }}
                    onMouseLeave={e => { if (period !== 'custom') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}
                  >
                    Rango Personalizado
                  </button>
                </div>
              ) : (
                /* custom range view */
                <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12, minWidth:240 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Rango Personalizado</div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Desde</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      style={{ width:'100%', background:'#1a1a1e', border:`1px solid ${GOLD}40`, borderRadius:8, padding:'8px 12px', color:'#f0ede8', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>Hasta</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      style={{ width:'100%', background:'#1a1a1e', border:`1px solid ${GOLD}40`, borderRadius:8, padding:'8px 12px', color:'#f0ede8', fontSize:12, fontFamily:'Outfit,sans-serif', outline:'none' }}
                    />
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:4 }}>
                    <button
                      onClick={applyCustom}
                      disabled={!customFrom || !customTo}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', cursor: customFrom && customTo ? 'pointer' : 'not-allowed', background: customFrom && customTo ? GOLD : `${GOLD}40`, color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif' }}
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => { setShowPeriod(false); setPeriodView('list') }}
                      style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', background:'transparent', color:'var(--text2)', fontSize:12, fontFamily:'Outfit,sans-serif' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Chart button */}
        <div ref={chartRef} style={{ position:'relative' }}>
          <button
            onClick={openAddChart}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, cursor:'pointer', background:GOLD, border:'none', color:'#0d0d0f', fontSize:12, fontWeight:700, fontFamily:'Outfit,sans-serif' }}
          >
            <Plus size={13} /> {t('addChart')}
          </button>

          {showAddChart && (
            <div style={dropdownStyle}>
              <div style={{ padding:4 }}>
                {CHART_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => addChart(opt.id)}
                    style={{ ...optStyle(activeCharts.includes(opt.id)), display:'flex', alignItems:'center', gap:10 }}
                    onMouseEnter={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = '#1a1a1e'; (e.currentTarget as HTMLElement).style.color = '#f0ede8' } }}
                    onMouseLeave={e => { if (!activeCharts.includes(opt.id)) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888580' } }}
                  >
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
        {row1.map(card => (
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
              : <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:card.color }}>AED</span>
                  <span style={{ fontSize:28, fontWeight:800, color:card.color, lineHeight:1 }}>{card.value}</span>
                </div>
            }
            <div style={{ fontSize:10, color:'#3a3836', marginTop:6 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── KPI Row 2 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {row2.map(card => (
          <div key={card.key} style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 16px' }}>
            <div style={{ fontSize:10, fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>{card.label}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:6 }}>
              <span style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>{card.value}</span>
              {card.suffix && <span style={{ fontSize:14, color:'var(--text2)' }}>{card.suffix}</span>}
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#34d399' }}>{card.delta}</span>
              <span style={{ fontSize:10, color:'var(--text2)' }}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart widgets (injected by "+ Add Chart") ── */}
      {mounted && activeCharts.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns: activeCharts.length === 1 ? '1fr' : 'repeat(2,1fr)', gap:14, marginBottom:16 }}>
          {activeCharts.map(id => (
            <ChartWidget key={id} id={id} onRemove={() => removeChart(id)} />
          ))}
        </div>
      )}

      {/* ── Bottom: Recent Bookings + Activity Feed ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14 }}>

        {/* Recent Bookings */}
        <div className="glass" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{t('recentBookings')}</div>
            <span style={{ fontSize:11, color:'var(--text2)' }}>{t('last10')}</span>
          </div>
          {loading ? <SkeletonTable rows={3} cols={5} /> : (
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
                  {displayBookings.map(b => {
                    const name = b.contacts?.name ?? 'Unknown'
                    const bg = TIER_GRAD[b.contacts?.tier ?? 'Standard'] ?? TIER_GRAD.Standard
                    return (
                      <tr key={b.id} className="row-hover" style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding:'10px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials(name)}</div>
                            <span style={{ fontSize:12, fontWeight:600 }}>{name}</span>
                          </div>
                        </td>
                        <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text2)' }}>{b.services?.name ?? '—'}</td>
                        <td style={{ padding:'10px 16px', fontSize:11, color:'var(--text2)' }}>{b.vehicles ? `${b.vehicles.make} ${b.vehicles.model}` : '—'}</td>
                        <td style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'var(--gold)' }}>{fmt(b.price ?? 0)}</td>
                        <td style={{ padding:'10px 16px' }}><StatusBadge status={b.status ?? 'Pending'} /></td>
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
              ? <div style={{ padding:'12px 18px', display:'flex', flexDirection:'column', gap:14 }}>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:36, borderRadius:8 }} />)}</div>
              : displayActivity.map((item, idx) => (
                <div key={item.id} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom: idx < displayActivity.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:4, background:DOT_COLOR[item.status] ?? 'var(--text2)' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{item.name}</div>
                    <div style={{ fontSize:11, color:'var(--text2)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.desc}</div>
                    <div style={{ fontSize:10, color:'#444' }}>{item.time}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'var(--bg3)', border:`1px solid ${GOLD}40`, borderRadius:10, padding:'12px 18px', color:'var(--text)', fontSize:13, fontWeight:500, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
