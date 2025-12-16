#!/bin/bash

TOKEN="/PTpOk/Al11OykVmwJpOY4zvj41PqRG0tWCNldNUh8mWIWjeitrTEPBBVSa5yN8bVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuSMi2LYscuKEaj6mX/RMv4VC+L6iNKCFMXdK4dQuNNaowdB04t89/1O/w1cDnyilFU="

echo "=== リッチメニュー画像をアップロード ==="

echo "日本語画像アップロード中..."
curl -X POST https://api-data.line.me/v2/bot/richmenu/richmenu-afd72d43e7f854f35d42b2424ee0a663/content \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: image/png" \
-T richmenu_jp.png

echo "韓国語画像アップロード中..."
curl -X POST https://api-data.line.me/v2/bot/richmenu/richmenu-683e241a7618e8aca838a6ff4ae955ae/content \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: image/png" \
-T richmenu_ko.png

echo "中国語画像アップロード中..."
curl -X POST https://api-data.line.me/v2/bot/richmenu/richmenu-24ae71c3fd5feaa0a3dd1753ccdfd868/content \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: image/png" \
-T richmenu_zh.png

echo "ベトナム語画像アップロード中..."
curl -X POST https://api-data.line.me/v2/bot/richmenu/richmenu-a46ce1e92ade8a3a8e70c8356c86faeb/content \
-H "Authorization: Bearer ${TOKEN}" \
-H "Content-Type: image/png" \
-T richmenu_vi.png

echo ""
echo "✅ 全ての画像アップロード完了"
