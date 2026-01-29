// =====================================================
// Support Handler for Customer Support AI
// =====================================================

import { replyMessage, showLoadingAnimation, getUserProfile } from '../line/client';
import {
  getConversationState,
  saveConversationState,
  clearConversationState,
  getUserLang,
} from '../database/queries';
import {
  createSupportTicket,
  updateTicket,
  saveMessage,
} from '../database/support-queries';
import { logFAQUsage } from '../database/faq-queries';
import {
  createSupportMenuFlex,
  createSupportCompleteFlex,
} from '../flex/support-menu';
import {
  generateSummaryPrompt,
  getSupportMessage,
  classifyTicketCategory,
  searchFAQAsync,
  FAQSearchResult,
  detectConfirmationPattern,
} from '../support/faq';
import {
  classifyMessage,
  isGreeting,
  GREETING_MESSAGES,
  ESCALATION_MESSAGES,
  detectAmbiguousPattern,
  getFAQResponseById,
  FAQ_CONFIRM_MESSAGES,
  FAQ_CONFIRM_YES,
  FAQ_CONFIRM_NO,
  FAQ_TOPIC_NAMES,
} from '../support/classifier';
import { notifyEscalation, notifyYoloDiscoverEnterpriseTrouble } from '../notifications/slack';
import {
  detectSpecialPattern,
  BUG_REPORT_MESSAGES,
  ENTERPRISE_TROUBLE_MESSAGES,
} from '../support/special-patterns';
import {
  handleFunnelFlow,
  handleCategoryQuickReply,
} from './funnel';
import { startDiagnosisMode } from './diagnosis';
import { ConversationState } from '@/types/conversation';
import {
  ServiceType,
  SupportModeState,
  SupportStep,
} from '@/types/support';
import OpenAI from 'openai';
import { config } from '../config';
import { processUrlsInText, UrlSourceType } from '../tracking/url-processor';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * サービス種別からトラッキングURLソースタイプを取得
 */
function getServiceUrlType(service: ServiceType | undefined): UrlSourceType {
  if (!service) return 'support';
  const serviceMap: Record<ServiceType, UrlSourceType> = {
    YOLO_JAPAN: 'support_yolo_japan',
    YOLO_HOME: 'support_yolo_home',
    YOLO_DISCOVER: 'support_yolo_discover',
  };
  return serviceMap[service] || 'support';
}

/**
 * サポートボタン押下時の処理
 * リッチメニューの「問い合わせ」ボタンから呼ばれる
 */
export async function handleSupportButton(
  userId: string,
  replyToken: string
): Promise<void> {
  const lang = await getUserLang(userId);

  // サポートモードの会話状態を初期化
  const state: ConversationState = {
    mode: 'support',
    currentQuestion: null,
    answers: {},
    selectedIndustries: [],
    lang,
    supportState: {
      step: 'select_type',
      conversationHistory: [],
    },
  };

  await saveConversationState(userId, state);

  // サポートメニュー（ご意見 / 不具合報告）を表示
  const flexMessage = createSupportMenuFlex(lang);
  await replyMessage(replyToken, flexMessage);

  console.log(`✅ サポートメニュー表示: ${userId}`);
}

/**
 * Postbackイベントの処理（サポート関連）
 */
export async function handleSupportPostback(
  userId: string,
  replyToken: string,
  data: string
): Promise<boolean> {
  const params = new URLSearchParams(data);
  const action = params.get('action');

  if (action !== 'support') {
    return false; // サポート関連ではない
  }

  const lang = await getUserLang(userId);
  const currentState = await getConversationState(userId);

  // サポートモードでなければ初期化
  if (!currentState || currentState.mode !== 'support') {
    await handleSupportButton(userId, replyToken);
    return true;
  }

  const supportState = currentState.supportState || {
    step: 'select_type' as SupportStep,
    conversationHistory: [],
  };

  const step = params.get('step');
  const service = params.get('service') as ServiceType | null;

  // サービス選択（YOLO JAPAN / YOLO DISCOVER / YOLO HOME）
  if (step === 'service' && service) {
    supportState.service = service;
    supportState.ticketType = 'feedback'; // お問い合わせとして処理
    supportState.step = 'describe_issue';

    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // サービス選択後は大カテゴリをクイックリプライで表示
    const { getCategoriesForService, generateCategoryQuickReplies } = await import('../support/categories');
    const categories = getCategoriesForService(service);
    const quickReplies = generateCategoryQuickReplies(categories, lang);

    const categoryPromptMessages: Record<string, string> = {
      ja: 'ありがとうございます。何についてお聞きですか？',
      en: 'Thank you. What would you like to know about?',
      ko: '감사합니다. 무엇에 대해 알고 싶으신가요?',
      zh: '谢谢。您想了解什么？',
      vi: 'Cảm ơn bạn. Bạn muốn hỏi về điều gì?',
    };
    const promptMessage = categoryPromptMessages[lang] || categoryPromptMessages.ja;

    await replyMessage(replyToken, {
      type: 'text',
      text: promptMessage,
      quickReply: quickReplies ? { items: quickReplies } : undefined,
    });

    console.log(`✅ サービス選択完了、大カテゴリ表示: ${service}`);
    return true;
  }

  // 診断モードからのサポートモード切り替え確認
  if (step === 'confirm_switch') {
    console.log('🔄 診断モード → サポートモード切り替え確定');
    await clearConversationState(userId);
    await handleSupportButton(userId, replyToken);
    return true;
  }

  return false;
}

/**
 * 肯定的な返答かどうかを判定
 */
function isAffirmativeResponse(message: string): boolean {
  const affirmatives = [
    'はい', 'yes', 'うん', 'そう', 'そうです', 'お願い', 'お願いします',
    '예', '네', '是', '对', 'Có', 'Vâng',
  ];
  return affirmatives.some((a) => message.toLowerCase() === a.toLowerCase());
}

/**
 * 否定的な返答かどうかを判定
 */
function isNegativeResponse(message: string): boolean {
  const negatives = [
    'いいえ', 'no', 'ちがう', '違う', '違います', 'いや',
    '아니오', '아니', '否', '不是', 'Không',
  ];
  return negatives.some((n) => message.toLowerCase() === n.toLowerCase());
}

// =====================================================
// FAQ候補分岐ロジック
// =====================================================

/**
 * FAQ候補分岐の閾値設定
 */
const FAQ_SCORE_THRESHOLDS = {
  HIGH: 0.85,    // 即回答
  MEDIUM: 0.60,  // 確認必要
  LOW: 0.40,     // カテゴリ選択へ
};

