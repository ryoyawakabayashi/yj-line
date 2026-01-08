// =====================================================
// FAQ and Prompt for Customer Support AI
// =====================================================

import { ServiceType, KnownIssue } from '@/types/support';

/**
 * サービス別FAQ
 */
export const SERVICE_FAQ: Record<ServiceType, string[]> = {
  YOLO_HOME: [
    'Q: YOLO HOMEとは何ですか？\nA: 外国人向けの住宅情報サービスです。敷金・礼金なし、保証人不要の物件を多数掲載しています。',
    'Q: 入居審査はありますか？\nA: はい、簡易的な審査があります。在留カードとパスポートが必要です。',
    'Q: 契約期間はどのくらいですか？\nA: 最短1ヶ月から契約可能です。',
    'Q: 家具付き物件はありますか？\nA: はい、多くの物件で家具・家電付きを選べます。',
    'Q: 物件について質問したい\nA: 物件ページの「お問い合わせ」ボタンから直接不動産会社に質問できます。物件ページの下部にあるお問い合わせボタンをご利用ください。',
  ],
  YOLO_DISCOVER: [
    'Q: YOLO DISCOVERとは何ですか？\nA: 外国人向けの生活情報・イベント情報プラットフォームです。',
    'Q: イベントの参加費用は？\nA: イベントによって異なります。無料のものも多数あります。',
    'Q: 情報は何語で見れますか？\nA: 日本語、英語、中国語、韓国語、ベトナム語に対応しています。',
  ],
  YOLO_JAPAN: [
    'Q: 求人に応募するには？\nA: まずYOLO JAPANに会員登録をお願いします。登録後、気になる求人に応募できます。',
    'Q: 海外から応募できますか？\nA: 日本在住の外国人で就労可能な在留カードをお持ちの方のみ応募可能です。',
    'Q: パスワードを忘れました。\nA: https://www.yolo-japan.com/ja/recruit/reminder からパスワードリセットができます。',
    'Q: 在留カードの更新サポートはありますか？\nA: 恐れ入りますが、現在在留カードの更新や支援は行っておりません。',
    'Q: 応募後の連絡はどのくらいで来ますか？\nA: 企業によって異なりますが、通常1週間以内にご連絡があります。',
    'Q: メルマガを停止したい\nA: メルマガの配信設定は以下のページから変更できます。設定ページ: https://www.yolo-japan.com/ja/recruit/mypage/mail/input',
    'Q: 退会したい\nA: 退会手続きは以下のページから行えます。退会ページ: https://www.yolo-japan.com/ja/withdraw/',
    'Q: 新しい動画をアップしたい・動画を変更したい\nA: 自己紹介動画のアップロード・変更は以下のページから行えます。動画ページ: https://www.yolo-japan.com/en/my-page/introduction-video',
    'Q: 勝手に辞退になった・応募が自動でキャンセルされた\nA: 一定期間、企業からの連絡に返信がない場合や、面接日程の調整が完了しない場合は、システムにより自動的にキャンセルされる仕組みとなっています。これは不具合ではなく、仕様となります。',
    'Q: 不採用になった理由が知りたい\nA: 申し訳ございませんが、不採用の理由は企業側から開示されないため、弊社からお伝えすることができません。ご理解のほどよろしくお願いいたします。',
    'Q: スカウトは自動で送っているのですか？ボットですか？\nA: スカウトメッセージは企業の採用担当者が直接送信しています。ボットや自動システムではありません。企業があなたのプロフィールを見て、直接興味を持った場合に送られるメッセージです。',
  ],
};

/**
 * 共通FAQ
 */
export const COMMON_FAQ = [
  'Q: 問い合わせの返信はどのくらいかかりますか？\nA: 通常1-2営業日以内にご返信いたします。',
  'Q: 日本語以外でも問い合わせできますか？\nA: はい、英語、中国語、韓国語、ベトナム語でも対応しています。',
  'Q: 電話での問い合わせはできますか？\nA: 恐れ入りますが、現在お電話でのお問い合わせは受け付けておりません。',
];

/**
 * サポートAIのシステムプロンプト生成
 */
export function generateSupportSystemPrompt(params: {
  ticketType: 'feedback' | 'bug';
  service?: ServiceType;
  lang: string;
  knownIssues?: KnownIssue[];
}): string {
  const { ticketType, service, lang, knownIssues } = params;

  const basePrompt = `あなたはYOLOサービスのカスタマーサポートAIです。
ユーザーからの${ticketType === 'feedback' ? 'ご意見・ご要望' : '不具合報告'}を丁寧に受け付けてください。

## 基本ルール
1. 常に丁寧で親切な対応を心がける
2. ユーザーの言語（${lang}）に合わせて応答する
3. 不明点は確認してから回答する
4. 解決できない場合は、担当者に引き継ぐことを伝える
5. 応答は簡潔に、3文以内を目安にする
6. **重要**: FAQに該当する質問には、FAQの回答内容（URLを含む）をそのまま使用すること
7. **重要**: 「確認」「調査」などの言葉を必ず使い、問題を認識していることを伝える

## 対応フロー
${ticketType === 'bug' ? `
【不具合報告の場合】
1. 「確認させていただきます」「調査いたします」などと伝える
2. 発生日時、頻度、再現手順を確認
3. 既知の問題がある場合は案内
4. 問題を記録し、調査することを伝える
` : `
【ご意見・ご要望の場合】
1. ご意見の内容を確認
2. 感謝の意を伝える
3. 検討することを伝える
`}

## 重要な注意事項
- スカウトについて聞かれた場合：「企業の採用担当者が直接送信している」と必ず伝え、「ボット」「自動」という言葉は使わないこと
- 不採用理由について：「開示されない」「お伝えできない」と回答すること
- 自動キャンセルについて：「自動的にキャンセル」される仕様であることを説明すること`;

  // サービス別FAQを追加
  let faqSection = '\n## FAQ\n';
  if (service && SERVICE_FAQ[service]) {
    faqSection += `### ${service}に関するFAQ\n`;
    SERVICE_FAQ[service].forEach((qa) => {
      faqSection += qa + '\n\n';
    });
  }
  faqSection += '### 共通FAQ\n';
  COMMON_FAQ.forEach((qa) => {
    faqSection += qa + '\n\n';
  });

  // 既知の問題を追加
  let knownIssuesSection = '';
  if (knownIssues && knownIssues.length > 0) {
    knownIssuesSection = '\n## 現在調査中の既知の問題\n';
    knownIssues.forEach((issue) => {
      knownIssuesSection += `- **${issue.title}**: ${issue.description || '調査中'}\n`;
    });
    knownIssuesSection += '\n上記に該当する場合は、既知の問題であることを伝え、調査中であることを案内してください。\n';
  }

  return basePrompt + faqSection + knownIssuesSection;
}

