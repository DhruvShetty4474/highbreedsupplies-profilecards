-- HIGHBREED seed data
-- Run after creating auth users (or use scripts/seed.ts with service role).
-- Demo UUIDs — replace with real auth.users ids in production seeding.

-- Example batch
INSERT INTO public.card_batches (batch_id, label, quantity, notes)
VALUES ('BATCH-2026-001', 'Factory Run A — Mumbai', 25, 'Initial HighCard production')
ON CONFLICT (batch_id) DO NOTHING;

-- Unprogrammed / unclaimed sample cards (tokens are illustrative)
INSERT INTO public.cards (
  card_id, public_token, nfc_url, qr_url, status, batch_id, programming_verified
) VALUES
  ('HB000001', 'tok_hb000001_demo', 'https://highbreedsupplies.com/c/tok_hb000001_demo', 'https://highbreedsupplies.com/c/tok_hb000001_demo', 'UNCLAIMED', 'BATCH-2026-001', false),
  ('HB000002', 'tok_hb000002_demo', 'https://highbreedsupplies.com/c/tok_hb000002_demo', 'https://highbreedsupplies.com/c/tok_hb000002_demo', 'UNCLAIMED', 'BATCH-2026-001', true),
  ('HB000003', 'tok_hb000003_demo', 'https://highbreedsupplies.com/c/tok_hb000003_demo', 'https://highbreedsupplies.com/c/tok_hb000003_demo', 'BLOCKED', 'BATCH-2026-001', true)
ON CONFLICT (card_id) DO NOTHING;
