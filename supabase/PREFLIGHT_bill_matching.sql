-- READ ONLY. Run in the B2All project SQL Editor before the upgrade.
-- Query 1: every baseline flag must be true.
select to_regclass('public.orders') is not null as orders_present,
 to_regclass('public.deliveries') is not null as deliveries_present,
 to_regclass('public.invoices') is not null as invoices_present,
 to_regclass('public.vouchers') is not null as vouchers_present,
 to_regprocedure('public.can_any(text[])') is not null as security_003_present,
 to_regprocedure('public.guard_profile_changes()') is not null as security_004_present,
 to_regprocedure('extensions.digest(text,text)') is not null as contract_hash_function_present;
-- Query 2: should return zero rows. Do not delete or renumber duplicates automatically.
select kind,party_id,upper(btrim(number)) as bill_number,
 extract(year from date)::int-case when extract(month from date)<4 then 1 else 0 end as financial_year,count(*)
from public.invoices group by 1,2,3,4 having count(*)>1;
-- Query 3: should return zero rows. These are old incomplete accounting records, not new demo records.
select i.id,i.number,i.voucher_id,i.total,v.amount
from public.invoices i left join public.vouchers v on v.id=i.voucher_id
where v.id is null or v.invoice_id is distinct from i.id or v.amount<>i.total;
-- Query 4: record these counts for comparison after migration. Counts must not change.
select 'invoices' as table_name,count(*) from public.invoices
union all select 'vouchers',count(*) from public.vouchers
union all select 'deliveries',count(*) from public.deliveries;

-- Query 5: should return zero rows. Invalid source values require accountant review.
select 'party_credit_days' as issue,id::text as record_id from public.parties where credit_days<0 or credit_days>365
union all select 'material_gst_rate',id::text from public.materials where gst_rate<0 or gst_rate>100 or gst_rate::text in ('NaN','Infinity','-Infinity');
