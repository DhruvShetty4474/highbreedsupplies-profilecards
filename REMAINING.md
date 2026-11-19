# HIGHBREED — what's remaining

Hand-off file for the owner or any AI assistant picking this up.
Read this first, then `README.md` (setup, deploy, going-live checklist).
Last updated: 2026-11-18.

---

## Current state (as of the last commit)

| Area | Status |
|---|---|
| Code | Production-ready on branch **`production-d1-r2-workers`** (not pushed, not merged to `main`) |
| Stack | Next.js 15 → Cloudflare Workers (OpenNext), D1 database, Better Auth, R2 (media, not enabled yet) |
| Tests | `npm test`: 48 passing. Also `npm run typecheck`, `npm run lint` and `npm run build` pass |
| Cloudflare account | `highbreedworkflow1360@gmail.com` · Account ID `4244994a3730fd21882bb81aab058375` |
| D1 database | `highbreed` (APAC) · ID `dc8822d5-e79b-4eeb-b4eb-2f808efa7b68` · all migrations applied |
| Worker | `highbreed`, created. **Not reachable yet** (no domain attached) |
| Secrets set | `BETTER_AUTH_SECRET`, `ADMIN_EMAILS` (= highbreedworkflow1360@gmail.com, finorex59@gmail.com) |
| Domain | **`highfis.com`**, being moved from Hostinger to Cloudflare (step 1 below) |
| Media (R2) | Deliberately postponed; uploads show "Media storage is not configured" |

### Rules for anyone working on this

- **Never** use or reference `arkasoftware` / `arkasoftware@zohomail.in` in this project.
  Admin and client email: `highbreedworkflow1360@gmail.com`. Developer email: `finorex59@gmail.com`.
- The domain is **highfis.com**. The brand name is "HIGHBREED SUPPLIES".
- **Don't create card batches or program NFC cards until highfis.com is live.**
  Each card's URL (`https://highfis.com/c/<token>`) is fixed at the moment the
  batch is created.
- Secrets go in `npx wrangler secret put NAME`, never in git.
- Work on a branch and commit per change. Don't push to `main` without the owner's OK.

---

## 1. Go live on highfis.com (do this first)

**Owner (in the browser):**

1. Cloudflare → `highfis.com` → DNS records: leave them empty (the Worker
   creates its own) → **Continue to activation**.
2. Copy the **two Cloudflare nameservers** shown (e.g. `xxx.ns.cloudflare.com`).
3. Hostinger → Domains → `highfis.com` → **Nameservers → Change** → custom →
   paste both → save.
