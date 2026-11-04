-- Additive upgrade after 004_fixes.sql. No historical postings are rewritten.
-- Review preflight in docs/ERP_AUDIT.md before applying to production.
begin;
set local lock_timeout = '5s';
do $$ begin
  if to_regprocedure('public.can_any(text[])') is null or to_regprocedure('public.guard_profile_changes()') is null then
    raise exception 'STOP: expected ERP security baseline (003 and 004) is missing. Do not rerun old setup files; request an upgrade plan.';
  end if;
end $$;
alter table public.invoices add column if not exists delivery_quantities jsonb,
  add column if not exists request_id uuid, add column if not exists company_snapshot jsonb, add column if not exists party_snapshot jsonb, add column if not exists material_snapshot jsonb;
create unique index if not exists invoice_request_unique on public.invoices(request_id) where request_id is not null;
alter table public.invoices drop constraint if exists invoices_kind_party_id_number_key;
create unique index if not exists invoice_supplier_fy_unique on public.invoices
  (kind, party_id, upper(btrim(number)), (extract(year from date)::int - case when extract(month from date) < 4 then 1 else 0 end));

-- Definer is necessary because direct invoice writes are disabled. Authorization is checked
-- inside this function, before reading any business records; no actor name/amount/tax is trusted.
create or replace function public.post_matched_invoice(input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders; p public.parties; m public.materials; co public.company; inv public.invoices;
  d public.deliveries; rid uuid; lid uuid; pl uuid; vid uuid; billdate date; fy int;
  actor text; bill text; vnum text; prefix text; state text; item text; nm text;
  allocation jsonb := '{}'; entries jsonb := '[]'; val numeric; used numeric; qty numeric := 0;
  rate numeric; taxable numeric; tax numeric; cg numeric := 0; sg numeric := 0; ig numeric := 0;
  linevalue numeric; total numeric; ids jsonb; req uuid; idx int;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'Staff sign-in required'; end if;
  select * into o from public.orders where id = (input->>'order_id')::uuid;
  if o.id is null then raise exception 'Order not found'; end if;
  if not public.can_any(array[case when o.kind = 'sale' then 'sales.create' else 'purchase.create' end]) then raise exception 'Not allowed to post this kind of bill'; end if;
  req := (input->>'request_id')::uuid;
  if req is null then raise exception 'Refresh the form before posting'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text, 0));
  select * into inv from public.invoices where request_id = req;
  if inv.id is not null then
    if inv.order_id <> o.id then raise exception 'This submission was used for another order'; end if;
    return to_jsonb(inv);
  end if;
  -- Serialize allocation of the same receipt across concurrent users.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(o.id::text, 1));
  select * into p from public.parties where id = o.party_id;
  select * into m from public.materials where id = o.material_id;
  select * into co from public.company where id = 'main';
  if co.id is null then raise exception 'Save company billing details first'; end if;
  state := coalesce(nullif(p.state_code,''), substring(p.gstin from '^([0-9]{2})'));
  if state is null or co.state_code !~ '^[0-9]{2}$' or state !~ '^[0-9]{2}$' then raise exception 'Set company and party states before calculating GST'; end if;
  billdate := (input->>'date')::date;
  if billdate is null then raise exception 'Bill date is required'; end if;
  fy := extract(year from billdate)::int - case when extract(month from billdate) < 4 then 1 else 0 end;
  rate := coalesce((input->>'rate')::numeric, o.rate);
  if rate < 0 or rate::text in ('NaN','Infinity','-Infinity') or rate > 1000000000 then raise exception 'Invalid bill rate'; end if;
  if m.gst_rate < 0 or m.gst_rate > 100 then raise exception 'Invalid material GST rate'; end if;
  ids := input->'delivery_ids';
  if jsonb_typeof(ids) <> 'array' or jsonb_array_length(ids) = 0 then raise exception 'Select receipts or dispatches to bill'; end if;
  for item in select jsonb_array_elements_text(ids) loop
    rid := item::uuid;
    if allocation ? item then raise exception 'A receipt was selected twice'; end if;
    select * into d from public.deliveries where id = rid and order_id = o.id;
    if d.id is null then raise exception 'Selected receipt does not belong to this order'; end if;
    select coalesce(sum(case when i.delivery_quantities ? item then (i.delivery_quantities->>item)::numeric
      when i.delivery_ids ? item then d.qty else 0 end),0) into used
      from public.invoices i where i.order_id = o.id;
    val := coalesce((input->'delivery_quantities'->>item)::numeric, d.qty-used);
    if val <= 0 or val::text in ('NaN','Infinity','-Infinity') or round(val,3) <> val or val > d.qty-used then
      raise exception 'Receipt % has only % left to bill. Refresh and check the quantity.', d.bill_no, d.qty-used;
    end if;
    allocation := allocation || jsonb_build_object(item,val);
    qty := qty + val;
  end loop;
  taxable := round(qty*rate,2); tax := round(taxable*m.gst_rate/100,2); total := taxable+tax;
  if input->>'bill_total' is not null and ((input->>'bill_total')::numeric::text in ('NaN','Infinity','-Infinity') or abs(round((input->>'bill_total')::numeric,2)-total)>0.01) then raise exception 'Printed bill total does not match quantities, rate and GST. Check charges or deductions before posting.'; end if;
  if total <= 0 then raise exception 'Bill total must be positive'; end if;
  if state = co.state_code then cg := round(tax/2,2); sg := tax-cg; else ig := tax; end if;
  if o.kind = 'purchase' then
    bill := btrim(input->>'supplier_bill_no');
    if bill is null or length(bill) = 0 or length(bill) > 100 then raise exception 'Enter the supplier bill number (up to 100 characters)'; end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p.id::text || upper(bill) || fy::text,2));
    if exists(select 1 from public.invoices i where i.kind = 'purchase' and i.party_id = p.id and upper(btrim(i.number)) = upper(bill)
      and extract(year from i.date)::int - case when extract(month from i.date)<4 then 1 else 0 end = fy) then raise exception 'This supplier bill is already entered for this financial year'; end if;
    vnum := 'PUR/' || fy || '-' || right((fy+1)::text,2) || '/' || lpad(public.next_number('vpurchase-' || fy || '-' || right((fy+1)::text,2))::text,4,'0');
  else
    bill := coalesce(nullif(co.invoice_prefix,''),'INV') || '/' || fy || '-' || right((fy+1)::text,2) || '/' || lpad(public.next_number('inv-' || fy || '-' || right((fy+1)::text,2))::text,4,'0');
    vnum := bill;
  end if;
  select name into actor from public.profiles where id = auth.uid();
  select id into pl from public.ledgers where party_id = p.id order by created_at limit 1;
  if pl is null then
    insert into public.ledgers(name,grp,party_id) values (p.name || ' [' || p.id::text || ']',case when p.type='customer' then 'Sundry Debtors' else 'Sundry Creditors' end,p.id) returning id into pl;
  end if;
  entries := jsonb_build_array(jsonb_build_object('ledger_id',pl,'dr',case when o.kind='sale' then total else 0 end,'cr',case when o.kind='purchase' then total else 0 end));
  prefix := case when o.kind='sale' then 'Output ' else 'Input ' end;
  for idx in 1..4 loop
    nm := case idx when 1 then case when o.kind='sale' then 'Sales' else 'Purchase' end when 2 then prefix || 'CGST' when 3 then prefix || 'SGST' else prefix || 'IGST' end;
    linevalue := case idx when 1 then taxable when 2 then cg when 3 then sg else ig end;
    if linevalue = 0 then continue; end if;
    insert into public.ledgers(name,grp) values(nm,case when idx=1 then case when o.kind='sale' then 'Sales Accounts' else 'Purchase Accounts' end else 'Duties & Taxes' end) on conflict(name) do nothing;
    select id into lid from public.ledgers where name=nm;
    entries := entries || jsonb_build_array(jsonb_build_object('ledger_id',lid,'dr',case when o.kind='purchase' then linevalue else 0 end,'cr',case when o.kind='sale' then linevalue else 0 end));
  end loop;
  insert into public.invoices(number,kind,party_id,order_id,date,due_date,material_id,qty,rate,gst_rate,taxable,cgst,sgst,igst,total,delivery_ids,delivery_quantities,place_of_supply,request_id,company_snapshot,party_snapshot,material_snapshot)
    values(bill,o.kind,p.id,o.id,billdate,billdate+p.credit_days,m.id,qty,rate,m.gst_rate,taxable,cg,sg,ig,total,ids,allocation,case when o.kind='sale' then state else co.state_code end,req,to_jsonb(co),to_jsonb(p),jsonb_build_object('name',m.name,'hsn',m.hsn,'unit',m.unit)) returning * into inv;
  insert into public.vouchers(number,type,date,party_id,invoice_id,narration,entries,amount,created_by)
    values(vnum,case when o.kind='sale' then 'sales' else 'purchase' end,billdate,p.id,inv.id,o.number || ' · ' || qty || ' ' || m.unit || ' ' || m.name,entries,total,actor) returning id into vid;
  update public.invoices set voucher_id=vid where id=inv.id returning * into inv;
  insert into public.activity(by_name,what) values(actor,'Posted matched bill ' || bill || ' for ' || total);
  return to_jsonb(inv);
