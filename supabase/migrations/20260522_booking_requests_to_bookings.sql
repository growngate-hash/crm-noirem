-- ── Trigger: booking_requests → bookings ──────────────────────────────────────
-- Flow:
--   1. Find or create contact by customer_phone
--   2. Find or create vehicle by plate_number, linked to contact
--   3. Insert into bookings with contact_id + vehicle_id

DROP TRIGGER IF EXISTS trg_booking_request_to_bookings ON booking_requests;
DROP FUNCTION IF EXISTS sync_booking_request_to_bookings();

CREATE OR REPLACE FUNCTION sync_booking_request_to_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_vehicle_id  uuid;
  v_plate       text;
  v_vehicle_name text;
  v_notes       text;
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

  -- ── 2. Find or create vehicle ──────────────────────────────────────────────
  v_plate := COALESCE(NULLIF(NEW.plate_number,''), NULLIF(NEW.plate,''));

  IF v_plate IS NOT NULL THEN
    SELECT id INTO v_vehicle_id
    FROM vehicles
    WHERE license_plate = v_plate
    LIMIT 1;

    IF v_vehicle_id IS NULL THEN
      v_vehicle_name := COALESCE(NULLIF(NEW.vehicle_make_model,''), v_plate);
      INSERT INTO vehicles (name, license_plate, status, contact_id)
      VALUES (v_vehicle_name, v_plate, 'libre', v_contact_id)
      RETURNING id INTO v_vehicle_id;
    END IF;
  END IF;

  -- ── 3. Build notes from booking details ───────────────────────────────────
  v_notes := NULLIF(CONCAT_WS(' | ',
    NULLIF('Vehicle: ' || NEW.vehicle_make_model, 'Vehicle: '),
    NULLIF('Plate: '   || v_plate,                'Plate: '),
    NULLIF('Payment: ' || NEW.payment_method,      'Payment: '),
    NULLIF('Area: '    || NEW.area,                'Area: '),
    NULLIF('Community: '|| NEW.community,          'Community: '),
    NULLIF('Villa/Flat: '|| NEW.villa_flat,        'Villa/Flat: '),
    NEW.notes
  ), '');

  -- ── 4. Insert into bookings ────────────────────────────────────────────────
  INSERT INTO bookings (
    contact_id,
    vehicle_id,
    service_id,
    scheduled_at,
    address,
    notes,
    price,
    status
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