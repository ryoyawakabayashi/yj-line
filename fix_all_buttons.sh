#!/bin/bash

# 全てのボタンハンドラーを (event: any, lang: string) 形式に統一

echo "🔧 buttons.tsを修正中..."

# 1. handleContact (83-87行目)
sed -i.step1 '
83,87c\
export async function handleContact(\
  event: any,\
  lang: string\
): Promise<void> {\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

# 2. handleSiteMode (163-167行目)
sed -i.step2 '
163,167c\
export async function handleSiteMode(\
  event: any,\
  lang: string\
): Promise<void> {\
  const userId = event.source.userId;\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

# 3. handleViewFeatures (184-188行目)
sed -i.step3 '
184,188c\
export async function handleViewFeatures(\
  event: any,\
  lang: string\
): Promise<void> {\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

# 4. handleYoloDiscover (226-228行目)
sed -i.step4 '226s/.*/  const userId = event.source.userId;/' lib/handlers/buttons.ts
sed -i.step4 '227s/.*/  const replyToken = event.replyToken;/' lib/handlers/buttons.ts
sed -i.step4 '228d' lib/handlers/buttons.ts

echo "✅ 修正完了!"