/**
 * FAQ候補からクイックリプライを生成
 */
function generateFAQCandidateQuickReplies(
  candidates: FAQSearchResult[],
  lang: string
): Array<{ type: 'action'; action: { type: 'message'; label: string; text: string } }> {
  const items = candidates.slice(0, 4).map((candidate) => {
    // 質問文を短縮してラベルに
    let label = candidate.question;
    if (label.length > 20) {
      label = label.substring(0, 17) + '...';
    }
    return {
      type: 'action' as const,
      action: {
        type: 'message' as const,
        label,
        text: `FAQ:${candidate.id}`, // 特殊フォーマットで選択を識別
      },
    };
  });

  // 「その他」を追加
  const otherLabels: Record<string, string> = {
    ja: 'その他',
    en: 'Other',
    ko: '기타',
    zh: '其他',
    vi: 'Khác',
    th: 'อื่นๆ',
    id: 'Lainnya',
    pt: 'Outro',
    es: 'Otro',
    ne: 'अन्य',
    my: 'အခြား',
  };
  items.push({
    type: 'action' as const,
    action: {
      type: 'message' as const,
      label: otherLabels[lang] || otherLabels.ja,
      text: 'FAQ:__other__',
    },
  });

  return items;
}

/**
 * FAQ候補分岐のメッセージ定義
 */
const FAQ_BRANCH_MESSAGES = {
  // 1件の候補で確認する場合
  confirm: {
    ja: 'こちらについてのお問い合わせでよろしいですか？\n「{question}」',
    en: 'Is this what you\'re asking about?\n"{question}"',
    ko: '이것에 대해 문의하시는 건가요?\n"{question}"',
    zh: '您是在询问这个问题吗？\n"{question}"',
    vi: 'Đây có phải điều bạn đang hỏi không?\n"{question}"',
    th: 'คุณกำลังถามเรื่องนี้ใช่ไหม?\n"{question}"',
    id: 'Apakah ini yang Anda tanyakan?\n"{question}"',
    pt: 'É sobre isso que você está perguntando?\n"{question}"',
    es: '¿Es esto lo que está preguntando?\n"{question}"',
    ne: 'के तपाईं यसबारे सोध्दै हुनुहुन्छ?\n"{question}"',
    my: 'ဒီအကြောင်းကို မေးနေတာလား?\n"{question}"',
  },
  // 複数候補から選択
  select: {
    ja: 'どちらについてお聞きですか？',
    en: 'Which one are you asking about?',
    ko: '어떤 것에 대해 문의하시나요?',
    zh: '您想询问哪个？',
    vi: 'Bạn đang hỏi về điều nào?',
    th: 'คุณต้องการถามเรื่องใด?',
    id: 'Yang mana yang Anda tanyakan?',
    pt: 'Sobre qual você está perguntando?',
    es: '¿Sobre cuál está preguntando?',
    ne: 'तपाईं कुनबारे सोध्दै हुनुहुन्छ?',
    my: 'ဘယ်တစ်ခုကို မေးနေတာလဲ?',
  },
  // 候補が多すぎる/スコアが低い場合
  tooMany: {
    ja: 'もう少し詳しく教えていただけますか？以下からお選びいただくか、具体的な内容をお聞かせください。',
    en: 'Could you tell me more details? Please select from below or describe your specific issue.',
    ko: '좀 더 자세히 알려주시겠어요? 아래에서 선택하시거나 구체적인 내용을 말씀해 주세요.',
    zh: '能告诉我更多细节吗？请从以下选项中选择或描述您的具体问题。',
    vi: 'Bạn có thể cho tôi biết thêm chi tiết không? Vui lòng chọn từ bên dưới hoặc mô tả vấn đề cụ thể của bạn.',
    th: 'ช่วยบอกรายละเอียดเพิ่มเติมได้ไหม? กรุณาเลือกจากด้านล่างหรืออธิบายปัญหาเฉพาะของคุณ',
    id: 'Bisakah Anda memberi tahu saya lebih detail? Silakan pilih dari bawah atau jelaskan masalah spesifik Anda.',
    pt: 'Você pode me contar mais detalhes? Por favor, selecione abaixo ou descreva seu problema específico.',
    es: '¿Puede darme más detalles? Por favor seleccione de abajo o describa su problema específico.',
    ne: 'के तपाईं मलाई थप विवरण दिन सक्नुहुन्छ? कृपया तलबाट छान्नुहोस् वा तपाईंको विशेष समस्या वर्णन गर्नुहोस्।',
    my: 'အသေးစိတ်ပိုပြောပြနိုင်မလား? အောက်ပါမှ ရွေးချယ်ပါ သို့မဟုတ် သင့်ပြဿနာကို ဖော်ပြပါ။',
  },
};

/**
 * FAQ候補に基づく分岐処理
 * @returns 処理されたかどうか、および処理結果
 */
