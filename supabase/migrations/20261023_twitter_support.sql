-- ==============================================================================
-- PostBridge Migration: X (Twitter) API v2 Support & PKCE OAuth 2.0 Token Storage
-- ==============================================================================

-- 1. Ensure refresh_token and token_expires_at exist on connected_accounts (for Twitter OAuth 2.0 offline.access)
ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Index for fast platform lookups
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform_ws 
ON public.connected_accounts (platform, workspace_id);

-- 3. Ensure post_history and posts support platform JSON / metadata
COMMENT ON COLUMN public.connected_accounts.refresh_token IS 'OAuth 2.0 refresh token for offline.access (YouTube, Twitter/X)';
COMMENT ON COLUMN public.connected_accounts.token_expires_at IS 'Expiration timestamp for the OAuth 2.0 access token';
