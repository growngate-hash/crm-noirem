import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: usersData, error: usersError }, { data: permsData }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('user_permissions').select('user_id, role, permissions'),
  ])

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const realUserIds = new Set((usersData?.users ?? []).map((u: any) => u.id))

  const permsMap: Record<string, { role: string; permissions: any }> = {}
  ;(permsData ?? []).forEach((row: any) => {
    if (realUserIds.has(row.user_id)) {
      permsMap[row.user_id] = { role: row.role, permissions: row.permissions }
    }
  })

  const team = (usersData?.users ?? []).map((u: any) => {
    const p = permsMap[u.id]
    const roleCap = p?.role
      ? p.role.charAt(0).toUpperCase() + p.role.slice(1)
      : 'Admin'
    return {
      id: u.id,
      email: u.email ?? '',
      name: (u.email ?? u.id.slice(0, 8)).split('@')[0],
      role: roleCap,
      permissions: p?.permissions ?? null,
    }
  })

  return NextResponse.json({ team })
}
