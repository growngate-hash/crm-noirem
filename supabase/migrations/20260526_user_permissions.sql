-- Tabla de permisos por usuario
-- Fuente de verdad para roles y accesos del equipo en el CRM
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'technician' CHECK (role IN ('admin','manager','technician')),
  permissions  jsonb NOT NULL DEFAULT '{}',
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- RLS: solo el service role puede leer/escribir (los endpoints API usan service role key)
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access"
  ON public.user_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- El usuario puede leer sus propios permisos (para el hook usePermissions)
CREATE POLICY "users_read_own_permissions"
  ON public.user_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para lookup rápido por user_id
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
  ON public.user_permissions(user_id);