-- ==============================================================================
-- POSTINGTUBE MIGRATION: 30 Shared Monthly Posts for Free Plan & Ledger Adaptation
-- ==============================================================================

-- 1. Alter public.post_usage_ledger to support shared monthly usage
ALTER TABLE public.post_usage_ledger ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE public.post_usage_ledger ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'committed';
ALTER TABLE public.post_usage_ledger ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Create index on user_id, month_key, post_id for lightning-fast COUNT(DISTINCT post_id)
CREATE INDEX IF NOT EXISTS idx_post_usage_user_month ON public.post_usage_ledger (user_id, month_key, post_id);

-- 3. Update public.subscription_plans Free tier to 30 posts
UPDATE public.subscription_plans
SET 
  monthly_posts_limit = 30,
  features = '["3 connected social accounts", "30 scheduled posts per month (shared across all accounts)", "Core scheduling & publishing", "Basic analytics", "1 user", "Access to core supported publishing features"]'::jsonb,
  updated_at = now()
WHERE id = 'free';

-- 4. Create atomic transaction-safe RPC function to check & reserve monthly usage
CREATE OR REPLACE FUNCTION public.check_and_reserve_monthly_usage(
  p_user_id TEXT,
  p_workspace_id UUID,
  p_post_id TEXT,
  p_month_key TEXT,
  p_action_type TEXT DEFAULT 'scheduled',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id TEXT := 'free';
  v_used_count INT := 0;
  v_limit INT := 30;
  v_already_reserved BOOLEAN := FALSE;
BEGIN
  -- 1. Check user subscription status
  SELECT plan_id INTO v_plan_id
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
  END IF;

  -- Paid plans have unlimited posting
  IF v_plan_id != 'free' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.post_usage_ledger
      WHERE user_id = p_user_id AND post_id = p_post_id AND month_key = p_month_key
    ) THEN
      INSERT INTO public.post_usage_ledger (user_id, workspace_id, post_id, month_key, action_type, status, idempotency_key)
      VALUES (p_user_id, p_workspace_id, p_post_id, p_month_key, p_action_type, 'committed', p_idempotency_key);
    END IF;

    RETURN jsonb_build_object(
      'allowed', TRUE,
      'plan_id', v_plan_id,
      'used_count', 0,
      'limit', -1,
      'remaining', 999999
    );
  END IF;

  -- 2. Free Plan: Check if this post is already counted in the ledger for this month
  SELECT EXISTS(
    SELECT 1 FROM public.post_usage_ledger
    WHERE user_id = p_user_id AND post_id = p_post_id AND month_key = p_month_key
  ) INTO v_already_reserved;

  SELECT COUNT(DISTINCT post_id) INTO v_used_count
  FROM public.post_usage_ledger
  WHERE user_id = p_user_id AND month_key = p_month_key;

  IF v_already_reserved THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'plan_id', 'free',
      'used_count', v_used_count,
      'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_used_count),
      'already_reserved', TRUE
    );
  END IF;

  -- 3. Check limit (30 shared posts per month)
  IF v_used_count >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'plan_id', 'free',
      'used_count', v_used_count,
      'limit', v_limit,
      'remaining', 0,
      'reason', 'Monthly limit reached (' || v_used_count || '/30 posts used this month across all accounts).'
    );
  END IF;

  -- 4. Reserve slot
  INSERT INTO public.post_usage_ledger (user_id, workspace_id, post_id, month_key, action_type, status, idempotency_key)
  VALUES (p_user_id, p_workspace_id, p_post_id, p_month_key, p_action_type, 'committed', p_idempotency_key);

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'plan_id', 'free',
    'used_count', v_used_count + 1,
    'limit', v_limit,
    'remaining', v_limit - (v_used_count + 1),
    'already_reserved', FALSE
  );
END;
$$;
