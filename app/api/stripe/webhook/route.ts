import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import type { Plan } from '@/types/index'

// Stripe requires raw body for signature verification
export const runtime = 'nodejs'

function derivePlan(priceId: string): Plan {
  const map: Record<string, Plan> = {
    [process.env.STRIPE_STARTER_MONTHLY!]:    'starter',
    [process.env.STRIPE_STARTER_ANNUAL!]:     'starter',
    [process.env.STRIPE_PRO_MONTHLY!]:        'pro',
    [process.env.STRIPE_PRO_ANNUAL!]:         'pro',
    [process.env.STRIPE_ENTERPRISE_MONTHLY!]: 'enterprise',
    [process.env.STRIPE_ENTERPRISE_ANNUAL!]:  'enterprise',
  }
  return map[priceId] ?? 'starter'
}

function derivePlanInterval(priceId: string): 'monthly' | 'annual' {
  const annualIds = [
    process.env.STRIPE_STARTER_ANNUAL!,
    process.env.STRIPE_PRO_ANNUAL!,
    process.env.STRIPE_ENTERPRISE_ANNUAL!,
  ]
  return annualIds.includes(priceId) ? 'annual' : 'monthly'
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenantId
        if (!tenantId) break

        const subscriptionId = session.subscription as string
        const subscription   = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
        const priceId        = subscription.items.data[0]?.price.id ?? ''
        const rawSub = subscription as unknown as Record<string, unknown>
        const periodEnd = typeof rawSub['current_period_end'] === 'number'
          ? new Date(rawSub['current_period_end'] * 1000).toISOString()
          : null

        await supabase
          .from('tenants')
          .update({
            stripe_customer_id:     session.customer as string,
            stripe_subscription_id: subscriptionId,
            stripe_price_id:        priceId,
            plan:                   derivePlan(priceId),
            plan_interval:          derivePlanInterval(priceId),
            subscription_status:    'active',
            subscription_ends_at:   periodEnd,
          })
          .eq('id', tenantId)
        break
      }

      case 'customer.subscription.updated': {
        const sub     = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenantId
        if (!tenantId) break

        const priceId   = sub.items.data[0]?.price.id ?? ''
        const rawSub2 = sub as unknown as Record<string, unknown>
        const periodEnd = typeof rawSub2['current_period_end'] === 'number'
          ? new Date(rawSub2['current_period_end'] * 1000).toISOString()
          : null

        await supabase
          .from('tenants')
          .update({
            stripe_price_id:      priceId,
            plan:                 derivePlan(priceId),
            plan_interval:        derivePlanInterval(priceId),
            subscription_status:  sub.status as 'active' | 'past_due' | 'canceled' | 'unpaid',
            subscription_ends_at: periodEnd,
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('tenants')
          .update({ subscription_status: 'canceled', plan: 'trial' })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const rawInvoice     = event.data.object as unknown as Record<string, unknown>
        const subField       = rawInvoice['subscription']
        const subscriptionId = typeof subField === 'string'
          ? subField
          : (subField as Record<string, unknown> | null)?.['id'] as string | undefined
        if (!subscriptionId) break

        await supabase
          .from('tenants')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)
        break
      }
    }
  } catch (err) {
    // Log internally but always return 200 to Stripe
    console.error('[stripe-webhook] handler error:', err)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
