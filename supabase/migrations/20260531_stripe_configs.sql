create table if not exists stripe_configs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null,
  publishable_key     text not null,
  secret_key_enc      text not null,
  webhook_secret_enc  text,
  is_active           boolean not null default false,
  created_at          timestamptz default now()
);

alter table stripe_configs enable row level security;

create policy "tenant isolation" on stripe_configs
  using (
    company_id in (
      select id from tenants where id = company_id
    )
  );
