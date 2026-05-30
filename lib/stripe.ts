import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ── Server-side Stripe client ─────────────────────────────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

// ── Price ID map from env ─────────────────────────────────────────────────────
export const PLANS = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY!,
    annual:  process.env.STRIPE_STARTER_ANNUAL!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY!,
    annual:  process.env.STRIPE_PRO_ANNUAL!,
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY!,
    annual:  process.env.STRIPE_ENTERPRISE_ANNUAL!,
  },
} as const

// ── Get or create Stripe customer ─────────────────────────────────────────────
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  name: string,
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (tenant?.stripe_customer_id) {
    return tenant.stripe_customer_id
  }

  const customer = await stripe.customers.create({ email, name, metadata: { tenantId } })

  await supabase
    .from('tenants')
    .update({ stripe_customer_id: customer.id })
    .eq('id', tenantId)

  return customer.id
}
