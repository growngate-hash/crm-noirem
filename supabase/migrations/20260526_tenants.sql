-- ── Planes disponibles ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL UNIQUE,
  price_monthly   numeric(10,2),
  max_users       integer DEFAULT 5,
  features        jsonb DEFAULT '[]',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Planes iniciales
INSERT INTO public.plans (name, price_monthly, max_users, features) VALUES
  ('Trial',      0,    3,  '["Full access for 10 days"]'),
  ('Starter',    null, 3,  '["Up to 3 users","Basic reports","WhatsApp bot"]'),
  ('Pro',        null, 10, '["Up to 10 users","Advanced reports","WhatsApp bot","Priority support"]'),
  ('Enterprise', null, 999,'["Unlimited users","Custom reports","Dedicated manager","SLA"]');

-- ── Tenants (una fila por empresa cliente) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id        uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text UNIQUE,
  plan_id         uuid REFERENCES public.plans(id),
  status          text NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial','active','expired','suspended')),
  trial_ends_at   timestamptz NOT NULL DEFAULT (now() + interval '10 days'),
  country         text,
  timezone        text DEFAULT 'UTC',
  currency        text DEFAULT 'USD',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS en tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- El owner ve y edita su propio tenant
CREATE POLICY "owner_manages_tenant"
  ON public.tenants FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- El staff puede leer el tenant de su owner
CREATE POLICY "staff_reads_tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (
    owner_id IN (
      SELECT owner_id FROM public.team_members WHERE member_id = auth.uid()
    )
  );

-- Service role acceso total (para el middleware y API routes)
CREATE POLICY "service_role_tenant_access"
  ON public.tenants FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS en plans (lectura pública)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read"
  ON public.plans FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id      ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status         ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends_at  ON public.tenants(trial_ends_at);

-- ── Función: verificar si el tenant actual está activo ────────────────────────
CREATE OR REPLACE FUNCTION public.tenant_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE owner_id = public.get_owner_id()
    AND (
      status = 'active'
      OR (status = 'trial' AND trial_ends_at > now())
    )
  );
$$;