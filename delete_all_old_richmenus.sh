#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

echo "📋 Step 1: 全てのリッチメニューをリスト取得..."
RICHMENUS=$(curl -s -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN")

echo "$RICHMENUS" | jq '.'

echo -e "\n🗑️  Step 2: 全てのリッチメニューを削除中..."

# 各リッチメニューIDを抽出して削除
echo "$RICHMENUS" | jq -r '.richmenus[].richMenuId' | while read RICHMENU_ID; do
  echo "削除中: $RICHMENU_ID"
  curl -X DELETE https://api.line.me/v2/bot/richmenu/$RICHMENU_ID \
    -H "Authorization: Bearer $TOKEN"
  echo " ✅"
  sleep 1
done

echo -e "\n\n🎉 全てのリッチメニューを削除しました!"
echo "次のステップ: 新しいリッチメニューを作成します。"
