export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ContactsClient from '@/components/contacts/ContactsClient'
import type { Contact, Company } from '@/types'

export default async function ContactsPage() {
  const supabase = await createClient()
  const [{ data: contacts }, { data: companies }] = await Promise.all([
    supabase.from('contacts').select('*, company:companies(name)').order('created_at', { ascending:false }),
    supabase.from('companies').select('id,name').order('name'),
  ])
  return (
    <ContactsClient
      initialContacts={(contacts ?? []) as Contact[]}
      companies={(companies ?? []) as Company[]}
    />
  )
}
