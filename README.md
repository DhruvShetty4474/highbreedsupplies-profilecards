# HIGHBREED — HighCard / NTAG213 NFC Platform

Linq-class digital business cards with physical NFC/QR HighCards, dual role dashboards, and visitor lead capture.

## Quick start (local, Cloudflare D1)

```bash
npm install
cp .env.example .env.local          # set BETTER_AUTH_SECRET (openssl rand -base64 32)
cp .env.local .dev.vars             # same values, for `npm run preview` (workerd)
npm run db:migrate:local            # applies ./migrations to a local D1 (.wrangler/)
npm run db:seed:local               # admin + sample client + 5 cards
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **login** with the email
or username printed by the seed script (defaults below; change them before production).

| Login | Password | Role |
|-------|----------|------|
| `admin@highbreedsupplies.com` | `HighbreedAdmin!23` | Admin console |
| `client@example.com` | `HighbreedClient!23` | Customer |

Roles are set only on the server: everyone who signs up is a `client`. Admins
come from the seed script or from `ADMIN_EMAILS` when that email signs up.

Schema changes: edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate:local`.

See [docs/SECTIONS.md](docs/SECTIONS.md) for what each screen is for.

## Client NFC flow (NTAG213)

1. **Factory** — Admin generates cards + unique `/c/{public_token}` URLs; write URL with NXP TagWriter; verify read-back → `PROGRAMMED` (still `UNCLAIMED`).
2. **Router** — Tap/scan → lookup token:
   - `UNCLAIMED` → activation / claim
   - `ACTIVE` → customer public profile
   - `BLOCKED` → security screen
3. **Profile** — Save Contact (`.vcf`) + Share Your Info leads + reach/share metrics.

Programming API (admin session required):

```http
GET /api/admin/cards/{card_id}/programming-data
POST /api/admin/cards/{card_id}/verify
```

## Stack

- Next.js 15 App Router · Tailwind · Cloudflare D1 (Drizzle) · Better Auth · Cloudflare R2 · Cloudflare Workers (OpenNext)

## Layout

- `/login` — credential login (no role picker)
- `/admin` — sidebar SaaS: customers, card inventory, NFC programming
- `/dashboard` — customer workspace: reaches, shares, leads, profile editor, devices
- `/[username]` · `/c/[token]` — public mobile profile cards

## Deploy (Cloudflare Workers + D1 + R2)

Everything runs on Cloudflare: one Worker (Next.js via OpenNext), one D1
database, one R2 bucket for media and one for backups. The Workers free plan is
enough to start; the Worker is ~1.6 MB gzipped (free limit 3 MB).

### 1. Move DNS from Hostinger to Cloudflare

1. Create a free Cloudflare account → **Add a domain** → `highbreedsupplies.com` → Free plan.
2. Cloudflare imports existing DNS records. Keep any **MX / TXT (email)** records
   you use at Hostinger; delete old **A/CNAME** records for `@` and `www`
   (the Worker will own them).
3. In **Hostinger → Domains → DNS / Nameservers → Change nameservers**, paste the
   two nameservers Cloudflare shows (e.g. `xxx.ns.cloudflare.com`).
4. Wait until Cloudflare says the zone is **Active** (minutes to a few hours).

### 2. Create D1 and run migrations

```bash
npx wrangler login
npx wrangler d1 create highbreed          # copy the database_id into wrangler.jsonc
npm run db:migrate:remote                 # applies ./migrations to production
```

### 3. R2 media bucket, public domain and CORS

```bash
npx wrangler r2 bucket create highbreed-media
npx wrangler r2 bucket create highbreed-backups      # private, for nightly D1 dumps
npx wrangler r2 bucket cors set highbreed-media --file docs/r2-cors.json
```

- Dashboard → **R2 → highbreed-media → Settings → Custom Domains → Connect
  Domain** → `media.highbreedsupplies.com`.
- Dashboard → **R2 → Manage R2 API Tokens → Create API token** →
  *Object Read & Write*, restricted to `highbreed-media`. Copy the Access Key
  ID, Secret Access Key, and your Account ID.

