-- ==============================================================================
-- PostBridge Post Analytics Schema for Supabase & PostgreSQL
-- Run this in your Supabase SQL Editor to enable the post_analytics table
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id TEXT REFERENCES public.posts(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    external_post_id TEXT NOT NULL,
    views INTEGER,
    impressions INTEGER,
    reach INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    saved INTEGER,
    clicks INTEGER,
    engagement_rate NUMERIC,
    fetch_status TEXT DEFAULT 'success',
    error_message TEXT,
    raw_details JSONB DEFAULT '{}'::jsonb,
    last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics (post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_workspace_id ON public.post_analytics (workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_last_fetched ON public.post_analytics (last_fetched_at);

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for post_analytics" ON public.post_analytics;
CREATE POLICY "Allow all for post_analytics" ON public.post_analytics FOR ALL USING (true) WITH CHECK (true);
