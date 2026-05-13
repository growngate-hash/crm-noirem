export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'
import type { BusinessSettings } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('business_settings').select('*').single()
  return <SettingsClient initialSettings={settings as BusinessSettings | null} />
}
