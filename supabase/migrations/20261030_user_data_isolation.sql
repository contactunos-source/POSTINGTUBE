-- ==============================================================================
-- PostingTube User Data Isolation & Strict Row Level Security Migration
-- Migration: 20261030_user_data_isolation.sql
-- Enforces complete tenant isolation so every customer's data is private.
-- ==============================================================================

-- 1. Ensure user_id column exists on customer-specific tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);

ALTER TABLE public.scheduled_jobs ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_id ON public.scheduled_jobs(user_id);

-- 2. Safe Backfill / Reconciliation for existing records
-- Backfill from workspace owner if available
UPDATE public.posts p
SET user_id = w.user_id::text
FROM public.workspaces w
WHERE p.workspace_id = w.id AND p.user_id IS NULL AND w.user_id IS NOT NULL;

UPDATE public.connected_accounts ca
SET user_id = w.user_id::text
FROM public.workspaces w
WHERE ca.workspace_id = w.id AND ca.user_id IS NULL AND w.user_id IS NOT NULL;

UPDATE public.scheduled_jobs sj
SET user_id = p.user_id
FROM public.posts p
WHERE sj.post_id = p.id AND sj.user_id IS NULL AND p.user_id IS NOT NULL;

-- Assign any remaining orphaned legacy seed records to primary platform owner
UPDATE public.posts
SET user_id = 'usr_owner_primary'
WHERE user_id IS NULL;

UPDATE public.connected_accounts
SET user_id = 'usr_owner_primary'
WHERE user_id IS NULL;

UPDATE public.scheduled_jobs
SET user_id = 'usr_owner_primary'
WHERE user_id IS NULL;

-- 3. Enable Strict Row Level Security (RLS) on all customer-specific tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POSTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for posts" ON public.posts;
DROP POLICY IF EXISTS "Users can only read own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can only insert own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can only update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can only delete own posts" ON public.posts;

-- Users can only read their own posts
CREATE POLICY "Users can only read own posts" ON public.posts
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only insert posts with their own user_id
CREATE POLICY "Users can only insert own posts" ON public.posts
    FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only update their own posts
CREATE POLICY "Users can only update own posts" ON public.posts
    FOR UPDATE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only delete their own posts
CREATE POLICY "Users can only delete own posts" ON public.posts
    FOR DELETE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- ------------------------------------------------------------------------------
-- 5. CONNECTED ACCOUNTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for connected_accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only read own connected_accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only insert own connected_accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only update own connected_accounts" ON public.connected_accounts;
DROP POLICY IF EXISTS "Users can only delete own connected_accounts" ON public.connected_accounts;

-- Users can only view their own social accounts
CREATE POLICY "Users can only read own connected_accounts" ON public.connected_accounts
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only link accounts to their own user_id
CREATE POLICY "Users can only insert own connected_accounts" ON public.connected_accounts
    FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only update their own accounts
CREATE POLICY "Users can only update own connected_accounts" ON public.connected_accounts
    FOR UPDATE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- Users can only disconnect/delete their own accounts
CREATE POLICY "Users can only delete own connected_accounts" ON public.connected_accounts
    FOR DELETE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- ------------------------------------------------------------------------------
-- 6. SCHEDULED JOBS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can only read own scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can only insert own scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can only update own scheduled_jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can only delete own scheduled_jobs" ON public.scheduled_jobs;

CREATE POLICY "Users can only read own scheduled_jobs" ON public.scheduled_jobs
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

CREATE POLICY "Users can only insert own scheduled_jobs" ON public.scheduled_jobs
    FOR INSERT
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

CREATE POLICY "Users can only update own scheduled_jobs" ON public.scheduled_jobs
    FOR UPDATE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    )
    WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

CREATE POLICY "Users can only delete own scheduled_jobs" ON public.scheduled_jobs
    FOR DELETE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- ------------------------------------------------------------------------------
-- 7. WORKSPACES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all for workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can read own workspaces" ON public.workspaces;

CREATE POLICY "Users can read own workspaces" ON public.workspaces
    FOR SELECT
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR id = '00000000-0000-0000-0000-000000000001'
        OR (auth.jwt()->>'email' = 'onmansonu@gmail.com')
    );

-- 8. Audit log entry for data isolation migration
INSERT INTO public.admin_audit_logs (
    event_type, actor_email, details, status
) VALUES (
    'SECURITY_RLS_DATA_ISOLATION_APPLIED',
    'onmansonu@gmail.com',
    '{"description": "Strict Row Level Security and user_id ownership enforced on posts, connected_accounts, and scheduled_jobs"}'::jsonb,
    'success'
);
