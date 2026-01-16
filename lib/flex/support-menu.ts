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

// 不具合報告用Google Form URL
const BUG_REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScXaHTBdf2q9JJvvYD90LEX9uvjkcEY7vRxHredVWLgXxdAhw/viewform';

/**
 * 多言語対応のテキスト
 */
const TEXTS = {
  ja: {
    title: 'お問い合わせ',
    description: 'どのサービスについてですか？',
    bug: '不具合報告',
    altText: 'お問い合わせメニュー',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  en: {
    title: 'Contact Us',
    description: 'Which service is this about?',
    bug: 'Bug Report',
    altText: 'Contact Menu',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  ko: {
    title: '문의하기',
    description: '어떤 서비스에 대한 문의인가요?',
    bug: '버그 신고',
    altText: '문의 메뉴',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  zh: {
    title: '联系我们',
    description: '这是关于哪个服务？',
    bug: '问题报告',
    altText: '联系菜单',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  'zh-TW': {
    title: '聯繫我們',
    description: '這是關於哪個服務？',
    bug: '問題報告',
    altText: '聯繫菜單',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  vi: {
    title: 'Liên hệ',
    description: 'Yêu cầu này liên quan đến dịch vụ nào?',
    bug: 'Báo lỗi',
    altText: 'Menu liên hệ',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  th: {
    title: 'ติดต่อเรา',
    description: 'เกี่ยวกับบริการใด?',
    bug: 'รายงานข้อผิดพลาด',
    altText: 'เมนูติดต่อ',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  id: {
    title: 'Hubungi Kami',
    description: 'Tentang layanan mana?',
    bug: 'Laporan Bug',
    altText: 'Menu Kontak',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  pt: {
    title: 'Fale Conosco',
    description: 'Sobre qual serviço?',
    bug: 'Reportar Erro',
    altText: 'Menu de Contato',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  es: {
    title: 'Contáctenos',
    description: '¿Sobre qué servicio?',
    bug: 'Reportar Error',
    altText: 'Menú de Contacto',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  ne: {
    title: 'सम्पर्क गर्नुहोस्',
    description: 'कुन सेवाको बारेमा?',
    bug: 'बग रिपोर्ट',
    altText: 'सम्पर्क मेनु',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
  my: {
    title: 'ဆက်သွယ်ရန်',
    description: 'မည်သည့်ဝန်ဆောင်မှုအကြောင်းလဲ?',
    bug: 'ချို့ယွင်းချက်အစီရင်ခံရန်',
    altText: 'ဆက်သွယ်ရန်မီနူး',
    yoloJapan: 'YOLO JAPAN',
    yoloDiscover: 'YOLO DISCOVER',
    yoloHome: 'YOLO HOME',
  },
};

type SupportedLang = keyof typeof TEXTS;

function getTexts(lang: string) {
  return TEXTS[lang as SupportedLang] || TEXTS.ja;
}

/**
 * サポートメニュー選択用 Flex Message
 * サービス選択（YOLO JAPAN / YOLO DISCOVER / YOLO HOME）+ 不具合報告
 */
export function createSupportMenuFlex(lang: string = 'ja'): FlexMessage {
  const t = getTexts(lang);

  const serviceButton = (
    name: string,
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
        size: 'lg',
        color: '#FFFFFF',
        align: 'center',
      },
    ],
    paddingAll: '15px',
    backgroundColor: color,
    cornerRadius: '10px',
    action: {
      type: 'postback',
      label: name,
      data: `action=support&step=service&service=${service}`,
      displayText: name,
    },
  });

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
          // YOLO JAPAN
          serviceButton(t.yoloJapan, 'YOLO_JAPAN', '#d10a1c'),
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE',
          },
          // YOLO DISCOVER
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              serviceButton(t.yoloDiscover, 'YOLO_DISCOVER', '#f9c83d'),
            ],
            margin: 'lg',
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE',
          },
          // YOLO HOME
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              serviceButton(t.yoloHome, 'YOLO_HOME', '#036ed9'),
            ],
            margin: 'lg',
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE',
          },
          // 不具合報告ボタン（Google Formへのリンク）
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
                align: 'center',
              },
            ],
            paddingAll: '15px',
            backgroundColor: '#666666',
            cornerRadius: '10px',
            margin: 'lg',
            action: {
              type: 'uri',
              label: t.bug,
              uri: BUG_REPORT_FORM_URL,
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
