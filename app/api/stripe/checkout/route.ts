import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { priceId, tenantId } = (await req.json()) as {
      priceId: string
      tenantId: string
    }

    console.log('[checkout] received:', { priceId, tenantId })

    if (!priceId || !tenantId) {
      return NextResponse.json({ error: 'priceId and tenantId are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, owner_id')
      .eq('id', tenantId)
      .single()

    console.log('[checkout] tenant found:', tenant?.id, tenantError?.message)

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Fetch owner email from auth.users via service role
    const { data: userData } = await supabase.auth.admin.getUserById(tenant.owner_id)
    const email = userData?.user?.email ?? ''

    const customerId = await getOrCreateStripeCustomer(tenantId, email, tenant.name)
    console.log('[checkout] stripe customer:', customerId)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { tenantId },
      },
      metadata: { tenantId },
    })

    console.log('[checkout] session url:', session.url)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
