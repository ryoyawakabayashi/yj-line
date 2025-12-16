#!/bin/bash

echo "=== 全てのボタンハンドラーを修正 ==="

# handleContactを修正 (83-85行目)
sed -i.bak1 '83,85c\
export async function handleContact(\
  event: any,\
  lang: string\
): Promise<void> {\
  const userId = event.source.userId;\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

# handleSiteModeを修正 (163-165行目)
sed -i.bak2 '163,165c\
export async function handleSiteMode(\
  event: any,\
  lang: string\
): Promise<void> {\
  const userId = event.source.userId;\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

# handleViewFeaturesを修正 (184-186行目)
sed -i.bak3 '184,186c\
export async function handleViewFeatures(\
  event: any,\
  lang: string\
): Promise<void> {\
  const userId = event.source.userId;\
  const replyToken = event.replyToken;
' lib/handlers/buttons.ts

echo "✅ 全てのボタンハンドラーを修正しました"
