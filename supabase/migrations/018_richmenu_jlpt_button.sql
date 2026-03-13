-- =====================================================
-- リッチメニュー: 左上ボタンを JLPT_QUIZ に変更
-- position 0 の action_text を JLPT_QUIZ に更新
-- =====================================================

-- 全言語・全バリアントの position 0 を JLPT_QUIZ に更新
UPDATE richmenu_configs
SET areas = (
  SELECT jsonb_agg(
    CASE
      WHEN (elem->>'position')::int = 0
      THEN jsonb_set(
        jsonb_set(elem, '{action_text}', '"JLPT_QUIZ"'),
        '{action_type}', '"message"'
      )
      ELSE elem
    END
    ORDER BY (elem->>'position')::int
  )
  FROM jsonb_array_elements(areas) AS elem
),
updated_at = NOW();
