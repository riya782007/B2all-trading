# B2All Trade Desk: feature outline and build plan

Principle: complex behind the scenes, nothing to learn on the front. A customer should need one tap to enquire. The owner should do the whole day from one screen with big buttons. Anything the AI reads or drafts is shown to a person before it affects money.

## 1. What the research says (and what we take from it)

| Finding | Source | What we do |
|---|---|---|
| Indian B2B marketplaces (mjunction, Moglix, Udaan) are built around a buyer account, requests for quotes and linked services (finance, logistics, quality, warehouses). | [mjunction e-marketplace](https://www.mjunction.in/services/selling/emarketplace/) | Buyer account with a personal page is the core. Services (logistics, finance) stay out of scope: B2All is a trader, not a marketplace. |
| Commodity prices move daily, so public catalogues show products, not prices. | Amit, on the call | No prices on the site. Price only appears in a quote. |
| Supabase phone login can send the OTP through any Indian SMS provider using the Send SMS hook (payload has `user.phone` and a 6-digit `sms.otp`; hook is a signed webhook). | [Supabase Send SMS hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook.md) | Phone OTP login, with MSG91 behind the hook. Indian SMS needs DLT registration of sender and template, which takes days and must be started early. |
| E-invoicing applies above ₹5 crore aggregate turnover (all GSTINs under one PAN). | [Tally Solutions](https://tallysolutions.com/gst/e-invoicing-threshold/) | B2All's turnover is unverified. Ask the accountant. If above ₹5 cr, invoices need an IRN from the government portal, and that is best done from Tally itself. |
| Tally accepts vouchers over HTTP/XML (server mode, default port 9000, a `VOUCHER` inside `TALLYMESSAGE`, reply reports `CREATED`/`ERRORS`). | [Tally help](https://help.tallysolutions.com/tallyprime-as-server/) | Do not build GST invoices ourselves. Create a Tally sales voucher from a confirmed deal and let Tally produce the invoice. Needs a small connector on the office PC. |
| Small-business commodity software (CTRM) is mostly about contracts, positions, risk and compliance, aimed at large traders. | [Capterra CTRM list](https://www.capterra.com/ctrm-software/) | Most CTRM features (hedging, mark-to-market, risk engines) are not relevant for a back-to-back physical trader. We take the contract and deal-book ideas only. |

Not yet researched in depth: WhatsApp template approval for offers (opt-in and marketing template rules), Aadhaar eSign provider quotes, rail FNR APIs. These are Phase 3 and need vendor quotes before we promise dates.

## 2. Features promised, with a verdict

| # | Feature | Verdict | Phase |
|---|---|---|---|
| 1 | Visitors give name, phone, city before they enquire | Keep. Core. | 1 (built) |
| 2 | Personal page: enquiries, delivery status, recommendations, order again | Keep. | 1 (built) |
| 3 | Cart | Rename "My enquiry basket". No payment, since price is quoted. | 1 (built) |
| 4 | Customers saved automatically | Keep. | 1 (built) |
| 5 | Owner console: Today, Enquiries, Customers, Offers | Keep. Four screens only. | 1 (built) |
| 6 | One-tap offers to all or chosen customers | Built with a ready-to-send link per customer. True one-tap bulk needs WhatsApp Business API and approved templates. | 1 now, 2 for bulk |
| 7 | Email and SMS offers | Email via Resend, SMS via MSG91 (DLT). | 2 |
| 8 | Lead analysis from email, WhatsApp, PDF | AI reads and fills a draft enquiry, source text shown next to each field. | 2 |
| 9 | Auto contract from a confirmed deal | Owner-approved template, fields filled from the deal. | 3 |
| 10 | E-sign | Hosted e-sign provider, evidence stored. | 3 |
| 11 | GST invoice and sharing | Via Tally voucher (see above). | 3 |
| 12 | Tally integration | Push sales vouchers to Tally; no two-way sync. | 3 |
| 13 | Recommendations | Simple rule now (same category, most-asked). Smarter later only if data justifies it. | 1 rule-based |
| 14 | Quality calculator, rail tracking | Deferred until formulas and API quotes exist. | 4 |

## 3. Tasks and specifications

### Phase 1: customer experience and owner console (built in this repo)
- **P1-1 Login with details.** Name, Indian mobile, city required; OTP by SMS; no password. Spec: number normalised to +91; returning customer re-confirms details; profile saved in `profiles`. Done in demo mode; live mode needs a Supabase project and an SMS provider.
- **P1-2 Catalogue.** Materials from the database, grouped by category, no prices. Add-to-enquiry requires login (this is what guarantees every lead leaves details).
- **P1-3 Enquiry basket.** Quantities in MT, free-text note, one Send button; stored in `enquiries` and `enquiry_items`.
- **P1-4 Customer page.** Open enquiries with status, "on the way" banner, recommendations, past orders.
- **P1-5 Owner Today.** Counts and the list of what needs action. Each enquiry has WhatsApp-reply (prefilled) and one button to move to the next step.
- **P1-6 Customers.** Everyone who signed in, with city and enquiry count.
- **P1-7 Offers.** Pick one of three starter messages, optional voucher code and date, choose everyone or some, choose channel, send.
- **P1-8 Security.** Row-level security so customers see only their own data; owners are set by changing `profiles.role` in Supabase; owner actions re-check the role on the server.

### Phase 2: messaging and AI intake
- **P2-1 WhatsApp Business API** (coexistence mode so Amit keeps his phone). Opt-in stored per customer; offers sent as approved utility or marketing templates; delivery status saved in `offer_sends`.
- **P2-2 Email and SMS senders** behind one `send(channel, customer, message)` function.
- **P2-3 Intake inbox.** Forwarded email or WhatsApp text and PDF lab reports become a draft enquiry. AI extracts material, grade, quantity, place; every field shows its source sentence; nothing is saved as a deal until the owner taps Confirm. AI never calculates amounts.
- **P2-4 Offer suggestions.** AI proposes wording from current stock and recent enquiries; owner edits and sends. Uses the OpenAI key.

### Phase 3: contracts, e-sign, invoices, Tally
- **P3-1 Contract draft** from confirmed deal using Amit's own approved template; owner reviews before sending.
- **P3-2 E-sign** through a hosted provider; signed PDF stored; status shown on the deal.
- **P3-3 Tally voucher push** (Sales voucher via HTTP/XML to the office PC). Party ledger must exist in Tally or be created first; show Tally's `CREATED/ERRORS` reply to the owner.
- **P3-4 Invoice sharing.** Invoice PDF from Tally is attached and sent to the customer.

### Phase 4: later, only with real numbers
Quality calculator, rail and truck tracking, analytics.

## 4. Decisions needed from Amit before Phase 2 and 3
1. Does B2All's turnover exceed ₹5 crore (e-invoice needed)?
2. Does his accountant run TallyPrime on one office PC, and can it stay on during the day?
3. Is the WhatsApp number a Business account? Is a separate number acceptable for the API?
4. His contract template and which fields change deal to deal.
5. Which customers have agreed to receive offers (opt-in list).

## 5. Limits of this first build
- Live Supabase login and database code is written but not tested against a real project; the demo mode was tested end to end in a browser.
- Offers open a ready message per customer rather than sending automatically.
- Page text on the website is plain and has no photos yet.