async function handleFAQCandidateBranching(
  userId: string,
  replyToken: string,
  userMessage: string,
  service: ServiceType | undefined,
  lang: string,
  supportState: SupportModeState,
  currentState: ConversationState
): Promise<{ handled: boolean; action?: 'replied' | 'escalate' | 'category' }> {
  // FAQ検索（スコア付き）
  const faqResults = await searchFAQAsync(userMessage, service, lang);
  const conversationHistory = supportState.conversationHistory || [];

  console.log(`🔍 FAQ検索結果: ${faqResults.length}件, 最高スコア: ${faqResults[0]?.score || 0}`);

  // === 候補0件 → カテゴリ選択へ（即エスカレーションしない） ===
  if (faqResults.length === 0) {
    console.log(`📂 FAQ候補0件、カテゴリ選択へ`);
    return { handled: false, action: 'category' };
  }

  const topScore = faqResults[0].score;

  // === 候補1件 & 高スコア → 即回答 ===
  if (faqResults.length === 1 && topScore >= FAQ_SCORE_THRESHOLDS.HIGH) {
    const faq = faqResults[0];
    let response = faq.answer;
    response = await processUrlsInText(response, userId, getServiceUrlType(service));

    conversationHistory.push({ role: 'assistant', content: response });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: response,
    });

    // FAQ利用ログを記録
    logFAQUsage({
      faqId: faq.id,
      userId,
      service,
      userMessage,
      confidence: topScore,
    }).catch(() => {});

    console.log(`✅ FAQ即回答（1件、スコア=${topScore}）: ${faq.faqKey}`);
    return { handled: true, action: 'replied' };
  }

  // === 候補1件 & 中〜低スコア → 確認 ===
  if (faqResults.length === 1 && topScore >= FAQ_SCORE_THRESHOLDS.LOW) {
    const faq = faqResults[0];
    const confirmTemplate = FAQ_BRANCH_MESSAGES.confirm[lang as keyof typeof FAQ_BRANCH_MESSAGES.confirm]
      || FAQ_BRANCH_MESSAGES.confirm.ja;
    const confirmMessage = confirmTemplate.replace('{question}', faq.question);

    // pendingQuickReplyを設定
    supportState.pendingQuickReply = {
      type: 'faq_confirm',
      choices: [
        { label: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja, faqId: faq.id },
        { label: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja, faqId: '__escalate__' },
      ],
      confirmFaq: {
        faqId: faq.id,
        response: faq.answer,
      },
    };

    conversationHistory.push({ role: 'assistant', content: confirmMessage });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: confirmMessage,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja,
              text: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja,
              text: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja,
            },
          },
        ],
      },
    });

    console.log(`🤔 FAQ確認（1件、スコア=${topScore}）: ${faq.faqKey}`);
    return { handled: true, action: 'replied' };
  }

  // === 候補2〜4件 → クイックリプライで候補選択 ===
  if (faqResults.length >= 2 && faqResults.length <= 4 && topScore >= FAQ_SCORE_THRESHOLDS.LOW) {
    const selectMessage = FAQ_BRANCH_MESSAGES.select[lang as keyof typeof FAQ_BRANCH_MESSAGES.select]
      || FAQ_BRANCH_MESSAGES.select.ja;

    const quickReplies = generateFAQCandidateQuickReplies(faqResults, lang);

    // pendingQuickReplyを設定（faq_candidatesタイプ）
    supportState.pendingQuickReply = {
      type: 'faq_candidates',
      choices: faqResults.map((faq) => ({
        label: faq.question.length > 20 ? faq.question.substring(0, 17) + '...' : faq.question,
        faqId: faq.id,
        response: faq.answer,
      })),
    };

    conversationHistory.push({ role: 'assistant', content: selectMessage });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: selectMessage,
      quickReply: { items: quickReplies },
    });

    console.log(`📋 FAQ候補選択（${faqResults.length}件）: ${faqResults.map(f => f.faqKey).join(', ')}`);
    return { handled: true, action: 'replied' };
  }

  // === 候補5件以上 or スコア低い → カテゴリ選択へ ===
  console.log(`🔄 FAQ候補多数（${faqResults.length}件）またはスコア低（${topScore}）、カテゴリ選択へ`);
  return { handled: false, action: 'category' };
}

/**
 * サポートモード中のメッセージ処理
 * Note: 有人対応モードのチェックはevent.tsで先に行われるため、
 *       ここに到達した時点で有人対応中ではないことが保証される
 */
