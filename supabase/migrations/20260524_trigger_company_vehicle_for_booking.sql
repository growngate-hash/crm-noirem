-- El booking.vehicle_id debe apuntar a un vehículo de empresa (contact_id IS NULL),
-- no al carro del cliente. El vehículo del cliente se guarda en vehicles vinculado
-- al contacto solo para el historial.

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
  -- Company vehicles have contact_id IS NULL
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

  -- ── 4. Build notes ─────────────────────────────────────────────────────────
  v_notes := NULLIF(CONCAT_WS(' | ',
    NULLIF('Vehicle: '    || NEW.vehicle_make_model, 'Vehicle: '),
    NULLIF('Plate: '      || v_plate,                'Plate: '),
    NULLIF('Payment: '    || NEW.payment_method,     'Payment: '),
    NULLIF('Area: '       || NEW.area,               'Area: '),
    NULLIF('Community: '  || NEW.community,          'Community: '),
    NULLIF('Villa/Flat: ' || NEW.villa_flat,         'Villa/Flat: '),
    NEW.notes
  ), '');

  -- ── 5. Insert into bookings using the COMPANY vehicle ──────────────────────
  INSERT INTO bookings (
    contact_id, vehicle_id, service_id, scheduled_at,
    address, notes, price, status
  ) VALUES (
    v_contact_id,
    v_company_vehicle_id,
    NEW.service_id,
    NEW.scheduled_at,
    NULLIF(COALESCE(NEW.address, ''), ''),
    v_notes,
    NEW.price,
    'pending'
  );

  RAISE LOG 'sync_booking: contact=% client_vehicle=% company_vehicle=% plate=%',
    v_contact_id, v_client_vehicle_id, v_company_vehicle_id, v_plate;

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