-- B2All Trade Desk: database schema (Supabase / Postgres). Run once in the SQL editor.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null, -- not unique: until phone codes are on, one person may sign in from two devices
  name text not null default '',
  city text not null default '',
  company text,
  role text not null default 'customer' check (role in ('customer','owner')),
  consent_whatsapp boolean not null default true,
  consent_email boolean not null default false,
  consent_sms boolean not null default false,
  email text,
  created_at timestamptz not null default now()
);

create index profiles_phone_idx on public.profiles(phone);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  note text,
  active boolean not null default true
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  status text not null default 'new' check (status in ('new','quoted','confirmed','dispatched','closed')),
  note text,
  created_at timestamptz not null default now()
);

create table public.enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  material_id uuid not null references public.materials(id),
  qty numeric not null check (qty > 0),
  unit text not null default 'MT'
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  code text,
  valid_till date,
  created_at timestamptz not null default now()
);

create table public.offer_sends (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  channel text not null check (channel in ('whatsapp','email','sms')),
  sent_at timestamptz not null default now()
);

-- Phase 2 tables (created now so data model is stable; no UI yet)
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.enquiries(id),
  status text not null default 'draft' check (status in ('draft','sent','signed','cancelled')),
  terms jsonb not null default '{}',
  signed_pdf_path text,
  created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.enquiries(id),
  number text unique,
  irn text,
  amount numeric,
  tally_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- helper: is the caller an owner?
create or replace function public.is_owner() returns boolean
language sql security definer stable set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'owner') $$;

alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.enquiries enable row level security;
alter table public.enquiry_items enable row level security;
alter table public.offers enable row level security;
alter table public.offer_sends enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or is_owner());
create policy "update own profile (not role)" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid() and role = 'customer');
create policy "owner updates profiles" on public.profiles for update using (is_owner());

create policy "anyone reads materials" on public.materials for select using (true);
create policy "owner manages materials" on public.materials for all using (is_owner()) with check (is_owner());

create policy "customer reads own enquiries" on public.enquiries for select using (customer_id = auth.uid() or is_owner());
create policy "customer creates own enquiries" on public.enquiries for insert with check (customer_id = auth.uid());
create policy "owner updates enquiries" on public.enquiries for update using (is_owner());

create policy "items follow enquiry" on public.enquiry_items for select
  using (exists(select 1 from enquiries e where e.id = enquiry_id and (e.customer_id = auth.uid() or is_owner())));
create policy "customer adds items to own enquiry" on public.enquiry_items for insert
  with check (exists(select 1 from enquiries e where e.id = enquiry_id and e.customer_id = auth.uid()));

create policy "owner manages offers" on public.offers for all using (is_owner()) with check (is_owner());
create policy "customer reads offers" on public.offers for select using (auth.uid() is not null);
create policy "owner manages sends" on public.offer_sends for all using (is_owner()) with check (is_owner());
create policy "owner manages contracts" on public.contracts for all using (is_owner()) with check (is_owner());
create policy "owner manages invoices" on public.invoices for all using (is_owner()) with check (is_owner());

insert into public.materials (name, category, note) values
 ('Thermal coal','Coal','Grade and GCV as per lab report'),
 ('Coking coal','Coal',null),
 ('Iron ore fines','Iron ore',null),
 ('Ferro manganese','Ferro alloys',null),
 ('Silico manganese','Ferro alloys',null),
 ('Ferro chrome','Ferro alloys',null),
 ('HMS scrap','Scrap',null),
 ('Limestone','Minerals',null),
 ('Dolomite','Minerals',null);
