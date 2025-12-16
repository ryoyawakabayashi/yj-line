#!/bin/bash

TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "英語リッチメニュー作成中..."
RICHMENU_EN=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (EN)",
  "chatBarText": "Menu",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1667, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')

echo "RICHMENU_EN=${RICHMENU_EN}"

# 画像をアップロード
if [ ! -z "$RICHMENU_EN" ] && [ "$RICHMENU_EN" != "null" ]; then
  echo "英語画像アップロード中..."
  curl -X POST https://api-data.line.me/v2/bot/richmenu/${RICHMENU_EN}/content \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: image/png" \
  -T richmenu_en.png
  echo ""
  echo "✅ 英語リッチメニュー作成完了: ${RICHMENU_EN}"
else
  echo "❌ 英語リッチメニュー作成失敗"
fi

