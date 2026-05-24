-- Los contactos creados por el trigger (desde booking_requests) tienen user_id = NULL
-- porque el trigger no conoce a qué usuario del staff asignarlos.
-- La política original solo muestra contacts WHERE auth.uid() = user_id,
-- lo que los hace invisibles al staff autenticado.
--
-- Solución: añadir una política que permita al staff autenticado leer/gestionar
-- todos los contactos donde user_id IS NULL (creados por el sistema).

-- Hacer user_id nullable (el trigger lo inserta sin user_id)
ALTER TABLE contacts ALTER COLUMN user_id DROP NOT NULL;

-- Política adicional: staff autenticado puede ver contactos sin user_id (trigger-created)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'contacts'
      AND policyname = 'auth_see_unowned_contacts'
  ) THEN
    CREATE POLICY "auth_see_unowned_contacts"
      ON public.contacts FOR ALL TO authenticated
      USING (user_id IS NULL)
      WITH CHECK (user_id IS NULL);
  END IF;
END $$;