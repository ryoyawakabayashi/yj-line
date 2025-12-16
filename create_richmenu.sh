#!/bin/bash

CHANNEL_ACCESS_TOKEN="sg52TdxSu+g96wTrOBkPIQ6v1VGwrtmzx2EhFG42kV1plUmArtoyg37CYSvA96YFWKEZXnawItrm11vbOqk/Q6GTEMgKhOojQKFLXstq58OcijURqmu6QzH1J6qjTKVfU9WE+827PIhKJ5SlYIoWZwdB04t89/1O/w1cDnyilFU="

# 日本語版リッチメニューを作成
curl -X POST https://api.line.me/v2/bot/richmenu \
-H "Authorization: Bearer $CHANNEL_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": true,
  "name": "YOLO JAPAN Menu (JP)",
  "chatBarText": "メニュー",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "AI_MODE",
        "label": "しごとをさがす（AI）"
      }
    },
    {
      "bounds": {
        "x": 833,
        "y": 0,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "SITE_MODE",
        "label": "しごとをさがす（Webサイト）"
      }
    },
    {
      "bounds": {
        "x": 1666,
        "y": 0,
        "width": 834,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "VIEW_FEATURES",
        "label": "おすすめのしごと"
      }
    },
    {
      "bounds": {
        "x": 0,
        "y": 843,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "CONTACT",
        "label": "といあわせ"
      }
    },
    {
      "bounds": {
        "x": 833,
        "y": 843,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "LANG_CHANGE",
        "label": "ことばをえらぶ"
      }
    },
    {
      "bounds": {
        "x": 1666,
        "y": 843,
        "width": 834,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "YOLO_DISCOVER",
        "label": "YOLO :DISCOVER"
      }
    }
  ]
}'
