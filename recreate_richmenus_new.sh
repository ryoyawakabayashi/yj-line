#!/bin/bash

TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "=== リッチメニューを新規作成 ==="

# 日本語リッチメニュー作成
echo "日本語リッチメニュー作成中..."
RICHMENU_JA=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (JA)",
  "chatBarText": "メニュー",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1667, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')

echo "RICHMENU_JA=${RICHMENU_JA}"

# 韓国語リッチメニュー作成
echo "韓国語リッチメニュー作成中..."
RICHMENU_KO=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (KO)",
  "chatBarText": "메뉴",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1667, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')

echo "RICHMENU_KO=${RICHMENU_KO}"

# 中国語リッチメニュー作成
echo "中国語リッチメニュー作成中..."
RICHMENU_ZH=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (ZH)",
  "chatBarText": "菜单",
  "areas": [
    {"bounds": {"x": 0, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "AI_MODE"}},
    {"bounds": {"x": 833, "y": 0, "width": 834, "height": 843}, "action": {"type": "message", "text": "SITE_MODE"}},
    {"bounds": {"x": 1667, "y": 0, "width": 833, "height": 843}, "action": {"type": "message", "text": "VIEW_FEATURES"}},
    {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "CONTACT"}},
    {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "text": "LANG_CHANGE"}},
    {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "text": "YOLO_DISCOVER"}}
  ]
}' | jq -r '.richMenuId')

echo "RICHMENU_ZH=${RICHMENU_ZH}"

# ベトナム語リッチメニュー作成
echo "ベトナム語リッチメニュー作成中..."
RICHMENU_VI=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: application/json" \
-d '{
  "size": {"width": 2500, "height": 1686},
  "selected": true,
  "name": "YOLO JAPAN Menu (VI)",
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

echo "RICHMENU_VI=${RICHMENU_VI}"

echo ""
echo "=== 作成されたリッチメニューID ==="
echo "RICHMENU_JA=${RICHMENU_JA}"
echo "RICHMENU_EN=richmenu-a1ef9ac139563e776942a28d41d7acc4"
echo "RICHMENU_KO=${RICHMENU_KO}"
echo "RICHMENU_ZH=${RICHMENU_ZH}"
echo "RICHMENU_VI=${RICHMENU_VI}"

