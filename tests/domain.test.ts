import test from 'node:test';
import assert from 'node:assert/strict';
import { r2, words, today, gstSplit, moneyProduct, validDate, fy } from '../lib/money';
import { deliveryBalance, validateAllocations } from '../lib/reconciliation';
import { tallyXml } from '../lib/tally';
import { ewayStatus } from '../lib/eway';
import { postVoucher, recordMoney, createInvoice } from '../lib/domain';
import type { Delivery, Invoice, Table, Tables } from '../lib/types';
import type { Store } from '../lib/store';
function store(): Store {
  const rows = new Map<Table, unknown[]>(); const counters = new Map<string,number>();
  const all = <T extends Table>(t:T) => (rows.get(t) ?? []) as Tables[T][];
  return {
    async all(t,m) { return structuredClone(all(t).filter(r=>!m || Object.entries(m).every(([k,v])=>r[k as keyof typeof r]===v))); },
    async one(t,id) { return all(t).find(r=>r.id===id) ?? null; },
    async insert(t,row) { const value = { id:crypto.randomUUID(),created_at:new Date().toISOString(),...row } as Tables[typeof t]; rows.set(t,[...all(t),value]); return value; },
    async update(t,id,patch) { Object.assign(all(t).find(r=>r.id===id)!,patch); },
    async remove(t,id) { rows.set(t,all(t).filter(r=>r.id!==id)); },
    async next(k) { const n=(counters.get(k) ?? 0)+1; counters.set(k,n); return n; }
  };
}
test('decimal rounding, carrying paise and Indian day boundary',()=>{
  assert.equal(r2(1.005),1.01); assert.equal(r2(-1.005),-1.01);
  assert.equal(words(99.999),'Rupees One Hundred Only');
  assert.equal(moneyProduct(12.345,6789.01),83810.33);
  assert.equal(today(new Date('2026-11-01T20:00:00Z')),'2026-11-02');
  assert.equal(fy('2026-03-31'),'2025-26'); assert.equal(fy('2026-04-01'),'2026-27');
  assert.equal(validDate('2026-02-30'),false);
  assert.deepEqual(gstSplit(0.10,5,true),{cgst:0.01,sgst:0,igst:0,total:0.11});
});
test('e-way dates use IST and invalid dates are never valid',()=>{
  assert.equal(ewayStatus('2026-11-02',Date.parse('2026-11-02T18:30:00Z')).key,'ended');
  assert.equal(ewayStatus('wrong').label,'Check date');
});
const delivery = { id:'d',bill_no:'GRN-1',qty:25.555 } as Delivery;
test('late partial bills retain exact residual quantity and support legacy invoices',()=>{
  const part={delivery_ids:['d'],delivery_quantities:{d:10.001}} as unknown as Invoice;
  assert.deepEqual(deliveryBalance(delivery,[part]),{billed:10.001,remaining:15.554});
  assert.deepEqual(validateAllocations([delivery],[part],['d'],{d:15.554}),{d:15.554});
  assert.throws(()=>validateAllocations([delivery],[part],['d'],{d:15.555}),/only/);
  assert.throws(()=>validateAllocations([delivery],[],['d','d']),/once/);
  assert.throws(()=>validateAllocations([delivery],[],['foreign']),/another order/);
  assert.throws(()=>validateAllocations([delivery],[],['d'],{d:Infinity}),/positive/);
  assert.throws(()=>validateAllocations([delivery],[],['d'],{d:1.0001}),/three/);
  assert.equal(deliveryBalance(delivery,[{delivery_ids:['d']} as Invoice]).remaining,0);
});
test('vouchers reject negative, non-finite, dual-sided, missing-ledger and unbalanced entries',async()=>{
  const s=store(); const a=await s.insert('ledgers',{name:'Bank'}), b=await s.insert('ledgers',{name:'Customer'});
  const base={type:'journal' as const,date:'2026-11-02',narration:'test'};
  for (const entries of [ [{ledger_id:a.id,dr:-10,cr:0},{ledger_id:b.id,dr:0,cr:-10}], [{ledger_id:a.id,dr:Infinity,cr:0}], [{ledger_id:a.id,dr:10,cr:10}], [{ledger_id:'missing',dr:10,cr:0}], [{ledger_id:a.id,dr:10,cr:0},{ledger_id:b.id,dr:0,cr:9}] ]) await assert.rejects(()=>postVoucher(s,'Tester',{...base,entries}));
  assert.equal((await s.all('vouchers')).length,0);
  await postVoucher(s,'Tester',{...base,entries:[{ledger_id:a.id,dr:10,cr:0},{ledger_id:b.id,dr:0,cr:10}]});
  assert.equal((await s.all('vouchers')).length,1);
});
test('payments cannot settle another supplier or wrong direction',async()=>{
  const s=store(); const p=await s.insert('parties',{name:'A',type:'supplier'});
  const i=await s.insert('invoices',{party_id:'B',kind:'purchase'});
  await assert.rejects(()=>recordMoney(s,'Tester',{direction:'out',party_id:p.id,invoice_id:i.id,amount:10,mode:'Bank',date:'2026-11-02'}),/does not belong/);
});
test('live invoice failure cannot silently fall back to separate writes',async()=>{
  const s=store(); s.postInvoice=async()=>{ throw new Error('transaction failed'); };
  await assert.rejects(()=>createInvoice(s,'Tester',{order_id:'o',date:'2026-11-02',delivery_ids:['d']}),/transaction failed/);
  assert.equal((await s.all('invoices')).length,0);
});

test('Tally export rejects missing ledgers instead of exporting an empty ledger name',()=>{
  assert.throws(()=>tallyXml([{number:'TEST',entries:[{ledger_id:'missing',dr:10,cr:0}]} as unknown as Tables['vouchers']],[],[]),/cannot be exported/);
});
