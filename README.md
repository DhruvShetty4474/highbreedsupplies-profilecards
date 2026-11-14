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
