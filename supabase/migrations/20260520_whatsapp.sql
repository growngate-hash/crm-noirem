-- Tabla 1: guardar las credenciales de WhatsApp de cada empresa
create table if not exists whatsapp_configs (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid,
  phone_number_id text not null,
  api_key text not null,
  phone_display text,
  business_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Tabla 2: registro de todos los mensajes enviados
create table if not exists whatsapp_logs (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid,
  booking_id uuid,
  phone_to text not null,
  message_type text,
  status text,
  error_message text,
  sent_at timestamptz default now()
);

-- Agregar campo WhatsApp a los contactos
alter table contacts add column if not exists whatsapp_phone text;
