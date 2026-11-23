-- B2All 007: offers on the website. Customers see offers made for them (and offers published for everyone),
-- and can attach an offer to an enquiry. Additive only. Run once in the SQL Editor after 006.
begin;
set local lock_timeout = '5s';

-- 1. Which offer an enquiry came from
alter table public.enquiries add column if not exists offer_id uuid references public.offers(id) on delete set null;

-- 2. A signed-in customer can read offers sent to them, and offers published on the website for everyone
drop policy if exists "customer reads own offers" on public.offers;
create policy "customer reads own offers" on public.offers for select using (
  channel = 'website' or exists (select 1 from public.offer_sends s where s.offer_id = offers.id and s.party_id in (select public.my_party_ids())));
drop policy if exists "customer reads own offer_sends" on public.offer_sends;
create policy "customer reads own offer_sends" on public.offer_sends for select using (party_id in (select public.my_party_ids()));

-- 3. Visitors who are not signed in see only live website-wide offers, and only these fields
create or replace function public.public_offers() returns jsonb language sql security definer stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'title', o.title, 'body', o.body, 'code', o.code, 'discount', o.discount, 'material_id', o.material_id, 'valid_till', o.valid_till) order by o.created_at desc), '[]'::jsonb)
  from public.offers o where o.channel = 'website' and (o.valid_till is null or o.valid_till >= current_date)
$$;
revoke all on function public.public_offers() from public;
grant execute on function public.public_offers() to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Check (run after): both should be true
-- select exists(select 1 from information_schema.columns where table_name='enquiries' and column_name='offer_id') as enquiry_offer,
--   to_regprocedure('public.public_offers()') is not null as website_offers;
