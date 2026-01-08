-- =====================================================
-- トラッキングトークン管理テーブル
-- LINE Bot → サイト遷移 → コンバージョン追跡用
-- =====================================================

-- トラッキングトークンテーブル
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  url_type TEXT,  -- 'faq_withdraw', 'faq_video', 'job_search', etc.
  destination_url TEXT,  -- 送信したURL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,  -- URLクリック時
  converted_at TIMESTAMPTZ  -- complete_work発火時
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_token ON tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_user_id ON tracking_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_converted ON tracking_tokens(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_created ON tracking_tokens(created_at DESC);

-- 応募完了ユーザービュー
CREATE OR REPLACE VIEW converted_users AS
SELECT
  user_id,
  MIN(converted_at) as first_conversion,
  MAX(converted_at) as last_conversion,
  COUNT(*) as conversion_count,
  array_agg(DISTINCT url_type) as url_types
FROM tracking_tokens
WHERE converted_at IS NOT NULL
GROUP BY user_id;

-- 統計用RPC関数
CREATE OR REPLACE FUNCTION get_conversion_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tokens', (SELECT COUNT(*) FROM tracking_tokens),
    'total_clicks', (SELECT COUNT(*) FROM tracking_tokens WHERE clicked_at IS NOT NULL),
    'total_conversions', (SELECT COUNT(*) FROM tracking_tokens WHERE converted_at IS NOT NULL),
    'unique_converted_users', (SELECT COUNT(DISTINCT user_id) FROM tracking_tokens WHERE converted_at IS NOT NULL),
    'click_rate', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric / COUNT(*) * 100, 2)
      END
      FROM tracking_tokens
    ),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) = 0 THEN 0
        ELSE ROUND(COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::numeric / COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) * 100, 2)
      END
      FROM tracking_tokens
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 日別コンバージョン数取得
CREATE OR REPLACE FUNCTION get_daily_conversions(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  conversions BIGINT,
  clicks BIGINT,
  tokens_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COUNT(*) FILTER (WHERE t.converted_at::DATE = d.date) as conversions,
    COUNT(*) FILTER (WHERE t.clicked_at::DATE = d.date) as clicks,
    COUNT(*) FILTER (WHERE t.created_at::DATE = d.date) as tokens_created
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) as d(date)
  LEFT JOIN tracking_tokens t ON TRUE
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS設定
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything on tracking_tokens"
  ON tracking_tokens FOR ALL
  USING (true)
  WITH CHECK (true);
