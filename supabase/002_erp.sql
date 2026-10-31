-- B2All: ERP, accounts, CRM, contracts and roles. Runs after schema.sql (phase 1).

-- profiles: staff roles and billing details
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer','owner','staff'));
alter table public.profiles add column if not exists staff_role_id uuid, add column if not exists gstin text, add column if not exists state_code text, add column if not exists address text;

-- helpers
create or replace function public.is_staff() returns boolean language sql security definer stable set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role in ('owner','staff')) $$;

create table if not exists public.roles (id uuid primary key default gen_random_uuid(), name text not null, perms jsonb not null default '{}', created_at timestamptz not null default now());
alter table public.profiles drop constraint if exists profiles_staff_role_fk;
alter table public.profiles add constraint profiles_staff_role_fk foreign key (staff_role_id) references public.roles(id) on delete set null;

create table if not exists public.invites (id uuid primary key default gen_random_uuid(), email text not null, name text not null, role_id uuid references public.roles(id), created_at timestamptz not null default now());
create table if not exists public.company (id text primary key, name text not null, gstin text not null default '', state_code text not null default '22', address text not null default '', phone text not null default '', email text not null default '', bank text not null default '', invoice_prefix text not null default 'B2A', terms text not null default '', created_at timestamptz not null default now());
create table if not exists public.activity (id uuid primary key default gen_random_uuid(), at timestamptz not null default now(), by_name text not null, what text not null, created_at timestamptz not null default now());
create table if not exists public.counters (k text primary key, n integer not null default 0);

alter table public.materials add column if not exists hsn text not null default '', add column if not exists gst_rate numeric not null default 18,
  add column if not exists unit text not null default 'MT', add column if not exists opening_qty numeric not null default 0, add column if not exists opening_rate numeric not null default 0,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(), name text not null, type text not null check (type in ('customer','supplier')),
  gstin text, state_code text, address text, phone text, email text, city text, profile_id uuid references public.profiles(id) on delete set null,
  credit_days integer not null default 15, created_at timestamptz not null default now());
create index if not exists parties_profile_idx on public.parties(profile_id);

create table if not exists public.ledgers (id uuid primary key default gen_random_uuid(), name text not null unique, grp text not null, party_id uuid references public.parties(id) on delete set null, opening numeric not null default 0, created_at timestamptz not null default now());

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), number text not null unique, kind text not null check (kind in ('sale','purchase')),
  party_id uuid not null references public.parties(id), material_id uuid not null references public.materials(id), qty numeric not null check (qty > 0), rate numeric not null check (rate >= 0),
  date date not null default current_date, status text not null default 'open' check (status in ('open','closed')), terms text, enquiry_id uuid references public.enquiries(id), closed_note text,
  created_at timestamptz not null default now());

drop table if exists public.invoices cascade;
drop table if exists public.contracts cascade;

create table public.invoices (
  id uuid primary key default gen_random_uuid(), number text not null, kind text not null check (kind in ('sale','purchase')), party_id uuid not null references public.parties(id),
  order_id uuid not null references public.orders(id), date date not null, due_date date not null, material_id uuid not null references public.materials(id),
  qty numeric not null, rate numeric not null, gst_rate numeric not null, taxable numeric not null, cgst numeric not null default 0, sgst numeric not null default 0, igst numeric not null default 0, total numeric not null,
  delivery_ids jsonb not null default '[]', place_of_supply text not null, voucher_id uuid, created_at timestamptz not null default now(),
  unique (kind, party_id, number));

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, bill_no text not null, bill_date date not null, vehicle_no text not null,
  eway_no text, eway_valid_till date, qty numeric not null check (qty > 0), note text, entered_by text not null, invoice_id uuid references public.invoices(id) on delete set null, created_at timestamptz not null default now());

create table public.contracts (
  id uuid primary key default gen_random_uuid(), number text not null unique, order_id uuid not null references public.orders(id), party_id uuid not null references public.parties(id), body text not null,
  status text not null default 'draft' check (status in ('draft','sent','signed','cancelled')), sent_at timestamptz, signed_at timestamptz, signed_name text, signed_ip text, doc_hash text, created_at timestamptz not null default now());

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(), number text not null, type text not null check (type in ('sales','purchase','receipt','payment','journal','contra')), date date not null,
  party_id uuid references public.parties(id), invoice_id uuid references public.invoices(id) on delete set null, narration text not null default '', entries jsonb not null, amount numeric not null,
  created_by text not null, tally_exported boolean not null default false, created_at timestamptz not null default now());

