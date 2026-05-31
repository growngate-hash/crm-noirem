create table if not exists payment_methods (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  type         text not null check (type in ('bank', 'wallet', 'stripe')),
  label        text not null,
  details      jsonb not null default '{}',
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz default now()
);

alter table payment_methods enable row level security;

create policy "tenant isolation" on payment_methods
  using (
    company_id in (
      select id from tenants
    )
  );
