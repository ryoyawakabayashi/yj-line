#!/bin/bash

# 31-43行目の言語マップを正しく置き換え
cat > temp_langmap.txt << 'LANGMAP'
      // 言語選択の処理(絵文字付きのみ)
      const langMap: Record<string, string> = {
        '🇯🇵 日本語': 'ja',
        '🇬🇧 English': 'en',
        '🇰🇷 한국어': 'ko',
        '🇨🇳 中文': 'zh',
        '🇻🇳 Tiếng Việt': 'vi'
      };
LANGMAP

# 31-43行目を置き換え
head -n 30 lib/handlers/event.ts > lib/handlers/event_temp.ts
cat temp_langmap.txt >> lib/handlers/event_temp.ts
tail -n +44 lib/handlers/event.ts >> lib/handlers/event_temp.ts
mv lib/handlers/event_temp.ts lib/handlers/event.ts
rm temp_langmap.txt

echo "✅ 言語マップを修正しました"