alter table public.enquiries drop constraint if exists enquiries_status_check;
update public.enquiries set status = 'new' where status not in ('new','quoted','won','lost');
alter table public.enquiries add constraint enquiries_status_check check (status in ('new','quoted','won','lost'));
alter table public.enquiries add column if not exists order_id uuid references public.orders(id);

drop table if exists public.offer_sends;
create table public.offer_sends (id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.offers(id) on delete cascade, party_id uuid not null references public.parties(id) on delete cascade, channel text not null check (channel in ('whatsapp','email','sms')), sent_at timestamptz not null default now(), created_at timestamptz not null default now());

-- functions
create or replace function public.my_party_ids() returns setof uuid language sql security definer stable set search_path = public as
$$ select id from parties where profile_id = auth.uid() $$;

create or replace function public.next_number(k text) returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  insert into counters(k, n) values (k, 1) on conflict (k) do update set n = counters.n + 1 returning n into v;
  return v;
end $$;

create or replace function public.sign_contract(cid uuid, signer text, ip text) returns void language plpgsql security definer set search_path = public, extensions as $$
declare c contracts;
begin
  select * into c from contracts where id = cid;
  if c.id is null or c.status <> 'sent' or not exists (select 1 from parties where id = c.party_id and profile_id = auth.uid()) then raise exception 'cannot sign'; end if;
  if length(trim(signer)) < 3 then raise exception 'name required'; end if;
  update contracts set status = 'signed', signed_at = now(), signed_name = trim(signer), signed_ip = ip, doc_hash = encode(extensions.digest(c.body, 'sha256'), 'hex') where id = cid;
  insert into activity(by_name, what) values (trim(signer), 'Signed contract ' || c.number);
end $$;

create or replace function public.claim_invite() returns void language plpgsql security definer set search_path = public as $$
declare i invites;
begin
  select * into i from invites where lower(email) = lower(auth.jwt() ->> 'email') order by created_at desc limit 1;
  if i.id is null then return; end if;
  insert into profiles (id, phone, name, city, role, staff_role_id, email) values (auth.uid(), '', i.name, '', 'staff', i.role_id, i.email)
  on conflict (id) do update set role = 'staff', staff_role_id = i.role_id, email = i.email where profiles.role = 'customer';
end $$;

-- row level security
alter table public.roles enable row level security; alter table public.invites enable row level security; alter table public.company enable row level security;
alter table public.activity enable row level security; alter table public.counters enable row level security; alter table public.parties enable row level security;
alter table public.ledgers enable row level security; alter table public.orders enable row level security; alter table public.deliveries enable row level security;
alter table public.invoices enable row level security; alter table public.contracts enable row level security; alter table public.vouchers enable row level security;
alter table public.offer_sends enable row level security;