/**
 * サポート完了時の要約プロンプト
 */
export function generateSummaryPrompt(conversation: Array<{ role: string; content: string }>): string {
  const conversationText = conversation
    .map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  return `以下の会話内容を3行以内で要約してください。
要約には以下を含めてください：
- 問い合わせの種類（ご意見/不具合）
- 主な内容
- 対応状況

会話内容：
${conversationText}

要約：`;
}

/**
 * FAQ検索（キーワードマッチング）
 */
export function searchFAQ(keyword: string, service?: ServiceType): string[] {
  const results: string[] = [];
  const lowerKeyword = keyword.toLowerCase();

  // サービス別FAQを検索
  if (service && SERVICE_FAQ[service]) {
    SERVICE_FAQ[service].forEach((qa) => {
      if (qa.toLowerCase().includes(lowerKeyword)) {
        results.push(qa);
      }
    });
  } else {
    // 全サービスのFAQを検索
    Object.values(SERVICE_FAQ).forEach((faqs) => {
      faqs.forEach((qa) => {
        if (qa.toLowerCase().includes(lowerKeyword)) {
          results.push(qa);
        }
      });
    });
  }

  // 共通FAQを検索
  COMMON_FAQ.forEach((qa) => {
    if (qa.toLowerCase().includes(lowerKeyword)) {
      results.push(qa);
    }
  });

  return results;
}

/**
 * 言語別の定型文
 */
export const SUPPORT_MESSAGES = {
  ja: {
    selectType: 'お問い合わせの種類を選択してください。',
    selectService: 'どのサービスについてのお問い合わせですか？',
    describeIssue: '詳しい内容をお聞かせください。',
    thankYou: 'お問い合わせありがとうございます。内容を確認し、必要に応じてご連絡いたします。',
    confirmReceived: 'ご報告ありがとうございます。担当者が確認し、対応いたします。',
    knownIssue: 'こちらは現在調査中の問題です。解決次第、お知らせいたします。',
    escalate: '担当者に確認し、改めてご連絡いたします。',
  },
  en: {
    selectType: 'Please select the type of inquiry.',
    selectService: 'Which service is this inquiry about?',
    describeIssue: 'Please describe the details.',
    thankYou: 'Thank you for your inquiry. We will review and contact you if necessary.',
    confirmReceived: 'Thank you for your report. Our team will review and respond.',
    knownIssue: 'This is a known issue we are currently investigating. We will notify you once resolved.',
    escalate: 'We will check with our team and get back to you.',
  },
  ko: {
    selectType: '문의 유형을 선택해 주세요.',
    selectService: '어떤 서비스에 대한 문의인가요?',
    describeIssue: '자세한 내용을 알려주세요.',
    thankYou: '문의해 주셔서 감사합니다. 확인 후 필요시 연락드리겠습니다.',
    confirmReceived: '신고해 주셔서 감사합니다. 담당자가 확인 후 대응하겠습니다.',
    knownIssue: '현재 조사 중인 문제입니다. 해결되면 알려드리겠습니다.',
    escalate: '담당자에게 확인 후 다시 연락드리겠습니다.',
  },
  zh: {
    selectType: '请选择咨询类型。',
    selectService: '这是关于哪个服务的咨询？',
    describeIssue: '请详细说明内容。',
    thankYou: '感谢您的咨询。我们将确认内容，如有必要会与您联系。',
    confirmReceived: '感谢您的报告。我们的团队将确认并处理。',
    knownIssue: '这是我们正在调查的已知问题。解决后会通知您。',
    escalate: '我们将与团队确认后再联系您。',
  },
  vi: {
    selectType: 'Vui lòng chọn loại yêu cầu.',
    selectService: 'Yêu cầu này liên quan đến dịch vụ nào?',
    describeIssue: 'Vui lòng mô tả chi tiết.',
    thankYou: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ xem xét và liên hệ lại nếu cần.',
    confirmReceived: 'Cảm ơn báo cáo của bạn. Đội ngũ của chúng tôi sẽ xem xét và phản hồi.',
    knownIssue: 'Đây là vấn đề đã biết mà chúng tôi đang điều tra. Chúng tôi sẽ thông báo khi được giải quyết.',
    escalate: 'Chúng tôi sẽ kiểm tra với đội ngũ và liên hệ lại với bạn.',
  },
};

/**
 * 言語に応じた定型文を取得
 */
export function getSupportMessage(
  key: keyof typeof SUPPORT_MESSAGES['ja'],
  lang: string
): string {
  const messages = SUPPORT_MESSAGES[lang as keyof typeof SUPPORT_MESSAGES] || SUPPORT_MESSAGES.ja;
  return messages[key];
}
