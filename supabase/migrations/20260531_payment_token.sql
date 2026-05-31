alter table booking_requests
  add column if not exists payment_token               text unique,
  add column if not exists payment_token_expires_at    timestamptz,
  add column if not exists stripe_session_id           text;

alter table booking_requests
  drop constraint if exists booking_requests_status_check;

alter table booking_requests
  add constraint booking_requests_status_check
  check (status in ('pending', 'pending_payment', 'confirmed', 'cancelled', 'completed'));