export async function handleSupportMessage(
  userId: string,
  replyToken: string,
  userMessage: string
): Promise<boolean> {
  const currentState = await getConversationState(userId);

  if (!currentState || currentState.mode !== 'support') {
    return false; // サポートモードではない
  }

  const lang = currentState.lang || 'ja';
  const supportState = currentState.supportState;

  if (!supportState) {
    return false;
  }

  // 「その他」からの詳細入力ステップの場合
  if (supportState.step === 'describe_other_issue') {
    return await handleDescribeOtherIssue(userId, replyToken, userMessage, currentState, lang);
  }

  // 詳細入力ステップ以外では処理しない
  if (supportState.step !== 'describe_issue') {
    return false;
  }

  await showLoadingAnimation(userId, 5);

  // 会話履歴を更新
  const conversationHistory = supportState.conversationHistory || [];

  // === 確認待ち状態のチェック ===
  if (supportState.pendingConfirmation) {
    const pending = supportState.pendingConfirmation;

    if (isAffirmativeResponse(userMessage)) {
      // 「はい」の場合 → FAQ回答を返す
      conversationHistory.push({ role: 'user', content: userMessage });

      let response = pending.faqAnswer || getSupportMessage('escalate', lang);

      // FAQ回答内のURLにトラッキングパラメータを付与（サービス種別を含む）
      response = await processUrlsInText(response, userId, getServiceUrlType(supportState.service));

      conversationHistory.push({ role: 'assistant', content: response });

      // 確認待ち状態をクリア
      supportState.pendingConfirmation = undefined;
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: response,
      });

      return true;
    } else if (isNegativeResponse(userMessage)) {
      // 「いいえ」の場合 → 確認待ちをクリアして再度質問を促す
      conversationHistory.push({ role: 'user', content: userMessage });

      const followUpMessages: Record<string, string> = {
        ja: 'かしこまりました。他にどのようなことでお困りですか？',
        en: 'I understand. What else can I help you with?',
        ko: '알겠습니다. 다른 어떤 도움이 필요하신가요?',
        zh: '好的，请问还有其他问题吗？',
        vi: 'Tôi hiểu. Bạn cần giúp đỡ gì khác?',
      };

      const response = followUpMessages[lang] || followUpMessages.ja;
      conversationHistory.push({ role: 'assistant', content: response });

      // 確認待ち状態をクリア
      supportState.pendingConfirmation = undefined;
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: response,
      });

      return true;
    }
    // それ以外の返答は新しい質問として処理を続行
    supportState.pendingConfirmation = undefined;
  }

  // === 新方式: AIは分類のみ、回答は定型文 ===
  conversationHistory.push({ role: 'user', content: userMessage });

  // 1. 挨拶チェック
  if (isGreeting(userMessage)) {
    const greetingResponse = GREETING_MESSAGES[lang] || GREETING_MESSAGES.ja;
    conversationHistory.push({ role: 'assistant', content: greetingResponse });

    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: greetingResponse,
    });
    return true;
  }

  // 1.3. 確認パターン検出（スコアリング方式）
  // サービス固有の問い合わせパターンを検出し、サービス未選択なら選択を促す
  const confirmResult = detectConfirmationPattern(userMessage, supportState.service, lang);

  if (confirmResult) {
    // サービス未選択でサービス固有パターンにマッチした場合
    if (confirmResult.needsServiceSelection) {
      const serviceSelectMessages: Record<string, string> = {
        ja: 'お問い合わせありがとうございます。まずサービスを選択してください。',
        en: 'Thank you for your inquiry. Please select a service first.',
        ko: '문의해 주셔서 감사합니다. 먼저 서비스를 선택해 주세요.',
        zh: '感谢您的咨询。请先选择服务。',
        vi: 'Cảm ơn bạn đã liên hệ. Vui lòng chọn dịch vụ trước.',
      };
      const selectMessage = serviceSelectMessages[lang] || serviceSelectMessages.ja;

      // 問い合わせ内容を保存しておく
      supportState.pendingMessage = userMessage;
      conversationHistory.push({ role: 'assistant', content: selectMessage });
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      // サービス選択クイックリプライを表示
      await replyMessage(replyToken, {
        type: 'text',
        text: selectMessage,
        quickReply: {
          items: [
            {
              type: 'action',
              action: {
                type: 'postback',
                label: 'YOLO JAPAN',
                data: 'action=support&step=service&service=YOLO_JAPAN',
              },
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: 'YOLO DISCOVER',
                data: 'action=support&step=service&service=YOLO_DISCOVER',
              },
            },
            {
              type: 'action',
              action: {
                type: 'postback',
                label: 'YOLO HOME',
                data: 'action=support&step=service&service=YOLO_HOME',
              },
            },
          ],
        },
      });

      console.log(`📋 サービス選択促し: pattern=${confirmResult.pattern.type}, suggestedService=${confirmResult.suggestedService}`);
      return true;
    }

    // サービスが選択済みでパターンにマッチした場合
    // → 確認待ち状態を設定
    supportState.pendingConfirmation = {
      type: confirmResult.pattern.type,
      question: confirmResult.question,
      faqAnswer: confirmResult.faqAnswer,
    };
    conversationHistory.push({ role: 'assistant', content: confirmResult.question });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // クイックリプライ付きで確認質問を送信
    const yesLabel = { ja: 'はい', en: 'Yes', ko: '예', zh: '是', vi: 'Có' };
    const noLabel = { ja: 'いいえ', en: 'No', ko: '아니오', zh: '否', vi: 'Không' };

    await replyMessage(replyToken, {
      type: 'text',
      text: confirmResult.question,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: yesLabel[lang as keyof typeof yesLabel] || yesLabel.ja,
              text: yesLabel[lang as keyof typeof yesLabel] || yesLabel.ja,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: noLabel[lang as keyof typeof noLabel] || noLabel.ja,
              text: noLabel[lang as keyof typeof noLabel] || noLabel.ja,
            },
          },
        ],
      },
    });

    console.log(`🤔 確認パターン検出: pattern=${confirmResult.pattern.type}, service=${supportState.service}`);
    return true;
  }

  // 1.5. 特殊パターン検出（バグ報告・企業トラブル）
  const specialPattern = detectSpecialPattern(userMessage, supportState.service);

  if (specialPattern.type === 'bug_report') {
    // バグ報告パターン → Googleフォーム案内
    const bugResponse = BUG_REPORT_MESSAGES[lang] || BUG_REPORT_MESSAGES.ja;
    conversationHistory.push({ role: 'assistant', content: bugResponse });

    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: bugResponse,
    });

    console.log(`🐛 バグ報告パターン案内: ${specialPattern.patternName}`);
    return true;
  }

  if (specialPattern.type === 'enterprise_trouble' && supportState.service === 'YOLO_DISCOVER') {
    // YOLO DISCOVER企業トラブル → CS+Cマーケに通知
    const troubleResponse = ENTERPRISE_TROUBLE_MESSAGES[lang] || ENTERPRISE_TROUBLE_MESSAGES.ja;
    conversationHistory.push({ role: 'assistant', content: troubleResponse });

    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // ユーザーに返信
    await replyMessage(replyToken, {
      type: 'text',
      text: troubleResponse,
    });

    // 両部署にSlack通知
    const userProfile = await getUserProfile(userId);
    await notifyYoloDiscoverEnterpriseTrouble({
      userId,
      userDisplayName: userProfile?.displayName,
      userLang: lang,
      message: userMessage,
      category: specialPattern.patternName || '企業トラブル',
      patternId: specialPattern.patternId || 'unknown',
      timestamp: new Date().toISOString(),
    });

    console.log(`🏢 企業トラブルパターン通知: ${specialPattern.patternName}`);
    return true;
  }

  // 1.6. ファネルフロー処理（カテゴリー絞り込み）
  const funnelResult = await handleFunnelFlow(
    userId,
    replyToken,
    userMessage,
    lang,
    supportState.service,
    supportState.currentCategoryId
  );

  if (funnelResult.handled) {
    // ファネルフローで処理された
    if (funnelResult.action === 'diagnosis' && funnelResult.data?.presetData) {
      // AI診断をプリセット付きで発火
      await startDiagnosisMode(userId, replyToken, lang, funnelResult.data.presetData);
      // サポートモードを終了してdiagnosisモードへ
      const newState: ConversationState = {
        mode: 'diagnosis',
        currentQuestion: 1,
        answers: {},
        selectedIndustries: [],
        lang,
      };
      await saveConversationState(userId, newState);
      return true;
    }

    if (funnelResult.action === 'subcategory' && funnelResult.data?.categoryId) {
      // サブカテゴリー選択中として状態を保存
      supportState.currentCategoryId = funnelResult.data.categoryId;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);
      return true;
    }

    if (funnelResult.action === 'ask_other_details') {
      // 「その他」が選択された場合、詳細を聞く
      const askDetailsMessages: Record<string, string> = {
        ja: 'どのようなお困りですか？詳しく教えてください。',
        en: 'What issue are you experiencing? Please tell me more details.',
        ko: '어떤 문제가 있으신가요? 자세히 알려주세요.',
        zh: '您遇到了什么问题？请告诉我详细情况。',
        vi: 'Bạn đang gặp vấn đề gì? Vui lòng cho tôi biết chi tiết.',
      };
      const askDetailsMessage = askDetailsMessages[lang] || askDetailsMessages.ja;

      conversationHistory.push({ role: 'assistant', content: askDetailsMessage });
      supportState.step = 'describe_other_issue';
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: askDetailsMessage,
      });
      return true;
    }

    if (funnelResult.action === 'escalate') {
      // エスカレーション処理
      const escalationResponse = ESCALATION_MESSAGES[lang] || ESCALATION_MESSAGES.ja;
      conversationHistory.push({ role: 'assistant', content: escalationResponse });
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: escalationResponse,
      });

      await handleEscalation(userId, supportState, lang, 'ファネルフローからのエスカレーション');
      return true;
    }

    // その他のアクション（FAQ、URL）は既にfunnelで処理済み
    return true;
  }

  // 1.7. クイックリプライからカテゴリー選択された場合
  const categoryResult = await handleCategoryQuickReply(
    userId,
    replyToken,
    userMessage,
    lang,
    supportState.service
  );

  if (categoryResult.handled) {
    if (categoryResult.action === 'diagnosis') {
      await startDiagnosisMode(userId, replyToken, lang, categoryResult.data?.presetData);
      const newState: ConversationState = {
        mode: 'diagnosis',
        currentQuestion: 1,
        answers: {},
        selectedIndustries: [],
        lang,
      };
      await saveConversationState(userId, newState);
      return true;
    }

    if (categoryResult.action === 'subcategory' && categoryResult.data?.categoryId) {
      supportState.currentCategoryId = categoryResult.data.categoryId;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);
      return true;
    }

    if (categoryResult.action === 'ask_other_details') {
      // 「その他」が選択された場合、詳細を聞く
      const askDetailsMessages: Record<string, string> = {
        ja: 'どのようなお困りですか？詳しく教えてください。',
        en: 'What issue are you experiencing? Please tell me more details.',
        ko: '어떤 문제가 있으신가요? 자세히 알려주세요.',
        zh: '您遇到了什么问题？请告诉我详细情况。',
        vi: 'Bạn đang gặp vấn đề gì? Vui lòng cho tôi biết chi tiết.',
      };
      const askDetailsMessage = askDetailsMessages[lang] || askDetailsMessages.ja;

      conversationHistory.push({ role: 'assistant', content: askDetailsMessage });
      supportState.step = 'describe_other_issue';
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: askDetailsMessage,
      });
      return true;
    }

    if (categoryResult.action === 'escalate') {
      const escalationResponse = ESCALATION_MESSAGES[lang] || ESCALATION_MESSAGES.ja;
      conversationHistory.push({ role: 'assistant', content: escalationResponse });
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: escalationResponse,
      });

      await handleEscalation(userId, supportState, lang, 'カテゴリー選択からのエスカレーション');
      return true;
    }

    return true;
  }

  // 2. 曖昧なパターンをチェック → クイックリプライで選択肢を出す
  const ambiguousResult = detectAmbiguousPattern(userMessage, lang);
  if (ambiguousResult) {
    console.log(`❓ 曖昧なパターン検出: ${userMessage}`);

    // クイックリプライ付きで選択肢を提示
    const quickReplyItems = ambiguousResult.pattern.choices.map((choice) => ({
      type: 'action' as const,
      action: {
        type: 'message' as const,
        label: choice.label,
        text: choice.label,
      },
    }));

    // 選択肢の情報を保存（次のメッセージで使う）
    supportState.pendingQuickReply = {
      type: 'ambiguous',
      choices: ambiguousResult.pattern.choices,
    };
    conversationHistory.push({ role: 'assistant', content: ambiguousResult.question });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: ambiguousResult.question,
      quickReply: {
        items: quickReplyItems,
      },
    });
    return true;
  }

  // 3. クイックリプライの選択肢が選ばれた場合
  if (supportState.pendingQuickReply) {
    const pendingQR = supportState.pendingQuickReply;

    // 3a. FAQ確認タイプ（「はい」「いいえ」選択）
    if (pendingQR.type === 'faq_confirm' && pendingQR.confirmFaq) {
      const yesLabel = FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja;
      const noLabel = FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja;

      // 「はい」が選択された → FAQ回答を返す
      if (userMessage.includes(yesLabel) || userMessage === yesLabel) {
        let faqResponse = pendingQR.confirmFaq.response;
        // FAQ回答内のURLにトラッキングパラメータを付与（サービス種別を含む）
        faqResponse = await processUrlsInText(faqResponse, userId, getServiceUrlType(supportState.service));
        conversationHistory.push({ role: 'assistant', content: faqResponse });
        supportState.pendingQuickReply = undefined;
        supportState.conversationHistory = conversationHistory;
        currentState.supportState = supportState;
        await saveConversationState(userId, currentState);

        await replyMessage(replyToken, {
          type: 'text',
          text: faqResponse,
        });

        // FAQ利用ログを記録（非同期、エラーは無視）
        logFAQUsage({
          faqId: pendingQR.confirmFaq.faqId,
          userId,
          service: supportState.service,
          userMessage,
          confidence: 1.0, // 確認後の選択は確実
        }).catch(() => {});

        console.log(`✅ FAQ確認→はい: ${pendingQR.confirmFaq.faqId}`);
        return true;
      }

      // 「いいえ」が選択された → エスカレーション
      if (userMessage.includes(noLabel) || userMessage === noLabel) {
        supportState.pendingQuickReply = undefined;
        supportState.conversationHistory = conversationHistory;
        currentState.supportState = supportState;

        const escalationResponse = ESCALATION_MESSAGES[lang] || ESCALATION_MESSAGES.ja;
        conversationHistory.push({ role: 'assistant', content: escalationResponse });
        await saveConversationState(userId, currentState);

        await replyMessage(replyToken, {
          type: 'text',
          text: escalationResponse,
        });

        // エスカレーション処理
        await handleEscalation(userId, supportState, lang, 'FAQ確認で「いいえ」選択');

        console.log(`🚨 FAQ確認→いいえ、エスカレーション`);
        return true;
      }

      // どちらでもない場合は通常のフローへ
      supportState.pendingQuickReply = undefined;
    }

    // 3b. FAQ候補選択タイプ（複数FAQ候補から選択）
    if (pendingQR.type === 'faq_candidates') {
      // FAQ:xxxx 形式のメッセージを処理
      const faqMatch = userMessage.match(/^FAQ:(.+)$/);
      if (faqMatch) {
        const selectedFaqId = faqMatch[1];

        // 「その他」が選ばれた場合はカテゴリ選択へ
        if (selectedFaqId === '__other__') {
          supportState.pendingQuickReply = undefined;
          supportState.conversationHistory = conversationHistory;
          currentState.supportState = supportState;

          // カテゴリ選択を表示
          const { getCategoriesForService, generateCategoryQuickReplies } = await import('../support/categories');
          const categories = getCategoriesForService(supportState.service);
          const quickReplies = generateCategoryQuickReplies(categories, lang);

          const helpMessages: Record<string, string> = {
            ja: '他にどのようなことでお困りですか？',
            en: 'What else can I help you with?',
            ko: '다른 무엇을 도와드릴까요?',
            zh: '还有什么可以帮您的？',
            vi: 'Tôi có thể giúp gì khác cho bạn?',
          };
          const helpMessage = helpMessages[lang] || helpMessages.ja;

          conversationHistory.push({ role: 'assistant', content: helpMessage });
          await saveConversationState(userId, currentState);

          await replyMessage(replyToken, {
            type: 'text',
            text: helpMessage,
            quickReply: quickReplies ? { items: quickReplies } : undefined,
          });

          console.log(`🔄 FAQ候補→その他選択、カテゴリ選択へ`);
          return true;
        }

        // 選択された候補を探す
        const selectedCandidate = pendingQR.choices.find(c => c.faqId === selectedFaqId);
        if (selectedCandidate && selectedCandidate.response) {
          let faqResponse = selectedCandidate.response;
          faqResponse = await processUrlsInText(faqResponse, userId, getServiceUrlType(supportState.service));
          conversationHistory.push({ role: 'assistant', content: faqResponse });
          supportState.pendingQuickReply = undefined;
          supportState.conversationHistory = conversationHistory;
          currentState.supportState = supportState;
          await saveConversationState(userId, currentState);

          await replyMessage(replyToken, {
            type: 'text',
            text: faqResponse,
          });

          // FAQ利用ログを記録（非同期、エラーは無視）
          logFAQUsage({
            faqId: selectedFaqId,
            userId,
            service: supportState.service,
            userMessage,
            confidence: 1.0, // 候補選択は確実
          }).catch(() => {});

          console.log(`✅ FAQ候補選択: ${selectedFaqId}`);
          return true;
        }
      }
      // 選択肢に該当しない場合は通常のフローへ
      supportState.pendingQuickReply = undefined;
    }

    // 3c. 曖昧パターンタイプ（複数選択肢から選択）
    if (pendingQR.type === 'ambiguous' || !pendingQR.type) {
      const choices = pendingQR.choices;
      const selectedChoice = choices.find((c: { label: string; faqId: string }) =>
        userMessage.includes(c.label) || c.label.includes(userMessage)
      );

      if (selectedChoice) {
        let faqResponse = getFAQResponseById(selectedChoice.faqId, supportState.service, lang);
        if (faqResponse) {
          // FAQ回答内のURLにトラッキングパラメータを付与（サービス種別を含む）
          faqResponse = await processUrlsInText(faqResponse, userId, getServiceUrlType(supportState.service));
          conversationHistory.push({ role: 'assistant', content: faqResponse });
          supportState.pendingQuickReply = undefined;
          supportState.conversationHistory = conversationHistory;
          currentState.supportState = supportState;
          await saveConversationState(userId, currentState);

          await replyMessage(replyToken, {
            type: 'text',
            text: faqResponse,
          });

          // FAQ利用ログを記録（非同期、エラーは無視）
          logFAQUsage({
            faqId: selectedChoice.faqId,
            userId,
            service: supportState.service,
            userMessage,
            confidence: 1.0, // クイックリプライ選択は確実
          }).catch(() => {});

          console.log(`✅ クイックリプライ選択: ${selectedChoice.faqId}`);
          return true;
        }
      }
      // 選択肢に該当しない場合は通常のフローへ
      supportState.pendingQuickReply = undefined;
    }
  }

  // 4. DB FAQ候補分岐ロジック（新方式）
  const faqBranchResult = await handleFAQCandidateBranching(
    userId,
    replyToken,
    userMessage,
    supportState.service,
    lang,
    supportState,
    currentState
  );

  if (faqBranchResult.handled) {
    // FAQ分岐で処理完了
    return true;
  }

  // ※ FAQ候補0件でもカテゴリ選択に進むため、ここには到達しない
  // （ユーザーが明示的に「その他」を選んだ場合のみエスカレーション）

  // FAQ候補多数/スコア低 → カテゴリ選択を表示
  if (faqBranchResult.action === 'category') {
    const { getCategoriesForService, generateCategoryQuickReplies } = await import('../support/categories');
    const categories = getCategoriesForService(supportState.service);
    const quickReplies = generateCategoryQuickReplies(categories, lang);

    const helpMessages: Record<string, string> = {
      ja: 'お手伝いできることを探しています。以下からお選びください。',
      en: 'Let me help you find what you need. Please select from below.',
      ko: '도움이 필요한 내용을 찾고 있습니다. 아래에서 선택해 주세요.',
      zh: '正在寻找可以帮助您的内容。请从以下选项中选择。',
      vi: 'Tôi đang tìm cách giúp bạn. Vui lòng chọn từ các tùy chọn bên dưới.',
    };
    const helpMessage = helpMessages[lang] || helpMessages.ja;

    conversationHistory.push({ role: 'assistant', content: helpMessage });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: helpMessage,
      quickReply: quickReplies ? { items: quickReplies } : undefined,
    });

    return true;
  }

  // 5. AI分類へフォールバック（DB FAQで対応できなかった場合）
  console.log(`🔍 メッセージ分類中（フォールバック）: ${userMessage}`);
  const classification = await classifyMessage(
    userMessage,
    supportState.service,
    lang
  );

  console.log(`📋 分類結果: matched=${classification.matched}, faqId=${classification.faqId}, confidence=${classification.confidence}`);

  const confidence = classification.confidence || 0;

  // 5a. 高信頼度（≥0.85）→ FAQ即回答
  if (confidence >= 0.85 && classification.matched && classification.response) {
    // FAQ回答内のURLにトラッキングパラメータを付与（サービス種別を含む）
    const trackedResponse = await processUrlsInText(classification.response, userId, getServiceUrlType(supportState.service));
    conversationHistory.push({ role: 'assistant', content: trackedResponse });

    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: trackedResponse,
    });

    // FAQ利用ログを記録（非同期、エラーは無視）
    if (classification.faqId) {
      logFAQUsage({
        faqId: classification.faqId,
        userId,
        service: supportState.service,
        userMessage,
        confidence,
      }).catch(() => {});
    }

    console.log(`✅ FAQ即回答（confidence=${confidence}）: ${classification.faqId}`);
    return true;
  }

  // 5b. 中間信頼度（0.60-0.85）→ 確認クイックリプライ or 候補選択
  if (confidence >= 0.60 && confidence < 0.85 && classification.faqId && classification.response) {
    // 複数候補がある場合は候補選択を表示
    if (classification.candidates && classification.candidates.length > 1) {
      const candidateSelectMessages: Record<string, string> = {
        ja: 'どちらについてお聞きですか？',
        en: 'Which one are you asking about?',
        ko: '어떤 것에 대해 문의하시나요?',
        zh: '您想询问哪个？',
        vi: 'Bạn đang hỏi về điều nào?',
      };
      const selectMessage = candidateSelectMessages[lang] || candidateSelectMessages.ja;

      // 候補をクイックリプライで表示
      const candidateItems = classification.candidates.slice(0, 4).map(c => {
        const topicNames = FAQ_TOPIC_NAMES[c.faqId];
        const label = topicNames?.[lang] || topicNames?.ja || c.faqId;
        return {
          type: 'action' as const,
          action: {
            type: 'message' as const,
            label: label.length > 20 ? label.substring(0, 17) + '...' : label,
            text: `FAQ:${c.faqId}`, // 特殊フォーマットで選択を識別
          },
        };
      });

      // 「その他」を追加
      const otherLabel = { ja: 'その他', en: 'Other', ko: '기타', zh: '其他', vi: 'Khác' };
      candidateItems.push({
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: otherLabel[lang as keyof typeof otherLabel] || otherLabel.ja,
          text: 'FAQ:__other__',
        },
      });

      // pendingQuickReplyを設定（faq_candidatesタイプ）
      supportState.pendingQuickReply = {
        type: 'faq_candidates',
        choices: classification.candidates.map(c => ({
          label: FAQ_TOPIC_NAMES[c.faqId]?.[lang] || FAQ_TOPIC_NAMES[c.faqId]?.ja || c.faqId,
          faqId: c.faqId,
          response: c.response,
        })),
      };

      conversationHistory.push({ role: 'assistant', content: selectMessage });
      supportState.conversationHistory = conversationHistory;
      currentState.supportState = supportState;
      await saveConversationState(userId, currentState);

      await replyMessage(replyToken, {
        type: 'text',
        text: selectMessage,
        quickReply: { items: candidateItems },
      });

      console.log(`🤔 FAQ候補選択中（${classification.candidates.length}件）: ${classification.candidates.map(c => c.faqId).join(', ')}`);
      return true;
    }

    // 単一候補の場合は従来通りYes/No確認
    const faqId = classification.faqId;
    const topicNames = FAQ_TOPIC_NAMES[faqId];
    const topicName = topicNames?.[lang] || topicNames?.ja || faqId;

    // 確認メッセージを生成
    const confirmTemplate = FAQ_CONFIRM_MESSAGES[lang] || FAQ_CONFIRM_MESSAGES.ja;
    const confirmMessage = confirmTemplate.replace('{topic}', topicName);

    // pendingQuickReplyを設定（faq_confirmタイプ）
    supportState.pendingQuickReply = {
      type: 'faq_confirm',
      choices: [
        { label: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja, faqId: faqId },
        { label: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja, faqId: '__escalate__' },
      ],
      confirmFaq: {
        faqId: faqId,
        response: classification.response,
      },
    };

    conversationHistory.push({ role: 'assistant', content: confirmMessage });
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    await replyMessage(replyToken, {
      type: 'text',
      text: confirmMessage,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja,
              text: FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja,
            },
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja,
              text: FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja,
            },
          },
        ],
      },
    });

    console.log(`🤔 FAQ確認中（confidence=${confidence}）: ${faqId}`);
    return true;
  }

  // 5c. 低信頼度（<0.60）→ カテゴリ選択を促す（エスカレーションしない）
  console.log(`🔄 低信頼度（confidence=${confidence}）、カテゴリ選択を促す: ${userMessage}`);

  // トップレベルカテゴリーを表示して絞り込みを促す
  const { getCategoriesForService, generateCategoryQuickReplies } = await import('../support/categories');
  const categories = getCategoriesForService(supportState.service);
  const quickReplies = generateCategoryQuickReplies(categories, lang);

  const helpMessages: Record<string, string> = {
    ja: 'お手伝いできることを探しています。以下からお選びください。',
    en: 'Let me help you find what you need. Please select from below.',
    ko: '도움이 필요한 내용을 찾고 있습니다. 아래에서 선택해 주세요.',
    zh: '正在寻找可以帮助您的内容。请从以下选项中选择。',
    vi: 'Tôi đang tìm cách giúp bạn. Vui lòng chọn từ các tùy chọn bên dưới.',
  };
  const helpMessage = helpMessages[lang] || helpMessages.ja;

  conversationHistory.push({ role: 'assistant', content: helpMessage });
  supportState.conversationHistory = conversationHistory;
  currentState.supportState = supportState;
  await saveConversationState(userId, currentState);

  await replyMessage(replyToken, {
    type: 'text',
    text: helpMessage,
    quickReply: quickReplies ? { items: quickReplies } : undefined,
  });

  return true;
}

