-- B2All 008: customers see a full statement of account (invoices, payments and credit notes) and the bank details to pay.
-- Additive only. Run once in the SQL Editor after 007.
begin;
set local lock_timeout = '5s';
drop policy if exists "customer vouchers" on public.vouchers;
create policy "customer vouchers" on public.vouchers for select using (party_id in (select public.my_party_ids()) and type in ('sales','receipt','credit_note'));
create or replace function public.public_contact() returns jsonb language sql security definer stable set search_path = '' as $$
  select jsonb_build_object('whatsapp', whatsapp, 'phone', phone, 'email', email, 'name', name, 'bank', bank) from public.company where id = 'main'
$$;
revoke all on function public.public_contact() from public;
grant execute on function public.public_contact() to anon, authenticated;
notify pgrst, 'reload schema';
commit;
-- Check (run after): should be true
-- select (public_contact() ? 'bank') as bank_on_statement;
