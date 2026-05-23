-- notifications table for the CRM bell panel
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('booking','stock','payment','system')),
  title      text not null,
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS: authenticated users can read and update; anon can insert (from booking flow)
alter table public.notifications enable row level security;

create policy "authenticated read notifications"
  on public.notifications for select
  to authenticated
  using (true);

create policy "authenticated update notifications"
  on public.notifications for update
  to authenticated
  using (true)
  with check (true);

create policy "anyone can insert notifications"
  on public.notifications for insert
  to anon, authenticated
  with check (true);

-- realtime
alter publication supabase_realtime add table public.notifications;