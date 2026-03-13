-- JLPT問題テーブル
CREATE TABLE IF NOT EXISTS jlpt_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('N5','N4','N3','N2','N1')),
  category TEXT NOT NULL CHECK (category IN ('grammar','vocabulary','kanji','reading')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,  -- ["選択肢A","選択肢B","選択肢C","選択肢D"]
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation JSONB NOT NULL DEFAULT '{}',  -- {"ja":"解説","en":"Explanation",...}
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jlpt_q_level_cat ON jlpt_questions(level, category);
CREATE INDEX IF NOT EXISTS idx_jlpt_q_approved ON jlpt_questions(is_approved);

-- ユーザー進捗テーブル
CREATE TABLE IF NOT EXISTS jlpt_user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES jlpt_questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jlpt_progress_user ON jlpt_user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_jlpt_progress_question ON jlpt_user_progress(question_id);

-- RLS
ALTER TABLE jlpt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jlpt_user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for jlpt_questions" ON jlpt_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for jlpt_user_progress" ON jlpt_user_progress FOR ALL USING (true) WITH CHECK (true);
