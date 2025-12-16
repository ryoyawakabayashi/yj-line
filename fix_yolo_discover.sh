#!/bin/bash

# 225-227行目の関数シグネチャを修正
sed -i.bak_yolo '225,227s/export async function handleYoloDiscover(\n  userId: string,\n  replyToken: string\n)/export async function handleYoloDiscover(\n  event: any,\n  lang: string\n)/' lib/handlers/buttons.ts

# もっとシンプルに置換
sed -i.bak_yolo2 '225s/export async function handleYoloDiscover(/export async function handleYoloDiscover(event: any, lang: string) {/' lib/handlers/buttons.ts
sed -i.bak_yolo3 '226,228d' lib/handlers/buttons.ts

# userIdとreplyTokenを取得する行を追加
sed -i.bak_yolo4 '226i\
  const userId = event.source?.userId || event;\
  const replyToken = event.replyToken || event;
' lib/handlers/buttons.ts

# langの取得行を削除（引数で受け取るため）
sed -i.bak_yolo5 '229d' lib/handlers/buttons.ts

echo "✅ handleYoloDiscover を修正しました"
