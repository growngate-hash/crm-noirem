-- Add cancellation audit fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by        text;