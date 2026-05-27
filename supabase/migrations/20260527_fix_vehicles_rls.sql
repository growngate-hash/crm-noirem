-- Fix: RLS en tabla vehicles bloqueaba vehículos de clientes
-- Los vehículos creados por el trigger sync_booking_request_to_bookings
-- tienen user_id = NULL (igual que los contactos del trigger).
-- La policy team_access_vehicles filtraba por user_id = get_owner_id()
-- dejando fuera estos registros y mostrando — en la columna VEHÍCULOS.
-- Fix: agregar policy adicional para que staff autenticado pueda ver
-- vehículos sin user_id (de clientes), igual que auth_see_unowned_contacts.
-- Aplicado directamente en Supabase SQL Editor el 2026-05-27.

CREATE POLICY "auth_see_unowned_vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);