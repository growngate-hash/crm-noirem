import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { localToUTCWithTz } from '@/utils/timezone'

const FALLBACK_BUFFER = 30  // si company_settings no tiene travel_time_minutes
const FALLBACK_DUR    = 60  // si el booking no tiene end_at ni el servicio tiene duración
const FALLBACK_TZ     = 'Asia/Dubai'

function toMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

function parseDuration(raw: unknown): number {
  if (typeof raw === 'number' && raw > 0) return raw
  if (typeof raw !== 'string' || !raw) return FALLBACK_DUR
  const num = parseFloat(raw)
  if (!isNaN(num) && num > 0) return num < 24 ? Math.round(num * 60) : Math.round(num)
  const hMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/i)
  if (hMatch) return Math.round(parseFloat(hMatch[1]) * 60)
  const mMatch = raw.match(/(\d+)\s*m/i)
  if (mMatch) return parseInt(mMatch[1])
  return FALLBACK_DUR
}

/** Minutes elapsed since midnight in the given timezone. */
function localMinutes(isoStr: string, timezone: string): number {
  const d = new Date(isoStr)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return (h === 24 ? 0 : h) * 60 + m
}

type ServiceShape = { duration_minutes?: number; duration?: string; duration_hrs?: string }
type Block = { startMin: number; endMin: number }

function bookingToBlock(
  scheduled_at: string,
  end_at: string | null,
  svc: ServiceShape | null,
  bufferMin: number,
  closeMin: number,
  timezone: string,
): Block {
  const startMin = localMinutes(scheduled_at, timezone)
  let durMin = FALLBACK_DUR
  if (end_at) {
    const diff = localMinutes(end_at, timezone) - startMin
    durMin = diff > 0 ? diff : FALLBACK_DUR
  } else if (svc) {
    durMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
  }
  const serviceEnd = startMin + durMin
  const blockEnd = serviceEnd >= closeMin ? serviceEnd : serviceEnd + bufferMin
  return { startMin: startMin - bufferMin, endMin: blockEnd }
}

function overlaps(block: Block, slotStart: number, slotEnd: number): boolean {
  return slotStart < block.endMin && block.startMin < slotEnd
}

