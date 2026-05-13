export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import type { Activity, Deal } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const stageMap: Record<string, { count:number; value:number; color:string }> = {}
  allDeals.forEach(d => {
    const sn = d.stage?.name ?? 'Unknown'
    if (!stageMap[sn]) stageMap[sn] = { count:0, value:0, color: d.stage?.color ?? '#8A8A9A' }
    stageMap[sn].count++
    stageMap[sn].value += d.value ?? 0
  })

  const initialStats = {
    totalContacts: contacts ?? 0,
    totalCompanies: companies ?? 0,
    totalDeals: allDeals.length,
    totalRevenue: revenue,
    wonDeals: won.length,
    activeDeals: active.length,
    conversionRate: allDeals.length > 0 ? Math.round(won.length / allDeals.length * 100) : 0,
    recentActivities: (activities ?? []) as Activity[],
    dealsByStage: Object.entries(stageMap).map(([stage, v]) => ({ stage, ...v })),
  }

  return <DashboardClient initialStats={initialStats} />
}
