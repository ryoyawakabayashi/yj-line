-- =====================================================
-- Operator Reply Templates
-- サポートオペレーターが使うクイックリプライテンプレート
-- =====================================================

CREATE TABLE IF NOT EXISTS operator_reply_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,                    -- 表示名（例: "応募ガイド"）
  message       TEXT NOT NULL,                    -- 送信テキスト
  quick_replies JSONB NOT NULL DEFAULT '[]',      -- [{ label, text }]
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_operator_reply_templates_active ON operator_reply_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_operator_reply_templates_sort ON operator_reply_templates(sort_order);

-- updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS update_operator_reply_templates_updated_at ON operator_reply_templates;
CREATE TRIGGER update_operator_reply_templates_updated_at
  BEFORE UPDATE ON operator_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 有効化
ALTER TABLE operator_reply_templates ENABLE ROW LEVEL SECURITY;

-- Service Role: フルアクセス
CREATE POLICY "service_role_all" ON operator_reply_templates FOR ALL USING (true) WITH CHECK (true);
