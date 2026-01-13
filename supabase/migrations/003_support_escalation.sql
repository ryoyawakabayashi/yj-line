-- =====================================================
-- Support Enhancement Migration
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. support_tickets 拡張
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_display_name TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS user_lang TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 有人対応用カラム
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT FALSE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS human_takeover_at TIMESTAMPTZ;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS human_operator_name TEXT;

-- 2. support_messages テーブル（メッセージ単位の永続化）
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'operator')),
  content TEXT NOT NULL,
  sender_name TEXT, -- オペレーター名（operator roleの場合）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated ON support_tickets(escalated_at) WHERE escalated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_human_takeover ON support_tickets(human_takeover) WHERE human_takeover = TRUE;

-- 4. RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on support_messages"
  ON support_messages FOR ALL
  USING (auth.role() = 'service_role');

-- 5. メッセージ保存関数
CREATE OR REPLACE FUNCTION save_support_message(
  p_ticket_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_sender_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO support_messages (ticket_id, role, content, sender_name)
  VALUES (p_ticket_id, p_role, p_content, p_sender_name)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 6. チケットメッセージ取得関数
CREATE OR REPLACE FUNCTION get_ticket_messages(p_ticket_id UUID)
RETURNS TABLE(
  id UUID,
  role TEXT,
  content TEXT,
  sender_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.id, sm.role, sm.content, sm.sender_name, sm.created_at
  FROM support_messages sm
  WHERE sm.ticket_id = p_ticket_id
  ORDER BY sm.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. 有人対応切り替え関数
CREATE OR REPLACE FUNCTION toggle_human_takeover(
  p_ticket_id UUID,
  p_enable BOOLEAN,
  p_operator_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets
  SET
    human_takeover = p_enable,
    human_takeover_at = CASE WHEN p_enable THEN NOW() ELSE NULL END,
    human_operator_name = CASE WHEN p_enable THEN p_operator_name ELSE NULL END,
    status = CASE WHEN p_enable THEN 'in_progress' ELSE status END,
    updated_at = NOW()
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8. アクティブチケット取得（有人対応チェック用）
CREATE OR REPLACE FUNCTION get_active_ticket_by_user(p_user_id TEXT)
RETURNS TABLE(
  id UUID,
  user_id TEXT,
  ticket_type TEXT,
  service TEXT,
  status TEXT,
  human_takeover BOOLEAN,
  human_operator_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id, st.user_id, st.ticket_type, st.service, st.status,
    st.human_takeover, st.human_operator_name, st.created_at
  FROM support_tickets st
  WHERE st.user_id = p_user_id
    AND st.status IN ('open', 'in_progress')
  ORDER BY st.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. エスカレーション関数
CREATE OR REPLACE FUNCTION escalate_ticket(
  p_ticket_id UUID,
  p_reason TEXT,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets
  SET
    escalated_at = NOW(),
    escalation_reason = p_reason,
    priority = p_priority,
    updated_at = NOW()
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 10. サポート統計拡張
CREATE OR REPLACE FUNCTION get_support_stats_extended()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_tickets', (SELECT COUNT(*) FROM support_tickets),
    'open_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'in_progress_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress'),
    'resolved_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved'),
    'escalated_tickets', (SELECT COUNT(*) FROM support_tickets WHERE escalated_at IS NOT NULL),
    'human_takeover_active', (SELECT COUNT(*) FROM support_tickets WHERE human_takeover = TRUE),
    'today_tickets', (SELECT COUNT(*) FROM support_tickets WHERE created_at >= CURRENT_DATE),
    'feedback_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'feedback'),
    'bug_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'bug'),
    'by_service', (
      SELECT json_object_agg(COALESCE(service, 'unknown'), cnt)
      FROM (SELECT service, COUNT(*) as cnt FROM support_tickets GROUP BY service) s
    ),
    'by_category', (
      SELECT json_object_agg(COALESCE(category, 'uncategorized'), cnt)
      FROM (SELECT category, COUNT(*) as cnt FROM support_tickets GROUP BY category) c
    )
  );
$$ LANGUAGE SQL STABLE;
