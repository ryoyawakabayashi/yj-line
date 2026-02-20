-- =====================================================
-- Rich Menu Configuration Table
-- 管理画面からリッチメニューのボタン設定を管理
-- =====================================================

CREATE TABLE IF NOT EXISTS richmenu_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang            TEXT NOT NULL UNIQUE CHECK (lang IN ('ja', 'en', 'ko', 'zh', 'vi')),
  menu_name       TEXT NOT NULL,
  chat_bar_text   TEXT NOT NULL,
  size_width      INTEGER NOT NULL DEFAULT 2500,
  size_height     INTEGER NOT NULL DEFAULT 1686,
  areas           JSONB NOT NULL DEFAULT '[]',
  rich_menu_id    TEXT,
  last_applied_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_richmenu_configs_lang ON richmenu_configs(lang);

-- RLS 有効化
ALTER TABLE richmenu_configs ENABLE ROW LEVEL SECURITY;

-- Service Role: フルアクセス
CREATE POLICY "service_role_all" ON richmenu_configs FOR ALL USING (true) WITH CHECK (true);

-- 初期データ（現在のシェルスクリプトの設定を投入）
INSERT INTO richmenu_configs (lang, menu_name, chat_bar_text, areas) VALUES
('ja', 'YOLO JAPAN Menu (JP)', 'メニュー', '[
  {"position":0,"bounds":{"x":0,"y":0,"width":833,"height":843},"action_type":"message","action_text":"AI_MODE","label":"しごとをさがす（AI）"},
  {"position":1,"bounds":{"x":833,"y":0,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ja/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=ja","label":"サイトで探す"},
  {"position":2,"bounds":{"x":1666,"y":0,"width":834,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ja/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=ja","label":"おすすめのしごと"},
  {"position":3,"bounds":{"x":0,"y":843,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ja/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=ja","label":"といあわせ"},
  {"position":4,"bounds":{"x":833,"y":843,"width":833,"height":843},"action_type":"message","action_text":"LANG_CHANGE","label":"ことばをえらぶ"},
  {"position":5,"bounds":{"x":1666,"y":843,"width":834,"height":843},"action_type":"message","action_text":"YOLO_DISCOVER","label":"YOLO :DISCOVER"}
]'::jsonb),
('en', 'YOLO JAPAN Menu (EN)', 'Menu', '[
  {"position":0,"bounds":{"x":0,"y":0,"width":833,"height":843},"action_type":"message","action_text":"AI_MODE","label":"Find Job (AI)"},
  {"position":1,"bounds":{"x":833,"y":0,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/en/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=en","label":"Search on Site"},
  {"position":2,"bounds":{"x":1666,"y":0,"width":834,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/en/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=en","label":"Featured Jobs"},
  {"position":3,"bounds":{"x":0,"y":843,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/en/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=en","label":"Contact"},
  {"position":4,"bounds":{"x":833,"y":843,"width":833,"height":843},"action_type":"message","action_text":"LANG_CHANGE","label":"Language"},
  {"position":5,"bounds":{"x":1666,"y":843,"width":834,"height":843},"action_type":"message","action_text":"YOLO_DISCOVER","label":"YOLO :DISCOVER"}
]'::jsonb),
('ko', 'YOLO JAPAN Menu (KO)', '메뉴', '[
  {"position":0,"bounds":{"x":0,"y":0,"width":833,"height":843},"action_type":"message","action_text":"AI_MODE","label":"일자리 찾기 (AI)"},
  {"position":1,"bounds":{"x":833,"y":0,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ko/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=ko","label":"사이트에서 검색"},
  {"position":2,"bounds":{"x":1666,"y":0,"width":834,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ko/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=ko","label":"추천 일자리"},
  {"position":3,"bounds":{"x":0,"y":843,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/ko/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=ko","label":"문의"},
  {"position":4,"bounds":{"x":833,"y":843,"width":833,"height":843},"action_type":"message","action_text":"LANG_CHANGE","label":"언어 변경"},
  {"position":5,"bounds":{"x":1666,"y":843,"width":834,"height":843},"action_type":"message","action_text":"YOLO_DISCOVER","label":"YOLO :DISCOVER"}
]'::jsonb),
('zh', 'YOLO JAPAN Menu (ZH)', '菜单', '[
  {"position":0,"bounds":{"x":0,"y":0,"width":833,"height":843},"action_type":"message","action_text":"AI_MODE","label":"找工作（AI）"},
  {"position":1,"bounds":{"x":833,"y":0,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/zh/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=zh","label":"在网站搜索"},
  {"position":2,"bounds":{"x":1666,"y":0,"width":834,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/zh/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=zh","label":"推荐工作"},
  {"position":3,"bounds":{"x":0,"y":843,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/zh/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=zh","label":"联系我们"},
  {"position":4,"bounds":{"x":833,"y":843,"width":833,"height":843},"action_type":"message","action_text":"LANG_CHANGE","label":"语言设置"},
  {"position":5,"bounds":{"x":1666,"y":843,"width":834,"height":843},"action_type":"message","action_text":"YOLO_DISCOVER","label":"YOLO :DISCOVER"}
]'::jsonb),
('vi', 'YOLO JAPAN Menu (VI)', 'Menu', '[
  {"position":0,"bounds":{"x":0,"y":0,"width":833,"height":843},"action_type":"message","action_text":"AI_MODE","label":"Tim viec (AI)"},
  {"position":1,"bounds":{"x":833,"y":0,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/vi/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=vi","label":"Tim tren trang web"},
  {"position":2,"bounds":{"x":1666,"y":0,"width":834,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/vi/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=vi","label":"Viec lam noi bat"},
  {"position":3,"bounds":{"x":0,"y":843,"width":833,"height":843},"action_type":"uri","action_text":"https://www.yolo-japan.com/vi/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=vi","label":"Lien he"},
  {"position":4,"bounds":{"x":833,"y":843,"width":833,"height":843},"action_type":"message","action_text":"LANG_CHANGE","label":"Ngon ngu"},
  {"position":5,"bounds":{"x":1666,"y":843,"width":834,"height":843},"action_type":"message","action_text":"YOLO_DISCOVER","label":"YOLO :DISCOVER"}
]'::jsonb)
ON CONFLICT (lang) DO NOTHING;
