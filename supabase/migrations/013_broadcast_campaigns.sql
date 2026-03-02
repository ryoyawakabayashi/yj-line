-- =====================================================
-- 配信管理テーブル
-- =====================================================

-- 配信キャンペーン（下書き/予約/配信済みを1テーブルで管理）
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed', 'cancelled')),
  delivery_method TEXT DEFAULT 'broadcast' CHECK (delivery_method IN ('broadcast', 'narrowcast', 'test')),
  messages JSONB NOT NULL DEFAULT '[]',
  area TEXT,                      -- narrowcast用: エリアプリセット名
  demographic JSONB,              -- narrowcast用: 追加フィルター
  broadcast_lang TEXT DEFAULT 'ja',
  scheduled_at TIMESTAMPTZ,       -- 予約配信日時
  executed_at TIMESTAMPTZ,        -- 実行日時
  result JSONB,                   -- 配信結果（requestId, successCount等）
  admin_email TEXT,               -- 実行した管理者
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- テスト配信ユーザー
CREATE TABLE IF NOT EXISTS broadcast_test_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_user_id TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status ON broadcast_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_scheduled ON broadcast_campaigns (scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_created ON broadcast_campaigns (created_at DESC);

-- RLS
ALTER TABLE broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_test_users ENABLE ROW LEVEL SECURITY;

-- service_role用ポリシー（ダッシュボードAPIはservice_roleで接続）
CREATE POLICY "Service role full access on broadcast_campaigns"
  ON broadcast_campaigns FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on broadcast_test_users"
  ON broadcast_test_users FOR ALL
  USING (true) WITH CHECK (true);
