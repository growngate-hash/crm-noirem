-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Companies ─────────────────────────────────────────────────────────
create table if not exists public.companies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  industry    text,
  phone       text,
  email       text,
  website     text,
  address     text,
  notes       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ── Contacts ──────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  company_id    uuid references public.companies(id) on delete set null,
  name          text not null,
  email         text,
  phone         text,
  tier          text check (tier in ('Black Diamond','Platinum','VIP')) default 'VIP',
  vehicle       text,
  plate         text,
  address       text,
  notes         text,
  lifetime_value numeric(12,2) default 0,
  total_bookings integer default 0,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- ── Deal stages ───────────────────────────────────────────────────────
create table if not exists public.deal_stages (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid references auth.users(id) on delete cascade not null,
  name     text not null,
  color    text default '#D4AF37',
  position integer not null default 0
);

-- ── Deals ─────────────────────────────────────────────────────────────
create table if not exists public.deals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  contact_id  uuid references public.contacts(id) on delete set null,
  company_id  uuid references public.companies(id) on delete set null,
  stage_id    uuid references public.deal_stages(id) on delete set null,
  title       text not null,
  value       numeric(12,2) default 0,
  currency    text default 'AED',
  probability integer default 50 check (probability >= 0 and probability <= 100),
  close_date  date,
  notes       text,
  position    integer default 0,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ── Activities ────────────────────────────────────────────────────────
create table if not exists public.activities (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  contact_id  uuid references public.contacts(id) on delete cascade,
  deal_id     uuid references public.deals(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  type        text check (type in ('note','call','email','meeting','task','deal_moved','deal_created','contact_created')) not null,
  title       text not null,
  description text,
  created_at  timestamptz default now() not null
);

-- ── Business settings ─────────────────────────────────────────────────
create table if not exists public.business_settings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  business_name   text default 'Noirem Luxury Car Care',
  email           text,
  phone           text,
  website         text,
  address         text,
  currency        text default 'AED',
  tax_rate        numeric(5,2) default 5.00,
  deposit_pct     numeric(5,2) default 30.00,
  logo_url        text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

-- ── Row-level security ────────────────────────────────────────────────
alter table public.companies         enable row level security;
alter table public.contacts          enable row level security;
alter table public.deal_stages       enable row level security;
alter table public.deals             enable row level security;
alter table public.activities        enable row level security;
alter table public.business_settings enable row level security;

-- Companies policies
create policy "users_own_companies"
  on public.companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Contacts policies
create policy "users_own_contacts"
  on public.contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deal stages policies
create policy "users_own_deal_stages"
  on public.deal_stages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Deals policies
create policy "users_own_deals"
  on public.deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activities policies
create policy "users_own_activities"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Business settings policies
create policy "users_own_settings"
  on public.business_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Updated_at trigger ────────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies
  for each row execute function public.handle_updated_at();
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.handle_updated_at();
create trigger deals_updated_at before update on public.deals
  for each row execute function public.handle_updated_at();
create trigger settings_updated_at before update on public.business_settings
  for each row execute function public.handle_updated_at();

-- ── Auto-create default stages for new users ──────────────────────────
create or replace function public.create_default_stages()
returns trigger language plpgsql security definer as $$
begin
  insert into public.deal_stages (user_id, name, color, position) values
    (new.id, 'Lead',        '#8A8A9A', 0),
    (new.id, 'Qualified',   '#00D4FF', 1),
    (new.id, 'Proposal',    '#D4AF37', 2),
    (new.id, 'Negotiation', '#A78BFA', 3),
    (new.id, 'Won',         '#22C55E', 4),
    (new.id, 'Lost',        '#EF4444', 5);
  insert into public.business_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_default_stages();

-- ── Realtime ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.contacts;
alter publication supabase_realtime add table public.deals;
alter publication supabase_realtime add table public.activities;
