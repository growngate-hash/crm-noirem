import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { booking_id, message_type } = await req.json()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, contact:contact_id(name, whatsapp_phone), service:service_id(name)')
    .eq('id', booking_id)
    .single()

  if (!booking?.contact?.whatsapp_phone) {
    return new Response('No WhatsApp phone', { status: 400 })
  }

  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!config) return new Response('No WA config', { status: 400 })

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: booking.contact.whatsapp_phone,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' }
        }
      })
    }
  )

  const status = res.ok ? 'sent' : 'failed'

  await supabase.from('whatsapp_logs').insert({
    booking_id,
    phone_to: booking.contact.whatsapp_phone,
    message_type,
    status
  })

  return new Response(JSON.stringify({ status }), { status: 200 })
})
