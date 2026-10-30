-- ==============================================================================
-- POSTINGTUBE: AUTOMATIC SUPABASE AUTH -> USER PROFILES SYNCHRONIZATION TRIGGER
-- Run this migration in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mdykqpqhuwfpondyqnms/sql/new
-- ==============================================================================

-- 1. Ensure user_profiles table exists with all required fields
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'customer',
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'free',
  billing_cycle TEXT DEFAULT 'monthly',
  payment_status TEXT DEFAULT 'free',
  country TEXT DEFAULT 'India',
  city TEXT,
  device_category TEXT DEFAULT 'desktop',
  browser TEXT DEFAULT 'Chrome',
  os TEXT DEFAULT 'Windows',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles (created_at DESC);

-- 3. Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for user_profiles" ON public.user_profiles;
CREATE POLICY "Allow all for user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. Function to automatically insert or update user_profiles when a user is created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    status,
    plan,
    created_at,
    last_active_at,
    updated_at
  )
  VALUES (
    new.id::text,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    'customer',
    'active',
    'free',
    COALESCE(new.created_at, NOW()),
    COALESCE(new.last_sign_in_at, new.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    last_active_at = COALESCE(EXCLUDED.last_active_at, public.user_profiles.last_active_at),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on auth.users for INSERT and UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Immediate Backfill: Copy all existing auth.users into public.user_profiles
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  avatar_url,
  role,
  status,
  plan,
  created_at,
  last_active_at,
  updated_at
)
SELECT
  u.id::text,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''),
  'customer',
  'active',
  'free',
  COALESCE(u.created_at, NOW()),
  COALESCE(u.last_sign_in_at, u.created_at, NOW()),
  NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
  last_active_at = COALESCE(EXCLUDED.last_active_at, public.user_profiles.last_active_at),
  updated_at = NOW();
