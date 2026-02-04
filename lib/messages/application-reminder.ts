// =====================================================
// Application Reminder Messages
// 応募リマインダーメッセージ定義
// =====================================================

/**
 * 3日後リマインダーメッセージ（10件応募促進）
 */
export const APPLICATION_REMINDER_MESSAGES: Record<string, string> = {
  ja: `【採用率アップのコツ】

お仕事への応募ありがとうございます！

実は、10件以上応募すると採用率が大幅にアップすることをご存知ですか？

💡 日本語レベルが1つ上のお仕事にも積極的にチャレンジしてみてください！意外と採用されることも多いですよ✨

複数応募することで：
✅ 企業からの返信確率UP
✅ 面接機会が増える
✅ 自分に合った仕事が見つかりやすい

👇 今すぐ他のお仕事もチェック！`,

  en: `【Tips to Increase Your Hiring Rate】

Thank you for applying!

Did you know that applying to 10+ jobs significantly increases your chances of getting hired?

💡 Don't hesitate to apply for jobs requiring a higher Japanese level - you might be surprised how often you get hired!✨

By applying to multiple jobs:
✅ Higher response rate from companies
✅ More interview opportunities
✅ Better chance of finding the right job

👇 Check out more jobs now!`,

  ko: `【채용률 높이는 팁】

지원해 주셔서 감사합니다!

10개 이상 지원하면 채용률이 크게 올라간다는 것을 알고 계셨나요?

💡 일본어 레벨이 한 단계 높은 일자리에도 적극적으로 도전해 보세요! 의외로 채용되는 경우가 많아요✨

여러 곳에 지원하면:
✅ 기업의 회신 확률 UP
✅ 면접 기회 증가
✅ 나에게 맞는 일자리를 찾기 쉬움

👇 지금 바로 다른 일자리도 확인하세요!`,

  zh: `【提高录用率的技巧】

感谢您的申请！

您知道吗？申请10个以上的职位可以大大提高录用率！

💡 也可以积极尝试申请日语要求高一级的工作！意外地很多人都被录用了✨

多投简历的好处：
✅ 提高企业回复率
✅ 增加面试机会
✅ 更容易找到适合的工作

👇 现在就查看更多职位吧！`,

  vi: `【Mẹo tăng tỷ lệ được tuyển dụng】

Cảm ơn bạn đã ứng tuyển!

Bạn có biết rằng ứng tuyển hơn 10 việc làm sẽ tăng đáng kể cơ hội được tuyển dụng không?

💡 Hãy thử ứng tuyển cả những công việc yêu cầu trình độ tiếng Nhật cao hơn một bậc! Bạn có thể bất ngờ khi được tuyển dụng đấy✨

Khi ứng tuyển nhiều nơi:
✅ Tăng tỷ lệ phản hồi từ công ty
✅ Nhiều cơ hội phỏng vấn hơn
✅ Dễ tìm được công việc phù hợp

👇 Xem thêm việc làm ngay!`,
};

/**
 * 求人検索URL（言語別）
 */
export const JOB_SEARCH_URLS: Record<string, string> = {
  ja: 'https://www.yolo-japan.com/ja/recruit/',
  en: 'https://www.yolo-japan.com/en/recruit/',
  ko: 'https://www.yolo-japan.com/ko/recruit/',
  zh: 'https://www.yolo-japan.com/zh/recruit/',
  vi: 'https://www.yolo-japan.com/vi/recruit/',
};

/**
 * リマインダーメッセージを取得
 */
export function getApplicationReminderMessage(lang: string): string {
  return APPLICATION_REMINDER_MESSAGES[lang] || APPLICATION_REMINDER_MESSAGES.ja;
}

/**
 * 求人検索URLを取得
 */
export function getJobSearchUrl(lang: string): string {
  return JOB_SEARCH_URLS[lang] || JOB_SEARCH_URLS.ja;
}

/**
 * 完全なリマインダーメッセージを取得（URL付き）
 */
