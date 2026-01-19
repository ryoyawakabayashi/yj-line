-- =====================================================
-- FAQ RPC Functions
-- =====================================================

-- ベクトル検索用関数
CREATE OR REPLACE FUNCTION search_faqs_by_vector(
  query_embedding vector(1536),
  p_service VARCHAR(20) DEFAULT NULL,
  p_lang VARCHAR(10) DEFAULT 'ja',
  p_limit INT DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  service VARCHAR(20),
  faq_key VARCHAR(100),
  keywords TEXT[],
  priority INT,
  question TEXT,
  answer TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.service,
    f.faq_key,
    f.keywords,
    f.priority,
    ft.question,
    ft.answer,
    1 - (ft.embedding <=> query_embedding) AS similarity
  FROM faqs f
  JOIN faq_translations ft ON f.id = ft.faq_id
  WHERE f.is_active = true
    AND ft.lang = p_lang
    AND ft.embedding IS NOT NULL
    AND (p_service IS NULL OR f.service = p_service)
    AND 1 - (ft.embedding <=> query_embedding) >= p_threshold
  ORDER BY ft.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$;

-- FAQ統計取得関数
CREATE OR REPLACE FUNCTION get_faq_stats(
  p_service VARCHAR(20) DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
  faq_id UUID,
  faq_key VARCHAR(100),
  service VARCHAR(20),
  question TEXT,
  usage_count BIGINT,
  resolved_count BIGINT,
  resolve_rate FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS faq_id,
    f.faq_key,
    f.service,
    ft.question,
    COUNT(l.id)::BIGINT AS usage_count,
    COUNT(CASE WHEN l.resolved = true THEN 1 END)::BIGINT AS resolved_count,
    CASE
      WHEN COUNT(l.id) > 0 THEN
        COUNT(CASE WHEN l.resolved = true THEN 1 END)::FLOAT / COUNT(l.id)::FLOAT
      ELSE 0
    END AS resolve_rate
  FROM faqs f
  JOIN faq_translations ft ON f.id = ft.faq_id AND ft.lang = 'ja'
  LEFT JOIN faq_usage_logs l ON f.id = l.faq_id AND l.created_at >= p_start_date
  WHERE f.is_active = true
    AND (p_service IS NULL OR f.service = p_service)
  GROUP BY f.id, f.faq_key, f.service, ft.question
  ORDER BY usage_count DESC;
END;
$$;

-- 既存FAQのマイグレーション用一括INSERT関数
CREATE OR REPLACE FUNCTION migrate_faq(
  p_service VARCHAR(20),
  p_faq_key VARCHAR(100),
  p_keywords TEXT[],
  p_priority INT,
  p_question_ja TEXT,
  p_answer_ja TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_faq_id UUID;
BEGIN
  -- FAQ本体を挿入
  INSERT INTO faqs (service, faq_key, keywords, priority)
  VALUES (p_service, p_faq_key, p_keywords, p_priority)
  RETURNING id INTO v_faq_id;

  -- 日本語翻訳を挿入
  INSERT INTO faq_translations (faq_id, lang, question, answer)
  VALUES (v_faq_id, 'ja', p_question_ja, p_answer_ja);

  RETURN v_faq_id;
END;
$$;
