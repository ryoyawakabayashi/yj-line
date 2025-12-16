#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRsTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

echo "🗑️  ========== 既存リッチメニューを全削除 =========="
RICHMENUS=$(curl -s -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN")

echo "$RICHMENUS" | jq -r '.richmenus[].richMenuId' | while read RICHMENU_ID; do
  echo "削除中: $RICHMENU_ID"
  curl -s -X DELETE https://api.line.me/v2/bot/richmenu/$RICHMENU_ID \
    -H "Authorization: Bearer $TOKEN"
  echo " ✅"
  sleep 1
done

echo -e "\n🆕 ========== 新規作成 =========="

# 日本語版
echo "��🇵 日本語版作成..."
RICHMENU_JA=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (JP)",
  "chatBarText": "メニュー",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_JA=$RICHMENU_JA"

# 画像アップロード
curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_JA/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_jp.png"
echo "✅ 日本語版画像アップロード完了"

# 英語版
echo -e "\n🇬🇧 英語版作成..."
RICHMENU_EN=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (EN)",
  "chatBarText": "Menu",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_EN=$RICHMENU_EN"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_EN/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_en.png"
echo "✅ 英語版画像アップロード完了"

# 韓国語版
echo -e "\n🇰🇷 韓国語版作成..."
RICHMENU_KO=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (KO)",
  "chatBarText": "메뉴",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_KO=$RICHMENU_KO"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_KO/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_ko.png"
echo "✅ 韓国語版画像アップロード完了"

# 中国語版
echo -e "\n🇨🇳 中国語版作成..."
RICHMENU_ZH=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (ZH)",
  "chatBarText": "菜单",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_ZH=$RICHMENU_ZH"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_ZH/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_zh.png"
echo "✅ 中国語版画像アップロード完了"

# ベトナム語版
echo -e "\n🇻🇳 ベトナム語版作成..."
RICHMENU_VI=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (VI)",
  "chatBarText": "Menu",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1666, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')
echo "✅ RICHMENU_VI=$RICHMENU_VI"

curl -s -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_VI/content \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: image/png" \
  --data-binary @"richmenu_vi.png"
echo "✅ ベトナム語版画像アップロード完了"

# デフォルトを英語版に設定
echo -e "\n🌐 デフォルトを英語版に設定..."
curl -s -X POST https://api.line.me/v2/bot/user/all/richmenu/$RICHMENU_EN \
  -H "Authorization: Bearer $TOKEN"
echo " ✅"

echo -e "\n\n📋 ========== 新しいID =========="
echo "RICHMENU_INIT=$RICHMENU_EN"
echo "RICHMENU_JA=$RICHMENU_JA"
echo "RICHMENU_EN=$RICHMENU_EN"
echo "RICHMENU_KO=$RICHMENU_KO"
echo "RICHMENU_ZH=$RICHMENU_ZH"
echo "RICHMENU_VI=$RICHMENU_VI"

echo -e "\n🎉 完了!"
echo "これらのIDで .env.local と Vercel を更新してください!"
