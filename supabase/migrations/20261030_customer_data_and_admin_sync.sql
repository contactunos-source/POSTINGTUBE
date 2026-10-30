-- ==============================================================================
-- POSTINGTUBE: COMPLETE SUPABASE CUSTOMER DATA & ADMIN SYNCHRONIZATION MIGRATION
-- Run this migration in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mdykqpqhuwfpondyqnms/sql/new
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Customer Profiles Table (Linked to Google Auth users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'creator', 'agency', 'owner')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'creator_pro', 'agency_scale')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    payment_status TEXT NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'past_due', 'cancelled')),
    razorpay_customer_id TEXT,
    stripe_customer_id TEXT,
    country TEXT DEFAULT 'India',
    region TEXT,
    city TEXT,
    device_category TEXT DEFAULT 'desktop',
    browser TEXT DEFAULT 'Chrome',
    os TEXT DEFAULT 'Windows',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'creator_pro', 'agency_scale')),
    plan_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
    provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'razorpay', 'manual')),
    provider_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days') NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'razorpay', 'manual')),
    provider_payment_id TEXT NOT NULL UNIQUE,
    provider_order_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'pending')),
    payment_method TEXT DEFAULT 'card',
    error_code TEXT,
    error_description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customer Activity & Publishing Event Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    user_email TEXT,
    event_type TEXT NOT NULL,
    record_type TEXT,
    record_id TEXT,
    description TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created ON public.user_profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_txns_user ON public.payment_transactions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs (user_id, created_at DESC);

-- 7. Row Level Security Policies (Allow all operations for application & admin access)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for user_profiles" ON public.user_profiles;
CREATE POLICY "Allow all for user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for subscriptions" ON public.subscriptions;
CREATE POLICY "Allow all for subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow all for payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for activity_logs" ON public.activity_logs;
CREATE POLICY "Allow all for activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 8. Automatic Supabase Auth Trigger (Google & Email Registration -> User Profile)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 9. Backfill all existing auth.users into public.user_profiles
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
