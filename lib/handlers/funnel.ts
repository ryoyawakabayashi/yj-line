// =====================================================
// Funnel Flow Handler - 絞り込みフローハンドラー
// =====================================================

import { ServiceType } from '@/types/support';
import { replyMessage, replyWithQuickReply } from '../line/client';
import {
  Category,
  getCategoriesForService,
  findCategoryById,
  getCategoryLabel,
  generateCategoryQuickReplies,
  generateSubcategoryQuickReplies,
} from '../support/categories';
import {
  DetectedIntent,
  ExtractedData,
  detectIntent,
  isAbstractMessage,
  getCategoryById,
  hasEnoughDataForDiagnosis,
} from '../support/intent-detector';
import { getFAQResponseById } from '../support/classifier';
import { processUrl, processUrlsInText } from '../tracking/url-processor';

/**
 * ファネルフローの結果
 */
export interface FunnelResult {
  handled: boolean;
  action?: 'diagnosis' | 'faq' | 'url' | 'escalate' | 'subcategory' | 'top_categories';
  data?: {
    presetData?: ExtractedData;
    faqId?: string;
    url?: string;
    categoryId?: string;
  };
}

/**
 * ファネルフローを処理
 * @param userId - LINE ユーザーID
 * @param replyToken - LINE 返信トークン
 * @param message - ユーザーメッセージ
 * @param lang - 言語コード
 * @param service - サービス種別
 * @param currentCategoryId - 現在選択中のカテゴリーID（サブカテゴリー選択中の場合）
 * @returns ファネルフローの結果
 */
export async function handleFunnelFlow(
  userId: string,
  replyToken: string,
  message: string,
  lang: string,
  service: ServiceType | undefined,
  currentCategoryId?: string
): Promise<FunnelResult> {
  // 1. 現在のカテゴリーコンテキストがあれば、サブカテゴリー選択として処理
  if (currentCategoryId) {
    return await handleSubcategorySelection(userId, replyToken, message, lang, service, currentCategoryId);
  }

  // 2. 抽象的なメッセージの場合、トップレベルカテゴリーを表示
  if (isAbstractMessage(message)) {
    await showTopLevelCategories(replyToken, lang, service);
    return { handled: true, action: 'top_categories' };
  }

  // 3. インテントを検出
  const intent = detectIntent(message, service);

  // 4. カテゴリーがマッチしなければファネルは処理しない
  if (!intent.categoryId || intent.confidence < 0.3) {
    return { handled: false };
  }

  // 5. カテゴリーを取得
  const category = getCategoryById(intent.categoryId, service);
  if (!category) {
    return { handled: false };
  }

  // 6. 具体的な情報があり、AI診断が適切な場合はプリセット付きで発火
  if (intent.isSpecific && hasEnoughDataForDiagnosis(intent.extractedData)) {
    // 仕事探し系のカテゴリーで、具体的な地域情報があればAI診断へ
    if (intent.categoryPath.includes('job_search') || intent.categoryPath.includes('ai_search')) {
      return {
        handled: true,
        action: 'diagnosis',
        data: { presetData: intent.extractedData },
      };
    }
  }

  // 7. カテゴリーにアクションがあれば実行
  if (category.action) {
    return await executeAction(userId, replyToken, category, lang, service);
  }

  // 8. 子カテゴリーがあれば表示
  if (category.children && category.children.length > 0) {
    await showSubcategories(replyToken, category, lang);
    return {
      handled: true,
      action: 'subcategory',
      data: { categoryId: category.id },
    };
  }

  return { handled: false };
}

/**
 * サブカテゴリー選択を処理
 */
async function handleSubcategorySelection(
  userId: string,
  replyToken: string,
  message: string,
  lang: string,
  service: ServiceType | undefined,
  parentCategoryId: string
): Promise<FunnelResult> {
  const parentCategory = getCategoryById(parentCategoryId, service);
  if (!parentCategory || !parentCategory.children) {
    return { handled: false };
  }

  // メッセージからサブカテゴリーを特定
  const selectedChild = parentCategory.children.find((child) => {
    const label = getCategoryLabel(child, lang);
    return message === label || message === child.id;
  });

  if (!selectedChild) {
    return { handled: false };
  }

  // サブカテゴリーにアクションがあれば実行
  if (selectedChild.action) {
    return await executeAction(userId, replyToken, selectedChild, lang, service);
  }

  // さらに子カテゴリーがあれば表示
  if (selectedChild.children && selectedChild.children.length > 0) {
    await showSubcategories(replyToken, selectedChild, lang);
    return {
      handled: true,
      action: 'subcategory',
      data: { categoryId: selectedChild.id },
    };
  }

  return { handled: false };
}

/**
 * カテゴリーアクションを実行
 */
