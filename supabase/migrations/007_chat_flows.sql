-- =====================================================
-- Chat Flow Builder Tables
-- 管理画面からビジュアルフローエディタでチャットフローを作成
-- =====================================================

-- チャットフローテーブル
CREATE TABLE IF NOT EXISTS chat_flows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('support_button', 'keyword', 'postback', 'message_pattern')),
  trigger_value   TEXT,           -- trigger条件の値（keyword検索やpostback data等）
  service         TEXT CHECK (service IN ('YOLO_HOME', 'YOLO_DISCOVER', 'YOLO_JAPAN')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  priority        INTEGER NOT NULL DEFAULT 0,  -- 大きいほど優先
  flow_definition JSONB NOT NULL,  -- フロー全体の定義（ノード+エッジ）
  version         INTEGER NOT NULL DEFAULT 1,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_flows_is_active ON chat_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_flows_trigger_type ON chat_flows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_chat_flows_service ON chat_flows(service);
CREATE INDEX IF NOT EXISTS idx_chat_flows_priority ON chat_flows(priority DESC);

-- updated_at 自動更新トリガー
CREATE TRIGGER update_chat_flows_updated_at
  BEFORE UPDATE ON chat_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 有効化
ALTER TABLE chat_flows ENABLE ROW LEVEL SECURITY;

-- Service Role: フルアクセス
CREATE POLICY "service_role_all" ON chat_flows FOR ALL USING (true) WITH CHECK (true);

-- フロー実行履歴テーブル（デバッグ・モニタリング用）
CREATE TABLE IF NOT EXISTS chat_flow_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         UUID NOT NULL REFERENCES chat_flows(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
  current_node_id TEXT,
  execution_log   JSONB NOT NULL DEFAULT '[]',  -- 各ノードの実行ログ
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_flow_executions_flow_id ON chat_flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_chat_flow_executions_user_id ON chat_flow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_flow_executions_status ON chat_flow_executions(status);
CREATE INDEX IF NOT EXISTS idx_chat_flow_executions_created_at ON chat_flow_executions(created_at DESC);

-- RLS 有効化
ALTER TABLE chat_flow_executions ENABLE ROW LEVEL SECURITY;

-- Service Role: フルアクセス
CREATE POLICY "service_role_all" ON chat_flow_executions FOR ALL USING (true) WITH CHECK (true);
