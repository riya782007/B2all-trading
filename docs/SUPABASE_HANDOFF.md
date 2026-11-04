# Supabase work for Riya

Use the **B2All project only**. No passwords, service-role keys or API keys need to be sent in chat.

## Run order
1. Take a database backup. Prefer a staging copy first. Agree a short maintenance window before changing production: the upgrade disables the old app’s direct invoice/voucher writes, so the matching app version must deploy immediately afterwards.
2. In SQL Editor, open and run `supabase/PREFLIGHT_bill_matching.sql`. All seven first-row flags should be true. The duplicate, incomplete-record and invalid-source-value queries should return zero rows. Save the counts from the last query. If anything differs, stop and send only the error or anonymized result—not real bills or customer details.
3. Open `supabase/migrations/20261102142325_bill_matching.sql`, copy the **entire file**, and run it as one SQL Editor query. It contains BEGIN/COMMIT and changes no historical monetary entries or receipt quantities. It adds fields, matching/posting functions, permissions and integrity guards. If it errors, do not run individual fragments; the transaction must be rolled back. Share the error so the migration can be corrected.
4. Run `supabase/VERIFY_bill_matching.sql`. Both readiness flags must be true, five invoice columns should be listed, all four permission flags must be false, and all three row counts must match preflight. Do not test by posting a real bill in SQL Editor.
5. Tell me “migration applied” and share the verification flags (no secrets). I can then deploy the corresponding application version and check the controlled workflow.

**Never run `schema.sql` or `002_erp.sql` again on this existing project.** They are historical setup scripts; 002 contains table drops.

## Customer email sign-in configuration
In Authentication → URL Configuration:
- Site URL: `https://b2alltrading.vercel.app`
- Add redirect URL: `https://b2alltrading.vercel.app/auth/callback`
- Add only preview domains you actually need. Avoid a broad wildcard for unrelated domains.

Enable Email sign-in. The default magic-link email works with the callback. If you want numeric-code entry as well, include `{{ .Token }}` in the sign-in email template. Configure company-owned SMTP and appropriate rate limits before real customer onboarding; the default development mail service is not a production sending plan.

Do not disable verification or return to anonymous logins to make testing easier. Older anonymous customer profiles need owner-verified mapping to the correct verified customer account before transferring their history. Never merge accounts solely because someone typed the same phone number.

## Gmail is separate
Supabase email authentication and B2All’s Gmail sending are different services. The Gmail OAuth sender requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` in Vercel. Use a company-owned mailbox and minimal `gmail.send` scope. Inbox reading is not enabled by this migration.

## What to send back
- Preflight clean / specific anonymized error
- Migration succeeded / error text
- Verification flags and unchanged counts
- Email callback allowlist configured: yes/no

Accountant checks, a real backup restore drill and a Tally test-company import are still required before financial cutover. The local PostgreSQL tests validate the upgrade logic, not the unseen data or configuration of the live project.
