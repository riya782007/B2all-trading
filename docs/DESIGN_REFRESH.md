# B2All interface refresh

## Direction
The console follows the user-provided [Akash ERP frontend](https://github.com/riya782007/akash-ERP-/tree/c340b8f04663cee5859c63ad20f5b4e26a658e90/public): warm white workspace, sage navigation, compact headings, distinct summary cards, adjacent activity and attention panels, quick actions and consistent tables. B2All keeps its own routes, role checks and financial logic. Text contrast is stronger than the reference and small-screen navigation remains keyboard accessible.

The public website combines the earlier local HTML references (`website/index.html` and `b2all-redesign/dist/index.html`): industrial images, restrained copper accents, broad material discovery and an obvious customer supply desk. It does not copy another supplier’s brand, testimonials or business claims.

## Alternatives considered
- Specimen tiles: useful for technical detail, but less useful as the only introduction for a first-time buyer.
- Large corporate hero alone: attractive, but buries enquiry and repeat-customer tasks.
- Chosen: industrial photography plus a searchable nine-group catalogue, clear quotation path, operations context, customer order/document access, and email for bespoke requirements.

## Research basis
- [Trafigura metals and minerals](https://www.trafigura.com/what-we-do/metals-and-minerals/): product families, uses, and bulk commodity specifications support a product-first discovery structure.
- [Kloeckner Connect](https://www.kloecknermetals.com/connect/): quotes, orders and account activity in one customer portal support keeping repeat-customer tasks prominent.
These are public product descriptions, not evidence of private internal screens or measurable ROI for B2All.

## Implemented
- Shared light/dark/system theme across workspace, forms, tables and customer pages.
- Role-aware sidebar and breadcrumbs, clear sample-data strip, smaller headings, individual metric cards.
- Seven-day invoice sales chart derived from actual visible invoices, labelled before GST; attention items, bill-matching entry and role-permitted shortcuts.
- Contract status counts, search, filter reset and direct path to prepare from a sales order.
- Nine material groups, category/search filtering, accessible native details, current active catalogue options and existing enquiry basket.
- Public client component receives only material ID/name/category/note; no cost or opening stock values.
- Responsive public navigation, operations details, group/commitments context and email contact.
- Images copied from the existing user workspace website assets; no new external asset dependency.

## Boundaries
The broader marketing range is indicative, not a stock promise. Only active database catalogue items can enter the existing basket. Bespoke materials use an email draft that the buyer sends. Final grade, availability and price require a quote. Older quantitative sustainability claims and target dates were not repeated without fresh verification. No database migration is needed for this visual refresh; the earlier bill-matching migration still needs the coordinated release described in SUPABASE_HANDOFF.md.

## Validation (4 November 2026)
Production build and lint passed. Eight accounting/migration regression tests passed. Browser checks covered desktop dashboard, dark theme, mobile contract filtering with contained table scrolling, material search (silico), expanded enquiry options and image loading. Mobile page widths stayed within the viewport. These checks used local demo data; production Supabase and provider integrations remain unverified.
