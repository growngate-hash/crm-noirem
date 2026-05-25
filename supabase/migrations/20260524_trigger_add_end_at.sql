-- ── Paso 0: columnas nuevas necesarias ────────────────────────────────────────

-- end_at en bookings (para que el trigger y la API puedan usarlo)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- duration_minutes en services (el trigger lo leerá; CAMBIO 4 lo poblará desde el formulario)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- ── Paso 0b: backfill duration_minutes desde la columna duration (text) ───────
-- Cubre los formatos reales encontrados en los datos:
--   "2h", "1.5h", "2 h"   → número * 60
--   "90m", "120m", "90 m" → número directo
--   "2", "1.5"            → si < 24 asume horas → *60; si ≥ 24 asume minutos
--   "2-3 Days", "4-8 hours", rangos de texto → NULL (no parseables de forma fiable)
-- También lee duration_hrs si duration está vacío (algunos servicios se crearon con ese campo)

UPDATE services
SET duration_minutes = CASE

  -- Patrón "Xh" o "X.Xh" (horas explícitas)
  WHEN COALESCE(duration, duration_hrs) ~* '^\s*(\d+(?:\.\d+)?)\s*h(our|r|s)?\b'
  THEN ROUND(
    CAST(REGEXP_REPLACE(COALESCE(duration, duration_hrs), '^\s*(\d+(?:\.\d+)?).*', '\1') AS numeric) * 60
  )::integer

  -- Patrón "Xm" o "X min" (minutos explícitos)
  WHEN COALESCE(duration, duration_hrs) ~* '^\s*(\d+)\s*m(in)?\b'
  THEN CAST(REGEXP_REPLACE(COALESCE(duration, duration_hrs), '^\s*(\d+).*', '\1') AS integer)

  -- Número puro sin unidad
  WHEN COALESCE(duration, duration_hrs) ~ '^\s*\d+(?:\.\d+)?\s*$'
  THEN CASE
    WHEN CAST(TRIM(COALESCE(duration, duration_hrs)) AS numeric) < 24
      THEN ROUND(CAST(TRIM(COALESCE(duration, duration_hrs)) AS numeric) * 60)::integer
    ELSE
      ROUND(CAST(TRIM(COALESCE(duration, duration_hrs)) AS numeric))::integer
  END

  -- Rangos de texto ("2-3 Days", "4-8 hours") y otros formatos no parseables → NULL
  ELSE NULL

END
WHERE duration_minutes IS NULL
  AND COALESCE(NULLIF(TRIM(duration),''), NULLIF(TRIM(duration_hrs),'')) IS NOT NULL;

-- ── Paso 1: reescribir trigger ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_booking_request_to_bookings ON booking_requests;
DROP FUNCTION IF EXISTS sync_booking_request_to_bookings();

CREATE OR REPLACE FUNCTION sync_booking_request_to_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id         uuid;
  v_client_vehicle_id  uuid;
  v_company_vehicle_id uuid;
  v_plate              text;
  v_make               text;
  v_notes              text;
  v_duration_minutes   integer;
BEGIN
  -- ── 1. Find or create contact ──────────────────────────────────────────────
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE phone = NEW.customer_phone
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (name, phone, tipo)
    VALUES (COALESCE(NULLIF(NEW.customer_name,''), 'Web Booking'), NEW.customer_phone, 'cliente')
    RETURNING id INTO v_contact_id;
  END IF;

  -- ── 2. Find or create CLIENT vehicle (for history, linked to contact) ──────
  v_plate := COALESCE(NULLIF(NEW.plate_number,''), NULLIF(NEW.plate,''));
  v_make  := COALESCE(NULLIF(NEW.vehicle_make_model,''), v_plate, 'Unknown');

  IF v_plate IS NOT NULL THEN
    SELECT id INTO v_client_vehicle_id
    FROM vehicles
    WHERE license_plate = v_plate
    LIMIT 1;

    IF v_client_vehicle_id IS NULL THEN
      INSERT INTO vehicles (make, license_plate, status, contact_id)
      VALUES (v_make, v_plate, 'libre', v_contact_id)
      RETURNING id INTO v_client_vehicle_id;
    END IF;
  END IF;

  -- ── 3. Assign COMPANY vehicle with fewest bookings that day ────────────────
  SELECT v.id INTO v_company_vehicle_id
  FROM vehicles v
  LEFT JOIN bookings b
    ON  b.vehicle_id    = v.id
    AND b.scheduled_at::date = NEW.scheduled_at::date
    AND b.status != 'cancelled'
  WHERE v.contact_id IS NULL
    AND v.status != 'inactivo'
  GROUP BY v.id
  ORDER BY COUNT(b.id) ASC, v.created_at ASC
  LIMIT 1;

  -- ── 4. Get service duration ────────────────────────────────────────────────
  SELECT duration_minutes INTO v_duration_minutes
  FROM services
  WHERE id = NEW.service_id;

  -- ── 5. Build notes ─────────────────────────────────────────────────────────
  v_notes := NULLIF(CONCAT_WS(' | ',
    NULLIF('Vehicle: '    || NEW.vehicle_make_model, 'Vehicle: '),
    NULLIF('Plate: '      || v_plate,                'Plate: '),
    NULLIF('Payment: '    || NEW.payment_method,     'Payment: '),
    NULLIF('Area: '       || NEW.area,               'Area: '),
    NULLIF('Community: '  || NEW.community,          'Community: '),
    NULLIF('Villa/Flat: ' || NEW.villa_flat,         'Villa/Flat: '),
    NEW.notes
  ), '');

  -- ── 6. Insert into bookings using the COMPANY vehicle ──────────────────────
  INSERT INTO bookings (
    contact_id, vehicle_id, service_id, scheduled_at,
    end_at,
    address, notes, price, status
  ) VALUES (
    v_contact_id,
    v_company_vehicle_id,
    NEW.service_id,
    NEW.scheduled_at,
    NEW.scheduled_at + (COALESCE(v_duration_minutes, 60) * interval '1 minute'),
    NULLIF(COALESCE(NEW.address, ''), ''),
    v_notes,
    NEW.price,
    'pending'
  );

  RAISE LOG 'sync_booking: contact=% client_vehicle=% company_vehicle=% plate=% duration_min=%',
    v_contact_id, v_client_vehicle_id, v_company_vehicle_id, v_plate, v_duration_minutes;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_booking_request_to_bookings failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_request_to_bookings
  AFTER INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_request_to_bookings();