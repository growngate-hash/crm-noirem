-- Detailed address and vehicle columns for booking_requests
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS villa_flat    text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS area          text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS community     text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS address_notes text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS vehicle_model text;
ALTER TABLE booking_requests ADD COLUMN IF NOT EXISTS plate_number  text;

SELECT 'Columnas de dirección agregadas' AS resultado;