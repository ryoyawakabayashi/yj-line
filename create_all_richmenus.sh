#!/bin/bash

TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "🗑️ ========== Step 1: 既存リッチメニューを全削除 =========="
RICHMENUS=$(curl -s -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN")

echo "$RICHMENUS" | jq -r '.richmenus[].richMenuId' | while read ID; do
  if [ -n "$ID" ]; then
    echo "削除中: $ID"
    curl -s -X DELETE https://api.line.me/v2/bot/richmenu/$ID \
      -H "Authorization: Bearer $TOKEN"
    echo " {}  → 削除完了"
  fi
done

echo -e "\n🆕 ========== Step 2: 新しいリッチメニューを作成 =========="

# 🇯🇵 JP
echo "🌐 JP メニュー作成中..."
RESP_JA=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size":{"width":2500,"height":1686},
    "selected":true,
    "name":"YOLO JAPAN Menu (JP)",
    "chatBarText":"メニュー",
    "areas":[
      {"bounds":{"x":0,"y":0,"width":833,"height":843},"action":{"type":"message","text":"AI_MODE"}},
      {"bounds":{"x":833,"y":0,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ja/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=ja"}},
      {"bounds":{"x":1666,"y":0,"width":834,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ja/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=ja"}},
      {"bounds":{"x":0,"y":843,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ja/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=ja"}},
      {"bounds":{"x":833,"y":843,"width":833,"height":843},"action":{"type":"message","text":"LANG_CHANGE"}},
      {"bounds":{"x":1666,"y":843,"width":834,"height":843},"action":{"type":"message","text":"YOLO_DISCOVER"}}
    ]
  }')
echo "RAW RESPONSE (JP): $RESP_JA"
MENU_JA=$(echo "$RESP_JA" | jq -r '.richMenuId')
echo "→ MENU_JA = $MENU_JA"

# 🇬🇧 EN
echo -e "\n🌐 EN メニュー作成中..."
RESP_EN=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size":{"width":2500,"height":1686},
    "selected":true,
    "name":"YOLO JAPAN Menu (EN)",
    "chatBarText":"Menu",
    "areas":[
      {"bounds":{"x":0,"y":0,"width":833,"height":843},"action":{"type":"message","text":"AI_MODE"}},
      {"bounds":{"x":833,"y":0,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/en/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=en"}},
      {"bounds":{"x":1666,"y":0,"width":834,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/en/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=en"}},
      {"bounds":{"x":0,"y":843,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/en/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=en"}},
      {"bounds":{"x":833,"y":843,"width":833,"height":843},"action":{"type":"message","text":"LANG_CHANGE"}},
      {"bounds":{"x":1666,"y":843,"width":834,"height":843},"action":{"type":"message","text":"YOLO_DISCOVER"}}
    ]
  }')
echo "RAW RESPONSE (EN): $RESP_EN"
MENU_EN=$(echo "$RESP_EN" | jq -r '.richMenuId')
echo "→ MENU_EN = $MENU_EN"

# 🇰🇷 KO
echo -e "\n🌐 KO メニュー作成中..."
RESP_KO=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size":{"width":2500,"height":1686},
    "selected":true,
    "name":"YOLO JAPAN Menu (KO)",
    "chatBarText":"메뉴",
    "areas":[
      {"bounds":{"x":0,"y":0,"width":833,"height":843},"action":{"type":"message","text":"AI_MODE"}},
      {"bounds":{"x":833,"y":0,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ko/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=ko"}},
      {"bounds":{"x":1666,"y":0,"width":834,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ko/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=ko"}},
      {"bounds":{"x":0,"y":843,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/ko/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=ko"}},
      {"bounds":{"x":833,"y":843,"width":833,"height":843},"action":{"type":"message","text":"LANG_CHANGE"}},
      {"bounds":{"x":1666,"y":843,"width":834,"height":843},"action":{"type":"message","text":"YOLO_DISCOVER"}}
    ]
  }')
echo "RAW RESPONSE (KO): $RESP_KO"
MENU_KO=$(echo "$RESP_KO" | jq -r '.richMenuId')
echo "→ MENU_KO = $MENU_KO"

# 🇨🇳 ZH
echo -e "\n🌐 ZH メニュー作成中..."
RESP_ZH=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size":{"width":2500,"height":1686},
    "selected":true,
    "name":"YOLO JAPAN Menu (ZH)",
    "chatBarText":"菜单",
    "areas":[
      {"bounds":{"x":0,"y":0,"width":833,"height":843},"action":{"type":"message","text":"AI_MODE"}},
      {"bounds":{"x":833,"y":0,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/zh/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=zh"}},
      {"bounds":{"x":1666,"y":0,"width":834,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/zh/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=zh"}},
      {"bounds":{"x":0,"y":843,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/zh/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=zh"}},
      {"bounds":{"x":833,"y":843,"width":833,"height":843},"action":{"type":"message","text":"LANG_CHANGE"}},
      {"bounds":{"x":1666,"y":843,"width":834,"height":843},"action":{"type":"message","text":"YOLO_DISCOVER"}}
    ]
  }')
echo "RAW RESPONSE (ZH): $RESP_ZH"
MENU_ZH=$(echo "$RESP_ZH" | jq -r '.richMenuId')
echo "→ MENU_ZH = $MENU_ZH"

# 🇻🇳 VI（さっきエラーだった bounds を修正）
echo -e "\n🌐 VI メニュー作成中..."
RESP_VI=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "size":{"width":2500,"height":1686},
    "selected":true,
    "name":"YOLO JAPAN Menu (VI)",
    "chatBarText":"Menu",
    "areas":[
      {"bounds":{"x":0,"y":0,"width":833,"height":843},"action":{"type":"message","text":"AI_MODE"}},
      {"bounds":{"x":833,"y":0,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/vi/?utm_source=line&utm_medium=menu&utm_campaign=line_menu_site_top&utm_content=vi"}},
      {"bounds":{"x":1666,"y":0,"width":834,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/vi/recruit/feature/theme?utm_source=line&utm_medium=menu&utm_campaign=line_menu_feature&utm_content=vi"}},
      {"bounds":{"x":0,"y":843,"width":833,"height":843},"action":{"type":"uri","uri":"https://www.yolo-japan.com/vi/inquiry/input?utm_source=line&utm_medium=menu&utm_campaign=line_menu_inquiry&utm_content=vi"}},
      {"bounds":{"x":833,"y":843,"width":833,"height":843},"action":{"type":"message","text":"LANG_CHANGE"}},
      {"bounds":{"x":1666,"y":843,"width":834,"height":843},"action":{"type":"message","text":"YOLO_DISCOVER"}}
    ]
  }')
echo "RAW RESPONSE (VI): $RESP_VI"
MENU_VI=$(echo "$RESP_VI" | jq -r '.richMenuId')
echo "→ MENU_VI = $MENU_VI"

echo -e "\n📤 ========== Step 3: 画像アップロード =========="

upload_image () {
  ID="$1"
  FILE="$2"
  echo "アップロード中: $FILE → $ID"
  curl -s -X POST "https://api-data.line.me/v2/bot/richmenu/$ID/content" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: image/png" \
    --data-binary @"$FILE"
  echo " → 完了"
}

upload_image "$MENU_JA" "richmenu_jp.png"
upload_image "$MENU_EN" "richmenu_en.png"
upload_image "$MENU_KO" "richmenu_ko.png"
upload_image "$MENU_ZH" "richmenu_zh.png"
upload_image "$MENU_VI" "richmenu_vi.png"

echo -e "\n🌐 ========== Step 4: デフォルトを英語に設定 =========="
curl -s -X POST "https://api.line.me/v2/bot/user/all/richmenu/$MENU_EN" \
  -H "Authorization: Bearer $TOKEN"
echo " → デフォルトリッチメニュー設定完了"

echo -e "\n🎉 完了！"
echo "MENU_JA=$MENU_JA"
echo "MENU_EN=$MENU_EN"
echo "MENU_KO=$MENU_KO"
echo "MENU_ZH=$MENU_ZH"
echo "MENU_VI=$MENU_VI"
