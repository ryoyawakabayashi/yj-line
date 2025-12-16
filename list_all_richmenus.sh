#!/bin/bash

TOKEN="502B27kTVKi8Y6UwxSOk2u1VxLJC+fUWIdaXSKuddc0PDaFz5OgKFPAZbRSF4HrnVX8y1/vVKYB377EKepyEaFZ6544ffpiFK4RjcRSTEuRbjvk7k1ZqK/PBwwfKoXAz9NP1OIelEt4JUZNQDZhJfgdB04t89/1O/w1cDnyilFU="

echo "📋 全てのリッチメニューをリスト表示..."
curl -X GET https://api.line.me/v2/bot/richmenu/list \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n現在のリッチメニューID:"
echo "RICHMENU_JA=richmenu-373fab7f4f8adbd4841c93cc2d27c47f"
echo "RICHMENU_EN=richmenu-a1ef9ac139563e776942a28d41d7acc4"
echo "RICHMENU_KO=richmenu-d7ab9bc99dda7eebd5b14e106347497e"
echo "RICHMENU_ZH=richmenu-600002ef4f42e96fd82cadd683e1fd7e"
echo "RICHMENU_VI=richmenu-99221d445d3ac19f0ead8425afaa38cf"
