import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  const supabase = await createClient()

  // Leer webhook_secret del tenant activo desde BD
  const { data: config, error: configError } = await supabase
    .from('stripe_configs')
    .select('secret_key_enc, webhook_secret_enc')
    .eq('is_active', true)
    .single()

  if (configError || !config?.webhook_secret_enc) {
    console.error('[booking-webhook] stripe_configs not found:', configError)
    return new NextResponse('Stripe not configured', { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = new Stripe(config.secret_key_enc)
    event = stripe.webhooks.constructEvent(body, sig, config.webhook_secret_enc)
  } catch (err) {
    console.error('[booking-webhook] Invalid signature:', err)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      const bookingRequestId = session.metadata?.bookingRequestId
      if (!bookingRequestId) {
        console.warn('[booking-webhook] Missing bookingRequestId in metadata')
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // Idempotencia — solo confirma si aún está pending_payment
      const { error: updateError } = await supabase
        .from('booking_requests')
        .update({
          status:                   'confirmed',
          payment_token:            null,
          payment_token_expires_at: null,
        })
        .eq('id', bookingRequestId)
        .eq('status', 'pending_payment')

      if (updateError) {
        console.error('[booking-webhook] Failed to confirm booking:', updateError)
        return new NextResponse('DB update failed', { status: 500 })
      }

      console.log('[booking-webhook] Booking confirmed:', bookingRequestId)
    }
  } catch (err) {
    // Siempre devolver 200 a Stripe para evitar reintentos infinitos
    console.error('[booking-webhook] Handler error:', err)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
