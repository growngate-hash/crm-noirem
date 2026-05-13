export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/deals/KanbanBoard'
import type { Deal, DealStage, Contact, Company } from '@/types'

export default async function DealsPage() {
  const supabase = await createClient()
  const [{ data: deals }, { data: stages }, { data: contacts }, { data: companies }] = await Promise.all([
    supabase.from('deals').select('*, contact:contacts(name,tier), company:companies(name), stage:deal_stages(name,color)').order('position'),
    supabase.from('deal_stages').select('*').order('position'),
    supabase.from('contacts').select('id,name,tier').order('name'),
    supabase.from('companies').select('id,name').order('name'),
  ])
  return (
    <KanbanBoard
      initialDeals={(deals ?? []) as Deal[]}
      stages={(stages ?? []) as DealStage[]}
      contacts={(contacts ?? []) as Contact[]}
      companies={(companies ?? []) as Company[]}
    />
  )
}
