CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  phone       text PRIMARY KEY,
  state       text NOT NULL DEFAULT 'init',
  language    text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);