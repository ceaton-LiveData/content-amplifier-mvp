-- Migration: Fix search_path for all functions (security hardening)
-- This addresses the "Function Search Path Mutable" warnings from Supabase linter
-- Run this in Supabase SQL Editor

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================================================
-- AUTH TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_account_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.accounts (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- ============================================================================
-- USAGE FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.accounts SET videos_processed_this_month = 0;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE OR REPLACE FUNCTION get_usage_this_month(p_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO usage_count
  FROM public.content_generations
  WHERE account_id = p_account_id
    AND status = 'complete'
    AND created_at >= DATE_TRUNC('month', NOW());

  RETURN usage_count;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE OR REPLACE FUNCTION can_process_transcript(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  plan TEXT;
  limit_count INTEGER;
BEGIN
  -- Get current plan and usage
  SELECT plan_tier INTO plan FROM public.accounts WHERE id = p_account_id;
  current_usage := public.get_usage_this_month(p_account_id);

  -- Set limits based on plan
  CASE plan
    WHEN 'free' THEN limit_count := 10;
    WHEN 'starter' THEN limit_count := 20;
    WHEN 'pro' THEN limit_count := 50;
    WHEN 'enterprise' THEN limit_count := 999999; -- Essentially unlimited
    ELSE limit_count := 10;
  END CASE;

  RETURN current_usage < limit_count;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================================================
-- API COST FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_api_cost_this_month(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC;
BEGIN
  SELECT COALESCE(SUM(estimated_cost), 0)
  INTO total_cost
  FROM public.api_usage_logs
  WHERE account_id = p_account_id
    AND created_at >= DATE_TRUNC('month', NOW());

  RETURN total_cost;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE OR REPLACE FUNCTION get_tokens_this_month(p_account_id UUID)
RETURNS TABLE(input_tokens BIGINT, output_tokens BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(l.input_tokens), 0)::BIGINT as input_tokens,
    COALESCE(SUM(l.output_tokens), 0)::BIGINT as output_tokens
  FROM public.api_usage_logs l
  WHERE l.account_id = p_account_id
    AND l.created_at >= DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION admin_get_api_stats()
RETURNS TABLE(
  total_cost NUMERIC,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_calls BIGINT,
  cost_today NUMERIC,
  cost_this_week NUMERIC,
  cost_this_month NUMERIC
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(estimated_cost), 0) as total_cost,
    COALESCE(SUM(l.input_tokens), 0)::BIGINT as total_input_tokens,
    COALESCE(SUM(l.output_tokens), 0)::BIGINT as total_output_tokens,
    COUNT(*)::BIGINT as total_calls,
    COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE THEN estimated_cost ELSE 0 END), 0) as cost_today,
    COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN estimated_cost ELSE 0 END), 0) as cost_this_week,
    COALESCE(SUM(CASE WHEN l.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN estimated_cost ELSE 0 END), 0) as cost_this_month
  FROM public.api_usage_logs l;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION admin_get_daily_costs(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  day DATE,
  cost NUMERIC,
  calls BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    DATE(l.created_at) as day,
    COALESCE(SUM(l.estimated_cost), 0) as cost,
    COUNT(*)::BIGINT as calls
  FROM public.api_usage_logs l
  WHERE l.created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY DATE(l.created_at)
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION admin_get_user_stats()
RETURNS TABLE(
  total_users BIGINT,
  users_with_brand_voice BIGINT,
  total_transcripts BIGINT,
  total_generations BIGINT,
  total_content_pieces BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.accounts)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.accounts WHERE brand_voice_profile IS NOT NULL)::BIGINT as users_with_brand_voice,
    (SELECT COUNT(*) FROM public.content_sources)::BIGINT as total_transcripts,
    (SELECT COUNT(*) FROM public.content_generations WHERE status = 'complete')::BIGINT as total_generations,
    (SELECT COUNT(*) FROM public.generated_content)::BIGINT as total_content_pieces;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION admin_get_top_users_by_cost(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  account_id UUID,
  user_id UUID,
  total_cost NUMERIC,
  total_calls BIGINT,
  plan_tier TEXT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    a.id as account_id,
    a.user_id as user_id,
    COALESCE(SUM(l.estimated_cost), 0) as total_cost,
    COUNT(l.id)::BIGINT as total_calls,
    a.plan_tier
  FROM public.accounts a
  LEFT JOIN public.api_usage_logs l ON l.account_id = a.id
  GROUP BY a.id, a.user_id, a.plan_tier
  ORDER BY total_cost DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION admin_get_recent_errors(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  account_id UUID,
  user_id UUID,
  operation TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.account_id,
    a.user_id as user_id,
    l.operation,
    l.error_message,
    l.created_at
  FROM public.api_usage_logs l
  LEFT JOIN public.accounts a ON a.id = l.account_id
  WHERE l.status = 'error'
  ORDER BY l.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
