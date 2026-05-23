import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!
const BOOKING_URL = 'https://crm-noirem.vercel.app/booking'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function sendMessage(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  })
}

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge!, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages
      if (!messages?.length) continue

      const msg = messages[0]
      const from = msg.from
      const text = msg.text?.body?.trim() ?? ''

      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('step, language')
        .eq('phone', from)
        .single()

      const step = conv?.step ?? 'init'

      if (step === 'init' || !conv) {
        await supabase.from('whatsapp_conversations').upsert({
          phone: from,
          step: 'waiting_language',
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' })

        await sendMessage(from,
          'Hello / Hola / مرحبا 👋\n\nPlease select your language:\n\n1️⃣ English\n2️⃣ Español\n3️⃣ العربية'
        )

      } else if (step === 'waiting_language') {
        let lang = 'en'
        let bookingMsg = ''

        if (text === '1') {
          lang = 'en'
          bookingMsg = 'Hi! 😊 Thanks for reaching out.\n\nTo book your service quickly and easily:\n\n👉 ' + BOOKING_URL + '\n\nChoose your service, pick a date and time, and your booking will be confirmed instantly. ✨'
        } else if (text === '2') {
          lang = 'es'
          bookingMsg = '¡Hola! 😊 Gracias por escribirnos.\n\nPara agendar tu servicio:\n\n👉 ' + BOOKING_URL + '\n\nElige el servicio, selecciona el día y hora, ¡y tu reserva queda confirmada al instante! ✨'
        } else if (text === '3') {
          lang = 'ar'
          bookingMsg = 'مرحباً! 😊\n\nلحجز خدمتك:\n\n👉 ' + BOOKING_URL + '\n\nاختر الخدمة والوقت المناسب وسيتم تأكيد حجزك فوراً! ✨'
        } else {
          await sendMessage(from, 'Please reply with:\n1️⃣ English\n2️⃣ Español\n3️⃣ العربية')
          continue
        }

        await supabase.from('whatsapp_conversations').upsert({
          phone: from,
          step: 'done',
          language: lang,
          updated_at: new Date().toISOString()
        }, { onConflict: 'phone' })

        await sendMessage(from, bookingMsg)

      } else if (step === 'done') {
        const keywords = ['reserva', 'booking', 'hola', 'hello', 'hi', 'مرحبا', 'book', 'cita']
        if (keywords.some(k => text.toLowerCase().includes(k))) {
          await supabase.from('whatsapp_conversations').upsert({
            phone: from,
            step: 'init',
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone' })

          await sendMessage(from,
            'Hello / Hola / مرحبا 👋\n\nPlease select your language:\n\n1️⃣ English\n2️⃣ Español\n3️⃣ العربية'
          )
        }
      }
    }
  }

  return new Response('ok', { status: 200 })
})