# B2All Trade Desk

Customer site plus owner console for B2 All Commo Trade Pvt. Ltd. Next.js 16, Supabase, Tailwind. Plan and feature list: [docs/PLAN.md](docs/PLAN.md).

## Try it now (demo mode, no accounts needed)
```bash
npm install
npm run dev
```
Open http://localhost:3000. Any name, mobile and city work; the code is `123456`. Use mobile `9000000000` to enter the owner console.
Demo data is kept in memory and resets when the server restarts.

## Go live
1. Create a Supabase project (region: Mumbai). Run `supabase/schema.sql` in the SQL editor.
2. Auth → Providers → Phone: enable it. Add a Send SMS hook that delivers the OTP through MSG91 (needs DLT registration). Until then, Supabase's test phone numbers can be used for trial.
3. Copy `.env.example` to `.env.local` and fill the two Supabase values. Add the same values in Vercel → Project → Settings → Environment Variables.
4. Import this repo into Vercel and deploy.
5. Make Amit the owner: sign in once, then in Supabase run `update profiles set role = 'owner' where phone = '+91XXXXXXXXXX';`
