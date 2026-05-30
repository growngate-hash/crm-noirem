-- ── Stripe subscription columns on tenants ───────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT,
  ADD COLUMN IF NOT EXISTS plan                    TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial','starter','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS plan_interval           TEXT NOT NULL DEFAULT 'monthly'
    CHECK (plan_interval IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing','active','past_due','canceled','unpaid')),
  ADD COLUMN IF NOT EXISTS subscription_ends_at    TIMESTAMPTZ;

-- Indices for webhook lookups
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
  ON public.tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id
  ON public.tenants(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status
  ON public.tenants(subscription_status);
