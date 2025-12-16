#!/bin/bash

# ここに「さっきのトークン」をそのままコピペする（公開リポジトリには絶対コミットしないこと！）
TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "🗑️  ========== Step 1: 既存のリッチメニューを全削除 =========="
RICHMENUS=$(curl -s -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN")

echo "$RICHMENUS" | jq -r '.richmenus[].richMenuId' | while read RICHMENU_ID; do
  if [ -n "$RICHMENU_ID" ]; then
    echo "削除中: $RICHMENU_ID"
    curl -s -X DELETE https://api.line.me/v2/bot/richmenu/$RICHMENU_ID \
      -H "Authorization: Bearer $TOKEN"
    echo " ✅"
    sleep 1
  fi
done

echo -e "\n🆕 ========== Step 2: 新しいリッチメニューを作成 =========="

echo "🇯🇵 日本語版作成中..."
RESP_JA=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (JP)",
  "chatBarText": "メニュー",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "message", "text": "AI_MODE" }
    }
  ]
}')
echo "🔍 RAW RESPONSE (JA): $RESP_JA"

RICHMENU_JA=$(echo "$RESP_JA" | jq -r '.richMenuId')
echo "✅ RICHMENU_JA=$RICHMENU_JA"

echo "🇬🇧 英語版作成中..."
RICHMENU_EN=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (EN)",
  "chatBarText": "Menu",
  "areas": [
    { "bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": { "type": "message", "text": "AI_MODE" } },
    { "bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/en/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=en" } },
    { "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/en/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=en" } },
    { "bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/en/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=en" } },
    { "bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": { "type": "message", "text": "LANG_CHANGE" } },
    { "bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": { "type": "message", "text": "YOLO_DISCOVER" } }
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_EN=$RICHMENU_EN"

echo "🇰🇷 韓国語版作成中..."
RICHMENU_KO=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (KO)",
  "chatBarText": "메뉴",
  "areas": [
    { "bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": { "type": "message", "text": "AI_MODE" } },
    { "bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/ko/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=ko" } },
    { "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/ko/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=ko" } },
    { "bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/ko/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=ko" } },
    { "bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": { "type": "message", "text": "LANG_CHANGE" } },
    { "bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": { "type": "message", "text": "YOLO_DISCOVER" } }
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_KO=$RICHMENU_KO"

echo "🇨🇳 中国語版作成中..."
RICHMENU_ZH=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (ZH)",
  "chatBarText": "菜单",
  "areas": [
    { "bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": { "type": "message", "text": "AI_MODE" } },
    { "bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/zh/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=zh" } },
    { "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/zh/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=zh" } },
    { "bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/zh/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=zh" } },
    { "bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": { "type": "message", "text": "LANG_CHANGE" } },
    { "bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": { "type": "message", "text": "YOLO_DISCOVER" } }
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_ZH=$RICHMENU_ZH"

echo "🇻🇳 ベトナム語版作成中..."
RICHMENU_VI=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (VI)",
  "chatBarText": "Menu",
  "areas": [
    { "bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": { "type": "message", "text": "AI_MODE" } },
    { "bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/vi/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=vi" } },
    { "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/vi/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=vi" } },
    { "bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": { "type": "uri", "uri": "https://www.yolo-japan.com/vi/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=vi" } },
    { "bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": { "type": "message", "text": "LANG_CHANGE" } },
    { "bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": { "type": "message", "text": "YOLO_DISCOVER" } }
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_VI=$RICHMENU_VI"

echo -e "\n📤 ========== Step 3: 画像をアップロード =========="

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_JA/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_jp.png"
echo "✅ 日本語版画像"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_EN/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_en.png"
echo "✅ 英語版画像"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_KO/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_ko.png"
echo "✅ 韓国語版画像"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_ZH/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_zh.png"
echo "✅ 中国語版画像"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_VI/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_vi.png"
echo "✅ ベトナム語版画像"

echo -e "\n🌐 ========== Step 4: デフォルトを英語版に設定 =========="
curl -s -X POST https://api.line.me/v2/bot/user/all/richmenu/$RICHMENU_EN \
  -H "Authorization: Bearer $TOKEN"
echo "✅ デフォルトリッチメニュー設定完了"

echo -e "\n\n📋 ========== 新しいリッチメニューID =========="
echo "RICHMENU_INIT=$RICHMENU_EN"
echo "RICHMENU_JA=$RICHMENU_JA"
echo "RICHMENU_EN=$RICHMENU_EN"
echo "RICHMENU_KO=$RICHMENU_KO"
echo "RICHMENU_ZH=$RICHMENU_ZH"
echo "RICHMENU_VI=$RICHMENU_VI"

echo -e "\n🎉 完了!"
echo "これらのIDをVercelの環境変数に設定してください!"
