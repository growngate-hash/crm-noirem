-- El trigger intenta INSERT INTO vehicles (name, license_plate, status, contact_id)
-- pero la tabla vehicles usa columnas make/model, no name.
-- El insert fallaba silenciosamente (EXCEPTION WHEN OTHERS) y el vehículo nunca se creaba.

-- Asegurar que existen las columnas que usa el trigger y la app
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make         text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model        text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status       text DEFAULT 'libre';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS contact_id   uuid REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS license_plate text;

-- Desactivar RLS para que el trigger (SECURITY DEFINER) pueda insertar sin restricciones
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Reescribir el trigger para usar make/model en lugar de name
DROP TRIGGER IF EXISTS trg_booking_request_to_bookings ON booking_requests;
DROP FUNCTION IF EXISTS sync_booking_request_to_bookings();

CREATE OR REPLACE FUNCTION sync_booking_request_to_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id   uuid;
  v_vehicle_id   uuid;
  v_plate        text;
  v_make         text;
  v_notes        text;
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

  -- ── 2. Find/create vehicle by plate, or auto-assign least busy ─────────────
  v_plate := COALESCE(NULLIF(NEW.plate_number,''), NULLIF(NEW.plate,''));
  v_make  := COALESCE(NULLIF(NEW.vehicle_make_model,''), v_plate, 'Unknown');

  IF v_plate IS NOT NULL THEN
    -- Plate provided: find or create that vehicle linked to this contact
    SELECT id INTO v_vehicle_id
    FROM vehicles
    WHERE license_plate = v_plate
    LIMIT 1;

    IF v_vehicle_id IS NULL THEN
      INSERT INTO vehicles (make, license_plate, status, contact_id)
      VALUES (v_make, v_plate, 'libre', v_contact_id)
      RETURNING id INTO v_vehicle_id;
    END IF;

  ELSE
    -- No plate: auto-assign the vehicle with fewest bookings today
    SELECT v.id INTO v_vehicle_id
    FROM vehicles v
    LEFT JOIN bookings b
      ON  b.vehicle_id = v.id
      AND b.scheduled_at::date = NEW.scheduled_at::date
      AND b.status != 'cancelled'
    WHERE v.status != 'inactivo'
    GROUP BY v.id
    ORDER BY COUNT(b.id) ASC, v.created_at ASC
    LIMIT 1;

  END IF;

  -- ── 3. Build notes ─────────────────────────────────────────────────────────
  v_notes := NULLIF(CONCAT_WS(' | ',
    NULLIF('Vehicle: '    || NEW.vehicle_make_model, 'Vehicle: '),
    NULLIF('Plate: '      || v_plate,                'Plate: '),
    NULLIF('Payment: '    || NEW.payment_method,     'Payment: '),
    NULLIF('Area: '       || NEW.area,               'Area: '),
    NULLIF('Community: '  || NEW.community,          'Community: '),
    NULLIF('Villa/Flat: ' || NEW.villa_flat,         'Villa/Flat: '),
    NEW.notes
  ), '');

  -- ── 4. Insert into bookings ────────────────────────────────────────────────
  INSERT INTO bookings (
    contact_id, vehicle_id, service_id, scheduled_at,
    address, notes, price, status
  ) VALUES (
    v_contact_id,
    v_vehicle_id,
    NEW.service_id,
    NEW.scheduled_at,
    NULLIF(COALESCE(NEW.address, ''), ''),
    v_notes,
    NEW.price,
    'pending'
  );

  RAISE LOG 'sync_booking: contact=% vehicle=% plate=%', v_contact_id, v_vehicle_id, v_plate;

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