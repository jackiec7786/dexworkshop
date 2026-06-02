# Spice Workshop

Inspection · Quote · Invoice manager for an auto detailing / dent / coating / wraps shop.
Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage) + Vercel.

One **job** carries one customer + vehicle through inspection → quote → invoice.
Quote and Invoice are the same document; flip the status dropdown to switch.

---

## What you get
- Email/password login (Supabase Auth). Each user sees only their own jobs (enforced by Row-Level Security — not just hidden in the UI).
- Visual damage map: click a car diagram (top/side/front) to drop color-coded marks per service type, each with a note.
- Photo upload straight from a phone camera, stored in a private Supabase bucket.
- Line items, discount, GST %, deposit → live totals and balance due.
- Print-ready Quote/Invoice (browser Print → "Save as PDF").
- Default currency **Rs** and **16% GST** — change both in Settings (set your provincial rate).

---

## Setup — do these in order

### 1. Create the Supabase project
1. Go to supabase.com → New project. Pick a region close to Pakistan (**Singapore / ap-southeast-1** is the nearest) to cut latency.
2. Wait for it to finish provisioning.

### 2. Create the database tables + storage
1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   This creates the `jobs` and `settings` tables, all RLS policies, and the `photos` storage bucket.

### 3. Get your API keys
Supabase → **Project Settings → API**. Copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(The anon key is safe in the browser — RLS is what protects the data, not key secrecy.)

### 4. Run locally (optional but recommended)
```bash
cp .env.local.example .env.local   # then paste your two values into it
npm install
npm run dev                        # http://localhost:3000
```
Create an account on the login screen, and you're in.

### 5. Deploy to Vercel
1. Push this folder to a GitHub repo.
2. Vercel → **Add New → Project** → import the repo.
3. Before deploying, add the two env vars (**Settings → Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel domain
   (e.g. `https://your-app.vercel.app`) to **Site URL** and **Redirect URLs**,
   or email confirmation links will point at localhost.

---

## Honest limitations (read before you rely on it)
- **One login = one shop's data.** Multiple staff would share one account, or each gets their own isolated data. True multi-user-per-shop (a shared workspace with roles) is NOT built — that needs a `workshops` table and membership join. Ask if you want it.
- **JSONB line items.** Items live inside the job row as JSON. Simple and fast, but you can't easily run "total revenue from wraps last month" in SQL. If you need reporting, line items should become their own table — a deliberate trade-off, documented in `schema.sql`.
- **Email confirmation** is on by default in Supabase. For a single owner, you can turn it off (Auth → Providers → Email → disable "Confirm email") to skip the inbox step.
- **No payment integration.** This records a deposit and balance; it doesn't take payment. Add a gateway later if needed.

## File map
```
app/page.tsx              dashboard: list + inspection + quote/invoice editor
app/login/page.tsx        auth screen
app/api/jobs/route.ts     GET list / POST create
app/api/jobs/[id]/route.ts PATCH update / DELETE
components/shared.tsx     CarDiagram, PrintDoc, types, money math
lib/supabase.ts           browser + server Supabase clients
middleware.ts             session refresh + route protection
supabase/schema.sql       tables, RLS, storage — run once in SQL Editor
```
