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
  // If it looks like hours (< 24), convert to minutes
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

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const date      = params.get('date')       // YYYY-MM-DD
  const serviceId = params.get('service_id')

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
      requestedDurMin = parseDuration(
        svc.duration_minutes ?? svc.duration ?? svc.duration_hrs
      )
    }
  }

  // 2. Existing non-cancelled bookings for the Dubai day
  const dayStart = new Date(`${date}T00:00:00+04:00`).toISOString()
  const dayEnd   = new Date(`${date}T23:59:59+04:00`).toISOString()

  const { data: dayBookings } = await sb
    .from('bookings')
    .select('scheduled_at, end_at, services(*)')
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .neq('status', 'cancelled')

  // 3. Build blocked minute intervals (with ±1h buffer)
  type Block = { startMin: number; endMin: number; label: string }
  const blocks: Block[] = []

  for (const b of (dayBookings ?? [])) {
    if (!b.scheduled_at) continue
    const startMin = dubaiMinutes(b.scheduled_at)

    let durMin = 60
    if (b.end_at) {
      const diff = dubaiMinutes(b.end_at) - startMin
      durMin = diff > 0 ? diff : 60
    } else {
      const svc = b.services as Record<string, unknown> | null
      if (svc) {
        durMin = parseDuration(svc.duration_minutes ?? svc.duration ?? svc.duration_hrs)
      }
    }

    const blockStart = startMin - BUFFER_MIN
    const blockEnd   = startMin + durMin + BUFFER_MIN

    const sh = String(Math.floor(startMin / 60)).padStart(2, '0')
    const sm = String(startMin % 60).padStart(2, '0')
    const eh = String(Math.floor((startMin + durMin) / 60)).padStart(2, '0')
    const em = String((startMin + durMin) % 60).padStart(2, '0')
    blocks.push({
      startMin: blockStart,
      endMin:   blockEnd,
      label:    `Reserva ${sh}:${sm}–${eh}:${em} + 1h traslado`,
    })
  }

  // 4. Classify each base slot
  const available: string[] = []
  const blocked: Array<{ slot: string; reason: string }> = []

  for (const slot of BASE_SLOTS) {
    const slotStart = toMinutes(slot)
    const slotEnd   = slotStart + requestedDurMin

    if (slotEnd > 20 * 60) {
      blocked.push({ slot, reason: 'Outside working hours' })
      continue
    }

    const conflict = blocks.find(b => slotStart < b.endMin && b.startMin < slotEnd)
    if (conflict) {
      blocked.push({ slot, reason: conflict.label })
    } else {
      available.push(slot)
    }
  }

  return NextResponse.json({ available, blocked, requestedDurMin })
}