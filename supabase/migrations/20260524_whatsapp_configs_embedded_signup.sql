-- Ampliar whatsapp_configs para soportar Embedded Signup de Meta
-- La tabla ya existe con: id, tenant_id, phone_number_id, api_key,
-- phone_display, business_name, is_active, created_at

-- Hacer nullable las columnas NOT NULL originales (pueden no venir del signup)
ALTER TABLE whatsapp_configs
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN api_key         DROP NOT NULL;

-- Nuevas columnas para Embedded Signup
ALTER TABLE whatsapp_configs
  ADD COLUMN IF NOT EXISTS user_id          uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS access_token     text,
  ADD COLUMN IF NOT EXISTS waba_id          text,
  ADD COLUMN IF NOT EXISTS phone_number     text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS waba_data        jsonb,
  ADD COLUMN IF NOT EXISTS connected        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();

-- Unique constraint en user_id para el upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_configs_user_id_key'
  ) THEN
    ALTER TABLE whatsapp_configs ADD CONSTRAINT whatsapp_configs_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Desactivar RLS (acceso controlado por service_role en Edge Functions)
ALTER TABLE whatsapp_configs DISABLE ROW LEVEL SECURITY;