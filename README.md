# DEX Workshop

Inspection · Quote · Invoice manager for an auto detailing / PDR / tint / wrap / PPF shop.

**Stack:** Next.js 15 (App Router) · Neon Postgres · Vercel Blob · DB-based auth (bcrypt + signed-cookie sessions) · deployed on Vercel.

One **job** carries one customer + vehicle through inspection → quote → invoice. Quote and Invoice are the same document — flip the status dropdown to switch.

---

## What you get

- **Single shop login.** One owner account, created on first run. Passwords are bcrypt-hashed; sessions are signed JWTs in an httpOnly cookie. Every page and API route is gated by middleware.
- **Visual damage map.** Click a car diagram (top / left / right / front) to drop colour-coded marks per service code, each with an optional square-inch measurement.
- **Photo upload** straight from a phone camera, stored in Vercel Blob (10 MB / type-checked).
- **Line items, discount, GST %, deposit** → live totals and balance due.
- **Print-ready Quote/Invoice** (browser Print → “Save as PDF”).
- Configurable business identity, currency and default GST in **Settings**.

---

## Architecture

```
app/
  page.tsx                  dashboard entry (server) → DashboardClient
  DashboardClient.tsx       list + inspection + quote/invoice editor
  login/                    first-run setup / sign-in screen
  api/
    auth/{status,setup,login,logout}/  DB-based auth endpoints (nodejs runtime)
    jobs/                    GET list / POST create / PATCH / DELETE  (session-guarded)
    settings/               GET / PUT                                 (session-guarded)
    photos/                 POST upload to Vercel Blob                (session-guarded)
components/
  shared.tsx                CarDiagram, PrintDoc, types, money math, DEX codes
  ui.tsx                    design tokens, Button/Field/Spinner, toasts, confirm dialog
lib/
  env.ts                    lazily-validated environment access
  db.ts                     Neon client + SHOP_OWNER key
  session.ts                JWT sign/verify (edge-safe, used by middleware)
  auth.ts                   getSession / requireSession for route handlers
  password.ts               bcrypt hash/verify (node runtime)
  users.ts                  users table queries
  validation.ts             zod schemas + upload limits
  rate-limit.ts             in-memory login throttle
middleware.ts               auth gate for every route
db/schema.sql               users + jobs + settings (run once in Neon)
tests/                       vitest unit tests (calc, session, password, validation)
.github/workflows/ci.yml     typecheck · lint · test · build on every push
```

### Security

- All `/api/*` routes (except `/api/auth/*`) require a valid session — enforced in middleware **and** re-checked in each handler (defence in depth).
- Inputs are validated with **zod** before they touch the database; queries are parameterized via Neon tagged templates.
- Login/setup are **rate-limited** per IP; login returns a single generic error and runs a constant-time hash compare to avoid user enumeration.
- Strict security headers (CSP, HSTS, `X-Frame-Options`, `nosniff`, `Permissions-Policy`) are set in `next.config.js`.
- Cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.

---

## Setup — do these in order

### 1. Create the Neon database
1. [neon.tech](https://neon.tech) → new project (pick a region near you).
2. Open **SQL Editor**, paste the contents of [`db/schema.sql`](db/schema.sql), and run it.
3. Copy the **connection string** (Connection Details → `postgresql://…?sslmode=require`).

### 2. Create a Vercel Blob store
Vercel → **Storage → Create → Blob**. Copy the `BLOB_READ_WRITE_TOKEN`.

### 3. Configure environment
```bash
cp .env.local.example .env.local
# then fill in:
#   DATABASE_URL          (Neon connection string)
#   BLOB_READ_WRITE_TOKEN (Vercel Blob token)
#   AUTH_SECRET           (openssl rand -base64 48)
```

### 4. Run locally
```bash
npm install
npm run dev          # http://localhost:3000
```
On first visit you’ll be prompted to **create the shop account**. After that it’s a normal sign-in.

### 5. Deploy to Vercel
1. Push to GitHub and import the repo in Vercel.
2. Add `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `AUTH_SECRET` under **Settings → Environment Variables**.
3. Deploy. (The Neon and Vercel Blob integrations set their tokens automatically if you add them through the Vercel Marketplace.)

---

## Development

```bash
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm test             # vitest unit tests
npm run build        # production build
```

CI runs typecheck → lint → test → build on every push (`.github/workflows/ci.yml`).

---

## Honest limitations

- **Single shop, single account.** Multi-user with roles and per-user data isolation is not built — every authenticated session sees the same shared pool of jobs (`owner = 'shop'`). The schema and queries are structured so this can become a real `user_id` later.
- **Rate limiting is in-memory**, so it’s per-serverless-instance — good enough as a brute-force brake for an internal tool, but use a shared store (e.g. Upstash) if you expose this widely.
- **JSONB line items.** Items live inside the job row as JSON — simple and fast, but cross-job reporting (“revenue from wraps last month”) would want line items in their own table.
- **No payment integration.** Records a deposit and balance; it doesn’t take payment.
