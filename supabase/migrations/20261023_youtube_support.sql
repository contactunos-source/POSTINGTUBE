-- ==============================================================================
-- PostBridge Migration: YouTube Data API v3 Support & Token Management
-- ==============================================================================

-- 1. Ensure refresh_token and token_expires_at exist on connected_accounts
ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS refresh_token TEXT;

ALTER TABLE public.connected_accounts 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Index for fast platform lookups
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform_ws 
ON public.connected_accounts (platform, workspace_id);

-- 3. Comments for documentation
COMMENT ON COLUMN public.connected_accounts.refresh_token IS 'OAuth 2.0 refresh token for long-lived offline access (e.g. Google YouTube)';
COMMENT ON COLUMN public.connected_accounts.token_expires_at IS 'Expiration timestamp for the current OAuth access token';
