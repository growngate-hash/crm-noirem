import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/utils/sendEmail'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Protección por secret token — solo Supabase cron puede llamar esto
function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-cron-secret')
  return token === process.env.CRON_SECRET
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 1. Buscar tenants en trial que expiran en 3 días o hoy
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, owner_id, name, trial_ends_at, status')
    .eq('status', 'trial')
    .eq('is_superadmin', false)
    .not('trial_ends_at', 'is', null)

  if (!tenants?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const now = new Date()
  let processed = 0
  let errors = 0

  for (const tenant of tenants) {
    const trialEnd = new Date(tenant.trial_ends_at)
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)

    // Solo procesar si faltan exactamente 3 días o 0 días
    if (daysLeft !== 3 && daysLeft !== 0) continue

    const template = daysLeft <= 0 ? 'trial_expired' : 'trial_expiring'

    // Verificar que no se haya enviado este email hoy
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const { data: existing } = await supabaseAdmin
      .from('email_queue')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('template', template)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle()

    if (existing) continue // Ya se envió hoy

    // Obtener email del owner
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(tenant.owner_id)
    if (!user?.email) continue

    // Registrar en cola
    const { data: queued } = await supabaseAdmin
      .from('email_queue')
      .insert({
        tenant_id: tenant.id,
        owner_id: tenant.owner_id,
        template,
        data: { days: String(daysLeft), name: tenant.name },
      })
      .select('id')
      .single()

    // Enviar email
    const result = await sendEmail({
      to: user.email,
      template,
      data: { days: String(daysLeft), name: tenant.name },
    })

    // Actualizar estado en cola
    if (queued) {
      await supabaseAdmin
        .from('email_queue')
        .update(
          result.ok
            ? { sent_at: new Date().toISOString() }
            : { error: JSON.stringify(result.error) }
        )
        .eq('id', queued.id)
    }

    if (result.ok) processed++
    else errors++
  }

  return NextResponse.json({ ok: true, processed, errors })
}

export async function GET(req: NextRequest) {
  return POST(req)
}