-- =====================================================
-- AI会話履歴テーブル
-- AIトーク（自由会話）の履歴を保存
-- =====================================================

-- ai_conversation_history テーブル作成
CREATE TABLE IF NOT EXISTS ai_conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_user_id
  ON ai_conversation_history(user_id);

-- RLS設定
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything on ai_conversation_history"
  ON ai_conversation_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_conversation_history_updated_at
  BEFORE UPDATE ON ai_conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