end $$;
revoke all on function public.post_matched_invoice(jsonb) from public, anon;
grant execute on function public.post_matched_invoice(jsonb) to authenticated;
-- Every invoice must have a matching journal; client applications cannot bypass the transaction.
revoke insert, update, delete on public.invoices from authenticated, anon;

-- Protect journal integrity even if a caller bypasses the application form.
create or replace function public.validate_voucher() returns trigger language plpgsql set search_path='' as $$
declare e jsonb; debit numeric:=0; credit numeric:=0; dr numeric; cr numeric;
begin
  if tg_op='DELETE' then raise exception 'Posted vouchers cannot be deleted; use a reversal entry'; end if;
  if tg_op='UPDATE' then
    if (to_jsonb(new)-'tally_exported') is distinct from (to_jsonb(old)-'tally_exported') then raise exception 'Posted vouchers are immutable; use a reversal entry'; end if;
    return new;
  end if;
  if current_user in ('authenticated','anon') and not public.can_any(array[case new.type when 'sales' then 'sales.create' when 'purchase' then 'purchase.create' else 'accounts.create' end]) then raise exception 'Not allowed to post this voucher type'; end if;
  if jsonb_typeof(new.entries)<>'array' or jsonb_array_length(new.entries)<2 then raise exception 'A voucher needs at least two entries'; end if;
  for e in select jsonb_array_elements(new.entries) loop
    dr := (e->>'dr')::numeric; cr := (e->>'cr')::numeric;
    if dr is null or cr is null or dr::text in ('NaN','Infinity','-Infinity') or cr::text in ('NaN','Infinity','-Infinity') or dr<0 or cr<0 or (dr>0 and cr>0) or round(dr,2)<>dr or round(cr,2)<>cr then raise exception 'Invalid debit or credit'; end if;
    if not exists(select 1 from public.ledgers where id=(e->>'ledger_id')::uuid) then raise exception 'Ledger not found'; end if;
    debit:=debit+dr; credit:=credit+cr;
  end loop;
  if debit<=0 or debit<>credit or new.amount<>debit then raise exception 'Voucher is not balanced'; end if;
  if new.invoice_id is not null and not exists(select 1 from public.invoices i where i.id=new.invoice_id and i.party_id=new.party_id and
    ((new.type in ('receipt','sales') and i.kind='sale') or (new.type in ('payment','purchase') and i.kind='purchase'))) then raise exception 'Invoice, party and voucher direction do not match'; end if;
  return new;
