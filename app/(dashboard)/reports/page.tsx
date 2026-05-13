export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import type { Deal, Contact } from '@/types'
import { BarChart2, Users, TrendingUp, Star, FileText, Download } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const [{ data: deals }, { data: contacts }, { data: stages }] = await Promise.all([
    supabase.from('deals').select('*, stage:deal_stages(name,color), contact:contacts(name,tier)').order('value', { ascending:false }),
    supabase.from('contacts').select('*, deals:deals(value)').order('lifetime_value', { ascending:false }).limit(10),
    supabase.from('deal_stages').select('*, deals:deals(value)').order('position'),
  ])

  const allDeals = (deals ?? []) as (Deal & { stage?: { name:string; color:string } })[]
  const wonDeals = allDeals.filter(d => d.stage?.name === 'Won')
  const totalRev = wonDeals.reduce((s,d) => s + d.value, 0)
  const totalPipeline = allDeals.reduce((s,d) => s + d.value, 0)
  const fmt = (v: number) => `AED ${v.toLocaleString('en-AE', { maximumFractionDigits:0 })}`

  const REPORTS = [
    { cat:'Sales',         icon:'💲', color:'#22C55E', reports:['General Sales','Sales by Service','Sales by Client','Profitability by Service','Client Sales Status'] },
    { cat:'Administrative',icon:'📈', color:'#00D4FF', reports:['Accounts Receivable','Accounts Payable','Income & Expenses','Inventory Value','Transactions','Purchases','Annual Report'] },
    { cat:'Financial',     icon:'📄', color:'#D4AF37', reports:['Cash Flow'] },
    { cat:'Accounting',    icon:'📋', color:'#A78BFA', reports:['Income Statement','Balance Sheet','Account Movements','General Journal'] },
  ]

  return (
    <div className="scroll" style={{ height:'100%', padding:'22px 26px' }}>
      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { l:'Total Revenue', v:fmt(totalRev), color:'#22C55E', icon:TrendingUp },
          { l:'Pipeline Value', v:fmt(totalPipeline), color:'#D4AF37', icon:BarChart2 },
          { l:'Total Deals', v:String(allDeals.length), color:'#00D4FF', icon:FileText },
        ].map(k => (
          <div key={k.l} className="glass" style={{ padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11, color:'#8A8A9A', marginBottom:6 }}>{k.l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.v}</div>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:`${k.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <k.icon size={18} color={k.color} strokeWidth={1.8} />
            </div>
          </div>
        ))}
      </div>

      {/* Report categories */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
        {REPORTS.map(cat => (
          <div key={cat.cat} className="glass" style={{ padding:22 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:22 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700 }}>{cat.cat}</div>
                  <div style={{ fontSize:10, color:'#8A8A9A' }}>{cat.reports.length} reports</div>
                </div>
              </div>
              <button className="btn btnq" style={{ padding:'6px 12px', fontSize:10 }}><Download size={10} />Export</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {cat.reports.map(r => (
                <div key={r} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,.02)', cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(212,175,55,.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}>
                  <span style={{ fontSize:11, color:'#F0EDE8' }}>{r}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn" style={{ padding:'3px 8px', fontSize:9, background:`${cat.color}18`, color:cat.color, border:`1px solid ${cat.color}30`, borderRadius:5 }}>Preview</button>
                    <button className="btn btng" style={{ padding:'3px 8px', fontSize:9, borderRadius:5 }}>Generate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
