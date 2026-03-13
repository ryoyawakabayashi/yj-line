-- tracking_tokens に broadcast_campaign_id カラムを追加
-- 配信キャンペーンからの応募追跡に使用
ALTER TABLE tracking_tokens ADD COLUMN IF NOT EXISTS broadcast_campaign_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_bcid ON tracking_tokens(broadcast_campaign_id);
