// @ts-nocheck
// SQL para crear la tabla (ejecutar como migración antes del primer deploy):
//
// CREATE TABLE IF NOT EXISTS whatsapp_messages (
//   id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   phone      text NOT NULL,
//   role       text NOT NULL,
//   content    text NOT NULL,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
// CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone
//   ON whatsapp_messages(phone, created_at DESC);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_TOKEN    = Deno.env.get('WHATSAPP_TOKEN')!
const PHONE_NUMBER_ID   = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const VERIFY_TOKEN      = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!
const OPENAI_API_KEY    = Deno.env.get('OPENAI_API_KEY') ?? ''
const BOOKING_URL       = Deno.env.get('BOOKING_URL') ?? 'https://crm-noirem.vercel.app/booking'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FALLBACK_MSG = `Hola! Para reservas y consultas visita: ${BOOKING_URL} o escríbenos directamente. 😊`

// ── WhatsApp send ──────────────────────────────────────────────────────────────
async function sendWhatsApp(to: string, text: string): Promise<void> {
  await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}

// ── OpenAI API ─────────────────────────────────────────────────────────────────
async function callOpenAI(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI ${res.status}: ${body}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Action executor ────────────────────────────────────────────────────────────
// Detecta tags [ACTION:CANCEL:uuid] y [ACTION:MODIFY:uuid:ISO] en la respuesta
// de OpenAI, ejecuta los updates en Supabase y devuelve el texto limpio.
async function executeActions(text: string, phone: string): Promise<string> {
  let clean = text

  // ── CANCEL ──
  const cancelRe = /\[ACTION:CANCEL:([0-9a-f-]{36})\]/gi
  for (const m of text.matchAll(cancelRe)) {
    const brId = m[1]

    const { data: br } = await supabase
      .from('booking_requests')
      .select('scheduled_at')
      .eq('id', brId)
      .single()

    if (br) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone)

      const contactIds = (contacts ?? []).map((c: any) => c.id)

      await Promise.all([
        supabase
          .from('booking_requests')
          .update({ status: 'cancelled' })
          .eq('id', brId),
        contactIds.length > 0
          ? supabase
              .from('bookings')
              .update({ status: 'cancelled' })
              .in('contact_id', contactIds)
              .eq('scheduled_at', br.scheduled_at)
          : Promise.resolve(),
      ])
    }

    clean = clean.replace(m[0], '')
  }

  // ── MODIFY ──
  const modifyRe = /\[ACTION:MODIFY:([0-9a-f-]{36}):([^\]]+)\]/gi
  for (const m of text.matchAll(modifyRe)) {
    const [, brId, newDate] = m

    const { data: br } = await supabase
      .from('booking_requests')
      .select('scheduled_at')
      .eq('id', brId)
      .single()

    if (br) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone)

      const contactIds = (contacts ?? []).map((c: any) => c.id)

      await Promise.all([
        supabase
          .from('booking_requests')
          .update({ scheduled_at: newDate })
          .eq('id', brId),
        contactIds.length > 0
          ? supabase
              .from('bookings')
              .update({ scheduled_at: newDate })
              .in('contact_id', contactIds)
              .eq('scheduled_at', br.scheduled_at)
          : Promise.resolve(),
      ])
    }

    clean = clean.replace(m[0], '')
  }

  return clean.trim()
}

// ── Main handler ───────────────────────────────────────────────────────────────
serve(async (req) => {
  // ── GET: verificación del webhook de Meta ──────────────────────────────────
  if (req.method === 'GET') {
    const url       = new URL(req.url)
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge!, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // ── POST: mensaje entrante ─────────────────────────────────────────────────
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages
      if (!messages?.length) continue

      const msg   = messages[0]
      const phone = msg.from as string
      const text  = (msg.text?.body ?? '').trim()
      if (!text) continue

      try {
        await processMessage(phone, text)
      } catch (err) {
        console.error('[whatsapp-bot] processMessage error:', err)
        // Fallback silencioso — nunca dejar al cliente sin respuesta
        try { await sendWhatsApp(phone, FALLBACK_MSG) } catch { /* ignore */ }
      }
    }
  }

  return new Response('ok', { status: 200 })
})

