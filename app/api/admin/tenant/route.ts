import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function verifySuperAdmin(req: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {},
      },
    }
  )
  const { data } = await supabase.auth.getUser()
  const user = data.user
  if (!user) return null

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('is_superadmin')
    .eq('owner_id', user.id)
    .maybeSingle()

  return tenant?.is_superadmin ? user.id : null
}

export async function POST(req: NextRequest) {
  const adminId = await verifySuperAdmin(req)
  if (!adminId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { action, tenantId, payload } = body

  if (!action || !tenantId) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  let updateData: Record<string, unknown> = {}

  if (action === 'activate') {
    updateData = { status: 'active' }
  } else if (action === 'suspend') {
    updateData = { status: 'suspended' }
  } else if (action === 'extend_trial') {
    const days = payload?.days ?? 7
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('trial_ends_at')
      .eq('id', tenantId)
      .maybeSingle()
    const base = tenant?.trial_ends_at
      ? new Date(tenant.trial_ends_at)
      : new Date()
    base.setDate(base.getDate() + days)
    updateData = { status: 'trial', trial_ends_at: base.toISOString() }
  } else {
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Registrar en audit log
  await supabaseAdmin
    .from('admin_audit_log')
    .insert({
      performed_by: adminId,
      action,
      affected_tenant_id: tenantId,
      payload: payload ?? null,
    })

  return NextResponse.json({ ok: true })
}