import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const BASE_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
const BUFFER_MIN = 60

function toMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number)
  return h * 60 + m
}

function parseDuration(raw: unknown): number {
  if (typeof raw === 'number' && raw > 0) return raw
  if (typeof raw !== 'string' || !raw) return 60
  const num = parseFloat(raw)
  if (!isNaN(num) && num > 0) return num < 24 ? Math.round(num * 60) : Math.round(num)
  const hMatch = raw.match(/(\d+(?:\.\d+)?)\s*h/i)
  if (hMatch) return Math.round(parseFloat(hMatch[1]) * 60)
  const mMatch = raw.match(/(\d+)\s*m/i)
  if (mMatch) return parseInt(mMatch[1])
  return 60
}

function dubaiMinutes(isoStr: string): number {
  const d = new Date(isoStr)
  const h = (d.getUTCHours() + 4) % 24
  return h * 60 + d.getUTCMinutes()
}

type ServiceShape = { duration_minutes?: number; duration?: string; duration_hrs?: string }
type Block = { startMin: number; endMin: number }

function bookingToBlock(scheduled_at: string, end_at: string | null, svc: ServiceShape | null): Block {
  const startMin = dubaiMinutes(scheduled_at)
  let durMin = 60
  if (end_at) {
    const diff = dubaiMinutes(end_at) - startMin
    durMin = diff > 0 ? diff : 60
  } else if (svc) {
    durMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
  }
  return { startMin: startMin - BUFFER_MIN, endMin: startMin + durMin + BUFFER_MIN }
}

function overlaps(block: Block, slotStart: number, slotEnd: number): boolean {
  return slotStart < block.endMin && block.startMin < slotEnd
}

export async function GET(req: NextRequest) {
  const params    = req.nextUrl.searchParams
  const date      = params.get('date')        // YYYY-MM-DD (required)
  const serviceId = params.get('service_id')  // optional

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server config error' }, { status: 500 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Requested service duration
  let requestedDurMin = 60
  if (serviceId) {
    const { data: svc } = await sb.from('services').select('*').eq('id', serviceId).single()
    if (svc) {
      requestedDurMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
    }
  }

  // 2. Active vehicles in the fleet
  const { data: vehiclesData } = await sb
    .from('vehicles')
    .select('id')
    .neq('status', 'inactivo')

  const vehicleIds: string[] = (vehiclesData ?? []).map((v: { id: string }) => v.id)

  // 3. Non-cancelled bookings for the Dubai day (assigned to a vehicle only)
  const dayStart = new Date(`${date}T00:00:00+04:00`).toISOString()
  const dayEnd   = new Date(`${date}T23:59:59+04:00`).toISOString()

  const { data: dayBookings } = await sb
    .from('bookings')
    .select('vehicle_id, scheduled_at, end_at, services(*)')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'cancelled')
    .not('vehicle_id', 'is', null)

  // 4. Build per-vehicle block sets
  const vehicleBlocks: Record<string, Block[]> = {}
  for (const vid of vehicleIds) vehicleBlocks[vid] = []

  for (const b of (dayBookings ?? [])) {
    if (!b.vehicle_id || !b.scheduled_at) continue
    const vid = b.vehicle_id as string
    if (!vehicleBlocks[vid]) vehicleBlocks[vid] = [] // booking for vehicle not in fleet
    vehicleBlocks[vid].push(
      bookingToBlock(b.scheduled_at, b.end_at, b.services as ServiceShape | null)
    )
  }

  // 5. Classify each base slot: available if ≥1 vehicle is free
  const available: string[] = []
  const blocked: Array<{ slot: string; reason: string }> = []

  // If fleet is empty, treat all within-hours slots as available
  const effectiveIds = vehicleIds.length > 0 ? vehicleIds : null

  for (const slot of BASE_SLOTS) {
    const slotStart = toMinutes(slot)
    const slotEnd   = slotStart + requestedDurMin

    if (slotEnd > 20 * 60) {
      blocked.push({ slot, reason: 'Outside working hours' })
      continue
    }

    if (!effectiveIds) {
      available.push(slot)
      continue
    }

    const freeVehicle = effectiveIds.find(vid => {
      const blocks = vehicleBlocks[vid] ?? []
      return !blocks.some(b => overlaps(b, slotStart, slotEnd))
    })

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

  return NextResponse.json({ available, blocked, requestedDurMin })
}