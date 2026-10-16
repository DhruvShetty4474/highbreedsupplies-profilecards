# HIGHBREED — HighCard / NTAG213 NFC Platform

Linq-class digital business cards with physical NFC/QR HighCards, dual role dashboards, and visitor lead capture.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **login**.

### Demo credentials (role auto-detected)

| Login ID | Password | Role |
|----------|----------|------|
| `admin` | `123123` | Admin console |
| `pranay` | `pranay123` | Customer dashboard |

Only **admin** can create customer login IDs (`/admin/customers`).

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

- Next.js 14 App Router · Tailwind · Supabase · Cloudflare R2 · Vercel ISR

## Layout

- `/login` — credential login (no role picker)
- `/admin` — sidebar SaaS: customers, card inventory, NFC programming
- `/dashboard` — customer workspace: reaches, shares, leads, profile editor, devices
- `/[username]` · `/c/[token]` — public mobile profile cards
