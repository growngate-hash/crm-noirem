import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('BODY RECIBIDO:', JSON.stringify(body))

  const {
    service_id, service_name, scheduled_at,
    customer_name, customer_phone,
    vehicle_make_model, plate, plate_number, vehicle_model,
    address, villa_flat, area, community, address_notes,
    price, vat, total_amount, payment_method,
  } = body

  // ── 1. Insert into booking_requests (trigger creates contact + booking) ──────
  const { error: brErr } = await supabaseAdmin.from('booking_requests').insert({
    service_id, service_name, scheduled_at,
    customer_name, customer_phone,
    vehicle_make_model: vehicle_make_model || null,
    plate: plate || null,
    plate_number: plate_number || null,
    vehicle_model: vehicle_model || null,
    address: address || null,
    villa_flat: villa_flat || null,
    area: area || null,
    community: community || null,
    address_notes: address_notes || null,
    price: price || null,
    vat: vat || null,
    total_amount: total_amount || null,
    payment_method: payment_method || 'cash',
    status: 'pending',
  })

  if (brErr) {
    console.error('Error creando booking_request:', brErr)
    return NextResponse.json({ error: brErr.message }, { status: 500 })
  }

  // ── 2. Find the contact created by the trigger ───────────────────────────────
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('id')
    .eq('phone', customer_phone)
    .maybeSingle()

  const contactId = contact?.id

  // ── 3. Save vehicle linked to contact ────────────────────────────────────────
  const plateRaw    = (plate_number || plate || '').trim()
  const makeModelRaw = (vehicle_make_model || vehicle_model || '').trim()

  if (plateRaw && contactId) {
    const parts   = makeModelRaw.split(' ').filter(Boolean)
    const yearStr = parts[parts.length - 1] ?? ''
    const hasYear = /^\d{4}$/.test(yearStr)
    const make    = parts[0] || 'Unknown'
    const model   = hasYear
      ? parts.slice(1, -1).join(' ') || parts[1] || 'Unknown'
      : parts.slice(1).join(' ') || 'Unknown'
    const year    = hasYear ? parseInt(yearStr) : null

    const { data: existingVehicle } = await supabaseAdmin
      .from('vehicles')
      .select('id')
      .eq('license_plate', plateRaw)
      .eq('contact_id', contactId)
      .maybeSingle()

    if (!existingVehicle) {
      const { error: vErr } = await supabaseAdmin
        .from('vehicles')
        .insert({
          contact_id:    contactId,
          license_plate: plateRaw,
          make,
          model,
          year,
          name: makeModelRaw || plateRaw,
        })

      if (vErr) console.error('Error guardando vehículo cliente:', vErr)
      else      console.log('✅ Vehículo cliente guardado:', plateRaw)
    } else {
      console.log('Vehículo ya existe:', existingVehicle.id)
    }
  }

  return NextResponse.json({ success: true })
}