4. Cloudflare → **Check nameservers now**. Wait for the status **Active**
   (minutes to a few hours; you'll get an email).

**Developer / AI (once the domain shows Active):**

1. In `wrangler.jsonc`:
   - uncomment the `routes` block (`highfis.com` and `www.highfis.com`, `custom_domain: true`)
   - set `"workers_dev": false`
   - make sure `vars.APP_URL` is `"https://highfis.com"`
2. Deploy and check:
   ```bash
   npx wrangler whoami                 # must show highbreedworkflow1360@gmail.com's account
   npm test && npm run deploy
   curl -I https://highfis.com/login   # expect 200
   ```
3. Owner registers at `https://highfis.com/register` with
   `highbreedworkflow1360@gmail.com`. They get admin automatically (`/admin` opens).
4. Smoke test: Admin → Cards → create a 1-card batch → open its `/c/<token>`
   link on a phone → register → profile shows → block the card → link shows
   "Card disabled".
5. Commit the `wrangler.jsonc` change.

---

## 2. Services to switch on later (no code changes needed)

Full steps for each are in the README's **Going live checklist**.

| Service | Why | Cost | What to set |
|---|---|---|---|
| **R2 media** | Profile photo, banner, gallery, video uploads | Free up to 10 GB stored. **Needs a card on file and auto-bills above the free tier; there is no hard cap.** Set billing alerts | Dashboard: add R2 subscription → `npx wrangler r2 bucket create highbreed-media` → custom domain `media.highfis.com` → `npx wrangler r2 bucket cors set highbreed-media --file docs/r2-cors.json` → API token → secrets `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` → redeploy |
| **Resend email** | Real password-reset and verification emails (right now they're only printed to the Worker log) | Free tier 3,000/month | Verify `highfis.com` in Resend (DNS records go in Cloudflare) → secret `RESEND_API_KEY` → optionally var `EMAIL_FROM` |
| **Google sign-in** | "Continue with Google" button | Free | Google Cloud Console → OAuth client (Web). Redirect URI `https://highfis.com/api/auth/callback/google` → secrets `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Nightly backups** | D1 export to R2 every night (needs R2) | Free | `npx wrangler r2 bucket create highbreed-backups`; GitHub repo secrets `CLOUDFLARE_API_TOKEN` (D1 Edit + R2 Edit) and `CLOUDFLARE_ACCOUNT_ID` |
| **Sentry** | Error alerts | Free tier | Secret `SENTRY_DSN` |

After setting secrets: `npm run deploy`.

---

## 3. Features requested but not built yet

### 3.1 Email OTP login + registration — DONE (2026-11-19)
- Registration: name, email, password → 6-digit code by email → signed in.
- Login: password, or "Email code" (passwordless). Unverified accounts get a
  fresh code when they sign in with their password.
- Better Auth `emailOTP` plugin, codes hashed, 10 min expiry, 5 tries.
- **Needs `RESEND_API_KEY` in production.** Without it codes are only printed
  to `npx wrangler tail`, so real customers can't register.
- Phone/SMS OTP was dropped in favour of email (no DLT/SMS cost).

### 3.2 Card activation, managers, payments, invoices — DONE (2026-11-19)
Flow: scan card → `/register?card=…` → email OTP → `/activate/<token>`
→ (1) type the code printed on the card (`HB000123`) → card RESERVED and the
customer is referred to the batch's manager → (2) payment form (name, mobile,
email, optional GSTIN, address with "Use my location", T&C) →
**UPI** (Razorpay Checkout, signature checked server-side + webhook backup)
or **Cash** (manager taps *Approve cash* on `/manager`, reads out a one-time
6-digit code, valid 30 min, 5 tries) → card ACTIVE → invoice `HB/2026-27/0001`
at `/invoice/<order>` (print / save as PDF, CGST+SGST or IGST).

- Roles: `admin`, `manager`, `client`. Admin → Customers → *Make manager*.
- Admin → Card inventory: pick the manager when generating a batch (or change it per batch).
- Admin → Settings → *Pricing & invoices*: card price (GST-inclusive), GST %,
  GSTIN, address, HSN, T&C. **Price 0 = payments off.**
- Razorpay secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET` (webhook URL `https://highfis.com/api/webhooks/razorpay`,
  events `payment.captured` + `order.paid`). Without keys the UPI button is disabled; cash works.
- Paying is now the only way a customer card becomes ACTIVE (dashboard
  "claim" and signup no longer activate cards).
- Not built: refunds/cancellation UI, invoice emails, invoice PDFs stored in R2.

### 3.2b Phase 2 (agreed, not started)
- Attendance: manager log in / log out with location.
- Salary & incentive calculation report. **Needs the salary and incentive rules from the owner.**

### 3.3 "VCF contact auto saving form" (client feedback)
- **Done:** Save Contact now serves the vCard inline. iPhone opens the
  "Add Contact" sheet directly. Android downloads it and the visitor taps
  Open → Contacts; no website can save into Android contacts directly.
- **Still unclear:** the client may instead want visitors who fill the
  "Share your info" form to be saved into the cardholder's phone contacts.
  Leads are already stored (Dashboard → Contacts). A possible addition is a
  "Download as .vcf" button per lead, or export of all leads.
  **Confirm with the client before building.**

### 3.4 Smaller items
- [ ] Terms of Use and Privacy Policy pages. The links in Settings still
      point to `#`, and these pages are needed because the site collects
      visitor details.
- [ ] Optional: Cloudflare Turnstile (free) on register and the lead form if spam appears.
- [ ] Optional: email OTP login (free) as a stop-gap for 3.1.
- [ ] Optional: an admin view for cards of deleted accounts. They're
      auto-BLOCKED today; unblock them by hand in Admin → Cards.
- [ ] Push the branch and open a PR to `main` once live and verified.
- [ ] The old Vercel demo (`*.vercel.app`) still runs the old demo code.
      Retire it once highfis.com is live so the client stops testing there.

---

## 4. Known limitations

- Admin-created customers with no email get a placeholder address
  (`<username>@customers.highbreed.invalid`) and can't reset their password
  by email until an admin adds a real one.
- R2 uploads, Resend and Sentry have only been tested with fakes or mocks
  (no keys were available). Test each one once after you add its key.
- 4 old commits on `main` carry a previous author email. They were left
  alone on purpose to avoid rewriting published history.

---

## 5. Handy commands

```bash
npm run dev                          # local app (needs .env.local, see .env.example)
npm run db:migrate:local && npm run db:seed:local
npm test                             # 48 tests
npm run deploy                       # build + deploy the Worker
npm run db:migrate:remote            # apply new migrations to production D1
npm run admin:grant -- <email> --remote   # make an existing account admin
npx wrangler secret put <NAME>       # set a production secret
npx wrangler tail                    # live production logs (emails print here when Resend is off)
```

Schema changes: edit `src/db/schema.ts` → `npm run db:generate` →
check the SQL in `migrations/` → `npm run db:migrate:local` → test →
`npm run db:migrate:remote` → deploy.
