ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'online'));