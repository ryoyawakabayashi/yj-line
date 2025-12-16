#!/bin/bash

# 138-280行目の後にhandleYoloDiscoverを追加
head -n 280 lib/handlers/buttons.ts > lib/handlers/buttons_temp.ts

cat >> lib/handlers/buttons_temp.ts << 'YOLO'

export async function handleYoloDiscover(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  // ユーザーのプロフィールを取得
  let displayName = '';
  try {
    const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${config.line.channelAccessToken}`,
      },
    });
    const profile = await profileResponse.json();
    displayName = profile.displayName || '';
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
  }

  const greetingJa = displayName ? `${displayName}さんの` : 'あなたの';
  const greetingEn = displayName ? `${displayName}'s` : 'Your';
  const greetingKo = displayName ? `${displayName}님의` : '당신의';
  const greetingZh = displayName ? `${displayName}的` : '您的';
  const greetingVi = displayName ? `${displayName} Của` : '';

  const messages: Record<string, string> = {
    ja: `【${greetingJa}日本生活をアップグレード】

YOLO :DISCOVERは、グルメ・観光・ライフスタイルなど、日本の魅力を無料で体験し、あなたのSNSで日本の魅力を発信するサービスです。

感じたことをシェアするだけ。
SNSのフォロワー数は問いません。

▼詳細はこちら
https://yolo-japan.com/discover/`,
    en: `【Upgrade ${greetingEn} life in Japan】

YOLO :DISCOVER is a service where you can experience Japanese attractions for free and share them on your SNS.

Just share what you feel.
No follower count required.

▼Details
https://yolo-japan.com/en/discover/`,
    ko: `【${greetingKo}일본 생활을 업그레이드】

YOLO :DISCOVER는 음식, 관광, 라이프스타일 등 일본의 매력을 무료로 체험하고 SNS에서 공유하는 서비스입니다.

느낀 것을 공유하기만 하면 됩니다.
팔로워 수는 문제되지 않습니다.

▼자세한 내용
https://yolo-japan.com/ko/discover/`,
    zh: `【升级${greetingZh}日本生活】

YOLO :DISCOVER是一项服务，您可以免费体验日本美食、旅游、生活方式等魅力，并在SNS上分享。

只需分享您的感受。
不要求粉丝数量。

▼详情
https://yolo-japan.com/zh/discover/`,
    vi: `【Nâng cấp cuộc sống ${greetingVi} tại Nhật】

YOLO :DISCOVER là dịch vụ trải nghiệm miễn phí sức hấp dẫn của Nhật Bản như ẩm thực, du lịch, phong cách sống và chia sẻ trên SNS.

Chỉ cần chia sẻ cảm nhận.
Không yêu cầu số lượng người theo dõi.

▼Chi tiết
https://yolo-japan.com/vi/discover/`,
  };

  await replyMessage(replyToken, {
    type: 'text',
    text: messages[lang] || messages.ja,
  });
}
YOLO

tail -n +281 lib/handlers/buttons.ts >> lib/handlers/buttons_temp.ts

mv lib/handlers/buttons_temp.ts lib/handlers/buttons.ts

echo "✅ handleYoloDiscover を追加しました"
