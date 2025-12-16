#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

# リッチメニューID
RICHMENU_JA="richmenu-373fab7f4f8adbd4841c93cc2d27c47f"
RICHMENU_EN="richmenu-a1ef9ac139563e776942a28d41d7acc4"
RICHMENU_KO="richmenu-d7ab9bc99dda7eebd5b14e106347497e"
RICHMENU_ZH="richmenu-600002ef4f42e96fd82cadd683e1fd7e"
RICHMENU_VI="richmenu-99221d445d3ac19f0ead8425afaa38cf"

# 実際の画像ファイル名
IMAGE_JA="richmenu_jp.png"
IMAGE_EN="richmenu_en.png"
IMAGE_KO="richmenu_ko.png"
IMAGE_ZH="richmenu_zh.png"
IMAGE_VI="richmenu_vi.png"

echo "🇯🇵 日本語版リッチメニュー画像アップロード"
curl -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_JA/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @"$IMAGE_JA"
echo "✅ 完了"

echo -e "\n🇬🇧 英語版リッチメニュー画像アップロード"
curl -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_EN/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @"$IMAGE_EN"
echo "✅ 完了"

echo -e "\n🇰🇷 韓国語版リッチメニュー画像アップロード"
curl -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_KO/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @"$IMAGE_KO"
echo "✅ 完了"

echo -e "\n🇨🇳 中国語版リッチメニュー画像アップロード"
curl -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_ZH/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @"$IMAGE_ZH"
echo "✅ 完了"

echo -e "\n🇻🇳 ベトナム語版リッチメニュー画像アップロード"
curl -X POST https://api-data.line.me/v2/bot/richmenu/$RICHMENU_VI/content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @"$IMAGE_VI"
echo "✅ 完了"

echo -e "\n\n🎉 全てのリッチメニュー画像をアップロードしました!"
