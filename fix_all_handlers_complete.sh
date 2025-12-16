#!/bin/bash

# 1-82行目までをコピー
head -n 82 lib/handlers/buttons.ts > lib/handlers/buttons_fixed.ts

# handleContact を修正
cat >> lib/handlers/buttons_fixed.ts << 'CONTACT'
export async function handleContact(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;

  const baseUrls: Record<string, string> = {
    ja: 'https://www.yolo-japan.com/ja/inquiry/input',
    en: 'https://www.yolo-japan.com/en/inquiry/input',
    ko: 'https://www.yolo-japan.com/ko/inquiry/input',
    zh: 'https://www.yolo-japan.com/zh-TW/inquiry/input',
    vi: 'https://www.yolo-japan.com/vi/inquiry/input',
  };

  const url = addUtmParams(baseUrls[lang] || baseUrls.ja, 'contact');

  const messages: Record<string, string> = {
    ja: `お問い合わせはこちらから↓\n${url}`,
    en: `Contact us here↓\n${url}`,
    ko: `문의는 여기에서↓\n${url}`,
    zh: `請在此處聯繫我們↓\n${url}`,
    vi: `Liên hệ với chúng tôi tại đây↓\n${url}`,
  };

  await replyMessage(replyToken, {
    type: 'text',
    text: messages[lang] || messages.ja,
  });
}

CONTACT

# 113-162行目（handleFindJob）をスキップして、163行目以降から追加
tail -n +163 lib/handlers/buttons.ts | head -n 21 > temp_sitemode.txt

# handleSiteMode を修正
cat >> lib/handlers/buttons_fixed.ts << 'SITE'
export async function handleSiteMode(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;
SITE

tail -n 5 temp_sitemode.txt >> lib/handlers/buttons_fixed.ts

# 184-204行目（handleViewFeatures）を修正
cat >> lib/handlers/buttons_fixed.ts << 'VIEW'

export async function handleViewFeatures(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;
VIEW

tail -n +187 lib/handlers/buttons.ts | head -n 18 >> lib/handlers/buttons_fixed.ts

# 205-224, 225以降（handleNoThanks, handleYoloDiscover, handleButtonAction）をそのまま追加
tail -n +205 lib/handlers/buttons.ts >> lib/handlers/buttons_fixed.ts

# 置き換え
mv lib/handlers/buttons_fixed.ts lib/handlers/buttons.ts
rm -f temp_sitemode.txt

echo "✅ 全ての関数を修正しました"
