-- B2All 006: Tally-parity accounting (credit/debit notes, period lock, bank reconciliation, permanent edit log)
-- and customer targeting for offers. Additive only: no data is changed or deleted. Run once in the SQL Editor.
begin;
set local lock_timeout = '5s';
do $$ begin
  if to_regprocedure('public.post_balanced_voucher(jsonb)') is null then
    raise exception 'STOP: run the bill matching update (20261102142325_bill_matching.sql) first.';
  end if;
end $$;

-- 1. New voucher types: Credit Note (Ctrl+F8) and Debit Note (Ctrl+F9), as in Tally
alter table public.vouchers drop constraint if exists vouchers_type_check;
alter table public.vouchers add constraint vouchers_type_check check (type in ('sales','purchase','receipt','payment','journal','contra','credit_note','debit_note'));

-- 2. Company settings: books lock date (like Tally's "disallow edit before"), WhatsApp number
alter table public.company add column if not exists books_locked_till date,
  add column if not exists whatsapp text not null default '';

-- 3. Ledger masters can carry GSTIN and an alias (Tally fields)
alter table public.ledgers add column if not exists gstin text, add column if not exists alias text;

-- 4. Customer persona: tags and notes, WhatsApp number if different from phone
alter table public.parties add column if not exists tags text[] not null default '{}',
  add column if not exists notes text, add column if not exists whatsapp text;

-- 5. Offers remember who they were aimed at
alter table public.offers add column if not exists discount text, add column if not exists material_id uuid references public.materials(id),
  add column if not exists audience jsonb, add column if not exists channel text;

-- 6. Bank reconciliation: the date each bank entry actually cleared in the bank statement
create table if not exists public.bank_reco (
  id uuid primary key default gen_random_uuid(), voucher_id uuid not null references public.vouchers(id), ledger_id uuid not null references public.ledgers(id),
  bank_date date not null, statement_ref text, created_by text not null default '', created_at timestamptz not null default now(), unique (voucher_id, ledger_id));
alter table public.bank_reco enable row level security;
drop policy if exists "staff read bank_reco" on public.bank_reco;
create policy "staff read bank_reco" on public.bank_reco for select using (public.can_any(array['accounts.view']));
drop policy if exists "staff write bank_reco" on public.bank_reco;
create policy "staff write bank_reco" on public.bank_reco for insert with check (public.can_any(array['accounts.create','accounts.edit']));
drop policy if exists "staff update bank_reco" on public.bank_reco;
create policy "staff update bank_reco" on public.bank_reco for update using (public.can_any(array['accounts.create','accounts.edit']));
drop policy if exists "staff delete bank_reco" on public.bank_reco;
create policy "staff delete bank_reco" on public.bank_reco for delete using (public.can_any(array['accounts.edit']));
grant select, insert, update, delete on public.bank_reco to authenticated;

-- 7. Edit log (MCA audit trail rule, 1 April 2023): every insert, change and delete on accounting and trade records,
--    with who, when, before and after. It cannot be switched off, edited or deleted, even by the owner.
create table if not exists public.audit_log (
  id bigserial primary key, at timestamptz not null default now(), actor uuid, actor_name text, table_name text not null,
  row_id text, action text not null, old_row jsonb, new_row jsonb);
alter table public.audit_log enable row level security;
drop policy if exists "staff read audit_log" on public.audit_log;
create policy "staff read audit_log" on public.audit_log for select using (public.can_any(array['accounts.view','admin.view']));
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare nm text; r jsonb;
begin
  select name into nm from public.profiles where id = auth.uid();
  r := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log(actor, actor_name, table_name, row_id, action, old_row, new_row)
  values (auth.uid(), coalesce(nm, current_user::text), tg_table_name, coalesce(r->>'id',''), lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;
revoke all on function public.audit_row() from public, anon, authenticated;

create or replace function public.audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'The edit log is permanent and cannot be changed or deleted'; end $$;
drop trigger if exists audit_immutable on public.audit_log;
create trigger audit_immutable before update or delete on public.audit_log for each row execute function public.audit_immutable();
drop trigger if exists audit_no_truncate on public.audit_log;
create trigger audit_no_truncate before truncate on public.audit_log for each statement execute function public.audit_immutable();

do $$ declare t text; begin
  foreach t in array array['company','ledgers','parties','materials','orders','deliveries','invoices','vouchers','contracts','bank_reco','roles'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.audit_row()', t);
  end loop;
end $$;

-- 8. Voucher guard: adds the books lock and the credit/debit note directions. Everything else is unchanged.
create or replace function public.validate_voucher() returns trigger language plpgsql set search_path='' as $$
declare e jsonb; debit numeric:=0; credit numeric:=0; dr numeric; cr numeric; lockd date;
begin
  if tg_op='DELETE' then raise exception 'Posted vouchers cannot be deleted; use a reversal entry'; end if;
  if tg_op='UPDATE' then
    if (to_jsonb(new)-'tally_exported') is distinct from (to_jsonb(old)-'tally_exported') then raise exception 'Posted vouchers are immutable; use a reversal entry'; end if;
    return new;
  end if;
  select books_locked_till into lockd from public.company where id='main';
  if lockd is not null and new.date <= lockd then raise exception 'Books are locked up to %. Ask the owner to unlock that period first.', to_char(lockd,'DD Mon YYYY'); end if;
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
    ((new.type in ('receipt','sales','credit_note') and i.kind='sale') or (new.type in ('payment','purchase','debit_note') and i.kind='purchase'))) then raise exception 'Invoice, party and voucher direction do not match'; end if;
  return new;
end $$;

-- 9. Posting function: accepts credit and debit notes; a note or payment can never exceed what is left on the bill.
create or replace function public.post_balanced_voucher(input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.vouchers; req uuid; typ text; dt date; f int; amount numeric; actor text; prefix text; bill public.invoices; paid numeric;
begin
  if auth.uid() is null or not public.can_any(array['accounts.create']) then raise exception 'Accounting permission required'; end if;
  typ:=input->>'type';
  if typ not in ('receipt','payment','journal','contra','credit_note','debit_note') then raise exception 'Use bill matching to post sales or purchases'; end if;
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
    if bill.id is null or bill.party_id is distinct from (input->>'party_id')::uuid or not ((typ in ('receipt','credit_note') and bill.kind='sale') or (typ in ('payment','debit_note') and bill.kind='purchase')) then raise exception 'Invoice, party and voucher direction do not match'; end if;
    select coalesce(sum(vv.amount),0) into paid from public.vouchers vv where vv.invoice_id=bill.id and vv.type in ('receipt','payment','credit_note','debit_note');
    if amount>bill.total-paid then raise exception 'This exceeds the bill balance. Record any advance separately on account.'; end if;
  end if;
  f:=extract(year from dt)::int-case when extract(month from dt)<4 then 1 else 0 end;
  prefix:=case typ when 'receipt' then 'RCT' when 'payment' then 'PMT' when 'journal' then 'JRN' when 'credit_note' then 'CRN' when 'debit_note' then 'DBN' else 'CNT' end;
  select name into actor from public.profiles where id=auth.uid();
  insert into public.vouchers(number,type,date,party_id,invoice_id,narration,entries,amount,created_by,request_id)
    values(prefix || '/' || f || '-' || right((f+1)::text,2) || '/' || lpad(public.next_number('v' || typ || '-' || f || '-' || right((f+1)::text,2))::text,4,'0'),typ,dt,(input->>'party_id')::uuid,(input->>'invoice_id')::uuid,left(coalesce(input->>'narration',''),5000),input->'entries',amount,actor,req) returning * into v;
  insert into public.activity(by_name,what) values(actor,'Posted ' || replace(typ,'_',' ') || ' voucher ' || v.number || ' for ' || amount);
  return to_jsonb(v);
end $$;
revoke all on function public.post_balanced_voucher(jsonb) from public,anon;
grant execute on function public.post_balanced_voucher(jsonb) to authenticated;

-- 10. The public website shows only the company's contact numbers (for the WhatsApp chat button). Nothing else is exposed.
create or replace function public.public_contact() returns jsonb language sql security definer stable set search_path = '' as $$
  select jsonb_build_object('whatsapp', whatsapp, 'phone', phone, 'email', email, 'name', name) from public.company where id = 'main'
$$;
revoke all on function public.public_contact() from public;
grant execute on function public.public_contact() to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Check (run after): all three should be true
-- select to_regclass('public.audit_log') is not null as edit_log, to_regclass('public.bank_reco') is not null as bank_reco,
--   exists(select 1 from information_schema.columns where table_name='company' and column_name='books_locked_till') as books_lock;
