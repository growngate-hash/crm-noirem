-- =============================================
-- Panel de administración SAFFI
-- Agrega rol superadmin y tabla de audit log
-- =============================================

-- 1. Agregar columna is_superadmin a la tabla tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

-- 2. Tabla de audit log para acciones administrativas
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL, -- 'activate' | 'suspend' | 'extend_trial' | 'add_note'
  affected_tenant_id uuid NOT NULL REFERENCES tenants(id),
  payload jsonb,        -- detalles de la acción (ej: { days: 7 })
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS en admin_audit_log — solo superadmins pueden leer/escribir
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all" ON admin_audit_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.owner_id = auth.uid()
      AND tenants.is_superadmin = true
    )
  );

-- 4. Marcar a Noirem como superadmin (owner del producto)
UPDATE tenants
SET is_superadmin = true
WHERE owner_id = 'afe5c9b1-d3b4-4617-80c0-73743cf92b33';

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_performed_by ON admin_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_affected_tenant ON admin_audit_log(affected_tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);