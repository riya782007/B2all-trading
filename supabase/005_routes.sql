-- B2All: PIN codes and cached road distances (OpenRouteService). Each route is fetched once and reused.
alter table public.parties add column if not exists pincode text;
alter table public.company add column if not exists pincode text not null default '';
create table if not exists public.route_cache (
  id uuid primary key default gen_random_uuid(), from_pin text not null, to_pin text not null, km numeric not null,
  created_at timestamptz not null default now(), unique (from_pin, to_pin));
alter table public.route_cache enable row level security;
drop policy if exists "staff read route_cache" on public.route_cache; create policy "staff read route_cache" on public.route_cache for select using (is_staff());
drop policy if exists "staff insert route_cache" on public.route_cache; create policy "staff insert route_cache" on public.route_cache for insert with check (is_staff());
