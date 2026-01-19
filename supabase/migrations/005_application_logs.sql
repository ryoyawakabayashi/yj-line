-- =====================================================
-- 応募履歴テーブル
-- 「誰が・いつ・応募した」を記録
-- =====================================================

-- 応募履歴テーブル（複数回の応募を記録）
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  url_type TEXT,
  utm_campaign TEXT,  -- line_bot_urlType_token 形式
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_applied_at ON application_logs(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_token ON application_logs(token);

-- RLS設定
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything on application_logs"
  ON application_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- 統計用RPC関数を更新（application_logsを使用）
CREATE OR REPLACE FUNCTION get_conversion_stats(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  filter_start TIMESTAMPTZ;
  filter_end TIMESTAMPTZ;
BEGIN
  filter_start := COALESCE(start_date, '1970-01-01'::TIMESTAMPTZ);
  filter_end := COALESCE(end_date, NOW() + INTERVAL '1 day');

  SELECT json_build_object(
    'total_tokens', (
      SELECT COUNT(*) FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'unique_issued_users', (
      SELECT COUNT(DISTINCT user_id) FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'total_clicks', (
      SELECT COUNT(*) FROM tracking_tokens
      WHERE clicked_at IS NOT NULL
      AND clicked_at >= filter_start AND clicked_at < filter_end
    ),
    'unique_clicked_users', (
      SELECT COUNT(DISTINCT user_id) FROM tracking_tokens
      WHERE clicked_at IS NOT NULL
      AND clicked_at >= filter_start AND clicked_at < filter_end
    ),
    -- 応募数: application_logsの行数
    'total_conversions', (
      SELECT COUNT(*) FROM application_logs
      WHERE applied_at >= filter_start AND applied_at < filter_end
    ),
    -- 応募者数: application_logsのユニークuser_id
    'unique_converted_users', (
      SELECT COUNT(DISTINCT user_id) FROM application_logs
      WHERE applied_at >= filter_start AND applied_at < filter_end
    ),
    'click_rate', (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric / COUNT(*) * 100, 2)
      END
      FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'conversion_rate', (
      SELECT CASE
        WHEN COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) = 0 THEN 0
        ELSE ROUND(
          (SELECT COUNT(*) FROM application_logs WHERE applied_at >= filter_start AND applied_at < filter_end)::numeric
          / COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) * 100, 2
        )
      END
      FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
