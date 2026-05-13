export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import CompaniesClient from '@/components/companies/CompaniesClient'
import type { Company } from '@/types'

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: companies } = await supabase.from('companies').select('*').order('created_at', { ascending:false })
  return <CompaniesClient initialCompanies={(companies ?? []) as Company[]} />
}
