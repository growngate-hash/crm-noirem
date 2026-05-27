import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { data: members } = await supabase.from('team_members').select('member_id').eq('owner_id', user.id)
  const memberIds = members?.map(m => m.member_id) ?? []
  const allIds = [user.id, ...memberIds]
  const { data: perms } = await supabase.from('user_permissions').select('user_id, role, permissions').in('user_id', allIds)
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const team = await Promise.all(
    allIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id)
      const perm = perms?.find(p => p.user_id === id)
      const email = data.user?.email ?? ''
      return { id, email, name: data.user?.user_metadata?.name || email.split('@')[0], role: perm?.role ?? 'admin', permissions: perm?.permissions ?? null }
    })
  )
  return NextResponse.json({ team })
}
