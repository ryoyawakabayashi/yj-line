-- =====================================================
-- トラッキング統計機能の更新
-- destination_urlカラム追加 + 期間フィルター対応RPC関数
-- =====================================================

-- 1. destination_url カラム追加（既存テーブルに）
ALTER TABLE tracking_tokens ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- 2. 統計用RPC関数（期間フィルター対応・クリック者数追加）
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
  -- デフォルト: 全期間
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
    'total_conversions', (
      SELECT COUNT(*) FROM tracking_tokens
      WHERE converted_at IS NOT NULL
      AND converted_at >= filter_start AND converted_at < filter_end
    ),
    'unique_converted_users', (
      SELECT COUNT(DISTINCT user_id) FROM tracking_tokens
      WHERE converted_at IS NOT NULL
      AND converted_at >= filter_start AND converted_at < filter_end
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
        ELSE ROUND(COUNT(*) FILTER (WHERE converted_at IS NOT NULL)::numeric / COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) * 100, 2)
      END
      FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
