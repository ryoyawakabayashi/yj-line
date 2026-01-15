// =====================================================
// Support Handler for Customer Support AI
// =====================================================

import { replyMessage, showLoadingAnimation, getUserProfile, pushMessage } from '../line/client';
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
  toggleHumanTakeover,
} from '../database/support-queries';
import {
  createSupportMenuFlex,
  createSupportCompleteFlex,
} from '../flex/support-menu';
import {
  generateSummaryPrompt,
  getSupportMessage,
  classifyTicketCategory,
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

    await replyMessage(replyToken, {
      type: 'text',
      text: getSupportMessage('describeIssue', lang),
    });
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

    // 3b. 曖昧パターンタイプ（複数選択肢から選択）
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

          console.log(`✅ クイックリプライ選択: ${selectedChoice.faqId}`);
          return true;
        }
      }
      // 選択肢に該当しない場合は通常のフローへ
      supportState.pendingQuickReply = undefined;
    }
  }

  // 4. AIでFAQを分類
  console.log(`🔍 メッセージ分類中: ${userMessage}`);
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

    console.log(`✅ FAQ即回答（confidence=${confidence}）: ${classification.faqId}`);
    return true;
  }

  // 5b. 中間信頼度（0.60-0.85）→ 確認クイックリプライ
  if (confidence >= 0.60 && confidence < 0.85 && classification.faqId && classification.response) {
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

  // 5c. 低信頼度（<0.60）→ エスカレーション
  console.log(`🚨 低信頼度（confidence=${confidence}）、エスカレーション: ${userMessage}`);

  const escalationResponse = ESCALATION_MESSAGES[lang] || ESCALATION_MESSAGES.ja;
  conversationHistory.push({ role: 'assistant', content: escalationResponse });

  supportState.conversationHistory = conversationHistory;
  currentState.supportState = supportState;
  await saveConversationState(userId, currentState);

  await replyMessage(replyToken, {
    type: 'text',
    text: escalationResponse,
  });

  // エスカレーション処理
  await handleEscalation(userId, supportState, lang, `FAQに該当なし（confidence=${confidence}）`);

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

    // 有人対応モードをON
    await toggleHumanTakeover(ticketId, true, undefined);

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

    console.log(`✅ エスカレーション完了: ${ticketId}`);

    // ユーザーに有人対応開始を通知
    const escalationMessages: Record<string, string> = {
      ja: 'オペレーターに接続しました。少々お待ちください。',
      en: 'Connected to an operator. Please wait a moment.',
      ko: '상담원에게 연결되었습니다. 잠시만 기다려주세요.',
      zh: '已连接到客服人员。请稍等。',
      vi: 'Đã kết nối với nhân viên hỗ trợ. Vui lòng đợi.',
    };
    await pushMessage(userId, [{
      type: 'text',
      text: escalationMessages[lang] || escalationMessages.ja,
    }]);
  }

  // 会話状態をクリア
  await clearConversationState(userId);
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
