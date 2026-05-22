-- ── Trigger: booking_requests → bookings ──────────────────────────────────────
-- When a public booking request is inserted, automatically:
--   1. Find or create a contact by phone number
--   2. Insert a row in bookings linked to that contact

DROP TRIGGER IF EXISTS trg_booking_request_to_bookings ON booking_requests;
DROP FUNCTION IF EXISTS sync_booking_request_to_bookings();

CREATE OR REPLACE FUNCTION sync_booking_request_to_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- runs as the function owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  -- 1. Find existing contact by phone
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE phone = NEW.customer_phone
  LIMIT 1;

  -- 2. If not found, create a new contact
  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (name, phone, tipo)
    VALUES (
      COALESCE(NEW.customer_name, 'Web Booking'),
      NEW.customer_phone,
      'cliente'
    )
    RETURNING id INTO v_contact_id;
  END IF;

  -- 3. Insert into bookings
  INSERT INTO bookings (
    contact_id,
    service_id,
    scheduled_at,
    address,
    notes,
    price,
    status
  ) VALUES (
    v_contact_id,
    NEW.service_id,
    NEW.scheduled_at,
    NULLIF(COALESCE(NEW.address, ''), ''),
    NULLIF(CONCAT_WS(' | ',
      NULLIF('Vehicle: ' || NEW.vehicle_make_model, 'Vehicle: '),
      NULLIF('Plate: '   || NEW.plate,              'Plate: '),
      NULLIF('Payment: ' || NEW.payment_method,     'Payment: '),
      NEW.notes
    ), ''),
    NEW.price,
    'pending'
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the booking_request insert
  RAISE WARNING 'sync_booking_request_to_bookings failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_request_to_bookings
  AFTER INSERT ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_request_to_bookings();