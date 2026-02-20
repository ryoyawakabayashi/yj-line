-- キャリアタイプ診断結果テーブル
CREATE TABLE IF NOT EXISTS career_diagnosis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  q1_answer TEXT CHECK (q1_answer IN ('A', 'B')),
  q2_answer TEXT CHECK (q2_answer IN ('A', 'B')),
  q3_answer TEXT CHECK (q3_answer IN ('A', 'B')),
  q4_answer TEXT CHECK (q4_answer IN ('A', 'B')),
  q5_answer TEXT CHECK (q5_answer IN ('A', 'B')),
  q6_answer TEXT CHECK (q6_answer IN ('A', 'B')),
  q7_answer TEXT CHECK (q7_answer IN ('A', 'B')),
  q8_answer TEXT CHECK (q8_answer IN ('A', 'B')),
  type_code TEXT NOT NULL,  -- 4文字コード (例: GARJ)
  recommended_industries TEXT[] DEFAULT '{}',  -- 推薦業界ID配列
  lang TEXT DEFAULT 'ja',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_career_diagnosis_user_id ON career_diagnosis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_career_diagnosis_type_code ON career_diagnosis_results(type_code);
CREATE INDEX IF NOT EXISTS idx_career_diagnosis_created_at ON career_diagnosis_results(created_at DESC);

-- RLS
ALTER TABLE career_diagnosis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for career_diagnosis_results" ON career_diagnosis_results
  FOR ALL USING (true) WITH CHECK (true);
