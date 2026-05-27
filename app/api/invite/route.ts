import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, role } = await request.json()

  if (!email?.trim()) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configuración del servidor incompleta. Agrega SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim(), {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm-noirem.vercel.app'}/accept-invite`,
    data: { role: (role ?? 'technician').toLowerCase() },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Pre-create user_permissions so the role is set when they accept the invite
  const userId = data.user?.id
  if (userId) {
    const perms = buildDefaultPermissions(role ?? 'Technician')
    await supabaseAdmin.from('user_permissions').upsert(
      { user_id: userId, role: (role ?? 'Technician').toLowerCase(), permissions: { ...perms, _email: email.trim() }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  }

  return NextResponse.json({ success: true, userId })
}

function buildDefaultPermissions(role: string) {
  const r = role.toLowerCase()
  const all  = { view: true,  create: true,  edit: true,  delete: true  }
  const mgr  = { view: true,  create: true,  edit: true,  delete: false }
  const view = { view: true,  create: false, edit: false, delete: false }
  const none = { view: false, create: false, edit: false, delete: false }

  if (r === 'admin') {
    return {
      dashboard: { view: true }, contacts: { ...all }, services: { ...all },
      vehicles:  { ...all },     bookings: { ...all }, finance:  { ...all },
      reports:   { view: true }, settings: { ...all },
    }
  }
  if (r === 'manager') {
    return {
      dashboard: { view: true }, contacts: { ...mgr }, services: { ...mgr },
      vehicles:  { ...mgr },     bookings: { ...mgr }, finance:  { ...mgr },
      reports:   { view: true }, settings: { ...none },
    }
  }
  // technician
  return {
    dashboard: { view: true }, contacts: { ...none }, services: { ...view },
    vehicles:  { ...view },    bookings: { ...view }, finance:  { ...none },
    reports:   { view: false }, settings: { ...none },
  }
}
