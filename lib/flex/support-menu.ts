// =====================================================
// Support Menu Flex Messages
// =====================================================

import { ServiceType } from '@/types/support';

/**
 * Flex Message の型定義（LINE Messaging API）
 */
interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble;
}

interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  hero?: FlexImage;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: any;
}

interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  flex?: number;
  action?: any;
}

interface FlexButton {
  type: 'button';
  action: {
    type: 'postback' | 'message' | 'uri';
    label: string;
    data?: string;
    text?: string;
    uri?: string;
  };
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  height?: 'sm' | 'md';
  margin?: string;
}

interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  color?: string;
  weight?: 'regular' | 'bold';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end';
  margin?: string;
}

interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
}

interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

type FlexComponent = FlexBox | FlexButton | FlexText | FlexImage | FlexSeparator;

/**
 * 多言語対応のテキスト
 */
const TEXTS = {
  ja: {
    title: 'お問い合わせ',
    description: 'ご用件を選択してください',
    feedback: 'ご意見・ご要望',
    bug: '不具合報告',
    feedbackDesc: 'サービスへのご意見やご要望',
    bugDesc: 'エラーや問題のご報告',
    altText: 'お問い合わせメニュー',
    serviceTitle: 'サービス選択',
    serviceDesc: 'どのサービスについてですか？',
    yoloHome: 'YOLO HOME',
    yoloDiscover: 'YOLO DISCOVER',
    yoloJapan: 'YOLO JAPAN',
    yoloHomeDesc: '住宅情報サービス',
    yoloDiscoverDesc: '生活・イベント情報',
    yoloJapanDesc: '求人サイト',
  },
  en: {
    title: 'Contact Us',
    description: 'Please select your inquiry type',
    feedback: 'Feedback',
    bug: 'Bug Report',
    feedbackDesc: 'Your opinions and suggestions',
    bugDesc: 'Report errors or issues',
    altText: 'Contact Menu',
    serviceTitle: 'Select Service',
    serviceDesc: 'Which service is this about?',
    yoloHome: 'YOLO HOME',
    yoloDiscover: 'YOLO DISCOVER',
    yoloJapan: 'YOLO JAPAN',
    yoloHomeDesc: 'Housing Service',
    yoloDiscoverDesc: 'Lifestyle & Events',
    yoloJapanDesc: 'Job Site',
  },
  ko: {
    title: '문의하기',
    description: '문의 유형을 선택해 주세요',
    feedback: '의견/요청',
    bug: '버그 신고',
    feedbackDesc: '서비스에 대한 의견이나 요청',
    bugDesc: '오류나 문제 신고',
    altText: '문의 메뉴',
    serviceTitle: '서비스 선택',
    serviceDesc: '어떤 서비스에 대한 문의인가요?',
    yoloHome: 'YOLO HOME',
    yoloDiscover: 'YOLO DISCOVER',
    yoloJapan: 'YOLO JAPAN',
    yoloHomeDesc: '주택 정보 서비스',
    yoloDiscoverDesc: '생활/이벤트 정보',
    yoloJapanDesc: '구인 사이트',
  },
  zh: {
    title: '联系我们',
    description: '请选择您的咨询类型',
    feedback: '意见/建议',
    bug: '问题报告',
    feedbackDesc: '您对服务的意见和建议',
    bugDesc: '报告错误或问题',
    altText: '联系菜单',
    serviceTitle: '选择服务',
    serviceDesc: '这是关于哪个服务？',
    yoloHome: 'YOLO HOME',
    yoloDiscover: 'YOLO DISCOVER',
    yoloJapan: 'YOLO JAPAN',
    yoloHomeDesc: '住房服务',
    yoloDiscoverDesc: '生活/活动信息',
    yoloJapanDesc: '求职网站',
  },
  vi: {
    title: 'Liên hệ',
    description: 'Vui lòng chọn loại yêu cầu',
    feedback: 'Góp ý',
    bug: 'Báo lỗi',
    feedbackDesc: 'Ý kiến và đề xuất của bạn',
    bugDesc: 'Báo cáo lỗi hoặc vấn đề',
    altText: 'Menu liên hệ',
    serviceTitle: 'Chọn dịch vụ',
    serviceDesc: 'Yêu cầu này liên quan đến dịch vụ nào?',
    yoloHome: 'YOLO HOME',
    yoloDiscover: 'YOLO DISCOVER',
    yoloJapan: 'YOLO JAPAN',
    yoloHomeDesc: 'Dịch vụ nhà ở',
    yoloDiscoverDesc: 'Thông tin sự kiện',
    yoloJapanDesc: 'Trang tuyển dụng',
  },
};

type SupportedLang = keyof typeof TEXTS;

function getTexts(lang: string) {
  return TEXTS[lang as SupportedLang] || TEXTS.ja;
}

/**
 * サポートメニュー選択用 Flex Message
 * 「ご意見・ご要望」と「不具合報告」の2択
 */
