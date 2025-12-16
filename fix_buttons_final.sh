#!/bin/bash

# buttons.ts の83-112行目（handleContact）を修正
head -n 82 lib/handlers/buttons.ts > lib/handlers/buttons_new.ts

cat >> lib/handlers/buttons_new.ts << 'CONTACT'
export async function handleContact(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
CONTACT

tail -n +86 lib/handlers/buttons.ts | head -n 27 >> lib/handlers/buttons_new.ts

# handleFindJobをスキップ（不要な可能性）
tail -n +163 lib/handlers/buttons.ts | head -n 0 >> lib/handlers/buttons_new.ts

# handleSiteMode を追加
cat >> lib/handlers/buttons_new.ts << 'SITE'

export async function handleSiteMode(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
SITE

tail -n +166 lib/handlers/buttons.ts | head -n 18 >> lib/handlers/buttons_new.ts

# handleViewFeatures を追加
cat >> lib/handlers/buttons_new.ts << 'VIEW'

export async function handleViewFeatures(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
VIEW

tail -n +187 lib/handlers/buttons.ts >> lib/handlers/buttons_new.ts

mv lib/handlers/buttons_new.ts lib/handlers/buttons.ts

echo "✅ buttons.ts を修正しました"