export function getFullReminderMessage(lang: string, trackedUrl?: string): string {
  const message = getApplicationReminderMessage(lang);
  const url = trackedUrl || getJobSearchUrl(lang);
  return `${message}\n${url}`;
}

/**
 * 日本語レベル別URLラベル
 */
const LEVEL_LABELS: Record<string, Record<string, string>> = {
  no_japanese: {
    ja: '🔹 日本語不要の求人',
    en: '🔹 Jobs without Japanese',
    ko: '🔹 일본어 불필요 구인',
    zh: '🔹 无需日语的工作',
    vi: '🔹 Không cần tiếng Nhật',
  },
  n5: {
    ja: '🔹 N5レベルの求人',
    en: '🔹 N5 Level Jobs',
    ko: '🔹 N5 수준 구인',
    zh: '🔹 N5水平工作',
    vi: '🔹 Công việc N5',
  },
  n4: {
    ja: '🔹 N4レベルの求人',
    en: '🔹 N4 Level Jobs',
    ko: '🔹 N4 수준 구인',
    zh: '🔹 N4水平工作',
    vi: '🔹 Công việc N4',
  },
  n3: {
    ja: '🔹 N3レベルの求人',
    en: '🔹 N3 Level Jobs',
    ko: '🔹 N3 수준 구인',
    zh: '🔹 N3水平工作',
    vi: '🔹 Công việc N3',
  },
  n2: {
    ja: '🔹 N2レベルの求人',
    en: '🔹 N2 Level Jobs',
    ko: '🔹 N2 수준 구인',
    zh: '🔹 N2水平工作',
    vi: '🔹 Công việc N2',
  },
  n1: {
    ja: '🔹 N1レベルの求人',
    en: '🔹 N1 Level Jobs',
    ko: '🔹 N1 수준 구인',
    zh: '🔹 N1水平工作',
    vi: '🔹 Công việc N1',
  },
};

/**
 * 1つ上のレベル促進メッセージ
 */
const UPPER_LEVEL_PROMPT: Record<string, string> = {
  ja: '🔸 チャレンジ！1つ上のレベル',
  en: '🔸 Challenge! One level up',
  ko: '🔸 도전! 한 단계 높은 레벨',
  zh: '🔸 挑战！高一级',
  vi: '🔸 Thử thách! Cao hơn một bậc',
};

/**
 * レベルラベルを取得
 */
export function getLevelLabel(level: string, lang: string): string {
  return LEVEL_LABELS[level]?.[lang] || LEVEL_LABELS[level]?.ja || '';
}

/**
 * 上のレベル促進メッセージを取得
 */
export function getUpperLevelPrompt(lang: string): string {
  return UPPER_LEVEL_PROMPT[lang] || UPPER_LEVEL_PROMPT.ja;
}

/**
 * 診断結果に基づく完全なリマインダーメッセージを取得（2つのURL付き）
 */
export function getFullReminderMessageWithLevels(
  lang: string,
  japaneseLevel: string | undefined,
  mainUrl: string,
  upperUrl?: string
): string {
  const message = getApplicationReminderMessage(lang);

  let urlSection = '';

  if (japaneseLevel && upperUrl) {
    // 診断結果がある場合: 自分のレベル + 1つ上
    const mainLabel = getLevelLabel(japaneseLevel, lang);
    const upperLabel = getUpperLevelPrompt(lang);
    urlSection = `${mainLabel}\n${mainUrl}\n\n${upperLabel}\n${upperUrl}`;
  } else {
    // 診断結果がない場合: 汎用URL
    urlSection = mainUrl;
  }

  return `${message}\n${urlSection}`;
}

/**
 * ボタンラベル（多言語）
 */
const BUTTON_LABELS: Record<string, Record<string, string>> = {
  main: {
    ja: '求人を見る',
    en: 'View Jobs',
    ko: '일자리 보기',
    zh: '查看职位',
    vi: 'Xem việc làm',
  },
  upper: {
    ja: 'チャレンジ求人を見る',
    en: 'View Challenge Jobs',
    ko: '도전 일자리 보기',
    zh: '查看挑战职位',
    vi: 'Xem việc thử thách',
  },
  generic: {
    ja: '求人を探す',
    en: 'Search Jobs',
    ko: '일자리 검색',
    zh: '搜索职位',
    vi: 'Tìm việc làm',
  },
};

