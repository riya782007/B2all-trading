# B2All: what the product does and why

## What the best systems do, and what we took
| Source | Idea | In B2All |
|---|---|---|
| SAP Fiori principles | Role-based, simple, coherent, adaptive | Each person sees only their areas; the same patterns on every screen; works on phone and desktop |
| CTRM platforms for physical traders | Deal capture → logistics → invoicing → settlement, with position and credit view | Order → part dispatches → invoice → payment; stock and "if all happen" position; outstanding with ageing |
| Google products | One search box, one Create button, plain words, light and dark | Global search across people, orders, bills, trucks; one Create menu; Material-style design with a theme toggle |
| Consumer apps (e.g. Chaayos) | Personal history, recommendations, gentle nudges | Customer page: what you buy, how often, next likely order, reorder button, documents |

## Priyansh's needs (finance)
- **Part bills against one PO**: every truck recorded against its order with a running total, warnings on over-quantity, duplicate bill numbers and missing e-way bills. Purchase bills are entered by ticking the receipts they cover, so billed vs received vs ordered is always visible.
- **Stock report**: built from receipts and dispatches, with arriving, to-send and projected stock, and value at average purchase rate.
- **Roles and permissions**: owners see everything; roles are a grid of view / create / edit / export per area.
- **E-way bills**: tracked per truck with status, validity calculator, alerts for movements above ₹50,000 without one.
- **Tally**: the accountant keeps Tally. Ledger masters and vouchers export as Tally XML.

## Accounts (Tally-style)
Sales and purchase vouchers post automatically from invoices and bills, with CGST/SGST or IGST worked out from the party's state. Receipts, payments and expenses are one-screen forms. Reports: day book, ledgers, ledger statements, outstanding with ageing, trial balance (checked to balance), GST by month.

## Not built yet (needs outside accounts)
- WhatsApp Business API for fully automatic sending (today: one tap per customer).
- Government e-way bill and e-invoice (IRN) APIs through a GST suvidha provider.
- Aadhaar e-sign (today: click-to-sign with name, time, IP and document fingerprint).
- Gmail sending switches on once the OAuth keys are added.
- GST on materials other than coal (18%) should be confirmed by the accountant.
