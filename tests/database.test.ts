import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const owner='00000000-0000-0000-0000-000000000001';
test('PostgreSQL migration: partial bills, retry, rollback, authorization and immutable balanced journals',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;`);
  for(const f of ['schema.sql','002_erp.sql','003_security.sql','004_fixes.sql','migrations/20261102142325_bill_matching.sql']) {
   const sql=(await readFile(`supabase/${f}`,'utf8')).replace('create extension if not exists pgcrypto;','');
   await db.exec(sql);
  }
  await db.exec(`grant usage on schema public,auth to authenticated,anon; grant select,insert,update,delete on all tables in schema public to authenticated,anon;
   revoke insert,update,delete on public.invoices from authenticated,anon;
   insert into auth.users values('${owner}');
   insert into public.profiles(id,phone,name,role) values('${owner}','','Amit','owner');
   select set_config('test.uid','${owner}',false);`);
  const party=(await db.query<{id:string}>(`insert into parties(name,type,state_code) values('Supplier','supplier','22') returning id`)).rows[0].id;
  const material=(await db.query<{id:string}>(`select id from materials limit 1`)).rows[0].id;
  const order=(await db.query<{id:string}>(`insert into orders(number,kind,party_id,material_id,qty,rate) values('PO-TEST','purchase','${party}','${material}',25.555,5000) returning id`)).rows[0].id;
  const receipt=(await db.query<{id:string}>(`insert into deliveries(order_id,bill_no,bill_date,vehicle_no,qty,entered_by) values('${order}','GRN-1','2026-10-01','CG01AA0001',25.555,'Amit') returning id`)).rows[0].id;
  await db.exec('set role authenticated');
  const input={order_id:order,date:'2026-11-02',supplier_bill_no:'B-1',bill_total:59005.90,delivery_ids:[receipt],delivery_quantities:{[receipt]:10.001},request_id:crypto.randomUUID()};
  const post=async(payload:unknown)=>(await db.query<{invoice:{id:string;qty:number;total:number}}>('select post_matched_invoice($1::jsonb) as invoice',[JSON.stringify(payload)])).rows[0].invoice;
  const a=await post(input); assert.equal(a.qty,10.001); assert.equal(a.total,59005.90);
  assert.equal((await post(input)).id,a.id);
  await assert.rejects(()=>post({...input,request_id:crypto.randomUUID(),supplier_bill_no:'WRONG-TOTAL',bill_total:1}),/Printed bill total/);
  await assert.rejects(()=>post({...input,request_id:crypto.randomUUID(),supplier_bill_no:' b-1 '}),/already entered/);
  await assert.rejects(()=>post({...input,request_id:crypto.randomUUID(),supplier_bill_no:'B-2',delivery_quantities:{[receipt]:20}}),/only/);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from invoices')).rows[0].n,1);
  // Fault injection AFTER invoice insertion: the transaction must roll back invoice and voucher.
  await db.exec(`reset role; create function fail_activity() returns trigger language plpgsql as $$begin raise exception 'injected failure'; end$$; create trigger fail_activity before insert on activity for each row execute function fail_activity(); set role authenticated;`);
  const b={...input,request_id:crypto.randomUUID(),supplier_bill_no:'B-2',bill_total:91768.60,delivery_quantities:{[receipt]:15.554}};
  await assert.rejects(()=>post(b),/injected failure/);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from invoices')).rows[0].n,1);
  assert.equal((await db.query<{n:number}>('select count(*)::int n from vouchers')).rows[0].n,1);
  await db.exec('reset role; drop trigger fail_activity on activity; set role authenticated;');
  await post(b);
  assert.equal((await db.query<{n:number}>('select sum(qty)::float8 n from invoices')).rows[0].n,25.555);
  await assert.rejects(()=>db.exec(`update vouchers set amount=1`),/immutable/);
  await assert.rejects(()=>db.exec(`delete from vouchers`),/cannot be deleted/);
  await assert.rejects(()=>db.exec(`insert into invoices(number) values('BYPASS')`),/permission denied/);
  const bank=(await db.query<{id:string}>("select id from ledgers where name='Bank'")).rows[0].id;
  const supplierLedger=(await db.query<{id:string}>("select id from ledgers where party_id=$1",[party])).rows[0].id;
  const payment={request_id:crypto.randomUUID(),type:'payment',date:'2026-11-02',party_id:party,invoice_id:a.id,narration:'Sample settlement',entries:[{ledger_id:supplierLedger,dr:10000,cr:0},{ledger_id:bank,dr:0,cr:10000}]};
  const pay=async(p:unknown)=>(await db.query<{v:{id:string}}>('select post_balanced_voucher($1::jsonb) v',[JSON.stringify(p)])).rows[0].v;
  const paymentResult=await pay(payment); assert.equal((await pay(payment)).id,paymentResult.id);
  await assert.rejects(()=>pay({...payment,request_id:crypto.randomUUID(),entries:[{ledger_id:supplierLedger,dr:60000,cr:0},{ledger_id:bank,dr:0,cr:60000}]}),/exceeds the bill balance/);
  const snapshot=(await db.query<{co:{name:string}}>("select company_snapshot co from invoices where id=$1",[a.id])).rows[0].co;
  assert.equal(snapshot.name,'B2 All Commo Trade Pvt. Ltd.');
  await db.exec(`reset role;
    insert into auth.users values ('00000000-0000-0000-0000-000000000002');
    insert into roles(id,name,perms) values('00000000-0000-0000-0000-000000000012','Sales only','{"sales":["view","create"]}');
    insert into profiles(id,phone,name,role,staff_role_id) values('00000000-0000-0000-0000-000000000002','','Sales','staff','00000000-0000-0000-0000-000000000012');
    select set_config('test.uid','00000000-0000-0000-0000-000000000002',false); set role authenticated;`);
  assert.equal((await db.query<{n:number}>("select count(*)::int n from invoices where kind='purchase'")).rows[0].n,0);
  assert.equal((await db.query<{n:number}>("select count(*)::int n from orders where kind='purchase'")).rows[0].n,0);
  await assert.rejects(()=>post({...input,request_id:crypto.randomUUID()}),/Not allowed/);
  await db.exec("update profiles set city='Raigarh' where id=auth.uid()");
  await assert.rejects(()=>db.exec("update profiles set role='owner' where id=auth.uid()"),/Only an owner or admin/);
  await db.exec(`select set_config('test.uid','${owner}',false);select set_config('test.jwt','{"is_anonymous":true}',false)`);
  await assert.rejects(()=>db.query("select sign_contract($1::uuid,'Someone','unknown')",[crypto.randomUUID()]),/Cannot sign this contract/);
  await db.exec(`select set_config('test.uid','00000000-0000-0000-0000-000000000099',false)`);
  await assert.rejects(()=>post({...b,request_id:crypto.randomUUID()}),/Staff sign-in/);
 } finally { await db.close(); }
});

test('PostgreSQL 006: debit notes, books lock, permanent edit log, public contact', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema extensions; create role anon; create role authenticated;
     create table auth.users(id uuid primary key);
     create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
     create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;`);
    for (const f of ['schema.sql', '002_erp.sql', '003_security.sql', '004_fixes.sql', 'migrations/20261102142325_bill_matching.sql', '006_tally_offers.sql', '007_offers_portal.sql', '008_customer_statement.sql']) {
      await db.exec((await readFile(`supabase/${f}`, 'utf8')).replace('create extension if not exists pgcrypto;', ''));
    }
    // running it twice must be safe
    await db.exec((await readFile('supabase/006_tally_offers.sql', 'utf8')));
    await db.exec((await readFile('supabase/008_customer_statement.sql', 'utf8')));
    await db.exec(`grant usage on schema public,auth to authenticated,anon; grant select,insert,update,delete on all tables in schema public to authenticated,anon;
     revoke insert,update,delete on public.invoices from authenticated,anon; revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
     insert into auth.users values('${owner}'); insert into public.profiles(id,phone,name,role) values('${owner}','','Amit','owner');
     insert into company(id,name,state_code,whatsapp) values('main','B2All','22','9810000000') on conflict (id) do update set whatsapp='9810000000';
     select set_config('test.uid','${owner}',false);`);
    const party = (await db.query<{ id: string }>(`insert into parties(name,type,state_code) values('Supplier','supplier','22') returning id`)).rows[0].id;
    const ledger = (await db.query<{ id: string }>(`insert into ledgers(name,grp,party_id) values('Supplier','Sundry Creditors','${party}') returning id`)).rows[0].id;
    const purchase = (await db.query<{ id: string }>("insert into ledgers(name,grp) values('Purchase','Purchase Accounts') on conflict (name) do update set grp=excluded.grp returning id")).rows[0].id;
    await db.exec('set role authenticated');
    const pay = async (p: unknown) => (await db.query<{ v: { id: string; number: string; type: string } }>('select post_balanced_voucher($1::jsonb) v', [JSON.stringify(p)])).rows[0].v;
    const note = { request_id: crypto.randomUUID(), type: 'debit_note', date: '2026-11-05', party_id: party, narration: 'Quality', entries: [{ ledger_id: ledger, dr: 1000, cr: 0 }, { ledger_id: purchase, dr: 0, cr: 1000 }] };
    const v = await pay(note); assert.equal(v.type, 'debit_note'); assert.match(v.number, /^DBN\//);
    const log = await db.query<{ n: number }>(`select count(*)::int n from audit_log where table_name='vouchers' and row_id='${v.id}' and action='insert'`); assert.equal(log.rows[0].n, 1);
    await assert.rejects(() => db.exec('delete from audit_log'), /permission denied|permanent/);
    await db.exec("update company set books_locked_till='2026-11-30' where id='main'");
    await assert.rejects(() => pay({ ...note, request_id: crypto.randomUUID() }), /locked/);
    await db.exec('reset role');
    await assert.rejects(() => db.exec('delete from audit_log'), /permanent/);
    await assert.rejects(() => db.exec('update audit_log set actor_name=null'), /permanent/);
    await db.exec('set role anon');
    assert.equal((await db.query<{ c: { whatsapp: string } }>('select public_contact() c')).rows[0].c.whatsapp, '9810000000');
    await db.exec("reset role; insert into offers(title,body,channel,code) values('Fresh coal','Ready now','website','FRESH'),('Private','For one','whatsapp',null); set role anon");
    const pub = (await db.query<{ o: { title: string }[] }>('select public_offers() o')).rows[0].o;
    assert.deepEqual(pub.map((x) => x.title), ['Fresh coal']);
    assert.ok('bank' in (await db.query<{ c: Record<string, string> }>('select public_contact() c')).rows[0].c);
  } finally { await db.close(); }
});
