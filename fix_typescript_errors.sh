#!/bin/bash

# 修正1: lib/database/queries.ts - clearConversationState の重複削除
# 240行目付近の clearConversationState を削除
sed -i '240,250d' lib/database/queries.ts

echo "✅ queries.ts の重複定義を削除しました"

# 修正2: lib/handlers/event.ts - startDiagnosisMode の引数修正
# 79行目: startDiagnosisMode に lang 引数を追加
sed -i '79s/await startDiagnosisMode(event, state);/await startDiagnosisMode(event, state, lang || "ja");/' lib/handlers/event.ts

echo "✅ event.ts の startDiagnosisMode 引数を修正しました"

# 修正3: lib/handlers/buttons.ts - handleButtonAction を追加
# buttons.ts に handleButtonAction 関数をエクスポート
cat >> lib/handlers/buttons.ts << 'BUTTONS_EOF'

// リッチメニューボタンアクションのハンドラー
export async function handleButtonAction(
  event: any,
  state: any,
  action: string,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  
  switch (action) {
    case 'SITE_MODE':
      await handleSiteMode(event, lang);
      break;
    case 'VIEW_FEATURES':
      await handleViewFeatures(event, lang);
      break;
    case 'CONTACT':
      await handleContact(event, lang);
      break;
    case 'YOLO_DISCOVER':
      await handleYoloDiscover(event, lang);
      break;
    default:
      console.log(`Unknown button action: ${action}`);
  }
}
BUTTONS_EOF

echo "✅ buttons.ts に handleButtonAction を追加しました"

