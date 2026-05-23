import { createClient } from '@/lib/supabase/client'

export async function createNotification({ type, title, message, link }: {
  type: 'booking' | 'stock' | 'payment' | 'system'
  title: string
  message: string
  link?: string
}) {
  console.log('[createNotification] Insertando:', { type, title, message })
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert({ type, title, message, link: link ?? null })
    .select()
  console.log('[createNotification] Resultado:', { data, error })
}