export function createSupportMenuFlex(lang: string = 'ja'): FlexMessage {
  const t = getTexts(lang);

  return {
    type: 'flex',
    altText: t.altText,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: t.title,
            weight: 'bold',
            size: 'xl',
            color: '#1DB446',
          },
          {
            type: 'text',
            text: t.description,
            size: 'sm',
            color: '#666666',
            margin: 'md',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#FFFFFF',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          // ご意見・ご要望ボタン
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: t.feedback,
                weight: 'bold',
                size: 'lg',
                color: '#FFFFFF',
              },
              {
                type: 'text',
                text: t.feedbackDesc,
                size: 'sm',
                color: '#FFFFFF',
                margin: 'sm',
              },
            ],
            paddingAll: '15px',
            backgroundColor: '#4A90D9',
            cornerRadius: '10px',
            action: {
              type: 'postback',
              label: t.feedback,
              data: 'action=support&type=feedback',
              displayText: t.feedback,
            },
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE',
          },
          // 不具合報告ボタン
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: t.bug,
                weight: 'bold',
                size: 'lg',
                color: '#FFFFFF',
              },
              {
                type: 'text',
                text: t.bugDesc,
                size: 'sm',
                color: '#FFFFFF',
                margin: 'sm',
              },
            ],
            paddingAll: '15px',
            backgroundColor: '#E85D5D',
            cornerRadius: '10px',
            margin: 'lg',
            action: {
              type: 'postback',
              label: t.bug,
              data: 'action=support&type=bug',
              displayText: t.bug,
            },
          },
        ],
        paddingAll: '20px',
        spacing: 'md',
      },
    },
  };
}

/**
 * サービス選択用 Flex Message
 * 不具合報告時に使用
 */
export function createServiceSelectFlex(lang: string = 'ja'): FlexMessage {
  const t = getTexts(lang);

  const serviceButton = (
    name: string,
    desc: string,
    service: ServiceType,
    color: string
  ): FlexBox => ({
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: name,
        weight: 'bold',
        size: 'md',
        color: '#FFFFFF',
      },
      {
        type: 'text',
        text: desc,
        size: 'xs',
        color: '#FFFFFF',
        margin: 'sm',
      },
    ],
    paddingAll: '12px',
    backgroundColor: color,
    cornerRadius: '8px',
    action: {
      type: 'postback',
      label: name,
      data: `action=support&step=service&service=${service}`,
      displayText: name,
    },
  });

  return {
    type: 'flex',
    altText: t.serviceTitle,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: t.serviceTitle,
            weight: 'bold',
            size: 'xl',
            color: '#E85D5D',
          },
          {
            type: 'text',
            text: t.serviceDesc,
            size: 'sm',
            color: '#666666',
            margin: 'md',
          },
        ],
        paddingAll: '20px',
        backgroundColor: '#FFFFFF',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          serviceButton(t.yoloHome, t.yoloHomeDesc, 'YOLO_HOME', '#5B9BD5'),
          {
            type: 'separator',
            margin: 'md',
            color: '#EEEEEE',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              serviceButton(t.yoloDiscover, t.yoloDiscoverDesc, 'YOLO_DISCOVER', '#70AD47'),
            ],
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'md',
            color: '#EEEEEE',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              serviceButton(t.yoloJapan, t.yoloJapanDesc, 'YOLO_JAPAN', '#FFC000'),
            ],
            margin: 'md',
          },
        ],
        paddingAll: '20px',
        spacing: 'sm',
      },
    },
  };
}

/**
 * 完了メッセージ用 Flex Message
 */
export function createSupportCompleteFlex(
  lang: string = 'ja',
  ticketType: 'feedback' | 'bug'
): FlexMessage {
  const completeTexts: Record<string, Record<'feedback' | 'bug', { title: string; message: string }>> = {
    ja: {
      feedback: {
        title: 'ご意見ありがとうございます',
        message: 'いただいたご意見は担当部署に共有し、サービス改善の参考にさせていただきます。',
      },
      bug: {
        title: 'ご報告ありがとうございます',
        message: 'いただいた内容を確認し、必要に応じて対応いたします。進捗があればご連絡いたします。',
      },
    },
    en: {
      feedback: {
        title: 'Thank you for your feedback',
        message: 'Your feedback will be shared with the relevant team for service improvement.',
      },
      bug: {
        title: 'Thank you for your report',
        message: 'We will review the issue and respond accordingly. We will notify you of any progress.',
      },
    },
    ko: {
      feedback: {
        title: '의견 감사합니다',
        message: '보내주신 의견은 담당 부서와 공유하여 서비스 개선에 참고하겠습니다.',
      },
      bug: {
        title: '신고해 주셔서 감사합니다',
        message: '내용을 확인하고 필요에 따라 대응하겠습니다. 진행 상황이 있으면 연락드리겠습니다.',
      },
    },
    zh: {
      feedback: {
        title: '感谢您的意见',
        message: '您的意见将分享给相关团队，作为服务改进的参考。',
      },
      bug: {
        title: '感谢您的报告',
        message: '我们将审查该问题并相应处理。如有进展，我们将通知您。',
      },
    },
    vi: {
      feedback: {
        title: 'Cảm ơn ý kiến của bạn',
        message: 'Ý kiến của bạn sẽ được chia sẻ với bộ phận liên quan để cải thiện dịch vụ.',
      },
      bug: {
        title: 'Cảm ơn báo cáo của bạn',
        message: 'Chúng tôi sẽ xem xét vấn đề và xử lý phù hợp. Chúng tôi sẽ thông báo nếu có tiến triển.',
      },
    },
  };

  const texts = completeTexts[lang] || completeTexts.ja;
  const t = texts[ticketType];

  return {
    type: 'flex',
    altText: t.title,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅',
            size: 'xxl',
            align: 'center',
          },
          {
            type: 'text',
            text: t.title,
            weight: 'bold',
            size: 'lg',
            color: '#1DB446',
            align: 'center',
            margin: 'md',
          },
          {
            type: 'text',
            text: t.message,
            size: 'sm',
            color: '#666666',
            wrap: true,
            align: 'center',
            margin: 'lg',
          },
        ],
        paddingAll: '20px',
      },
    },
  };
}