async function executeAction(
  userId: string,
  replyToken: string,
  category: Category,
  lang: string,
  service: ServiceType | undefined
): Promise<FunnelResult> {
  const action = category.action!;

  switch (action.type) {
    case 'diagnosis':
      // AI診断を発火（プリセットデータがあれば渡す）
      return {
        handled: true,
        action: 'diagnosis',
        data: { presetData: action.presetData },
      };

    case 'faq':
      // FAQ回答を返す
      if (action.faqId) {
        const faqResponse = getFAQResponseById(action.faqId, service, lang);
        if (faqResponse) {
          // FAQ回答内のURLをトラッキングURL化
          const processedResponse = await processUrlsInText(faqResponse, userId, getUrlSourceType(service));
          await replyMessage(replyToken, { type: 'text', text: processedResponse });
          return { handled: true, action: 'faq', data: { faqId: action.faqId } };
        }
      }
      return { handled: false };

    case 'url':
      // URLを送信
      if (action.url && action.url !== 'TBD') {
        const trackedUrl = await processUrl(action.url, userId, getUrlSourceType(service));

        // ビザサポートの場合は特別なメッセージ + Flexメッセージを送信
        if (category.id === 'visa_support') {
          const textMessage = getVisaSupportTextMessage(lang);
          const flexMessage = createVisaSupportFlexMessage(trackedUrl, lang);
          await replyMessage(replyToken, [
            { type: 'text', text: textMessage },
            flexMessage as any,
          ]);
          return { handled: true, action: 'url', data: { url: action.url } };
        }

        // 通常のURL送信
        const urlMessages = getUrlMessage(category, lang, trackedUrl);
        await replyMessage(replyToken, { type: 'text', text: urlMessages });
        return { handled: true, action: 'url', data: { url: action.url } };
      }
      // URL未設定の場合はカテゴリ選択へ（エスカレーションしない）
      return { handled: false };

    case 'escalate':
      // エスカレーション（呼び出し元で処理）
      return { handled: true, action: 'escalate' };

    case 'subcategory':
      // サブカテゴリーを表示
      if (category.children) {
        await showSubcategories(replyToken, category, lang);
        return {
          handled: true,
          action: 'subcategory',
          data: { categoryId: category.id },
        };
      }
      return { handled: false };

    default:
      return { handled: false };
  }
}

/**
 * トップレベルカテゴリーを表示
 */
async function showTopLevelCategories(
  replyToken: string,
  lang: string,
  service: ServiceType | undefined
): Promise<void> {
  const categories = getCategoriesForService(service);
  const quickReplies = generateCategoryQuickReplies(categories, lang);

  const messageText = getHelpMessage(lang);
  await replyWithQuickReply(replyToken, messageText, quickReplies);
}

/**
 * サブカテゴリーを表示
 */
async function showSubcategories(
  replyToken: string,
  parentCategory: Category,
  lang: string
): Promise<void> {
  const quickReplies = generateSubcategoryQuickReplies(parentCategory, lang);
  if (!quickReplies) return;

  const parentLabel = getCategoryLabel(parentCategory, lang);
  const messageText = getSubcategoryMessage(parentLabel, lang);
  await replyWithQuickReply(replyToken, messageText, quickReplies);
}

/**
 * サービスに応じたURLソースタイプを取得
 */
function getUrlSourceType(service: ServiceType | undefined): 'support_yolo_japan' | 'support_yolo_home' | 'support_yolo_discover' | 'support' {
  switch (service) {
    case 'YOLO_JAPAN':
      return 'support_yolo_japan';
    case 'YOLO_HOME':
      return 'support_yolo_home';
    case 'YOLO_DISCOVER':
      return 'support_yolo_discover';
    default:
      return 'support';
  }
}

/**
 * ヘルプメッセージを取得
 */
function getHelpMessage(lang: string): string {
  const messages: Record<string, string> = {
    ja: 'どのようなことでお困りですか？以下から選んでください。',
    en: 'What can I help you with? Please select from the options below.',
    ko: '어떤 도움이 필요하십니까? 아래에서 선택해 주세요.',
    zh: '请问有什么可以帮助您的？请从以下选项中选择。',
    vi: 'Bạn cần hỗ trợ gì? Vui lòng chọn từ các tùy chọn bên dưới.',
  };
  return messages[lang] || messages.ja;
}

/**
 * サブカテゴリーメッセージを取得
 */
function getSubcategoryMessage(parentLabel: string, lang: string): string {
  const messages: Record<string, string> = {
    ja: `「${parentLabel}」について、もう少し詳しく教えてください。`,
    en: `About "${parentLabel}", please tell me more.`,
    ko: `"${parentLabel}"에 대해 더 자세히 알려주세요.`,
    zh: `关于"${parentLabel}"，请告诉我更多。`,
    vi: `Về "${parentLabel}", vui lòng cho tôi biết thêm.`,
  };
  return messages[lang] || messages.ja;
}

