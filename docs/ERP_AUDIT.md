# B2All ERP audit and release plan — 2 November 2026

## Business decision
Priyansh is B2All’s finance stakeholder, alongside Amit. The confirmed issue is matching goods receipts to supplier invoices arriving late or in parts. Budget, volumes, Tally release, current tracking-number discipline and accountant-approved opening balances are not yet known. No invented finance-call requirements have been used.

The right first product is an exception-led trade desk beside Tally: receipt → bill allocation → accounting → reviewed export. Replacing all of Tally immediately would add statutory and operational risk before proving an advantage.

## What changed in this branch

| Finding | Change | Evidence |
|---|---|---|
| A receipt was either wholly billed or wholly unbilled | Exact quantities allocated per receipt; residual remains open; historical whole-receipt links supported | Unit, PostgreSQL and browser checks |
| Bill creation used multiple independent writes | One authorized PostgreSQL function posts invoice, allocations, voucher and activity transactionally | Injected final-write failure rolls everything back |
| Duplicate supplier bill entry | Trim/case normalization, supplier + financial-year uniqueness, request idempotency | PostgreSQL rejection and retry tests |
| Duplicate manual posting on a retry | Idempotent accounting transaction with request UUID | PostgreSQL tests |
| Printed supplier total was never compared | Explicit printed-total field; mismatch stops posting | PostgreSQL rejection test |
| Unknown party state silently became local GST | Missing state blocks posting | Domain + database checks |
| Negative or non-finite journal lines could balance | Validate finite positive single-sided lines, existing ledgers and balance; database trigger | Regression tests |
| Payment could reference another party’s bill | Validate party and direction; serialize settlement; reject excess allocation | Domain + PostgreSQL checks |
| Downloading Tally XML marked import complete | GET downloads have no writes; accountant explicitly confirms import | Route review and browser check |
| Invoice print changed with edited masters | New postings snapshot party, company and material print fields | Snapshot regression check |
| Customer sign-in did not verify identity | Email OTP/magic-link sign-in; no anonymous financial account access | Code review; live provider test pending |
| Staff reads exposed unrelated financial modules | Database read policies follow module; dashboard respects permissions | PostgreSQL sales-only-role tests |
| Self-profile policy queried itself | Remove recursive WITH CHECK; existing role-change trigger retains protection | PostgreSQL self-update + escalation rejection |
| Signed contract could be changed | Immutable signed record, verified-customer signing, lock during acknowledgement | Database guards; provider e-sign remains separate |
| Day boundary used UTC; quantities lost kg precision | IST business day/e-way expiry, decimal arithmetic, 0.001 MT allocation and stock precision | Unit tests |
| React forms had lint/state bugs | Stable company fields, external basket/theme store, native mobile dialog, email-first offers | Lint and browser checks |
| Supabase lookup errors looked like missing records | Propagate storage errors; missing posting RPC fails closed | Regression test |

## Features reviewed

| Area | Repository capability after this change | Remaining limits |
|---|---|---|
| Customer site | Material enquiry, verified customer account, order/delivery history, documents, repeat enquiry, purchase-pattern summaries | No retail checkout; prices require a quote; live email redirect configuration still needs testing |
| CRM | Enquiries, customers, conversion, offer drafts, personal outbound links | Multi-item enquiry conversion still needs a transaction before high-volume use; no unattended email ingestion |
| Sales / purchase | Orders, receipts/dispatches, partial bill allocation, GST amounts, printable bills | One material and one order per invoice; multi-PO consolidated bills and invoices before goods require another model |
| Inventory | Receipt-based stock, open-order commitments, projected shortfalls, export | No godowns, batches, weighbridge integration, assay deductions, returns or landed-cost allocation |
| Accounts | Double-entry day book, bank/cash receipts/payments, expenses, party ledgers, outstanding, trial balance, book GST summary | No complete statutory engine, bank reconciliation, journal editor/reversals UI, debit/credit-note workflow, TDS/TCS, cess or payroll |
| Contracts | Order draft, portal acknowledgement, hash/time/name/IP | Typed acknowledgement is not a certified Aadhaar/DSC e-sign integration; legal workflow/provider must be chosen |
| Tally | Ledger/voucher XML, validation, stable voucher identifiers, explicit import confirmation | Accountant must test a copy of the actual Tally company; bill allocations, item-level GST and import-response ingestion are not complete |
| Gmail | OAuth sender implementation, header validation, timeouts, configured-state indicator | Vercel currently has no Gmail OAuth variables; inbox reading, queues and retry handling are separate work |
| AI | Human-reviewed offer drafting; deterministic customer history insights | No AI posting, tax choice, payment approval or automatic contract acceptance |
| Operations | Team roles, audit activity, light/dark/system modes, mobile navigation, CI | Production backup/restore drill and remote monitoring must be exercised with the correct account |

