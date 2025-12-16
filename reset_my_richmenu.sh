#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="
USER_ID="U9467c9e67d32fc6c552df858c792f500"
RICHMENU_EN="richmenu-a1ef9ac139563e776942a28d41d7acc4"

echo "🗑️  あなたのリッチメニューをリセット中..."
curl -X DELETE https://api.line.me/v2/bot/user/$USER_ID/richmenu \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ リッチメニューをリセットしました!"

echo -e "\n🌐 新しい英語版リッチメニューを設定中..."
curl -X POST https://api.line.me/v2/bot/user/$USER_ID/richmenu/$RICHMENU_EN \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ 完了!"
echo "LINEアプリでトーク画面を閉じて、再度開いてください。"
echo "新しい英語版リッチメニューが表示されるはずです!"
