-- HIGHBREED — Initial schema
-- Physical cards ↔ profiles ↔ visitor leads with strict relational integrity

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.card_status AS ENUM ('UNCLAIMED', 'ACTIVE', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  banner_url TEXT,
  video_url TEXT,
  phone TEXT,
  email TEXT,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '{
    "show_hero": true,
    "show_save_contact": true,
    "show_exchange_contact": true,
    "show_quick_actions": true,
    "show_about": true,
    "show_video": true,
    "show_social": true,
    "show_business": true,
    "show_lead_banner": true,
    "section_order": ["about", "video", "social", "business"]
  }'::jsonb,
  role public.app_role NOT NULL DEFAULT 'client',
  theme JSONB NOT NULL DEFAULT '{"accent":"#0E7C66","surface":"#F4F7F5"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]{3,32}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ---------------------------------------------------------------------------
-- Card batches (printing / factory runs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.card_batches (
  batch_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_by UUID REFERENCES public.profiles (user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Physical NFC / QR cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
  card_id TEXT PRIMARY KEY,
  public_token TEXT NOT NULL UNIQUE,
  nfc_url TEXT NOT NULL,
  qr_url TEXT NOT NULL,
  nfc_uid TEXT,
  status public.card_status NOT NULL DEFAULT 'UNCLAIMED',
  user_id UUID REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  batch_id TEXT REFERENCES public.card_batches (batch_id) ON DELETE SET NULL,
  programmed_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  programming_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_token ON public.cards (public_token);
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards (status);
CREATE INDEX IF NOT EXISTS idx_cards_user ON public.cards (user_id);
CREATE INDEX IF NOT EXISTS idx_cards_batch ON public.cards (batch_id);

-- ---------------------------------------------------------------------------
-- Visitor leads captured from public profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cardholder_user_id UUID NOT NULL REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  visitor_phone TEXT,
  visitor_note TEXT,
  source_card_id TEXT REFERENCES public.cards (card_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_cardholder ON public.leads (cardholder_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Programming verification audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.card_programming_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id TEXT NOT NULL REFERENCES public.cards (card_id) ON DELETE CASCADE,
  verified_by UUID REFERENCES public.profiles (user_id),
  nfc_payload_readback TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  device_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_cards_updated ON public.cards;
CREATE TRIGGER trg_cards_updated
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6);
  END IF;
  final_username := SUBSTRING(base_username FROM 1 FOR 28);

  INSERT INTO public.profiles (user_id, username, full_name, email, role)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client')
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_programming_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles
CREATE POLICY "Public profiles are readable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Cards
CREATE POLICY "Anyone can read cards by token flow"
  ON public.cards FOR SELECT
  USING (true);

CREATE POLICY "Admins manage cards"
  ON public.cards FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients claim / update linked cards"
  ON public.cards FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

-- Leads
CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Cardholders read own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = cardholder_user_id OR public.is_admin());

CREATE POLICY "Cardholders delete own leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = cardholder_user_id OR public.is_admin());

-- Batches & programming logs (admin)
CREATE POLICY "Admins manage batches"
  ON public.card_batches FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage programming logs"
  ON public.card_programming_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
