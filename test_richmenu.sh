#!/bin/bash

TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "🇯🇵 TEST: 日本語版リッチメニュー1個だけ作成テスト"

RESP_JA=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size": {"width": 2500, "height": 1686},
    "selected": true,
    "name": "TEST MENU (JP)",
    "chatBarText": "メニュー",
    "areas": [
      {
        "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
        "action": { "type": "message", "text": "TEST" }
      }
    ]
  }')

echo "🔍 RAW RESPONSE:"
echo "$RESP_JA"

RICHMENU_JA=$(echo "$RESP_JA" | jq -r '.richMenuId')
echo "✅ 抜き出した richMenuId = $RICHMENU_JA"

