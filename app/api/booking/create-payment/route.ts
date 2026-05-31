import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { bookingRequestId, amount, currency, serviceName } = await req.json()

    if (!bookingRequestId || !amount || !currency || !serviceName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Leer stripe_configs del tenant activo
    const { data: config, error: configError } = await supabase
      .from('stripe_configs')
      .select('secret_key_enc, webhook_secret_enc')
      .eq('is_active', true)
      .single()

    if (configError || !config) {
      return NextResponse.json({ error: 'Stripe not configured for this tenant' }, { status: 400 })
    }

    const stripe = new Stripe(config.secret_key_enc)

    // Token opaco de un solo uso — no expone el UUID real de la reserva
    const paymentToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Guardar token antes de crear la sesión (evita race conditions)
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({
        payment_token: paymentToken,
        payment_token_expires_at: expiresAt,
      })
      .eq('id', bookingRequestId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to generate payment token' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://saffi.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: serviceName },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/booking/success?token=${paymentToken}`,
      cancel_url: `${baseUrl}/booking/noirem`,
      metadata: {
        bookingRequestId,
        paymentToken,
      },
    })

    // Guardar stripe_session_id para correlacionar con el webhook
    await supabase
      .from('booking_requests')
      .update({ stripe_session_id: session.id })
      .eq('id', bookingRequestId)

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('[create-payment]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
