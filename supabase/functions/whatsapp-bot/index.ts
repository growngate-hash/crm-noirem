import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!
const BUSINESS_NAME = Deno.env.get('BUSINESS_NAME') ?? 'Saffi Car Care'


const i18n: Record<string, Record<string, string>> = {
  es: {
    welcome: '¡Hola! Bienvenido a *{business}* 🚗✨\n\nSomos un servicio de detailing *a domicilio*. Vamos donde tú estás.\n\n¿Qué servicio deseas?',
    view_services: 'Ver servicios',
    our_services: 'Nuestros servicios',
    select_service_prompt: 'Por favor toca el botón *"Ver servicios"* para seleccionar 👆',
    service_selected: 'Excelente, elegiste *{service}* ✅\n\n¿Cuál es tu *nombre completo*?',
    ask_vehicle: 'Gracias *{name}* 😊\n\n¿Qué vehículo tenemos que atender?\nEscribe: *Marca Modelo Placa*\n\nEjemplo: Toyota Corolla ABC123',
    ask_address: 'Vehículo registrado 🚗\n\n📍 ¿En qué *dirección* prestamos el servicio?\n\nEjemplo: Calle 123 # 45-67, Bogotá',
    ask_date: 'Dirección registrada 📍\n\n¿Qué fecha y hora prefieres para tu cita?',
    view_slots: 'Ver horarios',
    available_slots: 'Próximas fechas disponibles',
    select_slot_prompt: 'Por favor toca *"Ver horarios"* para seleccionar una fecha 👆',
    confirmation: '✅ *¡Reserva confirmada!*\n\n👤 Cliente: {name}\n🚗 Vehículo: {vehicle}\n🔧 Servicio: {service}\n📍 Dirección: {address}\n📅 Fecha: {date}\n\n¡Te esperamos! 😊',
    new_booking: '📅 Nueva reserva',
    cancel: '❌ Cancelar',
    cancelled: 'Tu reserva ha sido cancelada. Escribe *"Hola"* cuando quieras hacer una nueva reserva. 👋',
    locale: 'es-CO',
  },
  en: {
    welcome: 'Welcome to *{business}* 🚗✨\nWe are a *mobile detailing service*. We come to you.\n\nWhat service would you like?',
    view_services: 'View services',
    our_services: 'Our services',
    select_service_prompt: 'Please tap *"View services"* to select 👆',
    service_selected: 'Great choice ✅\n\nWhat is your *full name*?',
    ask_vehicle: 'Thanks *{name}* 😊\n\nWhat vehicle should we attend?\nWrite: *Make Model Plate*\n\nExample: Toyota Corolla ABC123',
    ask_address: 'Vehicle registered 🚗\n\n📍 What is the *address* for the service?\n\nExample: Dubai Marina, Building 5, Apt 101',
    ask_date: 'Address registered 📍\n\nWhat date and time do you prefer?',
    view_slots: 'View slots',
    available_slots: 'Available slots',
    select_slot_prompt: 'Please tap *"View slots"* to select a date 👆',
    confirmation: '✅ *Booking confirmed!*\n\n👤 Client: {name}\n🚗 Vehicle: {vehicle}\n🔧 Service: {service}\n📍 Address: {address}\n📅 Date: {date}\n\nSee you soon! 😊',
    new_booking: '📅 New booking',
    cancel: '❌ Cancel',
    cancelled: 'Your booking has been cancelled. Write *Hi* to make a new booking. 👋',
    locale: 'en-US',
  },
  ar: {
    welcome: 'مرحباً بك في *{business}* 🚗✨\nنحن خدمة تفصيل *متنقلة*. نأتي إليك.\n\nما الخدمة التي تريدها؟',
    view_services: 'عرض الخدمات',
    our_services: 'خدماتنا',
    select_service_prompt: 'يرجى الضغط على *"عرض الخدمات"* للاختيار 👆',
    service_selected: 'اختيار رائع ✅\n\nما هو *اسمك الكامل*؟',
    ask_vehicle: 'شكراً *{name}* 😊\n\nما هي السيارة التي يجب أن نهتم بها؟\nاكتب: *الماركة الموديل رقم اللوحة*\n\nمثال: Toyota Corolla ABC123',
    ask_address: 'تم تسجيل السيارة 🚗\n\n📍 ما هو *عنوان* الخدمة؟\n\nمثال: دبي مارينا، مبنى 5، شقة 101',
    ask_date: 'تم تسجيل العنوان 📍\n\nما التاريخ والوقت المفضل لديك؟',
    view_slots: 'عرض المواعيد',
    available_slots: 'المواعيد المتاحة',
    select_slot_prompt: 'يرجى الضغط على *"عرض المواعيد"* لاختيار تاريخ 👆',
    confirmation: '✅ *تم تأكيد الحجز!*\n\n👤 العميل: {name}\n🚗 السيارة: {vehicle}\n🔧 الخدمة: {service}\n📍 العنوان: {address}\n📅 التاريخ: {date}\n\nنراك قريباً! 😊',
    new_booking: '📅 حجز جديد',
    cancel: '❌ إلغاء',
    cancelled: 'تم إلغاء حجزك. اكتب *مرحبا* لإجراء حجز جديد. 👋',
    locale: 'ar-AE',
  },
}

