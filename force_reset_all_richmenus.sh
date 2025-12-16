#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="
RICHMENU_EN="richmenu-a1ef9ac139563e776942a28d41d7acc4"

echo "🔍 Step 1: 現在のデフォルトリッチメニューを確認..."
curl -X GET https://api.line.me/v2/bot/user/all/richmenu \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n🗑️  Step 2: デフォルトリッチメニューを削除..."
curl -X DELETE https://api.line.me/v2/bot/user/all/richmenu \
  -H "Authorization: Bearer $TOKEN"

sleep 3

echo -e "\n🗑️  Step 3: もう一度削除(念のため)..."
curl -X DELETE https://api.line.me/v2/bot/user/all/richmenu \
  -H "Authorization: Bearer $TOKEN"

sleep 3

echo -e "\n🌐 Step 4: 新しい英語版リッチメニューを全ユーザーに設定..."
RESULT=$(curl -X POST https://api.line.me/v2/bot/user/all/richmenu/$RICHMENU_EN \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")

echo "$RESULT"

sleep 2

echo -e "\n✅ Step 5: 設定を確認..."
curl -X GET https://api.line.me/v2/bot/user/all/richmenu \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n🎉 完了!"
echo ""
echo "📱 ユーザー側の対応:"
echo "1. LINEアプリを完全に終了(タスクキル)"
echo "2. LINEアプリを再起動"
echo "3. Botのトーク画面を開く"
echo ""
echo "※それでも変わらない場合:"
echo "- Botをブロック→解除"
echo "- または、トーク削除→再度友達追加"
