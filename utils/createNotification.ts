import { createClient } from '@/lib/supabase/client'

export async function createNotification({
  type,
  title,
  message,
  link,
}: {
  type: 'booking' | 'stock' | 'payment' | 'system'
  title: string
  message: string
  link?: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('notifications').insert({ type, title, message, link: link ?? null })
  if (error) console.error('[createNotification] insert failed:', error.message)
}
