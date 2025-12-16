#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuBbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

echo "🔍 === トークン確認テスト ==="
curl -v -X GET https://api.line.me/v2/bot/info \
-H "Authorization: Bearer $TOKEN"

echo -e "\n\n🇯🇵 === 日本語版リッチメニュー作成（詳細表示） ==="
curl -v -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (JP)",
  "chatBarText": "メニュー",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}}
  ]
}'