/**
 * 「その他」カテゴリ選択後の詳細入力処理
 * FAQ検索 → 見つかれば回答 → 見つからなければエスカレーション
 */
async function handleDescribeOtherIssue(
  userId: string,
  replyToken: string,
  userMessage: string,
  currentState: ConversationState,
  lang: string
): Promise<boolean> {
  const supportState = currentState.supportState!;
  const conversationHistory = supportState.conversationHistory || [];

  await showLoadingAnimation(userId, 5);

  // ユーザーメッセージを履歴に追加
  conversationHistory.push({ role: 'user', content: userMessage });

  // FAQ検索を実行
  const faqResults = await searchFAQAsync(userMessage, supportState.service, lang);

  // 高スコアのFAQが見つかった場合
  if (faqResults.length > 0 && faqResults[0].score >= 0.5) {
    const topFaq = faqResults[0];

    // FAQ確認メッセージを表示
    const confirmMessages: Record<string, string> = {
      ja: `「${topFaq.question}」についてお困りですか？`,
      en: `Are you having trouble with "${topFaq.question}"?`,
      ko: `"${topFaq.question}"에 대해 어려움을 겪고 계신가요?`,
      zh: `您是否在"${topFaq.question}"方面遇到困难？`,
      vi: `Bạn có gặp khó khăn về "${topFaq.question}" không?`,
    };
    const confirmMessage = confirmMessages[lang] || confirmMessages.ja;

    // 確認待ち状態を保存
    supportState.pendingQuickReply = {
      type: 'faq_confirm',
      choices: [],
      confirmFaq: {
        faqId: topFaq.id,
        response: topFaq.answer,
      },
    };

    conversationHistory.push({ role: 'assistant', content: confirmMessage });
    supportState.conversationHistory = conversationHistory;
    // ステップをdescribe_issueに変更（通常のサポートフローに戻す）
    supportState.step = 'describe_issue';
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // クイックリプライ付きで確認
    const yesLabel = FAQ_CONFIRM_YES[lang] || FAQ_CONFIRM_YES.ja;
    const noLabel = FAQ_CONFIRM_NO[lang] || FAQ_CONFIRM_NO.ja;

    await replyMessage(replyToken, {
      type: 'text',
      text: confirmMessage,
      quickReply: {
        items: [
          {
            type: 'action',
            action: { type: 'message', label: yesLabel, text: yesLabel },
          },
          {
            type: 'action',
            action: { type: 'message', label: noLabel, text: noLabel },
          },
        ],
      },
    });

    return true;
  }

  // FAQが見つからない場合 → エスカレーション
  const escalationResponse = ESCALATION_MESSAGES[lang] || ESCALATION_MESSAGES.ja;
  conversationHistory.push({ role: 'assistant', content: escalationResponse });
  supportState.conversationHistory = conversationHistory;
  currentState.supportState = supportState;
  await saveConversationState(userId, currentState);

  await replyMessage(replyToken, {
    type: 'text',
    text: escalationResponse,
  });

  await handleEscalation(userId, supportState, lang, '「その他」カテゴリからのエスカレーション（FAQ該当なし）');
  return true;
}

