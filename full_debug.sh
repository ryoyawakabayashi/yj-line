#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRsTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="
USER_ID="U9467c9e67d32fc6c552df858c792f500"

echo "=========================================="
echo "🔍 完全デバッグ開始"
echo "=========================================="

echo -e "\n�� 1. 環境変数確認"
cat .env.local | grep RICHMENU

echo -e "\n📋 2. あなたの現在のリッチメニュー確認"
CURRENT=$(curl -s -X GET https://api.line.me/v2/bot/user/$USER_ID/richmenu \
  -H "Authorization: Bearer $TOKEN")
echo "$CURRENT"

echo -e "\n📋 3. 全リッチメニュー一覧"
curl -s -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN" | jq '.richmenus[] | {richMenuId, name}'

echo -e "\n🗑️  4. 既存のリッチメニューを強制削除"
curl -s -X DELETE https://api.line.me/v2/bot/user/$USER_ID/richmenu \
  -H "Authorization: Bearer $TOKEN"
echo " ✅"

sleep 2

echo -e "\n��🇵 5. 日本語版を強制設定"
RICHMENU_JA="richmenu-373fab7f4f8adbd4841c93cc2d27c47f"
RESULT=$(curl -s -X POST https://api.line.me/v2/bot/user/$USER_ID/richmenu/$RICHMENU_JA \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")
echo "$RESULT"

sleep 2

echo -e "\n🔍 6. 設定後の確認"
curl -s -X GET https://api.line.me/v2/bot/user/$USER_ID/richmenu \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=========================================="
echo "✅ デバッグ完了"
echo "=========================================="
echo ""
echo "📱 次の手順を必ず実行:"
echo "1. Botをブロック"
echo "2. トークを削除"
echo "3. もう一度友達追加"
echo "4. リッチメニューを確認"
