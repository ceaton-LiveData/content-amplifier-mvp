-- Migration: Remove direct email access from admin RPCs
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION admin_get_top_users_by_cost(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  account_id UUID,
  user_id UUID,
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
    a.user_id as user_id,
    COALESCE(SUM(l.estimated_cost), 0) as total_cost,
    COUNT(l.id)::BIGINT as total_calls,
    a.plan_tier
  FROM accounts a
  LEFT JOIN api_usage_logs l ON l.account_id = a.id
  GROUP BY a.id, a.user_id, a.plan_tier
  ORDER BY total_cost DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF NOT is_admin() THEN
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
  FROM api_usage_logs l
  LEFT JOIN accounts a ON a.id = l.account_id
  WHERE l.status = 'error'
  ORDER BY l.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