-- staff: full access to business tables (fine-grained permissions are enforced by the app on every page and action)
do $$ declare t text; begin
  foreach t in array array['roles','invites','activity','parties','ledgers','orders','deliveries','invoices','contracts','vouchers','offer_sends','company'] loop
    execute format('drop policy if exists "staff all %1$s" on public.%1$s', t);
    execute format('create policy "staff all %1$s" on public.%1$s for all using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- everyone signed in can read company details (printed on invoices)
drop policy if exists "read company" on public.company; create policy "read company" on public.company for select using (true);
-- customers: only their own records
drop policy if exists "customer own party" on public.parties; create policy "customer own party" on public.parties for select using (profile_id = auth.uid());
drop policy if exists "customer creates party" on public.parties; create policy "customer creates party" on public.parties for insert with check (profile_id = auth.uid() and type = 'customer');
drop policy if exists "customer updates party" on public.parties; create policy "customer updates party" on public.parties for update using (profile_id = auth.uid()) with check (profile_id = auth.uid() and type = 'customer');
drop policy if exists "customer orders" on public.orders; create policy "customer orders" on public.orders for select using (party_id in (select my_party_ids()));
drop policy if exists "customer deliveries" on public.deliveries; create policy "customer deliveries" on public.deliveries for select using (order_id in (select id from orders where party_id in (select my_party_ids())));
drop policy if exists "customer invoices" on public.invoices; create policy "customer invoices" on public.invoices for select using (kind = 'sale' and party_id in (select my_party_ids()));
drop policy if exists "customer contracts" on public.contracts; create policy "customer contracts" on public.contracts for select using (status <> 'draft' and party_id in (select my_party_ids()));
drop policy if exists "customer vouchers" on public.vouchers; create policy "customer vouchers" on public.vouchers for select using (party_id in (select my_party_ids()) and type in ('sales','receipt'));

-- phase 1 policies: owner-only -> any staff
drop policy if exists "own profile" on public.profiles; create policy "own profile" on public.profiles for select using (id = auth.uid() or is_staff());
drop policy if exists "owner updates profiles" on public.profiles; create policy "staff updates profiles" on public.profiles for update using (is_staff());
drop policy if exists "staff inserts profiles" on public.profiles; create policy "staff inserts profiles" on public.profiles for insert with check (is_staff());
drop policy if exists "owner manages materials" on public.materials; create policy "staff manages materials" on public.materials for all using (is_staff()) with check (is_staff());
drop policy if exists "customer reads own enquiries" on public.enquiries; create policy "customer reads own enquiries" on public.enquiries for select using (customer_id = auth.uid() or is_staff());
drop policy if exists "owner updates enquiries" on public.enquiries; create policy "staff updates enquiries" on public.enquiries for update using (is_staff());
drop policy if exists "items follow enquiry" on public.enquiry_items; create policy "items follow enquiry" on public.enquiry_items for select using (exists(select 1 from enquiries e where e.id = enquiry_id and (e.customer_id = auth.uid() or is_staff())));
drop policy if exists "owner manages offers" on public.offers; create policy "staff manages offers" on public.offers for all using (is_staff()) with check (is_staff());

-- starting data
insert into public.company (id, name, state_code, address, invoice_prefix) values ('main', 'B2 All Commo Trade Pvt. Ltd.', '22', 'Raigarh, Chhattisgarh', 'B2A') on conflict (id) do nothing;
insert into public.ledgers (name, grp) values ('Sales','Sales Accounts'),('Purchase','Purchase Accounts'),('Output CGST','Duties & Taxes'),('Output SGST','Duties & Taxes'),('Output IGST','Duties & Taxes'),
 ('Input CGST','Duties & Taxes'),('Input SGST','Duties & Taxes'),('Input IGST','Duties & Taxes'),('Bank','Bank Accounts'),('Cash','Cash-in-Hand'),('Freight','Direct Expenses'),('Office expenses','Indirect Expenses'),('Capital','Capital Account')
 on conflict (name) do nothing;
insert into public.roles (name, perms) select * from (values
 ('Finance manager', '{"crm":["view","export"],"sales":["view","create","edit","export"],"purchase":["view","create","edit","export"],"inventory":["view","create","edit","export"],"accounts":["view","create","edit","export"],"admin":["view"]}'::jsonb),
 ('Accounts clerk', '{"sales":["view","create"],"purchase":["view","create"],"inventory":["view"],"accounts":["view","create","export"]}'::jsonb),
 ('Sales executive', '{"crm":["view","create","edit"],"sales":["view","create"],"inventory":["view"]}'::jsonb),
 ('Store and dispatch', '{"sales":["view"],"purchase":["view"],"inventory":["view","create"]}'::jsonb),
 ('Viewer', '{"crm":["view"],"sales":["view"],"purchase":["view"],"inventory":["view"],"accounts":["view"]}'::jsonb)) v(name, perms)
 where not exists (select 1 from public.roles);
update public.materials set hsn = case when name ilike '%coal%' then '2701' when name ilike 'iron ore%' then '2601' when name ilike 'ferro%' or name ilike 'silico%' then '7202' when name ilike '%scrap%' then '7204' when name = 'Limestone' then '2521' when name = 'Dolomite' then '2518' else hsn end,
  gst_rate = case when name in ('Iron ore fines','Limestone','Dolomite') then 5 else 18 end where hsn = '';
insert into public.parties (name, type, phone, city, profile_id, credit_days)
  select coalesce(nullif(p.company,''), p.name), 'customer', p.phone, p.city, p.id, 15 from public.profiles p
  where p.role = 'customer' and not exists (select 1 from public.parties x where x.profile_id = p.id);
