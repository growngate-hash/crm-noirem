-- ── Tabla de membresía de equipo ──────────────────────────────────────────────
-- Mapea cada usuario de staff al owner/admin cuya data puede ver
-- Se puebla automáticamente cuando el admin invita a alguien
CREATE TABLE IF NOT EXISTS public.team_members (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (owner_id, member_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- El owner ve y gestiona su equipo
CREATE POLICY "owner_manages_team"
  ON public.team_members FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- El staff puede leer su propia fila (para saber a qué owner pertenece)
CREATE POLICY "member_reads_own_row"
  ON public.team_members FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- Índices para lookup rápido
CREATE INDEX IF NOT EXISTS idx_team_members_owner_id  ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON public.team_members(member_id);

-- ── Función helper: retorna el owner_id del usuario actual ────────────────────
-- Si el usuario ES el owner, retorna su propio auth.uid()
-- Si el usuario es staff, retorna el owner_id de su team_members row
CREATE OR REPLACE FUNCTION public.get_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members WHERE member_id = auth.uid() LIMIT 1),
    auth.uid()
  );
$$;

-- ── Actualizar RLS del Grupo A para soportar staff ───────────────────────────

-- companies
DROP POLICY IF EXISTS "users_own_companies" ON public.companies;
CREATE POLICY "team_access_companies"
  ON public.companies FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- deal_stages
DROP POLICY IF EXISTS "users_own_deal_stages" ON public.deal_stages;
CREATE POLICY "team_access_deal_stages"
  ON public.deal_stages FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- deals
DROP POLICY IF EXISTS "users_own_deals" ON public.deals;
CREATE POLICY "team_access_deals"
  ON public.deals FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- activities
DROP POLICY IF EXISTS "users_own_activities" ON public.activities;
CREATE POLICY "team_access_activities"
  ON public.activities FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- business_settings
DROP POLICY IF EXISTS "users_own_settings" ON public.business_settings;
CREATE POLICY "team_access_business_settings"
  ON public.business_settings FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- contacts (reemplaza ambas políticas existentes)
DROP POLICY IF EXISTS "users_own_contacts"        ON public.contacts;
DROP POLICY IF EXISTS "auth_see_unowned_contacts" ON public.contacts;
CREATE POLICY "team_access_contacts"
  ON public.contacts FOR ALL TO authenticated
  USING (user_id = public.get_owner_id() OR user_id IS NULL)
  WITH CHECK (user_id = public.get_owner_id() OR user_id IS NULL);