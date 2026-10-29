# B2All Trade Desk

Customer site plus owner console for B2 All Commo Trade Pvt. Ltd. Next.js 16, Supabase, Tailwind. Plan and feature list: [docs/PLAN.md](docs/PLAN.md).

## Try it now (demo mode, no accounts needed)
```bash
npm install
npm run dev
```
Open http://localhost:3000. Any name, mobile and city work. The owner console is at /owner (one button in demo mode).
Demo data is kept in memory and resets when the server restarts.

## Go live
1. Create a Supabase project (region: Mumbai). Run `supabase/schema.sql` in the SQL editor.
2. Supabase → Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins** (customers use this; no SMS needed yet).
3. Supabase → Authentication → Users → **Add user** with the owner's email and a strong password (tick auto-confirm). Then run: `insert into profiles (id, phone, name, city, role) select id, '+91XXXXXXXXXX', 'Amit Gupta', 'Raigarh', 'owner' from auth.users where email = 'OWNER_EMAIL';`
4. Copy `.env.example` to `.env.local` and fill the two Supabase values. Add the same values in Vercel → Project → Settings → Environment Variables.
5. Import this repo into Vercel and deploy.

## Install as an app
Open `/owner` on the device and use the Install button (Android, Windows) or Safari Share → Add to Home Screen (iPhone, iPad).