/**
 * URL送信メッセージを取得
 */
function getUrlMessage(category: Category, lang: string, url: string): string {
  const label = getCategoryLabel(category, lang);
  const prefixes: Record<string, string> = {
    ja: `${label}についてはこちらをご覧ください：`,
    en: `For ${label}, please check:`,
    ko: `${label}에 대해서는 여기를 확인해 주세요:`,
    zh: `关于${label}，请查看：`,
    vi: `Về ${label}, vui lòng xem:`,
  };
  const prefix = prefixes[lang] || prefixes.ja;
  return `${prefix}\n${url}`;
}

/**
 * ビザサポート用のテキストメッセージを取得
 */
function getVisaSupportTextMessage(lang: string): string {
  const messages: Record<string, string> = {
    ja: 'ビザサポート求人については、こちらをご覧ください。',
    en: 'For visa support jobs, please check below.',
    ko: '비자 지원 일자리에 대해서는 아래를 확인해 주세요.',
    zh: '关于签证支持工作，请查看以下内容。',
    vi: 'Về việc hỗ trợ visa, vui lòng xem bên dưới.',
    th: 'สำหรับงานที่สนับสนุนวีซ่า โปรดดูด้านล่าง',
    id: 'Untuk pekerjaan dukungan visa, silakan lihat di bawah ini.',
    pt: 'Para empregos com suporte de visto, por favor verifique abaixo.',
    es: 'Para trabajos con soporte de visa, por favor consulte a continuación.',
    ne: 'भिसा समर्थन कामको लागि, कृपया तल हेर्नुहोस्।',
    my: 'ဗီဇာ ပံ့ပိုးမှုရှိသော အလုပ်များအတွက် အောက်တွင် ကြည့်ပါ။',
  };
  return messages[lang] || messages.ja;
}

/**
 * ビザサポート用のFlexメッセージボタンラベルを取得
 */
function getVisaSupportButtonLabel(lang: string): string {
  const labels: Record<string, string> = {
    ja: '詳細を見る',
    en: 'View Details',
    ko: '자세히 보기',
    zh: '查看详情',
    vi: 'Xem chi tiết',
    th: 'ดูรายละเอียด',
    id: 'Lihat Detail',
    pt: 'Ver Detalhes',
    es: 'Ver Detalles',
    ne: 'विवरण हेर्नुहोस्',
    my: 'အသေးစိတ်ကြည့်ပါ',
  };
  return labels[lang] || labels.ja;
}

/**
 * ビザサポート用のFlexメッセージを生成
 */
function createVisaSupportFlexMessage(url: string, lang: string): object {
  const buttonLabel = getVisaSupportButtonLabel(lang);
  // Vercelにデプロイされた画像URL
  const imageUrl = 'https://line-bot-next-ryoyawakabayashis-projects.vercel.app/images/visa-support.png';

  return {
    type: 'flex',
    altText: buttonLabel,
    contents: {
      type: 'bubble',
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: buttonLabel,
              uri: url,
            },
            color: '#06C755',
          },
        ],
        flex: 0,
      },
    },
  };
}

/**
 * カテゴリーIDからインテントを検出（クイックリプライ選択用）
 */
export function detectCategoryFromQuickReply(
  message: string,
  lang: string,
  service: ServiceType | undefined
): { categoryId: string | null; category: Category | null } {
  const categories = getCategoriesForService(service);

  // トップレベルカテゴリーをチェック
  for (const category of categories) {
    const label = getCategoryLabel(category, lang);
    if (message === label) {
      return { categoryId: category.id, category };
    }

    // 子カテゴリーもチェック
    if (category.children) {
      for (const child of category.children) {
        const childLabel = getCategoryLabel(child, lang);
        if (message === childLabel) {
          return { categoryId: child.id, category: child };
        }
      }
    }
  }

  return { categoryId: null, category: null };
}

/**
 * クイックリプライからカテゴリーを選択した場合の処理
 */
export async function handleCategoryQuickReply(
  userId: string,
  replyToken: string,
  message: string,
  lang: string,
  service: ServiceType | undefined
): Promise<FunnelResult> {
  const { categoryId, category } = detectCategoryFromQuickReply(message, lang, service);

  if (!category) {
    return { handled: false };
  }

  // アクションがあれば実行
  if (category.action) {
    return await executeAction(userId, replyToken, category, lang, service);
  }

  // 子カテゴリーがあれば表示
  if (category.children && category.children.length > 0) {
    await showSubcategories(replyToken, category, lang);
    return {
      handled: true,
      action: 'subcategory',
      data: { categoryId: category.id },
    };
  }

  return { handled: false };
}
