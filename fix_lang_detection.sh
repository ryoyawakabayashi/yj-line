#!/bin/bash

# event.ts のバックアップ
cp lib/handlers/event.ts lib/handlers/event.ts.bak3

# 言語選択ロジックを修正（絵文字付きのみに限定）
cat > temp_event_fix.txt << 'EVENTFIX'
      // 言語選択の処理(絵文字付きのみ)
      const langMap: Record<string, string> = {
        '🇯🇵 日本語': 'ja',
        '🇬🇧 English': 'en',
        '🇰🇷 한국어': 'ko',
        '🇨🇳 中文': 'zh',
        '🇻🇳 Tiếng Việt': 'vi'
      };

      // 診断モード以外の場合のみ言語選択を処理
      if (langMap[messageText] && currentState?.mode !== CONSTANTS.MODE.DIAGNOSIS) {
        console.log('🌐 言語選択を検出:', messageText);
EVENTFIX

# 31-46行目を置き換え
head -n 30 lib/handlers/event.ts > lib/handlers/event_new.ts
cat temp_event_fix.txt >> lib/handlers/event_new.ts
tail -n +47 lib/handlers/event.ts >> lib/handlers/event_new.ts
mv lib/handlers/event_new.ts lib/handlers/event.ts
rm temp_event_fix.txt

echo "✅ 言語選択ロジックを修正しました（診断モード中は無効化）"
