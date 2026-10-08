# One2Infinite — Internal Business Management System (Phase 1)

A private, secure internal web application for **One2Infinite Recruitment Solutions** to manage
clients, jobs, candidates, placements, recruitment fees, invoices, payments, attendance, leave and
basic payroll — replacing manual Excel tracking.

> ⚠️ **Not yet production-ready.** This code has been written but **not yet run, built, or tested**
> in a live environment (it was authored in a sandbox without npm access). You must install
> dependencies, run migrations and verify it before relying on it. See **Known Limitations** below.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn-style components + Recharts |
| Database | PostgreSQL via Prisma ORM |
| Auth | Auth.js (NextAuth v5) credentials + Argon2id |
| PDF | @react-pdf/renderer (invoices) |
| Money | `decimal.js` + Postgres `NUMERIC` (never floats) |
| Hosting | Vercel + managed Postgres (Neon) + private blob storage |

Brand colours (gold `#F4C430`, navy `#1a1a2e`, Inter) match the public One2Infinite site.

---

## Architecture

- **Route groups:** `(public)` is reserved for marketing content; `(app)` is the private system
  behind authentication. The existing public website (Astro on Cloudflare Pages) is **separate and
  untouched** — this app is deployed on its own subdomain, e.g. `app.one2infinite.com`.
- **Server-side authorization everywhere.** Every mutation and sensitive read runs an
  `authorize()` / `requirePermission()` guard on the server (`src/lib/auth/guards.ts`). The sidebar
  and middleware only *hide* things — they are never the security boundary.
- **RBAC is table-driven** (`roles`, `permissions`, `role_permissions`). Two seed roles:
  `SUPER_ADMIN` (you — full access) and `RECRUITER` (restricted). New granular roles can be added by
  seeding a role with a subset of permission keys — no code changes to the auth layer.
- **Centralized business logic** in `src/lib/services/` (fee calc, invoice totals, payment balance,
  attendance, payroll, guarantee dates). One source of truth; all Decimal-safe.
- **Financial safety:** invoices and payments are never hard-deleted — they move to
  `CANCELLED` / reversed states and are retained for audit.

### Data model
See `prisma/schema.prisma`. Key tables: `users, roles, permissions, role_permissions, employees,
attendance, leave_requests, payslips, clients, client_contacts, recruitment_terms, jobs, candidates,
candidate_applications, placements, invoices, invoice_items, payments, expenses, tasks, documents,
notifications, audit_logs, company_settings`.

---

## Local Setup

> Requires **Node 18.18+** and network access to the npm registry.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
#   Fill in DATABASE_URL + DIRECT_URL (Neon), AUTH_SECRET (openssl rand -base64 32),
#   and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.

# 3. Create the database schema
npx prisma migrate dev --name init     # first time (creates migration + applies)
#   OR, against an existing prod DB:  npx prisma migrate deploy

# 4. Seed roles, settings and the Super Admin
npm run db:seed
#   To also load fictional demo data (spec §51): set SEED_DEMO=1 before seeding.

# 5. Run
npm run dev    # http://localhost:3000  -> redirects to /login
```

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set. **Change the password
immediately** from *My Profile*.

---

## Deployment (Vercel + Neon)

1. Push this repo to GitHub and **import it into Vercel**.
2. Create a **Neon** Postgres database. Add to Vercel env vars:
   - `DATABASE_URL` — pooled connection string (`?sslmode=require&pgbouncer=true`)
   - `DIRECT_URL` — direct connection string (for migrations)
   - `AUTH_SECRET`, `NEXTAUTH_URL`/`AUTH_URL` (`https://app.one2infinite.com`)
   - `CRON_SECRET` (any long random string)
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (for the seed step)
3. Run migrations against Neon: `npx prisma migrate deploy` (locally with prod `DATABASE_URL`, or a
   one-off deploy step). Then `npm run db:seed` once.
4. **Custom domain:** add `app.one2infinite.com` in Vercel → create the CNAME at your DNS →
   automatic HTTPS.
5. The nightly overdue-invoice cron is configured in `vercel.json`.

### Estimated monthly cost
Vercel Hobby **$0** · Neon free tier **$0** · blob storage **~$0** → **~$0/month to start**, scaling
to ~$20–40/month only as data/traffic grows. No VPS, no server administration.

---

## Phase 1 — What's Included

