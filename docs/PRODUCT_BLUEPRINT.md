# B2All product blueprint

## Research and product choice
Tally already supports receipt notes linked to purchase orders and invoices, including pending-bill reports. Its GSTR-2B tools already distinguish missing invoices, document/value differences and return-period mismatches. Therefore Priyansh’s problem is not evidence that Tally has no reconciliation feature. The product opportunity is easier capture on the field, a visible pending-work queue, explicit partial allocation and fewer handoffs. Confirm the existing Tally configuration with his accountant before migrating.

Primary sources reviewed 2 November 2026:
- [Tally: purchase orders and receipt tracking](https://help.tallysolutions.com/purchase-order-tally/): track goods separately from purchase invoices.
- [Tally: GSTR-2B reconciliation](https://help.tallysolutions.com/gstr-2b-reconciliation/): missing, mismatched and period-shifted documents. A late physical bill and a late GST filing are different problems.
- [Tally: why mismatches happen](https://tallysolutions.com/gst/gstr-2b-reconciliation-mismatches-how-to-fix/): timing, document/GSTIN errors and values. These are documented categories, not a survey of every Indian trader.
- [Odoo vendor bills](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/purchase/manage_deals/manage.html): received-quantity control and three-way matching. Adapt the pattern to bulk material receipts.
- [SAP Fiori floorplans](https://www.sap.com/design-system/fiori-design-web/v1-108/page-types/floorplans/when-to-use-which-floorplan): role-specific worklists, object details and short guided tasks. Use the newer Fiori elements guidance for framework context; the linked floorplan reference is historical.
- [Google Material foundations](https://m3.material.io/foundations/): coherent tokens, hierarchy, accessible controls and predictable interaction.
- [Fendahl coal CTRM fact sheet](https://fendahl.com/wp-content/uploads/2025/11/FACT-SHEET-COAL-NEW-2.pdf): trade lifecycle, physical stock, contract execution and financial exposure. Vendor claims are patterns to evaluate, not independent performance evidence.
- [ION / Anglo American deployment](https://iongroup.com/press-release/commodities/mining-giant-anglo-american-deploys-aspectctrm-global-marketing-trading-business-press-release/): a historical example of integrated physical trading operations, not proof of today’s exact private stack.
- [Tally integration](https://help.tallysolutions.com/integrate-with-tallyprime/): XML, JSON and ODBC capabilities depend on the release and integration. This app currently implements XML only.
- [Gmail OAuth scopes](https://developers.google.com/workspace/gmail/api/auth/scopes): sending needs OAuth; inbox scopes entail additional verification/security obligations. A Gmail API key alone cannot provide mailbox access.

We cannot inspect competitors’ private ERP screens or establish a universal “world’s best” or “world’s fastest” system from public marketing. The design adopts documented patterns, then verifies them against B2All’s workflow.

## Priorities for Amit and Priyansh
| Rank | Workflow | Why / release condition |
|---|---|---|
| 1 | Goods received → late/partial supplier bill → exact residual → accountant review | Directly confirmed pain. Implemented core in this branch. Pilot with real anonymized examples in staging. |
| 2 | Party balances, invoice-linked receipts/payments, duplicate and total checks | Protect working capital. Validate against actual Tally balances. |
| 3 | One list of unbilled receipts, overdue bills and shortfalls | Stop hunting across calls, registers and email. Estimate unbilled value separately from posted liabilities. |
| 4 | Parallel Tally workflow and gradual cutover | Preserve accountant confidence; export/import reconciliation before replacing a system of record. |
| 5 | Owner-controlled customer history, documents and repeat enquiry | Customers gain service value without exposing other customers’ data or live trading margins. |
| 6 | Stock movements, vehicle/challan/e-way references | Capture once at receipt/dispatch; company-specific quality/weight rules need discovery. |
| 7 | Reviewed contract and invoice templates | Reduce typing. Proper e-sign provider and legal template approval are separate gates. |
| 8 | Gmail capture into a document-review queue | Useful after OAuth, attachment handling and duplicate review exist. Never auto-post extracted amounts. |
| 9 | Bank / GSTR-2B reconciliation, credit/debit notes, TDS/TCS/cess | Important before a full accounting cutover, but not safe to improvise without accountant examples and specifications. |
| 10 | AI document extraction and suggested matches | Assist the reviewer; show source evidence and uncertainty. Amounts, tax and accounting remain deterministic and approved. |
| 11 | Price forecasting, autonomous negotiation, trading/payment agents | Defer. No demonstrated ROI or safe mandate for B2All yet. |

## Interface changes
Replace stretched Archivo headings with locally served Inter, more readable hierarchy, calmer surfaces and a clear green action color. Keep one coherent set of tokens for light, dark and system modes. Group navigation by selling, buying, stock, money and people; expose only permitted actions. Correct active states for query-based sales/purchase links.

Daily starting point: role-specific next actions and current figures. Finance’s key destination is Bill matching, with pending/part-billed/7+ days/all filters and supplier/vehicle search. The seven-day follow-up bucket is a visible product default, not a statutory deadline or claimed B2All policy.

Entry flow: choose order and supplier → enter document number/date → select exact receipt quantities → enter printed total and check rate → review calculated total → confirm. Errors explain the next correction. Unmatched charges or deductions stay unposted until resolved; no hidden tolerances beyond one paise of total rounding.

Customer site: materials and enquiry first; a clearly marked personal supply desk for order progress, invoices, contracts and repeat enquiries. Reorder estimates describe observed history, not psychological certainty. No fabricated claims about delivery time, stock availability, rates or certifications.

## Safe Tally transition
1. Observe an accountant’s real receipt-note, pending-bill and allocation workflow. Collect anonymized cases: one bill/many trucks, one truck/many bills, bill before goods, same number across financial years, quantity/rate deductions, freight, advances and returns.
2. Set a cutover date and signed-off ledger/GSTIN/HSN mappings. Obtain opening trial balance, party bill balances, stock by location and unbilled receipts. Never infer them from website enquiries.
3. Import to a staging copy using a preview and rejection report. An opening-balance import wizard is still to build; no bulk auto-import is represented as ready.
4. Run side by side. Compare every day’s voucher counts/totals and sample documents, then complete month-end stock, party and GST reconciliation.
5. Move operational entry first. Keep statutory filing and specialist accounting in Tally until the accountant signs off each replacement workflow. Maintain exports and restoration access throughout.

## ROI and operating cost discipline
Do not invent Amit’s budget or promise a salary-sized saving. Measure baseline time per receipt and bill, weekly chasing effort, unmatched value/age, duplicates caught and reconciliation time. ROI = measured minutes saved × actual loaded staff cost per minute + verified avoided rework, minus monthly infrastructure/support. Do not count unbilled stock value as cash saved or claim all input GST is recoverable.

Use existing company email and manual reviewed outbound links first. Gmail infrastructure does not remove mailbox/admin/security costs. WhatsApp automation adds provider and message charges, so leave it optional. AI drafting is optional with a small usage cap; document extraction would be separately metered and reviewed. Database hosting, backup retention, email provider, monitoring and solo-developer support must be quoted from the selected live plans and measured usage, not guessed free forever. Build the high-value matching pilot before agreeing a wider ERP fixed price.
