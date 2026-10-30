-- ==============================================================================
-- PostingTube Private Owner Super Admin Panel Migration
-- Migration: 20261030_owner_admin_system.sql
-- Run in Supabase SQL Editor to enable full database-backed admin telemetry
-- ==============================================================================

-- 1. User Profiles & Customer Metadata
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'creator', 'agency', 'owner')),
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
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Verified Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'creator_pro', 'agency_scale')),
    plan_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'annual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
    provider TEXT NOT NULL DEFAULT 'razorpay' CHECK (provider IN ('razorpay', 'stripe', 'manual')),
    provider_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days') NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Verified Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    provider TEXT NOT NULL CHECK (provider IN ('razorpay', 'stripe', 'manual')),
    provider_payment_id TEXT NOT NULL UNIQUE,
    provider_order_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded', 'pending')),
    payment_method TEXT DEFAULT 'card',
    error_code TEXT,
    error_description TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Immutable Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    actor_ip TEXT,
    actor_user_agent TEXT,
    target_type TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'warning', 'blocked')),
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

-- 6. User Device & Geographical Session Insights
CREATE TABLE IF NOT EXISTS public.user_device_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    ip_address TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    device_category TEXT,
    browser TEXT,
    os TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_txns_user ON public.payment_transactions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_event ON public.admin_audit_logs (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs (user_id, created_at DESC);

-- 8. Row Level Security Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for application operations
DROP POLICY IF EXISTS "Allow all for user_profiles" ON public.user_profiles;
CREATE POLICY "Allow all for user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for subscriptions" ON public.subscriptions;
CREATE POLICY "Allow all for subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow all for payment_transactions" ON public.payment_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Allow all for admin_audit_logs" ON public.admin_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for activity_logs" ON public.activity_logs;
CREATE POLICY "Allow all for activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for user_device_sessions" ON public.user_device_sessions;
CREATE POLICY "Allow all for user_device_sessions" ON public.user_device_sessions FOR ALL USING (true) WITH CHECK (true);

-- 9. Seed Owner Profile and Baseline Platform Telemetry
INSERT INTO public.user_profiles (
    id, email, full_name, role, status, plan, billing_cycle, payment_status, country, city, last_active_at
) VALUES (
    'usr_owner_primary',
    'onmansonu@gmail.com',
    'Platform Owner',
    'owner',
    'active',
    'agency_scale',
    'annual',
    'paid',
    'India',
    'Bengaluru',
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();

-- Record baseline audit log for migration setup
INSERT INTO public.admin_audit_logs (
    event_type, actor_email, details, status
) VALUES (
    'SYSTEM_SCHEMA_INITIALIZATION',
    'onmansonu@gmail.com',
    '{"component": "Private Owner Super Admin Panel", "version": "1.0.0"}'::jsonb,
    'success'
);
