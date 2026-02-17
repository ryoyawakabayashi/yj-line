-- =====================================================
-- Card Selection Events Table
-- カードボタン選択イベント追跡（どのQ&Aがよく見られたかの分析用）
-- =====================================================

CREATE TABLE IF NOT EXISTS card_selection_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id         TEXT NOT NULL,
  card_node_id    TEXT NOT NULL,           -- 選択されたカードノードID
  user_id         TEXT NOT NULL,
  button_label    TEXT,                    -- ボタンのラベル（例: "回答を見る"）
  display_text    TEXT,                    -- ボタン押下時の表示テキスト
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_card_selection_events_flow_id ON card_selection_events(flow_id);
CREATE INDEX IF NOT EXISTS idx_card_selection_events_card_node_id ON card_selection_events(card_node_id);
CREATE INDEX IF NOT EXISTS idx_card_selection_events_created_at ON card_selection_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_selection_events_flow_card ON card_selection_events(flow_id, card_node_id);

-- RLS 有効化
ALTER TABLE card_selection_events ENABLE ROW LEVEL SECURITY;

-- Service Role: フルアクセス
CREATE POLICY "service_role_all" ON card_selection_events FOR ALL USING (true) WITH CHECK (true);