end $$;
drop trigger if exists validate_voucher on public.vouchers;
create trigger validate_voucher before insert or update or delete on public.vouchers for each row execute function public.validate_voucher();

-- Read permissions follow the module, including when querying the REST API directly.
drop policy "staff read orders" on public.orders;
create policy "staff read orders" on public.orders for select using (public.can_any(case when kind='sale' then array['sales.view','accounts.view','inventory.view'] else array['purchase.view','accounts.view','inventory.view'] end));
drop policy "staff read invoices" on public.invoices;
create policy "staff read invoices" on public.invoices for select using (public.can_any(case when kind='sale' then array['sales.view','accounts.view'] else array['purchase.view','accounts.view'] end));
drop policy "staff read vouchers" on public.vouchers;
create policy "staff read vouchers" on public.vouchers for select using (public.can_any(case when type in ('sales','receipt') then array['accounts.view','sales.view'] when type in ('purchase','payment') then array['accounts.view','purchase.view'] else array['accounts.view'] end));
drop policy "staff read contracts" on public.contracts;
create policy "staff read contracts" on public.contracts for select using (public.can_any(array['sales.view']));
drop policy "staff insert orders" on public.orders;
create policy "staff insert orders" on public.orders for insert with check (public.can_any(array[case when kind='sale' then 'sales.create' else 'purchase.create' end]));
drop policy "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update using (public.can_any(array[case when kind='sale' then 'sales.edit' else 'purchase.edit' end])) with check (public.can_any(array[case when kind='sale' then 'sales.edit' else 'purchase.edit' end]));
-- The existing trigger guards role changes. Self-referencing profile policies recurse.
drop policy "update own profile (not role)" on public.profiles;
create policy "update own profile (not role)" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

