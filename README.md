# HIGHBREED — HighCard / NTAG213 NFC Platform

Linq-class digital business cards with physical NFC/QR HighCards, dual role dashboards, and visitor lead capture.

## Quick start (local, Cloudflare D1)

```bash
npm install
cp .env.example .env.local          # set BETTER_AUTH_SECRET (openssl rand -base64 32)
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