/**
 * エスカレーション処理（AIが対応できない場合）
 * チケット作成 → 有人対応モードON → Slack通知
 */
async function handleEscalation(
  userId: string,
  supportState: SupportModeState,
  lang: string,
  reason: string
): Promise<void> {
  const conversationHistory = supportState.conversationHistory || [];

  // ユーザーの元メッセージを取得（最新のもの）
  const userMessages = conversationHistory
    .filter((m) => m.role === 'user')
    .map((m) => m.content);
  const originalMessage = userMessages[userMessages.length - 1] || '';

  // AIで日本語要約を生成（多言語→日本語）
  let aiSummary = '';
  try {
    const summaryPrompt = `以下のカスタマーサポートの会話を**日本語で**簡潔に要約してください。
ユーザーが何に困っているか、何を求めているかを明確に。
50文字以内で要約してください。

会話:
${conversationHistory.map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}

日本語要約:`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 100,
      temperature: 0.3,
    });
    aiSummary = completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('❌ 要約生成エラー:', error);
    // フォールバック: 元メッセージをそのまま使用
    aiSummary = originalMessage;
  }

  // 会話内容を結合
  const content = conversationHistory
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  // チケット作成
  const ticketId = await createSupportTicket({
    userId,
    ticketType: supportState.ticketType || 'feedback',
    service: supportState.service,
    content,
    aiSummary,
  });

  if (ticketId) {
    // LINEプロフィールを取得
    let userDisplayName: string | undefined;
    try {
      const profile = await getUserProfile(userId);
      userDisplayName = profile?.displayName;

      // 会話履歴からカテゴリを推定
      const userMessages = conversationHistory
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' ');
      const category = classifyTicketCategory(userMessages);

      await updateTicket(ticketId, {
        userDisplayName,
        userLang: lang,
        category,
        escalatedAt: new Date().toISOString(),
        escalationReason: reason,
      });
    } catch (error) {
      console.error('⚠️ チケット更新失敗:', error);
    }

    // ※ 有人対応モードはSlackから「対応する」を押した時にONにする
    // （エスカレーション時点ではAIが引き続き対応）

    // 会話履歴をメッセージとして保存
    for (const msg of conversationHistory) {
      await saveMessage(ticketId, msg.role as 'user' | 'assistant', msg.content);
    }

    // Slack通知（日本語要約 + 元メッセージ + 言語情報）
    await notifyEscalation({
      ticketId,
      userId,
      userDisplayName,
      userLang: lang,
      service: supportState.service,
      summary: aiSummary || '要約生成に失敗',
      originalMessage,
      reason,
    });

    console.log(`✅ エスカレーション通知送信: ${ticketId}`);
  }

  // ※ 会話状態はクリアしない（AIが引き続き対応するため）
  // オペレーターがダッシュボードから「有人対応開始」を押した時点で
  // 有人モードに切り替わり、AIは停止する
}

