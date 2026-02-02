-- =====================================================
-- Application Reminders Table
-- 応募リマインダー送信履歴
-- =====================================================

-- リマインダー送信履歴テーブル
CREATE TABLE IF NOT EXISTS application_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,  -- '3day_reminder', '7day_reminder' など
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_sent TEXT,            -- 送信したメッセージ内容（オプション）
  UNIQUE(user_id, reminder_type)  -- 同じユーザーに同じタイプは1回のみ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_application_reminders_user_id ON application_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_application_reminders_sent_at ON application_reminders(sent_at);

-- RLS有効化
ALTER TABLE application_reminders ENABLE ROW LEVEL SECURITY;

-- サービスロールはすべての操作可能
CREATE POLICY "Service role can do all" ON application_reminders
  FOR ALL
  USING (true)
  WITH CHECK (true);
