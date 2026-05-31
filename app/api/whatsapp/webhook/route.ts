import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://saffi.app/booking'
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'noirem_verify_token'

const MESSAGES = {
  language_selector:
    'Welcome to Saffi Luxury Car Care 🚗✨\n\nPlease select your language / Selecciona tu idioma / اختر لغتك:\n\n1️⃣ English\n2️⃣ Español\n3️⃣ العربية',
  booking_en: `Hi! Here is your booking link:\n${BOOKING_URL}\n\nBook your premium car care service in Dubai 🌟`,
  booking_es: `¡Hola! Aquí tienes tu enlace de reserva:\n${BOOKING_URL}\n\nReserva tu servicio premium de cuidado del vehículo en Dubái 🌟`,
  booking_ar: `مرحباً! إليك رابط الحجز:\n${BOOKING_URL}\n\nاحجز خدمة العناية الفاخرة بسيارتك في دبي 🌟`,
  invalid:
    'Please reply with 1, 2 or 3 to select your language.\n\nPor favor responde 1, 2 o 3 para seleccionar tu idioma.\n\nالرجاء الرد بـ 1 أو 2 أو 3 لاختيار لغتك.',
}

const RESET_RE = /reserva|booking|hola|hello|مرحبا/i

async function getSession(phone: string) {
  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('state, language')
    .eq('phone', phone)
    .maybeSingle()
  return data ?? { state: 'init', language: null }
}

async function setSession(phone: string, state: string, language?: string | null) {
  await supabase.from('whatsapp_sessions').upsert(
    { phone, state, language: language ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'phone' }
  )
}

async function sendMessage(to: string, body: string, config: { phone_number_id: string; api_key: string }) {
  await fetch(`https://graph.facebook.com/v20.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })
}

async function getWhatsAppConfig() {
  const { data } = await supabase
    .from('whatsapp_configs')
    .select('phone_number_id, api_key')
    .eq('is_active', true)
    .maybeSingle()
  return data
}

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — incoming messages
export async function POST(req: NextRequest) {
  const body = await req.json()

  const entry   = body?.entry?.[0]
  const change  = entry?.changes?.[0]
  const value   = change?.value
  const messages = value?.messages

  if (!messages || messages.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const config = await getWhatsAppConfig()
  if (!config) return NextResponse.json({ error: 'No WhatsApp config' }, { status: 500 })

  for (const msg of messages) {
    if (msg.type !== 'text') continue

    const phone = msg.from as string
    const text  = (msg.text?.body ?? '').trim()

    const session = await getSession(phone)
    let { state } = session

    // Reset on keyword regardless of state
    if (state === 'done' && RESET_RE.test(text)) {
      state = 'init'
    }

    if (state === 'init') {
      await sendMessage(phone, MESSAGES.language_selector, config)
      await setSession(phone, 'waiting_language')
      continue
    }

    if (state === 'waiting_language') {
      if (text === '1') {
        await sendMessage(phone, MESSAGES.booking_en, config)
        await setSession(phone, 'done', 'en')
      } else if (text === '2') {
        await sendMessage(phone, MESSAGES.booking_es, config)
        await setSession(phone, 'done', 'es')
      } else if (text === '3') {
        await sendMessage(phone, MESSAGES.booking_ar, config)
        await setSession(phone, 'done', 'ar')
      } else {
        await sendMessage(phone, MESSAGES.invalid, config)
      }
      continue
    }

    // state === 'done' and no reset keyword — ignore silently
  }

  return NextResponse.json({ ok: true })
}