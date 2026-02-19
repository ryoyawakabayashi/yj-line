-- 用語集テーブル: 翻訳時に固定用語として使用
CREATE TABLE IF NOT EXISTS glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ja TEXT NOT NULL,          -- 標準日本語（キー）
  ja_easy TEXT,              -- やさしい日本語
  en TEXT,                   -- English
  ko TEXT,                   -- Korean
  zh TEXT,                   -- Simplified Chinese
  vi TEXT,                   -- Vietnamese
  note TEXT,                 -- メモ（用途・コンテキスト）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE glossary_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on glossary_terms"
  ON glossary_terms FOR ALL
  USING (true)
  WITH CHECK (true);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_glossary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER glossary_terms_updated_at
  BEFORE UPDATE ON glossary_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_glossary_updated_at();
