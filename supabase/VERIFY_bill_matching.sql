-- READ ONLY. Run after the migration succeeds.
select to_regprocedure('public.post_matched_invoice(jsonb)') is not null as bill_posting_ready,
 to_regprocedure('public.post_balanced_voucher(jsonb)') is not null as voucher_posting_ready;
select column_name,data_type from information_schema.columns
where table_schema='public' and table_name='invoices'
and column_name in ('delivery_quantities','request_id','company_snapshot','party_snapshot','material_snapshot')
order by column_name;
-- All must be false: direct API inserts must use the authorized transactional functions.
select has_table_privilege('authenticated','public.invoices','INSERT') as direct_invoice_insert,
 has_table_privilege('authenticated','public.vouchers','INSERT') as direct_voucher_insert,
 has_function_privilege('anon','public.post_matched_invoice(jsonb)','EXECUTE') as anonymous_bill_posting,
 has_function_privilege('anon','public.post_balanced_voucher(jsonb)','EXECUTE') as anonymous_voucher_posting;
select 'invoices' as table_name,count(*) from public.invoices
union all select 'vouchers',count(*) from public.vouchers
union all select 'deliveries',count(*) from public.deliveries;
