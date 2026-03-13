-- =====================================================
-- 016: 留学生向けリッチメニュー + JLPT学習サポート
-- user_status に visa_type 追加 + richmenu_configs に variant 追加
-- =====================================================

-- 1. user_status に visa_type カラム追加
ALTER TABLE user_status ADD COLUMN IF NOT EXISTS visa_type TEXT DEFAULT NULL;
-- 値: 'student', 'work', 'other', NULL(未設定)

-- 2. richmenu_configs に variant カラム追加（言語×バリアントのユニーク制約）
ALTER TABLE richmenu_configs DROP CONSTRAINT IF EXISTS richmenu_configs_lang_key;
ALTER TABLE richmenu_configs ADD COLUMN IF NOT EXISTS variant TEXT NOT NULL DEFAULT 'default';

-- ユニーク制約: lang + variant
ALTER TABLE richmenu_configs ADD CONSTRAINT richmenu_configs_lang_variant_key UNIQUE (lang, variant);

-- 3. 留学生用メニュー行をデフォルトからコピー（student variant）
INSERT INTO richmenu_configs (lang, variant, menu_name, chat_bar_text, areas)
SELECT lang, 'student', menu_name || ' (Student)', chat_bar_text, areas
FROM richmenu_configs WHERE variant = 'default'
ON CONFLICT (lang, variant) DO NOTHING;
