export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import type { Deal } from '@/types'
import { DollarSign, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: deals } = await supabase.from('deals').select('*, stage:deal_stages(name)').order('created_at', { ascending:false })
  const allDeals = (deals ?? []) as (Deal & { stage?: { name: string } })[]
  const wonDeals = allDeals.filter(d => d.stage?.name === 'Won')
  const totalRevenue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const pipeline = allDeals.filter(d => !['Won','Lost'].includes(d.stage?.name ?? '')).reduce((s,d) => s + (d.value ?? 0), 0)
  const avgDeal = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0
  const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits:0 })}`

  return (
    <div className="scroll" style={{ height:'100%', padding:'22px 26px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { l:'Won Revenue', v:fmt(totalRevenue), icon:DollarSign, color:'#22C55E' },
          { l:'Active Pipeline', v:fmt(pipeline), icon:TrendingUp, color:'#D4AF37' },
          { l:'Avg. Deal Size', v:fmt(avgDeal), icon:BarChart2, color:'#00D4FF' },
          { l:'Won Deals', v:String(wonDeals.length), icon:TrendingDown, color:'#A78BFA' },
        ].map(k => (
          <div key={k.l} className="glass" style={{ padding:'20px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ fontSize:11, color:'#8A8A9A' }}>{k.l}</div>
              <div style={{ width:28, height:28, borderRadius:8, background:`${k.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <k.icon size={14} color={k.color} strokeWidth={2} />
              </div>
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="glass" style={{ padding:22 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>Won Deals — Revenue Log</div>
        {wonDeals.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#4A4A5A', fontSize:12 }}>No won deals yet</div>
        ) : (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'9px 18px', borderBottom:'1px solid rgba(212,175,55,.08)' }}>
              {['Deal','Value','Probability','Close Date'].map(h => <div key={h} className="field-label" style={{ margin:0 }}>{h}</div>)}
            </div>
            {wonDeals.map((d, i) => (
              <div key={d.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, alignItems:'center', padding:'12px 18px', borderBottom: i < wonDeals.length-1 ? '1px solid rgba(212,175,55,.04)' : 'none' }}>
                <div style={{ fontSize:12, fontWeight:600 }}>{d.title}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'#22C55E' }}>{fmt(d.value)}</div>
                <div style={{ fontSize:12 }}>{d.probability}%</div>
                <div style={{ fontSize:11, color:'#8A8A9A' }}>{d.close_date ? new Date(d.close_date).toLocaleDateString('en-AE') : '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
