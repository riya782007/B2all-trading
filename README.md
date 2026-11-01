# B2All

One product for B2 All Commo Trade Pvt. Ltd.:
- **Website** for customers: catalogue, one-tap enquiry, and a personal page with buying insights, reorder prompts, delivery tracking, contracts to e-sign and GST invoices.
- **Console** (installable app) for the team: enquiries → sales orders → contracts → dispatches → GST invoices → payments, purchase orders with part-by-part receipts and supplier-bill matching, stock, e-way bills, double-entry accounts (day book, ledgers, outstanding with ageing, trial balance, GST summary), Tally export, offers, and roles and permissions.

## Run locally (demo data, no accounts)
```bash
npm install && npm run dev
```
Website: http://localhost:3000 (any name, mobile and city). Console: http://localhost:3000/owner (pick a person to see their role's view).

## Live setup
1. Supabase SQL editor: run `supabase/schema.sql`, `002_erp.sql`, `003_security.sql` and `004_fixes.sql` in order (already done on the live project).
2. Supabase → Authentication: allow anonymous sign-ins (customers) and keep email sign-in on (team).
3. Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Optional: `OPENAI_API_KEY` (offer writing), `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` (emails from the company Gmail).
4. Team: an owner adds people under Team and roles; each person opens /owner, chooses "First time here", and sets a password with that email.

## How it is built
- `lib/store.ts`: six storage calls, backed by Supabase (live) or memory (demo and tests).
- `lib/domain.ts`: all business rules: orders, part deliveries, GST invoices, vouchers, reports, stock, contracts, customer insights.
- `lib/auth.ts` + `lib/perms.ts`: role checks on every page, action and export. Database row-level security keeps customers to their own records.
- Money is plain arithmetic in code (rounded to paise). AI only drafts marketing text.