function noCache(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

export async function GET(req: NextRequest) {
  const params    = req.nextUrl.searchParams
  const date      = params.get('date')       // YYYY-MM-DD (required)
  const serviceId = params.get('service_id') // optional
  const ownerId   = params.get('owner_id')   // optional

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return noCache({ error: 'Invalid date' }, 400)
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return noCache({ error: 'Server config error' }, 500)

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // day_of_week en business_hours: 0=Lunes … 6=Domingo (igual que el panel de Settings)
  // getUTCDay() devuelve 0=Domingo, 1=Lunes … 6=Sábado → conversión necesaria
  const jsDay     = new Date(date).getUTCDay()
  const dayOfWeek = (jsDay + 6) % 7  // 0=Mon … 6=Sun, igual que en la BD

  // ── 5 queries en paralelo ──────────────────────────────────────────────────
  const [
    { data: businessHour },
    { data: travelSetting },
    { data: tzSetting },
    { data: svc },
  ] = await Promise.all([
    sb.from('business_hours')
      .select('is_open, start_time, end_time')
      .eq('day_of_week', dayOfWeek)
      .maybeSingle(),

    sb.from('company_settings')
      .select('travel_time_minutes')
      .maybeSingle(),

    sb.from('business_settings')
      .select('timezone')
      .maybeSingle(),

    serviceId
      ? sb.from('services')
          .select('duration_minutes, duration, duration_hrs')
          .eq('id', serviceId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  let vehiclesQuery = sb.from('vehicles')
    .select('id')
    .is('contact_id', null)
    .neq('status', 'inactivo')
  if (ownerId) vehiclesQuery = vehiclesQuery.eq('user_id', ownerId)
  const { data: vehiclesData } = await vehiclesQuery

  const timezone = tzSetting?.timezone ?? FALLBACK_TZ

  console.log('[availability] date:', date, 'dayOfWeek:', dayOfWeek)
  console.log('[availability] businessHour:', JSON.stringify(businessHour))

  // ── Día cerrado según business_hours ──────────────────────────────────────
  if (!businessHour?.is_open) {
    return noCache({ available: [], blocked: [], closed: true })
  }

  // ── Parámetros dinámicos ──────────────────────────────────────────────────
  const BUFFER_MIN = travelSetting?.travel_time_minutes ?? FALLBACK_BUFFER

  const [startH, startM = 0] = (businessHour.start_time  ?? '08:00').split(':').map(Number)
  const [endH,   endM   = 0] = (businessHour.end_time ?? '18:00').split(':').map(Number)
  const OPEN_MIN  = startH * 60 + startM
  const CLOSE_MIN = endH   * 60 + endM

  // Slots generados dinámicamente desde apertura hasta cierre (uno por hora)
  const BASE_SLOTS: string[] = []
  for (let min = OPEN_MIN; min < CLOSE_MIN; min += 30) {
    const h = Math.floor(min / 60)
    const m = min % 60
    BASE_SLOTS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }

  // ── Duración del servicio solicitado ──────────────────────────────────────
  let requestedDurMin = FALLBACK_DUR
  if (svc) {
    requestedDurMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
  }

  // ── Vehículos de empresa activos ──────────────────────────────────────────
  const vehicleIds: string[] = (vehiclesData ?? []).map((v: { id: string }) => v.id)

  // ── Bookings del día (zona horaria de la empresa) ─────────────────────────
  const dayStart = localToUTCWithTz(date, '00:00:00', timezone)
  const dayEnd   = localToUTCWithTz(date, '23:59:59', timezone)

  let bookingsQuery = sb.from('bookings')
    .select('vehicle_id, scheduled_at, end_at, services(duration_minutes, duration, duration_hrs)')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'cancelled')
    .not('vehicle_id', 'is', null)
  if (ownerId) bookingsQuery = bookingsQuery.eq('user_id', ownerId)
  const { data: bookingsRaw } = await bookingsQuery

  // ── Bloques ocupados por vehículo ─────────────────────────────────────────
  const vehicleBlocks: Record<string, Block[]> = {}
  for (const vid of vehicleIds) vehicleBlocks[vid] = []

  for (const b of (bookingsRaw ?? [])) {
    if (!b.vehicle_id || !b.scheduled_at) continue
    const vid = b.vehicle_id as string
    if (!vehicleBlocks[vid]) vehicleBlocks[vid] = []
    vehicleBlocks[vid].push(
      bookingToBlock(b.scheduled_at, b.end_at, b.services as ServiceShape | null, BUFFER_MIN, CLOSE_MIN, timezone)
    )
  }

  // ── Clasificar cada slot ──────────────────────────────────────────────────
  const available: string[] = []
  const blocked: Array<{ slot: string; reason: string }> = []

  const effectiveIds = vehicleIds.length > 0 ? vehicleIds : null

  for (const slot of BASE_SLOTS) {
    const slotStart = toMinutes(slot)
    const slotEnd   = slotStart + requestedDurMin

    // El servicio solicitado debe caber íntegro antes del cierre
    if (slotStart + requestedDurMin >= CLOSE_MIN) {
      blocked.push({ slot, reason: `Fuera de horario (cierre ${businessHour.end_time})` })
      continue
    }

    if (!effectiveIds) {
      blocked.push({ slot, reason: 'Sin vehículos disponibles' })
      continue
    }

    const freeVehicle = effectiveIds.find(vid =>
      !(vehicleBlocks[vid] ?? []).some(b => overlaps(b, slotStart, slotEnd))
    )

    if (freeVehicle) {
      available.push(slot)
    } else {
      const busyCount = effectiveIds.filter(vid =>
        (vehicleBlocks[vid] ?? []).some(b => overlaps(b, slotStart, slotEnd))
      ).length
      blocked.push({
        slot,
        reason: `Todos los vehículos ocupados (${busyCount}/${effectiveIds.length})`,
      })
    }
  }

  return noCache({ available, blocked, requestedDurMin, bufferMin: BUFFER_MIN, timezone })
}