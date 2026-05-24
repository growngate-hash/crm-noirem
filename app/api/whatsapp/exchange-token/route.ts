import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const FACEBOOK_APP_ID     = process.env.FACEBOOK_APP_ID!
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!

  // 1. Intercambiar code por access token de corta duración
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` +
    `&code=${code}`
  )
  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    console.error('[exchange-token] short-lived token failed:', tokenData)
    return NextResponse.json({ error: 'Token exchange failed', detail: tokenData }, { status: 400 })
  }

  // 2. Intercambiar por token de larga duración (60 días)
  const longTokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` +
    `&fb_exchange_token=${tokenData.access_token}`
  )
  const longTokenData = await longTokenRes.json()
  const accessToken = longTokenData.access_token ?? tokenData.access_token

  // 3. Obtener WABA y teléfonos vinculados
  const wabaRes  = await fetch(
    `https://graph.facebook.com/v19.0/me/businesses?access_token=${accessToken}`
  )
  const wabaData = await wabaRes.json()

  // Extraer waba_id y phone_number_id del primer negocio/número disponible
  let wabaId        = wabaData.data?.[0]?.id ?? null
  let phoneNumberId = null
  let phoneNumber   = null

  if (wabaId) {
    const phonesRes  = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`
    )
    const phonesData = await phonesRes.json()
    const firstPhone = phonesData.data?.[0]
    if (firstPhone) {
      phoneNumberId = firstPhone.id
      phoneNumber   = firstPhone.display_phone_number
    }
  }

  // 4. Guardar en Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('whatsapp_configs').upsert({
    user_id:           user.id,
    access_token:      accessToken,
    phone_number_id:   phoneNumberId,
    waba_id:           wabaId,
    phone_number:      phoneNumber,
    token_expires_at:  new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    waba_data:         wabaData,
    connected:         true,
    updated_at:        new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) {
    console.error('[exchange-token] supabase upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, phone_number: phoneNumber })
}