ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS vat          numeric(15,2) DEFAULT 0;

ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS total_amount numeric(15,2) DEFAULT 0;