import { replyMessage, replyWithQuickReply } from '../line/client';
import { getUserLang } from '../database/queries';
import { buildYoloSiteUrl, buildYoloFeatureUrl, addUtmParams } from '../utils/url';
import { processUrlsInText } from '../tracking/url-processor';
import { config } from '../config';

export async function handleGreeting(
  userId: string,
  replyToken: string,
  lang: string
): Promise<void> {
  const messages: Record<string, any> = {
    ja: {
      greeting: 'こんにちは!YOLO JAPANです✨',
      prompt: '今日はどのようなお手伝いができますか?\n\n例えば...\n📌 仕事を探している\n📌 お問い合わせしたい',
      quickReply: [
        { label: '🔍 仕事を探す', text: '仕事を探しています' },
        { label: '📩 お問い合わせ', text: 'お問い合わせ' },
      ],
    },
    en: {
      greeting: 'Hello! This is YOLO JAPAN✨',
      prompt: 'How can I help you today?\n\nFor example...\n📌 Looking for a job\n📌 Contact us',
      quickReply: [
        { label: '🔍 Find Job', text: "I'm looking for a job" },
        { label: '📩 Contact', text: 'Contact' },
      ],
    },
    ko: {
      greeting: '안녕하세요! YOLO JAPAN입니다✨',
      prompt: '오늘은 무엇을 도와드릴까요?\n\n예를 들어...\n📌 일자리 찾기\n📌 문의하기',
      quickReply: [
        { label: '🔍 일자리 찾기', text: '일자리를 찾고 있습니다' },
        { label: '📩 문의', text: '문의하기' },
      ],
    },
    zh: {
      greeting: '你好!这里是YOLO JAPAN✨',
      prompt: '今天需要什么帮助?\n\n例如...\n📌 找工作\n📌 联系我们',
      quickReply: [
        { label: '🔍 找工作', text: '我在找工作' },
        { label: '📩 联系', text: '联系我们' },
      ],
    },
    vi: {
      greeting: 'Xin chào! Đây là YOLO JAPAN✨',
      prompt: 'Hôm nay tôi có thể giúp gì cho bạn?\n\nVí dụ...\n📌 Tìm việc làm\n📌 Liên hệ',
      quickReply: [
        { label: '🔍 Tìm việc', text: 'Tôi đang tìm việc' },
        { label: '📩 Liên hệ', text: 'Liên hệ' },
      ],
    },
  };

  const msg = messages[lang] || messages.ja;

  await replyMessage(replyToken, [
    {
      type: 'text',
      text: msg.greeting,
    },
    {
      type: 'text',
      text: msg.prompt,
      quickReply: {
        items: msg.quickReply.map((item: any) => ({
          type: 'action',
          action: {
            type: 'message',
            label: item.label,
            text: item.text,
          },
        })),
      },
    },
  ]);
}

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

export async function handleFindJob(
  userId: string,
  replyToken: string
): Promise<void> {
  const lang = await getUserLang(userId);

  const messages: Record<string, string> = {
    ja: 'どちらの方法で探しますか？',
    en: 'How would you like to search?',
    ko: '어떻게 찾으시겠습니까?',
    zh: '您想如何搜索？',
    vi: 'Bạn muốn tìm kiếm như thế nào?',
  };

  const aiLabel: Record<string, string> = {
    ja: 'AIに丸投げ',
    en: 'Ask AI',
    ko: 'AI에게 물어보기',
    zh: '询问AI',
    vi: 'Hỏi AI',
  };

  const siteLabel: Record<string, string> = {
    ja: '🔍 サイトで探す',
    en: '🔍 Search on Site',
    ko: '🔍 사이트에서 검색',
    zh: '🔍 在网站上搜索',
    vi: '🔍 Tìm trên trang web',
  };

  const featuredLabel: Record<string, string> = {
    ja: '⭐ おすすめの仕事',
    en: '⭐ Featured Jobs',
    ko: '⭐ 추천 일자리',
    zh: '⭐ 推荐工作',
    vi: '⭐ Việc làm nổi bật',
  };

  await replyWithQuickReply(replyToken, messages[lang] || messages.ja, [
    {
      type: 'action',
      action: {
        type: 'message',
        label: aiLabel[lang] || aiLabel.ja,
        text: 'AI_MODE',
      },
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: siteLabel[lang] || siteLabel.ja,
        text: 'SITE_MODE',
      },
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: featuredLabel[lang] || featuredLabel.ja,
        text: 'VIEW_FEATURES',
      },
    },
  ]);
}

export async function handleSiteMode(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const siteUrl = buildYoloSiteUrl(lang);

  const messages: Record<string, string> = {
    ja: `こちらからお仕事を探せます：\n${siteUrl}`,
    en: `You can search for jobs here:\n${siteUrl}`,
    ko: `여기에서 일자리를 찾을 수 있습니다:\n${siteUrl}`,
    zh: `您可以在这里搜索工作：\n${siteUrl}`,
    vi: `Bạn có thể tìm công việc tại đây:\n${siteUrl}`,
  };

  const rawText = messages[lang] || messages.ja;
  const text = await processUrlsInText(rawText, userId, 'support', 'line_chatbot_site_mode');

  await replyMessage(replyToken, {
    type: 'text',
    text,
  });
}

/**
 * AIトーク経由でサイトへ誘導する際のハンドラー
 * utm_medium=autochat を使用してGA4で識別可能にする
 */
