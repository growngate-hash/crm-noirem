-- Add user_id to services table for multi-tenant isolation
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: uncomment and set the correct UUID for existing Noirem data
-- UPDATE services SET user_id = 'TU-USER-UUID-AQUI' WHERE user_id IS NULL;

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any exist
DROP POLICY IF EXISTS "tenant_isolation" ON services;
DROP POLICY IF EXISTS "auth_only" ON services;

CREATE POLICY "tenant_isolation" ON services
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());