create or replace function public.sign_contract(cid uuid, signer text, ip text) returns void language plpgsql security definer set search_path = '' as $$
declare c public.contracts;
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  select * into c from public.contracts where id=cid for update;
  if c.id is null or c.status<>'sent' or not exists(select 1 from public.parties where id=c.party_id and profile_id=auth.uid()) then raise exception 'Cannot sign this contract'; end if;
  if length(btrim(signer))<3 then raise exception 'Full name required'; end if;
  update public.contracts set status='signed',signed_at=now(),signed_name=btrim(signer),signed_ip=left(ip,100),doc_hash=encode(extensions.digest(c.body,'sha256'),'hex') where id=cid;
  insert into public.activity(by_name,what) values(btrim(signer),'Acknowledged contract ' || c.number);
end $$;
create or replace function public.guard_signed_contract() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and current_user in ('authenticated','anon') and new.status='signed' then raise exception 'Use verified customer acknowledgement'; end if;
  if old.status='signed' then raise exception 'Signed documents are immutable; issue a new contract'; end if;
  if tg_op='DELETE' then return old; end if;
  if old.status='sent' and new.body is distinct from old.body then raise exception 'Withdraw the contract before editing'; end if;
  return new;
end $$;
drop trigger if exists guard_signed_contract on public.contracts;
create trigger guard_signed_contract before update or delete on public.contracts for each row execute function public.guard_signed_contract();

create or replace function public.guard_party_terms() returns trigger language plpgsql set search_path='' as $$
begin
  if not public.is_staff() then
    if new.credit_days <> 15 or (tg_op='UPDATE' and (new.credit_days<>old.credit_days or new.profile_id is distinct from old.profile_id or new.type<>old.type)) then raise exception 'Only B2All staff can change credit terms or ownership'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_party_terms on public.parties;
create trigger guard_party_terms before insert or update on public.parties for each row execute function public.guard_party_terms();

alter table public.vouchers add column if not exists request_id uuid;
create unique index if not exists voucher_request_unique on public.vouchers(request_id) where request_id is not null;
create or replace function public.post_balanced_voucher(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.vouchers; req uuid; typ text; dt date; f int; amount numeric; actor text; prefix text; bill public.invoices; paid numeric;
begin
  if auth.uid() is null or not public.can_any(array['accounts.create']) then raise exception 'Accounting permission required'; end if;
  typ:=input->>'type';
  if typ not in ('receipt','payment','journal','contra') then raise exception 'Use bill matching to post sales or purchases'; end if;
  req:=(input->>'request_id')::uuid;
  if req is null then raise exception 'Refresh the voucher form'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text,3));
  select * into v from public.vouchers where request_id=req;
  if v.id is not null then return to_jsonb(v); end if;
  dt:=(input->>'date')::date;
  if dt is null then raise exception 'Enter a voucher date'; end if;
  select sum((e->>'dr')::numeric) into amount from jsonb_array_elements(input->'entries') e;
  if input->>'invoice_id' is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(input->>'invoice_id',4));
    select * into bill from public.invoices where id=(input->>'invoice_id')::uuid;
    if bill.id is null or bill.party_id is distinct from (input->>'party_id')::uuid or not ((typ='receipt' and bill.kind='sale') or (typ='payment' and bill.kind='purchase')) then raise exception 'Invoice, party and payment direction do not match'; end if;
    select coalesce(sum(vv.amount),0) into paid from public.vouchers vv where vv.invoice_id=bill.id and vv.type in ('receipt','payment');
    if amount>bill.total-paid then raise exception 'This exceeds the bill balance. Record any advance separately on account.'; end if;
  end if;
  f:=extract(year from dt)::int-case when extract(month from dt)<4 then 1 else 0 end;
  prefix:=case typ when 'receipt' then 'RCT' when 'payment' then 'PMT' when 'journal' then 'JRN' else 'CNT' end;
  select name into actor from public.profiles where id=auth.uid();
  insert into public.vouchers(number,type,date,party_id,invoice_id,narration,entries,amount,created_by,request_id)
    values(prefix || '/' || f || '-' || right((f+1)::text,2) || '/' || lpad(public.next_number('v' || typ || '-' || f || '-' || right((f+1)::text,2))::text,4,'0'),typ,dt,(input->>'party_id')::uuid,(input->>'invoice_id')::uuid,left(coalesce(input->>'narration',''),5000),input->'entries',amount,actor,req) returning * into v;
  insert into public.activity(by_name,what) values(actor,'Posted ' || typ || ' voucher ' || v.number || ' for ' || amount);
  return to_jsonb(v);
end $$;
revoke all on function public.post_balanced_voucher(jsonb) from public,anon;
grant execute on function public.post_balanced_voucher(jsonb) to authenticated;
revoke insert,delete on public.vouchers from authenticated,anon;
notify pgrst, 'reload schema';
commit;