This is a tested improvement to the existing ERP, not a claim of complete Tally parity or zero possible bugs.

## Release gate
1. Riya will perform Supabase work in the B2All account. Follow `docs/SUPABASE_HANDOFF.md`; the current connector/CLI does not have project access. Do not use unrelated projects.
2. Back up the B2All database and restore to a staging project. The existing numbered schema files describe the installed baseline; **never rerun 002_erp.sql on production**, since it contains destructive historical setup statements.
3. On the staging copy, run the preflight below. Investigate every inconsistent old invoice/voucher with Priyansh; never silently fix monetary history.
4. Apply only `supabase/migrations/20261102142325_bill_matching.sql`. It adds columns, functions, constraints and guards. Test permissions with separate owner, accounts, sales, store and customer accounts.
5. Configure Supabase email redirect allowlist for the final domain and `/auth/callback`. Default magic-link template works; OTP entry requires a template containing the token. Configure a production email sender and rate limits. Do not automatically merge legacy anonymous accounts by a typed phone number: owner verification and an explicit mapping are required.
6. In a copy of the Tally company, check master mappings, dates, bill references, voucher counts, debit/credit totals, duplicate re-import behavior and GST reporting. Confirm only successful imports.
7. Deploy application and migration together. The new code intentionally refuses financial posting if its RPC is missing; never fall back to the unsafe old sequence. Smoke test a controlled sample, then reconcile trial balance, party balances and stock with Priyansh before switching real entry.
8. Retain a rollback plan: revert the application only with compatible database permissions/functions; never drop the new allocation columns or restore the old all-or-nothing billing logic after partial bills have been posted.

### Read-only preflight
```sql
-- Duplicates newly caught by normalization and fiscal-year scoping.
select kind, party_id, upper(btrim(number)),
 extract(year from date)::int - case when extract(month from date)<4 then 1 else 0 end as financial_year,
 count(*) from public.invoices group by 1,2,3,4 having count(*)>1;
-- Incomplete legacy invoice/voucher pairs need accountant review.
select i.id,i.number,i.voucher_id from public.invoices i
 left join public.vouchers v on v.id=i.voucher_id
 where v.id is null or v.invoice_id is distinct from i.id or v.amount<>i.total;
-- Old invoices may lack snapshots: do not invent historical addresses or HSN values.
select count(*) from public.invoices;
```

## Validation commands
`npm test` executes arithmetic/domain tests and real PostgreSQL via PGlite, loading the full installed schema and the new migration. It checks rollback via fault injection. This is not a multi-session production concurrency/load test. `npm run lint`, `npm run build`, then `node scripts/smoke.mjs http://127.0.0.1:3002` exercise the local compiled sample app. Browser tests use sample data, not real supplier bills or payments.

Production dependency audit: zero advisories on 2 November 2026. Development dependencies still have moderate minimatch advisories; npm proposes incompatible downgrades, so no forced downgrade or untested major override was applied. CI uses trusted repository paths. Track upstream fixes.

### Completed local verification
- Eight regression tests passed, including a PostgreSQL integration test with many assertions: partial allocations, retry idempotency for bills and settlements, duplicate and printed-total rejection, forced rollback, role filtering, profile escalation protection and immutable journals.
- ESLint and the Next.js production build passed.
- 55 local HTTP route/role checks passed against compiled sample mode.
- Browser: 60 MT receipt → 10.5 MT bill → 49.5 MT remains open. Light/dark switching worked; mobile dialog and customer landing layout were checked. At 390 px, document width is 375 px (no page overflow); wide tables scroll inside their card.
- Live Supabase, production email authentication, Gmail sending, actual Tally import and multi-session load tests remain unverified. Riya will execute the database handoff.