Authentication & RBAC · Admin dashboard (KPIs + charts) · Employee dashboard · Clients CRM + terms ·
Jobs + per-job pipeline · Candidates (deduped) + applications · Placements + fee calculation +
replacement-guarantee tracking · Invoice builder + professional PDF + sequential numbering +
GST-ready (disabled) · Payments (partial, auto status, outstanding/overdue) · Expenses · Employees
(admin-only salary/bank + login provisioning) · Attendance (mobile clock in/out) · Leave
(apply/approve) · Basic payroll + payslips · Company settings · Audit log · Finance report · Seed
demo data.

### End-to-end flow (spec §48) — verify this after setup
Create client *ABC* (6% of annual CTC, 15-day payment, 30-day replacement) → create job *Data
Analyst* → add candidate → move to **Selected** → **Create Placement** (joining CTC ₹6,00,000 →
fee auto-calculates to **₹36,000**) → **Generate Invoice** (`OI-YYYY-####`, due = joining + 15d) →
record payment ₹36,000 → invoice flips to **PAID** → dashboard revenue +₹36,000, outstanding ₹0,
placements +1.

---

## Phase 2A — What's Included (added)

Payslip PDF (admin: any; employee: own) · Leave balances with configurable
annual quotas + auto-deduct on approval · Tasks & reminders (Overdue/Today/
Upcoming) · In-app notifications (bell + auto events: leave requested/decided,
invoice overdue) · Expense reports (category pie + monthly trend) · Admin CSV
export (invoices, payments, placements, expenses).

> **Phase 2A requires a database migration** (new `leave_balances` table +
> leave-quota columns on `company_settings`). After pulling, run:
> ```bash
> npx prisma migrate dev --name phase2a
> npx prisma generate
> ```

Still pending (Phase 2B): document uploads (Vercel Blob) and email (SMTP).

## Known Limitations (Phase 1)

- **Not yet run/tested.** Authored without a runnable environment — expect to fix minor issues on
  first `npm install && npm run build`. Treat as a reviewed draft, not a verified release.
- **Document uploads** are not wired yet. The model + permissions + private-storage approach are in
  place; file upload via Vercel Blob/R2 (signed URLs, never public) is Phase 2.
- **Email sending** is intentionally not implemented. Invoice email text is generated for
  copy/paste only; SMTP/Gmail is Phase 2 (spec §35).
- **Payroll is basic** (working days, present/leave, LOP, net). No statutory PF/ESI/TDS, no payslip
  PDF yet, no leave-balance accrual engine. No money is ever transferred.
- **Attendance regularization requests** (edit via approval) are Phase 2; employees can only clock
  in/out, which is by design.
- **Per-IP login rate limiting**: account-level lockout is implemented; add Vercel Firewall or an
  Upstash-based per-IP limiter in production for defence in depth.
- **2FA** is schema-ready (`twoFactorSecret`) but the enrolment/verify UI is Phase 2/3.
- **CSV/Excel financial export** is Phase 2.
- **Tasks/notifications** tables exist but have minimal UI in Phase 1.

## Invoice PDF fonts

The invoice PDF registers **Noto Sans** (bundled in `src/lib/pdf/fonts/`) so the
Indian Rupee sign (₹) and other glyphs render correctly — the built-in
Helvetica font cannot render ₹. These TTF files ship in the repo, so PDF
generation works offline with no network fetch.

> **Vercel note:** when deploying, ensure the `src/lib/pdf/fonts/*.ttf` files are
> included in the serverless bundle (they are inside `src/`, which Next traces;
> if the font path fails on Vercel, switch `Font.register` to a hosted TTF URL).

## Security Notes

- Passwords: Argon2id, strong-password policy, account lockout after repeated failures.
- Sessions: JWT in httpOnly/Secure/SameSite cookies (8h), server-validated.
- All input validated with Zod; all DB access parameterized via Prisma (SQL-injection safe).
- Security headers (HSTS, X-Frame-Options DENY, nosniff, etc.) in `next.config.mjs`; app is
  `noindex`.
- Secrets only via env vars — never committed. `.env*` is gitignored.
- Audit log records logins and all sensitive mutations with before/after where practical.
- **Database backups:** Neon provides automated backups + point-in-time restore on its paid tiers;
  the free tier offers basic history. Recommended: enable Neon backups and/or a scheduled
  `pg_dump` to private object storage (documented, Admin-only restore).

## Phasing
- **Phase 1 (this repo):** core recruitment-to-billing + basic HR, as above.
- **Phase 2:** documents upload, payslip PDF, leave balances, expenses reports, CSV export,
  tasks/notifications UI, attendance regularization, email (SMTP).
- **Phase 3:** WhatsApp, AI candidate matching, advanced analytics, client portal, 2FA UI.

---

_Demo data is fictional. Do not enter real candidate/client/employee data until you have reviewed
and verified the system._
