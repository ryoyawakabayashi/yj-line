-- =====================================================
-- Support Tables for Customer Support AI
-- =====================================================
-- Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. support_tickets（問い合わせ保存）
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('feedback', 'bug')),
  service TEXT CHECK (service IN ('YOLO_HOME', 'YOLO_DISCOVER', 'YOLO_JAPAN', NULL)),
  content TEXT NOT NULL,
  ai_summary TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. known_issues（既知の不具合）
CREATE TABLE IF NOT EXISTS known_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('YOLO_HOME', 'YOLO_DISCOVER', 'YOLO_JAPAN')),
  title TEXT NOT NULL,
  description TEXT,
  keywords TEXT[], -- 検索用キーワード配列
  status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'resolved', 'wontfix')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =====================================================
-- Indexes
-- =====================================================

-- support_tickets のインデックス
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type ON support_tickets(ticket_type);

-- known_issues のインデックス
CREATE INDEX IF NOT EXISTS idx_known_issues_service ON known_issues(service);
CREATE INDEX IF NOT EXISTS idx_known_issues_status ON known_issues(status);
CREATE INDEX IF NOT EXISTS idx_known_issues_keywords ON known_issues USING GIN(keywords);

-- =====================================================
-- RPC Functions
-- =====================================================

-- 既知問題検索関数
CREATE OR REPLACE FUNCTION search_known_issues(
  p_service TEXT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  service TEXT,
  title TEXT,
  description TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ki.id, ki.service, ki.title, ki.description, ki.status
  FROM known_issues ki
  WHERE ki.status != 'resolved'
    AND (p_service IS NULL OR ki.service = p_service)
    AND (p_keyword IS NULL OR
         ki.title ILIKE '%' || p_keyword || '%' OR
         ki.description ILIKE '%' || p_keyword || '%' OR
         p_keyword = ANY(ki.keywords));
END;
$$ LANGUAGE plpgsql STABLE;

-- サポートチケット作成関数
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_user_id TEXT,
  p_ticket_type TEXT,
  p_service TEXT DEFAULT NULL,
  p_content TEXT DEFAULT '',
  p_ai_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  INSERT INTO support_tickets (user_id, ticket_type, service, content, ai_summary)
  VALUES (p_user_id, p_ticket_type, p_service, p_content, p_ai_summary)
  RETURNING id INTO v_ticket_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- サポート統計取得関数
CREATE OR REPLACE FUNCTION get_support_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_tickets', (SELECT COUNT(*) FROM support_tickets),
    'open_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'feedback_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'feedback'),
    'bug_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'bug'),
    'today_tickets', (SELECT COUNT(*) FROM support_tickets WHERE created_at >= CURRENT_DATE),
    'known_issues_count', (SELECT COUNT(*) FROM known_issues WHERE status = 'investigating')
  );
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_issues ENABLE ROW LEVEL SECURITY;

-- サービスロールは全アクセス可能
CREATE POLICY "Service role full access on support_tickets"
  ON support_tickets
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on known_issues"
  ON known_issues
  FOR ALL
  USING (auth.role() = 'service_role');

-- 匿名ユーザーは読み取りのみ（known_issues）
CREATE POLICY "Anon read known_issues"
  ON known_issues
  FOR SELECT
  USING (true);

-- =====================================================
-- Updated_at トリガー
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
