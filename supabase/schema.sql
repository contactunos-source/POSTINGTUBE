-- ==============================================================================
-- PostBridge Database Schema for Supabase & PostgreSQL
-- Copy and paste this ENTIRE script into your Supabase SQL Editor and click RUN
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL DEFAULT 'My Workspace',
    slug TEXT NOT NULL UNIQUE DEFAULT 'main',
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Connected Social Accounts Table
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    account_type TEXT DEFAULT 'page',
    access_token TEXT NOT NULL,
    page_id TEXT,
    status TEXT DEFAULT 'connected',
    followers_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media JSONB DEFAULT '[]'::jsonb,
    target_account_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    post_type TEXT DEFAULT 'post',
    platform_overrides JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    first_comment TEXT,
    collaborators TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft',
    results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Durable Background Publishing Queue
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id TEXT REFERENCES public.posts(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Indexes for Performance & Instant Querying
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_date ON public.scheduled_jobs (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON public.posts (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform ON public.connected_accounts (platform);

-- 7. Row Level Security (RLS) - Permissive for Anon & Authenticated Web Client
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for workspaces" ON public.workspaces;
CREATE POLICY "Allow all for workspaces" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for connected_accounts" ON public.connected_accounts;
CREATE POLICY "Allow all for connected_accounts" ON public.connected_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for posts" ON public.posts;
CREATE POLICY "Allow all for posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for scheduled_jobs" ON public.scheduled_jobs;
CREATE POLICY "Allow all for scheduled_jobs" ON public.scheduled_jobs FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed Default Workspace and Connected Facebook Account
INSERT INTO public.workspaces (id, name, slug, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'U NOS Digital Marketing', 'unos-digital-marketing', 'owner')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connected_accounts (id, workspace_id, platform, username, display_name, avatar_url, account_type, access_token, page_id, status)
VALUES (
    'fb_868941086292404',
    '00000000-0000-0000-0000-000000000001',
    'facebook',
    'unosdigitalmarketing',
    'U NOS Digital marketing',
    'https://scontent.fhyd14-1.fna.fbcdn.net/v/t39.30808-1/559110494_122093677857072386_1644291893333566859_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=106&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=f907e8&_nc_ohc=tZoTblvaavEQ7kNvwEoCgQP&_nc_oc=Adp-VJrC03UjJKc0eeWkndk_bQZPtDzqLtNVTu_efYErldQBYTFQrNsyYaDSJsqHagfB18iseyANs9DLPrcaiiPy&_nc_zt=24&_nc_ht=scontent.fhyd14-1.fna&edm=AJdBtusEAAAA&_nc_gid=SucoqeYkwX8jiJ9x6-GprA&_nc_tpa=Q5bMBQJ0aTi1Z9bXXMOqSGXbXOfKZ9TulrS_k4YePsv0_8e45yLFosLLewPqFETuRjLJNux4THkAfvVEgw&oh=00_AQP6T9kysTTUwD2oMayNWxc21earpv63aKQTdnT9Ts7htQ&oe=6ADF9E9C',
    'page',
    'EAAc25SQTmPMBS5qCywTAtDkeRmNdEoaDKQFOrwqlVCNA1zH5VEgjv77BDWoqDZAANqqauOyi8ZBg8uyCBwe1ZCVbGy4A8dm87lPiAZCLSXvbDBBl7RuCqiZAhAdwWaDEeZC32kz1OKsptbxNjbtLkOsmsqM6CG8ftfrrZB58Giz3fT1EC1bOH0gIiX6ZAW5Ey0fCfYUMzAQi',
    '868941086292404',
    'connected'
)
ON CONFLICT (id) DO UPDATE 
SET access_token = EXCLUDED.access_token,
    status = 'connected',
    updated_at = NOW();
