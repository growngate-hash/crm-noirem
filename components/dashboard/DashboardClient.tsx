'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Activity, Deal } from '@/types'
import { TrendingUp, TrendingDown, Users, Briefcase, DollarSign, Star, Clock, Phone, Mail, MessageSquare, Plus } from 'lucide-react'

interface Stats {
  totalContacts: number
  totalCompanies: number
  totalDeals: number
  totalRevenue: number
  wonDeals: number
  activeDeals: number
  conversionRate: number
  recentActivities: Activity[]
  dealsByStage: { stage: string; count: number; value: number; color: string }[]
}

const ACT_ICONS: Record<string, React.ElementType> = {
  call: Phone, email: Mail, note: MessageSquare, meeting: Users,
  task: Clock, deal_moved: TrendingUp, deal_created: Briefcase, contact_created: Users,
}
const ACT_COLORS: Record<string, string> = {
  call: '#00D4FF', email: '#A78BFA', note: '#D4AF37', meeting: '#22C55E',
  task: '#F59E0B', deal_moved: '#D4AF37', deal_created: '#22C55E', contact_created: '#00D4FF',
}

function KpiCard({ label, value, sub, color, icon: Icon, trend }: { label: string; value: string; sub: string; color: string; icon: React.ElementType; trend?: { v: string; up: boolean } }) {
  return (
    <div className="glass" style={{ padding:'20px 22px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,175,55,.13),transparent 70%)' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'#8A8A9A', letterSpacing:.3 }}>{label}</div>
        <div style={{ width:28, height:28, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={14} color={color} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, letterSpacing:-.5, marginBottom:6 }}>{value}</div>
      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
        {trend && <>
          {trend.up ? <TrendingUp size={11} color="#22C55E" /> : <TrendingDown size={11} color="#EF4444" />}
          <span style={{ fontSize:10, fontWeight:700, color: trend.up ? '#22C55E' : '#EF4444' }}>{trend.v}</span>
        </>}
        <span style={{ fontSize:10, color:'#4A4A5A' }}>{sub}</span>
      </div>
    </div>
  )
}

