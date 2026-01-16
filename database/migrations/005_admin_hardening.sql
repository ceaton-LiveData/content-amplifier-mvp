-- Migration: Admin access hardening for RPC functions
-- Run this in Supabase SQL Editor

-- Table to store admin users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can view their own admin record
CREATE POLICY "Admins can view own admin record" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Helper function to check admin access
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Harden admin functions with server-side checks
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(estimated_cost), 0) as total_cost,
    COALESCE(SUM(input_tokens), 0)::BIGINT as total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::BIGINT as total_output_tokens,
    COUNT(*)::BIGINT as total_calls,
    COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN estimated_cost ELSE 0 END), 0) as cost_today,
    COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN estimated_cost ELSE 0 END), 0) as cost_this_week,
    COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN estimated_cost ELSE 0 END), 0) as cost_this_month
  FROM api_usage_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_daily_costs(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  day DATE,
  cost NUMERIC,
  calls BIGINT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    DATE(created_at) as day,
    COALESCE(SUM(estimated_cost), 0) as cost,
    COUNT(*)::BIGINT as calls
  FROM api_usage_logs
  WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_user_stats()
RETURNS TABLE(
  total_users BIGINT,
  users_with_brand_voice BIGINT,
  total_transcripts BIGINT,
  total_generations BIGINT,
  total_content_pieces BIGINT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM accounts)::BIGINT as total_users,
    (SELECT COUNT(*) FROM accounts WHERE brand_voice_profile IS NOT NULL)::BIGINT as users_with_brand_voice,
    (SELECT COUNT(*) FROM content_sources)::BIGINT as total_transcripts,
    (SELECT COUNT(*) FROM content_generations WHERE status = 'complete')::BIGINT as total_generations,
    (SELECT COUNT(*) FROM generated_content)::BIGINT as total_content_pieces;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_top_users_by_cost(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  account_id UUID,
  user_email TEXT,
  total_cost NUMERIC,
  total_calls BIGINT,
  plan_tier TEXT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    a.id as account_id,
    u.email as user_email,
    COALESCE(SUM(l.estimated_cost), 0) as total_cost,
    COUNT(l.id)::BIGINT as total_calls,
    a.plan_tier
  FROM accounts a
  LEFT JOIN api_usage_logs l ON l.account_id = a.id
  LEFT JOIN auth.users u ON u.id = a.user_id
  GROUP BY a.id, u.email, a.plan_tier
  ORDER BY total_cost DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_recent_errors(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  account_id UUID,
  user_email TEXT,
  operation TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.account_id,
    u.email as user_email,
    l.operation,
    l.error_message,
    l.created_at
  FROM api_usage_logs l
  LEFT JOIN accounts a ON a.id = l.account_id
  LEFT JOIN auth.users u ON u.id = a.user_id
  WHERE l.status = 'error'
  ORDER BY l.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