### 4. Secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET      # openssl rand -base64 32
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put ADMIN_EMAILS            # e.g. you@highbreedsupplies.com
```

Non-secret settings (`APP_URL`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, media
limits) live in `vars` in `wrangler.jsonc`.

### 5. Deploy

```bash
npm run preview     # optional: run the real Worker locally (workerd) on :8787
npm run deploy      # build with OpenNext + deploy; attaches the custom domains
```

`routes` in `wrangler.jsonc` attaches `highbreedsupplies.com` and
`www.highbreedsupplies.com` as Workers Custom Domains (DNS + TLS automatic).

> Windows: builds work, but if OpenNext ever misbehaves, run `npm run deploy` from WSL.

### 6. First admin

Either put your email in `ADMIN_EMAILS` **before** registering at `/register`,
or promote an existing account:

```bash
npm run admin:grant -- you@example.com --remote
```

### Backups

`.github/workflows/d1-backup.yml` exports D1 nightly to
`highbreed-backups/d1/*.sql.gz`. Add repo secrets `CLOUDFLARE_API_TOKEN`
(permissions: *D1 Edit*, *Workers R2 Storage Edit*) and
`CLOUDFLARE_ACCOUNT_ID`, then run it once via **Actions → Run workflow**.

Manual backup: `npm run db:backup`. Restore into a fresh database:

```bash
gunzip highbreed-<stamp>.sql.gz
npx wrangler d1 execute highbreed --remote --file highbreed-<stamp>.sql
```

## Going live checklist

Every setting is validated by [`src/config.ts`](src/config.ts) and documented in
[`.env.example`](.env.example). Optional services degrade gracefully: no
Resend key → emails are printed to the Workers log; no Sentry DSN → errors
are only logged; no R2 keys → uploads are disabled with a clear message.

| # | Service | Sign up / where | Paste into | How to test |
|---|---------|-----------------|-----------|-------------|
| 1 | **Cloudflare** (DNS, Workers, D1, R2) | [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) — free plan | — (`npx wrangler login`) | Zone shows **Active**; `npx wrangler whoami` |
| 2 | **Domain** at Hostinger | hPanel → Domains → Nameservers | Cloudflare's 2 nameservers | `nslookup -type=ns highbreedsupplies.com` shows `*.ns.cloudflare.com` |
| 3 | **D1 database** | `npx wrangler d1 create highbreed` | `database_id` in `wrangler.jsonc` | `npm run db:migrate:remote` lists all migrations ✅ |
| 4 | **Auth secret** | `openssl rand -base64 32` | `wrangler secret put BETTER_AUTH_SECRET` | Register at `/register`, sign out, sign in |
| 5 | **App URL** | — | `APP_URL` in `wrangler.jsonc` vars | Admin → Cards → export CSV: `nfc_url` starts with `https://highbreedsupplies.com/c/` |
| 6 | **First admin** | — | `wrangler secret put ADMIN_EMAILS` (before registering) or `npm run admin:grant -- you@x.com --remote` | `/admin` opens instead of redirecting |
| 7 | **R2 media** | Dashboard → R2 → create `highbreed-media`, custom domain `media.highbreedsupplies.com`, API token | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (secrets); `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (vars); CORS: `wrangler r2 bucket cors set highbreed-media --file docs/r2-cors.json` | Dashboard → Pages → upload a profile photo; it loads from `media.highbreedsupplies.com` |
| 8 | **Email (Resend)** — optional but needed for real password resets | [resend.com](https://resend.com) → add & verify domain `highbreedsupplies.com` (DNS records go in Cloudflare) → API key | `wrangler secret put RESEND_API_KEY`; `EMAIL_FROM` var | `/forgot-password` with your email → email arrives. Then optionally set `REQUIRE_EMAIL_VERIFICATION=true` |
| 9 | **Sentry** — optional | [sentry.io](https://sentry.io) → new project (Browser JavaScript) → copy DSN | `wrangler secret put SENTRY_DSN` | Errors from API routes appear in Sentry Issues |
| 10 | **Backups** | GitHub repo → Settings → Secrets → Actions | `CLOUDFLARE_API_TOKEN` (D1 Edit + R2 Edit), `CLOUDFLARE_ACCOUNT_ID` | Actions → *Nightly D1 backup* → Run; file appears in `highbreed-backups/d1/` |

Before announcing:

- [ ] Change or remove the seeded demo accounts (the seed script is for local only — don't run it on `--remote`).
- [ ] Program one physical card, verify read-back in Admin → Programming, tap it with a phone: activation page → register → profile.
- [ ] Block that card in Admin → Cards and tap again: "Card disabled".
- [ ] `npm run deploy` again after any `wrangler.jsonc` change.

## Tests

```bash
npm test            # vitest: 48 tests, in-memory SQLite with the real D1 migrations
npm run typecheck && npm run lint && npm run build
```

The suites run the real route handlers and Better Auth against libSQL, with
`next/headers` mocked as a cookie jar and an in-memory fake for R2:

- `cards.test.ts`: unique card_id/token generation (incl. concurrent
  batches, DB constraints, all-or-nothing batches), resolver for all four
  states, verify never changes `status`, second/concurrent claims fail,
  block/unblock, CSV.
- `authz.test.ts`: every `/api/admin/*` endpoint gives 401 to anonymous
  users and 403 to clients; no role escalation through signup, the raw
  Better Auth endpoints or a profile update.
- `media.test.ts`: types, per-file limits, quota (including the real size
  checked on completion), R2 deletion on remove/replace, YouTube parsing.
- `auth-flow.test.ts`: register/login/logout, login rate limiting,
  password reset (link, token reuse rejected), change password, delete
  account.
- `config.test.ts`: env validation messages and optional services.