export default function DashboardClient({ initialStats }: { initialStats: Stats }) {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>(initialStats)

  const fetchStats = useCallback(async () => {
    const [
      { count: contacts },
      { count: companies },
      { data: deals },
      { data: activities },
    ] = await Promise.all([
      supabase.from('contacts').select('*', { count:'exact', head:true }),
      supabase.from('companies').select('*', { count:'exact', head:true }),
      supabase.from('deals').select('*, stage:deal_stages(name,color)'),
      supabase.from('activities').select('*, contact:contacts(name), deal:deals(title)').order('created_at', { ascending:false }).limit(10),
    ])

    const allDeals = (deals ?? []) as (Deal & { stage?: { name: string; color: string } })[]
    const won = allDeals.filter(d => d.stage?.name === 'Won')
    const active = allDeals.filter(d => !['Won','Lost'].includes(d.stage?.name ?? ''))
    const revenue = won.reduce((s, d) => s + (d.value ?? 0), 0)

    const stageMap: Record<string, { count: number; value: number; color: string }> = {}
    allDeals.forEach(d => {
      const sn = d.stage?.name ?? 'Unknown'
      if (!stageMap[sn]) stageMap[sn] = { count:0, value:0, color: d.stage?.color ?? '#8A8A9A' }
      stageMap[sn].count++
      stageMap[sn].value += d.value ?? 0
    })

    setStats({
      totalContacts: contacts ?? 0,
      totalCompanies: companies ?? 0,
      totalDeals: allDeals.length,
      totalRevenue: revenue,
      wonDeals: won.length,
      activeDeals: active.length,
      conversionRate: allDeals.length > 0 ? Math.round(won.length / allDeals.length * 100) : 0,
      recentActivities: (activities ?? []) as Activity[],
      dealsByStage: Object.entries(stageMap).map(([stage, v]) => ({ stage, ...v })),
    })
  }, [supabase])

  useEffect(() => {
    const channel = supabase.channel('realtime-dashboard')
      .on('postgres_changes', { event:'*', schema:'public', table:'contacts' }, fetchStats)
      .on('postgres_changes', { event:'*', schema:'public', table:'deals' }, fetchStats)
      .on('postgres_changes', { event:'*', schema:'public', table:'activities' }, fetchStats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchStats])

  const fmtCurrency = (v: number) =>
    v >= 1000000 ? `AED ${(v/1000000).toFixed(1)}M`
    : v >= 1000 ? `AED ${(v/1000).toFixed(0)}K`
    : `AED ${v.toFixed(0)}`

  const pipelineTotal = stats.dealsByStage.reduce((s, d) => s + d.value, 0)

  return (
    <div className="scroll" style={{ padding:'22px 26px', height:'100%' }}>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        <KpiCard label="Total Contacts"    value={String(stats.totalContacts)}   color="#00D4FF" icon={Users}      sub="in CRM" />
        <KpiCard label="Active Deals"      value={String(stats.activeDeals)}     color="#D4AF37" icon={Briefcase}  sub="in pipeline" />
        <KpiCard label="Won Revenue"       value={fmtCurrency(stats.totalRevenue)} color="#22C55E" icon={DollarSign} sub="closed won" />
        <KpiCard label="Conversion Rate"   value={`${stats.conversionRate}%`}    color="#A78BFA" icon={Star}       sub="deals won" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>

        {/* Pipeline by stage */}
        <div className="glass" style={{ padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Pipeline by Stage</div>
            <span style={{ fontSize:11, color:'#8A8A9A' }}>{fmtCurrency(pipelineTotal)} total</span>
          </div>
          {stats.dealsByStage.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#4A4A5A', fontSize:12 }}>No deals yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {stats.dealsByStage.sort((a,b) => b.value - a.value).map(s => (
                <div key={s.stage}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }} />
                      <span style={{ fontSize:11, fontWeight:600 }}>{s.stage}</span>
                      <span style={{ fontSize:10, color:'#8A8A9A' }}>{s.count} deal{s.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:s.color }}>{fmtCurrency(s.value)}</span>
                  </div>
                  <div className="prog">
                    <div className="progf" style={{ width:`${pipelineTotal > 0 ? (s.value/pipelineTotal*100) : 0}%`, background:s.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity feed */}
        <div className="glass" style={{ padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700 }}>Recent Activity</div>
            <span style={{ fontSize:10, color:'#8A8A9A', textTransform:'uppercase', letterSpacing:.8 }}>Live</span>
          </div>
          {stats.recentActivities.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#4A4A5A', fontSize:12 }}>No activity yet</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {stats.recentActivities.map((a, i) => {
                const Icon = ACT_ICONS[a.type] ?? MessageSquare
                const col = ACT_COLORS[a.type] ?? '#D4AF37'
                const time = new Date(a.created_at).toLocaleTimeString('en-AE', { hour:'2-digit', minute:'2-digit' })
                return (
                  <div key={a.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < stats.recentActivities.length-1 ? '1px solid rgba(212,175,55,.04)' : 'none' }}>
                    <div style={{ width:30, height:30, borderRadius:9, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={13} color={col} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</div>
                      <div style={{ fontSize:10, color:'#8A8A9A', marginTop:2 }}>
                        {a.contact?.name && <span>{a.contact.name}</span>}
                        {a.deal?.title && <span style={{ color:'#D4AF37' }}> · {a.deal.title}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:'#4A4A5A', flexShrink:0 }}>{time}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <div className="glass" style={{ padding:'18px 22px' }}>
          <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:8 }}>Total Deals</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#D4AF37' }}>{stats.totalDeals}</div>
        </div>
        <div className="glass" style={{ padding:'18px 22px' }}>
          <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:8 }}>Won Deals</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#22C55E' }}>{stats.wonDeals}</div>
        </div>
        <div className="glass" style={{ padding:'18px 22px' }}>
          <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:8 }}>Companies</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#00D4FF' }}>{stats.totalCompanies}</div>
        </div>
      </div>
    </div>
  )
}
