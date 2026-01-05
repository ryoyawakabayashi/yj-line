-- =====================================================
-- Supabase RPC Functions for Performance Optimization
-- =====================================================
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Dashboard Stats (1クエリで全統計取得)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM user_status),
    'total_ai_chats', (SELECT COALESCE(SUM(ai_chat_count), 0) FROM user_status),
    'total_diagnosis', (SELECT COUNT(*) FROM diagnosis_results),
    'diagnosis_user_count', (SELECT COUNT(*) FROM user_status WHERE diagnosis_count >= 1),
    'today_active_users', (SELECT COUNT(*) FROM user_status WHERE last_used >= CURRENT_DATE),
    'repeat_user_count', (SELECT COUNT(*) FROM user_status WHERE diagnosis_count >= 2)
  );
$$ LANGUAGE SQL STABLE;

-- 2. Increment AI Chat Count (1クエリでカウント増加)
CREATE OR REPLACE FUNCTION increment_ai_chat_count(p_user_id TEXT)
RETURNS VOID AS $$
  UPDATE user_status
  SET
    ai_chat_count = ai_chat_count + 1,
    total_usage_count = total_usage_count + 1,
    last_used = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL VOLATILE;

-- 3. Increment Diagnosis Count (1クエリでカウント増加)
CREATE OR REPLACE FUNCTION increment_diagnosis_count(p_user_id TEXT)
RETURNS VOID AS $$
  UPDATE user_status
  SET
    diagnosis_count = diagnosis_count + 1,
    total_usage_count = total_usage_count + 1,
    last_used = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL VOLATILE;

-- 4. Language Distribution (言語別ユーザー分布)
CREATE OR REPLACE FUNCTION get_language_distribution()
RETURNS TABLE(lang TEXT, count BIGINT) AS $$
  SELECT COALESCE(us.lang, 'unknown')::TEXT, COUNT(*)
  FROM user_status us
  GROUP BY us.lang
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;

-- 5. Japanese Level Distribution (日本語レベル別分布)
CREATE OR REPLACE FUNCTION get_japanese_level_distribution()
RETURNS TABLE(level TEXT, count BIGINT) AS $$
  SELECT COALESCE(q5_japanese_level, 'unknown')::TEXT, COUNT(*)
  FROM diagnosis_results
  WHERE q5_japanese_level IS NOT NULL
  GROUP BY q5_japanese_level
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;

-- 6. Region Distribution (地域別分布)
CREATE OR REPLACE FUNCTION get_region_distribution()
RETURNS TABLE(region TEXT, count BIGINT) AS $$
  SELECT COALESCE(q4_region, 'unknown')::TEXT, COUNT(*)
  FROM diagnosis_results
  WHERE q4_region IS NOT NULL
  GROUP BY q4_region
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;

-- 7. Daily User Trend (日別ユーザー登録推移)
CREATE OR REPLACE FUNCTION get_daily_user_trend(days_back INT DEFAULT 30)
RETURNS TABLE(date DATE, count BIGINT) AS $$
  SELECT DATE(first_used), COUNT(*)
  FROM user_status
  WHERE first_used >= CURRENT_DATE - days_back
  GROUP BY DATE(first_used)
  ORDER BY DATE(first_used);
$$ LANGUAGE SQL STABLE;

-- 8. Daily Diagnosis Trend (日別診断数推移)
CREATE OR REPLACE FUNCTION get_daily_diagnosis_trend(days_back INT DEFAULT 30)
RETURNS TABLE(date DATE, count BIGINT) AS $$
  SELECT DATE(timestamp), COUNT(*)
  FROM diagnosis_results
  WHERE timestamp >= CURRENT_DATE - days_back
  GROUP BY DATE(timestamp)
  ORDER BY DATE(timestamp);
$$ LANGUAGE SQL STABLE;

-- 9. Dashboard Stats By Month (月別統計)
CREATE OR REPLACE FUNCTION get_dashboard_stats_by_month(start_date DATE, end_date DATE)
RETURNS JSON AS $$
  WITH period_diagnosis AS (
    SELECT user_id, COUNT(*) as cnt
    FROM diagnosis_results
    WHERE timestamp >= start_date AND timestamp <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    GROUP BY user_id
  )
  SELECT json_build_object(
    'new_users', (
      SELECT COUNT(*) FROM user_status
      WHERE first_used >= start_date AND first_used <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'total_users', (SELECT COUNT(*) FROM user_status),
    'total_diagnosis', (
      SELECT COUNT(*) FROM diagnosis_results
      WHERE timestamp >= start_date AND timestamp <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'diagnosis_user_count', (SELECT COUNT(*) FROM period_diagnosis),
    'active_users', (
      SELECT COUNT(*) FROM user_status
      WHERE last_used >= start_date AND last_used <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'repeat_user_count', (SELECT COUNT(*) FROM period_diagnosis WHERE cnt >= 2)
  );
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- Views for Dashboard
-- =====================================================

-- Monthly Stats View (月別統計ビュー)
CREATE OR REPLACE VIEW monthly_stats AS
SELECT
  DATE_TRUNC('month', first_used)::DATE as month,
  COUNT(*) as new_users,
  COALESCE(SUM(ai_chat_count), 0) as total_ai_chats,
  COALESCE(SUM(diagnosis_count), 0) as total_diagnosis
FROM user_status
GROUP BY DATE_TRUNC('month', first_used)
ORDER BY month DESC;

-- Daily Diagnosis Stats View (日別診断数ビュー)
CREATE OR REPLACE VIEW daily_diagnosis_stats AS
SELECT
  DATE(timestamp) as date,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM diagnosis_results
GROUP BY DATE(timestamp)
ORDER BY date DESC;
