-- Añadir payment_method y booking_request_id a bookings
alter table bookings
  add column if not exists payment_method      text default 'cash',
  add column if not exists booking_request_id  uuid;

-- Actualizar trigger para copiar payment_method y booking_request_id
create or replace function sync_booking_request_to_bookings()
returns trigger language plpgsql security definer as $$
DECLARE
  v_contact_id         uuid;
  v_client_vehicle_id  uuid;
  v_company_vehicle_id uuid;
  v_plate              text;
  v_make               text;
  v_duration_minutes   int;
  v_owner_id           uuid;
  v_booking_id         uuid;
  v_service_name       text;
  v_timezone           text;
BEGIN
  v_owner_id := COALESCE(
    NEW.owner_id,
    (SELECT user_id FROM business_settings LIMIT 1)
  );

  SELECT COALESCE(timezone, 'Asia/Dubai') INTO v_timezone
  FROM business_settings WHERE user_id = v_owner_id LIMIT 1;

  SELECT id INTO v_contact_id FROM contacts
  WHERE phone = NEW.customer_phone LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (name, phone, tipo, user_id)
    VALUES (NEW.customer_name, NEW.customer_phone, 'cliente', v_owner_id)
    RETURNING id INTO v_contact_id;
  END IF;

  v_plate := COALESCE(NULLIF(NEW.plate_number,''), NULLIF(NEW.plate,''));
  v_make  := COALESCE(
    NULLIF(NEW.vehicle_make_model,''),
    NULLIF(NEW.vehicle_model,''),
    'Unknown'
  );

  IF v_plate IS NOT NULL THEN
    SELECT id INTO v_client_vehicle_id FROM vehicles
    WHERE license_plate = v_plate LIMIT 1;

    IF v_client_vehicle_id IS NULL THEN
      INSERT INTO vehicles (make, model, license_plate, status, contact_id)
      VALUES (v_make, 'N/A', v_plate, 'libre', v_contact_id);
    END IF;
  END IF;

  SELECT v.id INTO v_company_vehicle_id
  FROM vehicles v
  LEFT JOIN bookings b
    ON b.vehicle_id = v.id
    AND b.scheduled_at::date = NEW.scheduled_at::date
    AND b.status != 'cancelled'
  WHERE v.contact_id IS NULL
    AND v.status != 'inactivo'
    AND v.user_id = v_owner_id
  GROUP BY v.id
  ORDER BY COUNT(b.id) ASC, v.created_at ASC
  LIMIT 1;

  SELECT duration_minutes, name INTO v_duration_minutes, v_service_name
  FROM services WHERE id = NEW.service_id LIMIT 1;

  INSERT INTO bookings (
    user_id, contact_id, vehicle_id, service_id,
    scheduled_at, end_at, address, notes, price, status,
    payment_method, booking_request_id
  ) VALUES (
    v_owner_id,
    v_contact_id,
    v_company_vehicle_id,
    NEW.service_id,
    NEW.scheduled_at,
    NEW.scheduled_at + (COALESCE(v_duration_minutes, 60) * interval '1 minute'),
    NEW.address,
    NEW.address_notes,
    NEW.price,
    'confirmed',
    COALESCE(NEW.payment_method, 'cash'),
    NEW.id
  ) RETURNING id INTO v_booking_id;

  INSERT INTO notifications (user_id, type, title, message, read)
  VALUES (
    v_owner_id, 'booking',
    'Nueva reserva — ' || TO_CHAR(NEW.scheduled_at AT TIME ZONE v_timezone, 'DD Mon · HH12:MI AM'),
    NEW.customer_name || ' · ' || COALESCE(v_service_name, 'Servicio'),
    false
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_booking_request_to_bookings failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;