// ── processMessage ─────────────────────────────────────────────────────────────
async function processMessage(phone: string, text: string): Promise<void> {
  // ── 1. Guardar mensaje del cliente ─────────────────────────────────────────
  await supabase.from('whatsapp_messages').insert({ phone, role: 'user', content: text })

  // ── 2. Contexto desde Supabase (paralelo) ──────────────────────────────────
  const [
    { data: services },
    { data: zones },
    { data: hours },
    { data: settings },
    { data: historyDesc },
    { data: activeBookings },
  ] = await Promise.all([
    supabase
      .from('services')
      .select('name, description, base_price, duration_hrs, category')
      .eq('is_active', true)
      .order('category')
      .order('name'),

    supabase
      .from('coverage_zones')
      .select('name')
      .eq('is_active', true),

    supabase
      .from('business_hours')
      .select('day_label, is_open, start_time, end_time')
      .order('day_of_week'),

    supabase
      .from('company_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_phone', 'company_email', 'company_address']),

    // Historial: últimos 10 mensajes (DESC), luego invertimos
    supabase
      .from('whatsapp_messages')
      .select('role, content')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(10),

    // Reservas activas del cliente
    supabase
      .from('booking_requests')
      .select('id, service_name, scheduled_at, status')
      .eq('customer_phone', phone)
      .in('status', ['pending', 'confirmed'])
      .order('scheduled_at', { ascending: true }),
  ])

  // Construir objeto empresa desde company_settings
  const co: Record<string, string> = {}
  for (const s of settings ?? []) co[s.key] = s.value ?? ''
  const company = {
    name:    co.company_name    ?? 'NOIREM',
    phone:   co.company_phone   ?? '',
    email:   co.company_email   ?? '',
    address: co.company_address ?? '',
  }

  // Historial cronológico — excluir el mensaje que acabamos de insertar
  const history = [...(historyDesc ?? [])].reverse().slice(0, -1)

  // ── 3. Construir system prompt ─────────────────────────────────────────────
  const svcLines = (services ?? []).map(s =>
    `- ${s.name} (${s.category}): AED ${s.base_price ?? '—'}, ${s.duration_hrs ?? '—'} hrs. ${s.description ?? ''}`
  ).join('\n') || '(Sin servicios configurados aún)'

  const zoneList = (zones ?? []).map((z: any) => z.name).join(', ') || '(Sin zonas configuradas)'

  const hoursLines = (hours ?? []).map((h: any) =>
    h.is_open ? `${h.day_label}: ${h.start_time} - ${h.end_time}` : `${h.day_label}: Cerrado`
  ).join('\n') || '(Sin horario configurado)'

  const bookingsSection = (activeBookings ?? []).length > 0
    ? `\nRESERVAS ACTIVAS DEL CLIENTE:\n${(activeBookings ?? []).map((b: any) => {
        const d = new Date(b.scheduled_at)
        const dateStr = d.toLocaleDateString('en-AE', { timeZone: 'Asia/Dubai', day: '2-digit', month: 'short', year: 'numeric' })
        const timeStr = d.toLocaleTimeString('en-AE', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', hour12: true })
        return `  • ID: ${b.id} | ${b.service_name} | ${dateStr} ${timeStr} | ${b.status}`
      }).join('\n')}`
    : '\nRESERVAS ACTIVAS DEL CLIENTE: Ninguna'

  const systemPrompt = `Eres el asistente virtual de ${company.name}, empresa premium de car wash y detailing a domicilio en UAE.

SERVICIOS DISPONIBLES:
${svcLines}

ZONAS DE COBERTURA:
${zoneList}

HORARIO DE ATENCIÓN:
${hoursLines}

CONTACTO DEL NEGOCIO: ${company.phone}
${bookingsSection}

COMPORTAMIENTO POR TIPO DE MENSAJE:

1. PRIMER SALUDO (hola, hello, hi, مرحبا, hey, buenos días, good morning, etc.):
   - Responde con saludo cálido y pregunta en qué puedes ayudar
   - NO envíes el link todavía

2. PREGUNTAS SOBRE SERVICIOS, PRECIOS, ZONAS, HORARIOS:
   - Responde con la información solicitada de forma clara y concisa
   - AL FINAL de tu respuesta SIEMPRE agrega una pregunta invitando a reservar
   - Ejemplo inglés: '...Would you like to book one of our services?'
   - Ejemplo español: '...¿Te gustaría agendar alguno de nuestros servicios?'
   - Ejemplo árabe: '...هل تود حجز أحد خدماتنا؟'

3. CUANDO EL CLIENTE CONFIRME QUE QUIERE RESERVAR:
   - Genera un mensaje corto y cálido en el MISMO idioma del cliente. Detecta el idioma por los mensajes previos del cliente en la conversación.
   - Incluye SIEMPRE el link: ${BOOKING_URL}
   - Si el cliente escribió en inglés: 'Great! You can book here: ${BOOKING_URL} It only takes 2 minutes.'
   - Si el cliente escribió en español: 'Perfecto. Puedes reservar aquí: ${BOOKING_URL} Solo toma 2 minutos.'
   - Si el cliente escribió en árabe: 'رائع. يمكنك الحجز هنا: ${BOOKING_URL} يستغرق دقيقتين فقط.'
   - Para cualquier otro idioma genera el mensaje en ese idioma
   - CRITICAL: Si el cliente escribió en inglés, responde en inglés. NUNCA cambies de idioma.
   - NO pidas fecha, hora, ni datos del vehículo
   - NO hagas ninguna pregunta adicional
   - Toda esa información se completa en la página de reservas

4. CANCELAR O MODIFICAR RESERVA EXISTENTE:
   - Seguir el flujo de cancelación/modificación detallado abajo

REGLA PRINCIPAL: Responde SIEMPRE en el mismo idioma que usa el cliente.

CANCELACIÓN DE RESERVAS:
- Cuando el cliente quiera cancelar, consulta sus reservas activas en "RESERVAS ACTIVAS DEL CLIENTE"
- Muéstrale las reservas: servicio, fecha, hora
- Pide confirmación antes de cancelar
- Al confirmar, incluye en tu respuesta el tag (será eliminado antes de enviarse al cliente):
  [ACTION:CANCEL:uuid_de_la_reserva]

MODIFICACIÓN DE RESERVAS:
- Cuando el cliente quiera cambiar fecha/hora:
  1. Muéstrale sus reservas activas
  2. Solicita cuál quiere cambiar y la nueva fecha/hora
  3. Al confirmar, incluye en tu respuesta:
     [ACTION:MODIFY:uuid_de_la_reserva:nueva_fecha_en_ISO8601_UTC]
  4. Ejemplo: [ACTION:MODIFY:550e8400-e29b-41d4-a716-446655440000:2026-06-15T06:00:00.000Z]

FORMATO DE MENSAJES:
- NO uses emojis ni emoticones en ningún mensaje
- Mantén un tono profesional y cálido usando solo texto
- Los emojis pueden tener diferentes significados culturales, evítalos completamente

INSTRUCCIONES DE COMPORTAMIENTO:
- Tono cálido, profesional y conciso (máximo 3-4 oraciones)
- NUNCA uses formato markdown para los links: escribe la URL directamente (ej: ${BOOKING_URL}), NUNCA como [texto](url) porque WhatsApp no renderiza markdown
- Siempre pide confirmación antes de cancelar o modificar
- No inventes información que no esté en este contexto
- Si el cliente pregunta por zona no cubierta, sé honesto
- Los precios incluyen 5% VAT
- Fechas y horas en formato local UAE (UTC+4)`

  // ── 4. Llamar OpenAI ──────────────────────────────────────────────────────
  let reply: string

  if (!OPENAI_API_KEY) {
    reply = FALLBACK_MSG
  } else {
    try {
      const chatMessages = [
        ...history.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content as string,
        })),
        { role: 'user' as const, content: text },
      ]

      const raw = await callOpenAI(systemPrompt, chatMessages)
      reply = await executeActions(raw, phone)
      if (!reply) reply = FALLBACK_MSG
    } catch (err) {
      console.error('[whatsapp-bot] OpenAI error:', err)
      reply = FALLBACK_MSG
    }
  }

  // ── 5. Guardar respuesta del asistente ─────────────────────────────────────
  await supabase.from('whatsapp_messages').insert({ phone, role: 'assistant', content: reply })

  // ── 6. Enviar al cliente ───────────────────────────────────────────────────
  await sendWhatsApp(phone, reply)
}