/**
 * サポート完了処理
 */
async function completeSupport(
  userId: string,
  supportState: SupportModeState,
  lang: string
): Promise<void> {
  const conversationHistory = supportState.conversationHistory || [];

  // AIで要約を生成
  let aiSummary = '';
  try {
    const summaryPrompt = generateSummaryPrompt(conversationHistory);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 150,
      temperature: 0.3,
    });
    aiSummary = completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('❌ 要約生成エラー:', error);
  }

  // 会話内容を結合
  const content = conversationHistory
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  // チケット作成
  const ticketId = await createSupportTicket({
    userId,
    ticketType: supportState.ticketType || 'feedback',
    service: supportState.service,
    content,
    aiSummary,
  });

  // LINEプロフィールを取得してチケットに保存 + カテゴリ分類
  if (ticketId) {
    try {
      const profile = await getUserProfile(userId);

      // 会話履歴からカテゴリを推定
      const userMessages = conversationHistory
        .filter((m) => m.role === 'user')
        .map((m) => m.content)
        .join(' ');
      const category = classifyTicketCategory(userMessages);

      await updateTicket(ticketId, {
        userDisplayName: profile?.displayName,
        userLang: lang,
        category,
      });
      console.log(`✅ チケット更新: ${profile?.displayName || userId}, カテゴリ: ${category}`);
    } catch (error) {
      console.error('⚠️ チケット更新失敗:', error);
    }
  }

  // 会話状態をクリア
  await clearConversationState(userId);

  console.log(`✅ サポートチケット作成完了: ${userId}`);
}

/**
 * サポートモードの強制終了
 */
export async function exitSupportMode(
  userId: string,
  replyToken: string
): Promise<void> {
  const currentState = await getConversationState(userId);
  const lang = currentState?.lang || 'ja';
  const supportState = currentState?.supportState;

  if (supportState?.conversationHistory && supportState.conversationHistory.length > 0) {
    // 会話があった場合はチケット作成
    await completeSupport(userId, supportState, lang);

    const completeFlex = createSupportCompleteFlex(
      lang,
      supportState.ticketType || 'feedback'
    );
    await replyMessage(replyToken, completeFlex);
  } else {
    // 会話がなかった場合は単にクリア
    await clearConversationState(userId);
  }
}

/**
 * サポートモードかどうかを確認
 */
export async function isSupportMode(userId: string): Promise<boolean> {
  const state = await getConversationState(userId);
  return state?.mode === 'support';
}
