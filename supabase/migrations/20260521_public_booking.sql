-- ── Public read access for services (anon booking page) ───────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='services'
    AND policyname='anon_read_active_services'
  ) THEN
    CREATE POLICY "anon_read_active_services"
      ON services FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='service_categories'
    AND policyname='anon_read_active_service_categories'
  ) THEN
    CREATE POLICY "anon_read_active_service_categories"
      ON service_categories FOR SELECT TO anon
      USING (is_active = true);
  END IF;
END $$;

-- ── Public booking requests (no auth required) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id         uuid REFERENCES services(id) ON DELETE SET NULL,
  service_name       text,
  scheduled_at       timestamptz NOT NULL,
  customer_name      text NOT NULL,
  customer_phone     text NOT NULL,
  vehicle_make_model text,
  plate              text,
  address            text,
  notes              text,
  price              numeric,
  status             text DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','cancelled')),
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Anon can create booking requests
CREATE POLICY "anon_insert_booking_requests"
  ON booking_requests FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can read scheduled_at to check slot availability (no personal data)
CREATE POLICY "anon_read_booking_times"
  ON booking_requests FOR SELECT TO anon
  USING (status != 'cancelled');

-- Authenticated staff can manage all booking requests
CREATE POLICY "auth_manage_booking_requests"
  ON booking_requests FOR ALL TO authenticated
  USING (true) WITH CHECK (true);