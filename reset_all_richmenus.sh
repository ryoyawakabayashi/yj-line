#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

echo "🗑️  全ユーザーのデフォルトリッチメニューを削除中..."
curl -X DELETE https://api.line.me/v2/bot/user/all/richmenu \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ デフォルトリッチメニューを削除しました!"
echo "これで全ユーザーのリッチメニューがリセットされました。"

# 英語版をデフォルトに再設定
RICHMENU_EN="richmenu-a1ef9ac139563e776942a28d41d7acc4"

echo -e "\n🌐 新しいデフォルトリッチメニュー(英語版)を設定中..."
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/$RICHMENU_EN \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ 完了!"
echo "全ユーザーに新しい英語版リッチメニューが適用されます。"
echo "※既存ユーザーはBotをブロック→再追加、または一度トーク画面を閉じて再度開くと反映されます。"