export async function handleSiteModeAutochat(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const { buildYoloAutochatUrl } = await import('../utils/url');
  const siteUrl = buildYoloAutochatUrl(lang);

  const messages: Record<string, string> = {
    ja: `こちらからお仕事を探せます：\n${siteUrl}`,
    en: `You can search for jobs here:\n${siteUrl}`,
    ko: `여기에서 일자리를 찾을 수 있습니다:\n${siteUrl}`,
    zh: `您可以在这里搜索工作：\n${siteUrl}`,
    vi: `Bạn có thể tìm công việc tại đây:\n${siteUrl}`,
  };

  const rawText = messages[lang] || messages.ja;
  const text = await processUrlsInText(rawText, userId, 'support', 'line_chatbot_site_mode_autochat');

  await replyMessage(replyToken, {
    type: 'text',
    text,
  });
}

export async function handleViewFeatures(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;  const featureUrl = buildYoloFeatureUrl(lang);

  const messages: Record<string, string> = {
    ja: `おすすめの求人特集はこちら：\n${featureUrl}`,
    en: `Featured jobs here:\n${featureUrl}`,
    ko: `추천 특집:\n${featureUrl}`,
    zh: `推荐特辑：\n${featureUrl}`,
    vi: `Đặc sản đề xuất:\n${featureUrl}`,
  };

  await replyMessage(replyToken, {
    type: 'text',
    text: messages[lang] || messages.ja,
  });
}

export async function handleNoThanks(
  userId: string,
  replyToken: string
): Promise<void> {
  const lang = await getUserLang(userId);

  const messages: Record<string, string> = {
    ja: 'かしこまりました!😊\n\n何かお困りのことがあれば、いつでもお声がけください。',
    en: 'Understood!😊\n\nIf you need anything, feel free to ask anytime.',
    ko: '알겠습니다!😊\n\n무엇이든 필요하시면 언제든지 말씀해주세요.',
    zh: '明白了!😊\n\n如果您有任何需要，请随时告诉我。',
    vi: 'Hiểu rồi!😊\n\nNếu bạn cần gì, hãy hỏi bất cứ lúc nào.',
  };

  await replyMessage(replyToken, {
    type: 'text',
    text: messages[lang] || messages.ja,
  });
}

export async function handleYoloDiscover(event: any, lang: string) {
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

  const greeting = displayName ? `${displayName}さんの` : 'あなたの';

  // 日本語だけ「さん」を付ける
  const greetingJa = displayName ? `${displayName}さんの` : 'あなたの';
  const greetingEn = displayName ? `${displayName}'s` : 'Your';
  const greetingKo = displayName ? `${displayName}님의` : '당신의';
  const greetingZh = displayName ? `${displayName}的` : '您的';
  const greetingVi = displayName ? `${displayName} Của` : '';

  const messages: Record<string, string> = {
    ja: `【YOLO :DISCOVER】
グルメ・観光・ライフスタイルなど、日本の魅力を無料で体験できるサービスです。

最新のプロジェクト情報はYOLO :DISCOVERのLINEでお届けしています。

言語と住んでる地域を設定するだけですぐアクセスできます。
※未登録の方は初回登録が必要です

👇 友だち追加してチェック！
https://lin.ee/bRDMgVx`,
    en: `【YOLO :DISCOVER】
A service where you can experience Japan's charm for FREE - gourmet, sightseeing, lifestyle and more!

Get the latest project info on YOLO :DISCOVER's LINE.

Just set your language and region to get started.
*First-time users need to register

👇 Add as friend and check it out!
https://lin.ee/bRDMgVx`,
    ko: `【YOLO :DISCOVER】
그루메・관광・라이프스타일 등 일본의 매력을 무료로 체험할 수 있는 서비스입니다.

최신 프로젝트 정보는 YOLO :DISCOVER LINE에서 전달하고 있습니다.

언어와 거주 지역만 설정하면 바로 이용할 수 있습니다.
※미등록 회원은 최초 등록이 필요합니다

👇 친구 추가하고 확인하세요!
https://lin.ee/bRDMgVx`,
    zh: `【YOLO :DISCOVER】
美食・观光・生活方式等，可以免费体验日本魅力的服务。

最新项目信息在YOLO :DISCOVER的LINE上发布。

只需设置语言和居住地区即可立即使用。
※未注册用户需要首次注册

👇 添加好友查看！
https://lin.ee/bRDMgVx`,
    vi: `【YOLO :DISCOVER】
Dịch vụ trải nghiệm miễn phí sức hấp dẫn của Nhật Bản - ẩm thực, du lịch, phong cách sống và nhiều hơn nữa!

Thông tin dự án mới nhất được cập nhật trên LINE của YOLO :DISCOVER.

Chỉ cần cài đặt ngôn ngữ và khu vực sinh sống để bắt đầu.
※Người dùng mới cần đăng ký lần đầu

👇 Thêm bạn bè và kiểm tra ngay!
https://lin.ee/bRDMgVx`,
  };

  await replyMessage(replyToken, {
    type: 'text',
    text: messages[lang] || messages.ja,
  });
}
// リッチメニューボタンアクションのハンドラー
export async function handleButtonAction(
  event: any,
  state: any,
  action: string,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  
  switch (action) {
    case 'FIND_JOB':
      await handleFindJob(userId, event.replyToken);
      break;
    case 'SITE_MODE':
      await handleSiteMode(event, lang);
      break;
    case 'SITE_MODE_AUTOCHAT':
      await handleSiteModeAutochat(event, lang);
      break;
    case 'VIEW_FEATURES':
      await handleViewFeatures(event, lang);
      break;
    case 'CONTACT':
      await handleContact(event, lang);
      break;
    case 'YOLO_DISCOVER':
      await handleYoloDiscover(event, lang);
      break;
    default:
      console.log(`Unknown button action: ${action}`);
  }
}

// リッチメニューボタンアクションのハンドラー
