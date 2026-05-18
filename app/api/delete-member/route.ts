import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: permsError } = await supabaseAdmin
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)

  if (permsError) {
    return NextResponse.json({ error: permsError.message }, { status: 400 })
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