/**
 * Flex Messageのヘッダーテキスト（多言語）
 */
const FLEX_HEADER: Record<string, string> = {
  ja: '採用率アップのコツ',
  en: 'Tips to Get Hired',
  ko: '채용률 높이는 팁',
  zh: '提高录用率的技巧',
  vi: 'Mẹo tăng tỷ lệ tuyển dụng',
};

/**
 * Flex Messageの本文（多言語）- 短縮版
 */
const FLEX_BODY: Record<string, string> = {
  ja: `お仕事への応募ありがとうございます！

10件以上応募すると採用率が大幅にアップします✨

💡 日本語レベルが1つ上のお仕事にもチャレンジしてみてください！意外と採用されることも多いですよ`,
  en: `Thank you for applying!

Applying to 10+ jobs significantly increases your hiring rate✨

💡 Try applying for jobs requiring a higher Japanese level - you might be surprised!`,
  ko: `지원해 주셔서 감사합니다!

10개 이상 지원하면 채용률이 크게 올라갑니다✨

💡 일본어 레벨이 한 단계 높은 일자리에도 도전해 보세요!`,
  zh: `感谢您的申请！

申请10个以上的职位可以大大提高录用率✨

💡 也可以尝试申请日语要求高一级的工作！`,
  vi: `Cảm ơn bạn đã ứng tuyển!

Ứng tuyển hơn 10 việc sẽ tăng đáng kể cơ hội✨

💡 Hãy thử ứng tuyển cả những công việc yêu cầu tiếng Nhật cao hơn!`,
};

/**
 * Flex Message形式のリマインダーメッセージを生成
 */
export function getReminderFlexMessage(
  lang: string,
  japaneseLevel: string | undefined,
  mainUrl: string,
  upperUrl?: string
): object {
  const header = FLEX_HEADER[lang] || FLEX_HEADER.ja;
  const body = FLEX_BODY[lang] || FLEX_BODY.ja;

  const buttons: object[] = [];

  if (japaneseLevel && upperUrl) {
    // 診断結果がある場合: 2つのボタン
    const mainLabel = getLevelLabel(japaneseLevel, lang).replace('🔹 ', '');
    const mainButtonLabel = BUTTON_LABELS.main[lang] || BUTTON_LABELS.main.ja;
    const upperButtonLabel = BUTTON_LABELS.upper[lang] || BUTTON_LABELS.upper.ja;

    buttons.push(
      {
        type: 'button',
        style: 'primary',
        color: '#d10a1c',
        action: {
          type: 'uri',
          label: `${mainButtonLabel}（${mainLabel}）`.slice(0, 20),
          uri: mainUrl,
        },
      },
      {
        type: 'button',
        style: 'primary',
        color: '#FF6B00',
        action: {
          type: 'uri',
          label: `🔥 ${upperButtonLabel}`,
          uri: upperUrl,
        },
      }
    );
  } else {
    // 診断結果がない場合: 1つのボタン
    const genericLabel = BUTTON_LABELS.generic[lang] || BUTTON_LABELS.generic.ja;
    buttons.push({
      type: 'button',
      style: 'primary',
      color: '#d10a1c',
      action: {
        type: 'uri',
        label: genericLabel,
        uri: mainUrl,
      },
    });
  }

  return {
    type: 'flex',
    altText: header,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `🎯 ${header}`,
            weight: 'bold',
            size: 'lg',
            color: '#d10a1c',
          },
        ],
        backgroundColor: '#FFF0F0',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: body,
            wrap: true,
            size: 'sm',
            color: '#333333',
          },
        ],
        paddingAll: '15px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: buttons,
        paddingAll: '15px',
      },
    },
  };
}