function tr(lang: string, key: string, vars: Record<string, string> = {}): string {
  let text = i18n[lang]?.[key] ?? i18n['en'][key] ?? key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, v)
  }
  return text
}

async function sendText(phone: string, token: string, phoneNumberId: string, message: string) {
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message }
    })
  })
}

async function sendButtons(phone: string, token: string, phoneNumberId: string, body: string, buttons: {id: string, title: string}[]) {
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title }
          }))
        }
      }
    })
  })
}

async function sendList(phone: string, token: string, phoneNumberId: string, body: string, buttonText: string, sections: {title: string, rows: {id: string, title: string, description?: string}[]}[]) {
  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: {
          button: buttonText,
          sections
        }
      }
    })
  })
}

async function getOrCreateConversation(phone: string) {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .single()
  if (data) return data
  const { data: newConv } = await supabase
    .from('whatsapp_conversations')
    .insert({ phone, step: 'inicio', language: 'en' })
    .select()
    .single()
  return newConv
}

async function updateConversation(phone: string, updates: Record<string, string>) {
  await supabase
    .from('whatsapp_conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('phone', phone)
}

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge!, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    return new Response('Forbidden', { status: 403 })
  }

  const body = await req.json()
  const entry = body?.entry?.[0]
  const change = entry?.changes?.[0]
  const message = change?.value?.messages?.[0]
  if (!message) return new Response('OK', { status: 200 })

  const phone = message.from
  const text = message.text?.body?.trim() ?? ''
  const buttonId = message.interactive?.button_reply?.id ?? ''
  const listId = message.interactive?.list_reply?.id ?? ''
  const input = buttonId || listId || text

  const conv = await getOrCreateConversation(phone)
  const lang = conv.language ?? 'en'

  // PASO 0: Selección de idioma
  if (conv.step === 'inicio') {
    await sendButtons(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
      '🌐 Please choose your language / Elige tu idioma / اختر لغتك',
      [
        { id: 'lang_en', title: '🇬🇧 English' },
        { id: 'lang_es', title: '🇪🇸 Español' },
        { id: 'lang_ar', title: '🇦🇪 العربية' },
      ]
    )
    await updateConversation(phone, { step: 'eligiendo_idioma' })
  }

  // PASO 0b: Idioma elegido → mostrar servicios
  else if (conv.step === 'eligiendo_idioma') {
    if (!input.startsWith('lang_')) {
      await sendButtons(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        '🌐 Please choose your language / Elige tu idioma / اختر لغتك',
        [
          { id: 'lang_en', title: '🇬🇧 English' },
          { id: 'lang_es', title: '🇪🇸 Español' },
          { id: 'lang_ar', title: '🇦🇪 العربية' },
        ]
      )
    } else {
      const selectedLang = input.replace('lang_', '')
      const { data: services } = await supabase.from('services').select('id, name').limit(8)
      const rows = (services ?? []).map((s: any) => ({ id: `service_${s.id}`, title: s.name.substring(0, 24) }))
      await sendList(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        tr(selectedLang, 'welcome', { business: BUSINESS_NAME }),
        tr(selectedLang, 'view_services'),
        [{ title: tr(selectedLang, 'our_services'), rows }]
      )
      await updateConversation(phone, { step: 'esperando_servicio', language: selectedLang })
    }
  }

  // PASO 1: Servicio seleccionado → pedir nombre
  else if (conv.step === 'esperando_servicio') {
    if (!input.startsWith('service_')) {
      await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        tr(lang, 'select_service_prompt'))
    } else {
      const serviceId = input.replace('service_', '')
      const { data: service } = await supabase.from('services').select('name').eq('id', serviceId).single()
      await updateConversation(phone, { step: 'esperando_nombre', service: service?.name ?? input })
      await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        tr(lang, 'service_selected', { service: service?.name ?? '' }))
    }
  }

  // PASO 2: Nombre → pedir vehículo
  else if (conv.step === 'esperando_nombre') {
    await updateConversation(phone, { step: 'esperando_vehiculo', client_name: text })
    await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
      tr(lang, 'ask_vehicle', { name: text }))
  }

  // PASO 3: Vehículo → pedir dirección
  else if (conv.step === 'esperando_vehiculo') {
    await updateConversation(phone, { step: 'esperando_direccion', vehicle: text })
    await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
      tr(lang, 'ask_address'))
  }

  // PASO 4: Dirección → mostrar fechas como texto
  else if (conv.step === 'esperando_direccion') {
    await updateConversation(phone, {
      step: 'esperando_fecha',
      address: text
    })

    const today = new Date()
    // Dubai es UTC+4, ajustamos para que 9am Dubai = 5am UTC
    const fecha1 = new Date(today); fecha1.setDate(today.getDate() + 1); fecha1.setHours(5,0,0)
    const fecha2 = new Date(today); fecha2.setDate(today.getDate() + 1); fecha2.setHours(10,0,0)
    const fecha3 = new Date(today); fecha3.setDate(today.getDate() + 2); fecha3.setHours(5,0,0)
    const fecha4 = new Date(today); fecha4.setDate(today.getDate() + 2); fecha4.setHours(10,0,0)
    const fecha5 = new Date(today); fecha5.setDate(today.getDate() + 3); fecha5.setHours(5,0,0)
    const fecha6 = new Date(today); fecha6.setDate(today.getDate() + 3); fecha6.setHours(10,0,0)

    const slots: Record<string, string> = {
      '1': fecha1.toISOString(),
      '2': fecha2.toISOString(),
      '3': fecha3.toISOString(),
      '4': fecha4.toISOString(),
      '5': fecha5.toISOString(),
      '6': fecha6.toISOString(),
    }

    await supabase
      .from('whatsapp_conversations')
      .update({ slots: JSON.stringify(slots) })
      .eq('phone', phone)

    const msg = `📅 Dirección registrada ✅\n\n¿Qué fecha prefieres?\n\n1️⃣ ${fecha1.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 9:00 AM\n2️⃣ ${fecha2.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 2:00 PM\n3️⃣ ${fecha3.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 9:00 AM\n4️⃣ ${fecha4.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 2:00 PM\n5️⃣ ${fecha5.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 9:00 AM\n6️⃣ ${fecha6.toLocaleDateString('en-AE', {weekday:'long', day:'numeric', month:'long', timeZone:'Asia/Dubai'})} - 2:00 PM\n\nWrite the number of your preference`

    await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, msg)
  }

  // PASO 5: Fecha → confirmar reserva
  else if (conv.step === 'esperando_fecha') {
    const slots = JSON.parse(conv.slots ?? '{}')
    const selected = slots[input]

    if (!selected) {
      await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        'Por favor escribe el número de la fecha que prefieres (1-6) 👆')
    } else {
      const fecha = new Date(selected)

      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', phone)
        .single()

      let contactId = existingContact?.id

      if (!contactId) {
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            name: conv.client_name,
            phone: phone,
            whatsapp_phone: phone
          })
          .select()
          .single()
        contactId = newContact?.id
      }

      // 1. Obtener duración del servicio
      const { data: serviceInfo } = await supabase
        .from('services')
        .select('id, duration_minutes, duration_hrs')
        .eq('name', conv.service)
        .single()

      const durationMinutes = serviceInfo?.duration_minutes
        ?? (serviceInfo?.duration_hrs ? serviceInfo.duration_hrs * 60 : 120)

      // 2. Calcular ventana bloqueada (1h antes + servicio + 1h después)
      const blockedStart = new Date(fecha)
      blockedStart.setHours(blockedStart.getHours() - 1)

      const blockedEnd = new Date(fecha)
      blockedEnd.setMinutes(blockedEnd.getMinutes() + durationMinutes + 60)

      // 3. Obtener todos los vehículos del negocio
      const { data: businessVehicles } = await supabase
        .from('vehicles')
        .select('id, name')
        .is('contact_id', null)

      // 4. Buscar reservas que se solapan con la ventana bloqueada
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('vehicle_id, scheduled_at, end_at')
        .gte('end_at', blockedStart.toISOString())
        .lte('scheduled_at', blockedEnd.toISOString())
        .not('vehicle_id', 'is', null)

      const occupiedVehicleIds = new Set(
        (conflictingBookings ?? []).map(b => b.vehicle_id)
      )

      // 5. Encontrar primer vehículo libre
      const availableVehicle = (businessVehicles ?? [])
        .find(v => !occupiedVehicleIds.has(v.id))

      if (!availableVehicle) {
        await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
          '😔 Lo sentimos, no hay vehículos disponibles para ese horario.\nPor favor elige otra fecha.')
        await updateConversation(phone, { step: 'esperando_fecha' })
        return new Response('OK', { status: 200 })
      }

      const vehicleId = availableVehicle.id

      // 6. Calcular end_at de la reserva
      const endAt = new Date(fecha)
      endAt.setMinutes(endAt.getMinutes() + durationMinutes)

      // 7. Insertar reserva con end_at y vehicle_id
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          contact_id: contactId,
          vehicle_id: vehicleId,
          service_id: serviceInfo?.id,
          notes: `📱 Reserva por WhatsApp\nCliente: ${conv.client_name}\nVehículo cliente: ${conv.vehicle}\nTeléfono: ${phone}`,
          scheduled_at: fecha.toISOString(),
          end_at: endAt.toISOString(),
          address: conv.address,
          status: 'pending',
          price: 0
        })
        .select()
        .single()

      if (bookingError) {
        console.log('Error creando reserva:', JSON.stringify(bookingError))
        await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
          `Error interno: ${bookingError.message}`)
        return new Response('OK', { status: 200 })
      }

      await updateConversation(phone, { step: 'inicio' })

      await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
        `✅ *¡Reserva confirmada!*\n\n👤 Cliente: ${conv.client_name}\n🚗 Vehículo: ${conv.vehicle}\n🔧 Servicio: ${conv.service}\n📍 Dirección: ${conv.address}\n📅 Fecha: ${fecha.toLocaleString('es-CO')}\n\n¡Te esperamos! 😊`)
    }
  }

  // Cancelar
  else if (input === 'cancelar') {
    await updateConversation(phone, { step: 'inicio' })
    await sendText(phone, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
      tr(lang, 'cancelled'))
  }

  return new Response('OK', { status: 200 })
})
