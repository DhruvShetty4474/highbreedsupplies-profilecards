# HIGHBREED — What each section is for

## Public entry
| Route | Purpose |
|-------|---------|
| `/login` | Sign in with email or Login ID + password. Role (admin vs customer) comes from the account. |
| `/register` | Customer self-signup (email + password + username). `/signup` redirects here. Admin can still create accounts and sees all users under Customers. |

## Admin console (`/admin`)
| Section | Purpose |
|---------|---------|
| **Overview** | Quick Actions (Edit Profile, Share, …) plus live card/customer counts. |
| **Customers** | Create login IDs and **edit any customer profile** with live visitor preview. |
| **Share pages** | Customer list → per-page Share screen (QR, link, Offline, 8 options, Setup Quick Share). |
| **Card inventory** | Generate batches of HighCards with unique `card_id` + secret `public_token` URLs. |
| **NFC programming** | Pull the exact URL for NXP TagWriter, then verify read-back so a failed write stays unprogrammed. |
| **Settings** | Sign out / support. |

### Provisioning API (factory)
`GET /api/admin/cards/{card_id}/programming-data` (admin session required) returns:

- `nfc_url` / `qr_url` — what to write on the NTAG213 chip and print as QR  
- `programming_status` — `UNPROGRAMMED` or `PROGRAMMED` (separate from ACTIVE)  
- Does **not** put name/phone on the chip — only the shortcut URL  

`POST /api/admin/cards/{card_id}/verify` confirms read-back matched before marking programmed.

## Customer dashboard (`/dashboard`)
| Section | Purpose |
|---------|---------|
| **Overview** | Reaches (page views), shares, contact saves, leads. Starts at 0 and grows with real use. |
| **Profile editor** | Toggle blocks, edit avatar/banner, add **images / galleries / video / text / files**, social links. Live preview on the right. |
| **Share** | Same Share tools as admin (QR, link, Offline, share options, Setup Quick Share). |
| **Cards / Devices** | Claim an unclaimed programmed HighCard token to your account. |
| **Leads** | People who submitted “Share Your Info” on your public page. |
| **Settings** | Account info & sign out. |

## Public profile (`/[username]` or ACTIVE card `/c/{token}`)
| Block | Purpose |
|-------|---------|
| Hero | Banner + circular avatar + name |
| Save Contact | Downloads a `.vcf` contact file |
| Exchange Contact / Share Your Info | Visitor lead form → your Leads list |
| Quick actions | Call, Text, Email, Maps, Web |
| About / Media / Social / Business | Configurable content (not video-only) |

## Smart card router (`/c/{token}`)
| Status | What visitor sees |
|--------|-------------------|
| UNCLAIMED | Activation / claim screen |
| ACTIVE | Owner’s public profile |
| BLOCKED | Security disabled screen |
