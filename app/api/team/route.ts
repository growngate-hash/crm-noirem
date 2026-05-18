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

  const [{ data: permsData }, { data: usersData, error: usersError }] = await Promise.all([
    supabaseAdmin.from('user_permissions').select('user_id, role, permissions'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  // Build email lookup from real auth users
  const authEmailMap: Record<string, string> = {}
  ;(usersData?.users ?? []).forEach((u: any) => {
    authEmailMap[u.id] = u.email ?? ''
  })

  // user_permissions is the source of truth — only show users with a row there
  const team = (permsData ?? []).map((row: any) => {
    const r = row.role ?? 'admin'
    const roleCap = r.charAt(0).toUpperCase() + r.slice(1)
    const email = authEmailMap[row.user_id] ?? (row.permissions?._email ?? '')
    return {
      id: row.user_id,
      email,
      name: email ? email.split('@')[0] : row.user_id.slice(0, 8),
      role: roleCap,
      permissions: row.permissions ?? null,
    }
  })

  return NextResponse.json({ team })
}
