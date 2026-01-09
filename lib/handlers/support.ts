// =====================================================
// Support Handler for Customer Support AI
// =====================================================

import { replyMessage, showLoadingAnimation } from '../line/client';
import {
  getConversationState,
  saveConversationState,
  clearConversationState,
  getUserLang,
} from '../database/queries';
import {
  createSupportTicket,
  getKnownIssues,
} from '../database/support-queries';
import {
  createSupportMenuFlex,
  createSupportCompleteFlex,
} from '../flex/support-menu';
import {
  generateSupportSystemPrompt,
  generateSummaryPrompt,
  getSupportMessage,
  sanitizeAiResponse,
  detectConfirmationPattern,
  getQuickReplyOptions,
} from '../support/faq';
import { ConversationState } from '@/types/conversation';
import {
  ServiceType,
  SupportModeState,
  SupportStep,
} from '@/types/support';
import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

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

  return false;
}

/**
 * クイックリプライ付きメッセージを作成
 */
function createQuickReplyMessage(text: string, lang: string) {
  const options = getQuickReplyOptions(lang);
  return {
    type: 'text' as const,
    text,
    quickReply: {
      items: [
        {
          type: 'action' as const,
          action: {
            type: 'message' as const,
            label: options.yes,
            text: options.yes,
          },
        },
        {
          type: 'action' as const,
          action: {
            type: 'message' as const,
            label: options.no,
            text: options.no,
          },
        },
        {
          type: 'action' as const,
          action: {
            type: 'message' as const,
            label: options.other,
            text: options.other,
          },
        },
      ],
    },
  };
}

/**
 * 肯定的な返答かどうかを判定
 */
function isAffirmativeResponse(message: string, lang: string): boolean {
  const options = getQuickReplyOptions(lang);
  const affirmatives = [
    options.yes,
    'はい', 'yes', 'うん', 'そう', 'そうです', 'お願い', 'お願いします',
    '예', '네', '是', '对', 'Có', 'Vâng',
  ];
  return affirmatives.some((a) => message.toLowerCase() === a.toLowerCase());
}

/**
 * 否定的な返答かどうかを判定
 */
function isNegativeResponse(message: string, lang: string): boolean {
  const options = getQuickReplyOptions(lang);
  const negatives = [
    options.no, options.other,
    'いいえ', 'no', 'ちがう', '違う', '違います', 'いや',
    '아니오', '아니', '否', '不是', 'Không',
  ];
  return negatives.some((n) => message.toLowerCase() === n.toLowerCase());
}

/**
 * サポートモード中のメッセージ処理
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

    if (isAffirmativeResponse(userMessage, lang)) {
      // 「はい」の場合 → FAQ回答を返す
      conversationHistory.push({ role: 'user', content: userMessage });

      const response = pending.faqAnswer || getSupportMessage('escalate', lang);

      // サポートモードではトラッキングURL変換をスキップ（元URLをそのまま表示）

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

      // 3往復したらチケット作成
      const userMessages = conversationHistory.filter((m) => m.role === 'user');
      if (userMessages.length >= 3) {
        await completeSupport(userId, supportState, lang);
      }

      return true;
    } else if (isNegativeResponse(userMessage, lang)) {
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

  // === 確認パターンの検出（イエスドリ） ===
  const confirmationResult = detectConfirmationPattern(
    userMessage,
    supportState.service,
    lang
  );

  if (confirmationResult && confirmationResult.faqAnswer) {
    // 確認パターンにマッチ → クイックリプライ付きで確認質問を送信
    conversationHistory.push({ role: 'user', content: userMessage });
    conversationHistory.push({ role: 'assistant', content: confirmationResult.question });

    // 確認待ち状態を保存
    supportState.pendingConfirmation = {
      type: confirmationResult.pattern.type,
      question: confirmationResult.question,
      faqAnswer: confirmationResult.faqAnswer,
    };
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // クイックリプライ付きで確認質問を送信
    const quickReplyMessage = createQuickReplyMessage(confirmationResult.question, lang);
    await replyMessage(replyToken, quickReplyMessage);

    return true;
  }

  // === 通常のAI応答処理 ===
  conversationHistory.push({ role: 'user', content: userMessage });

  // 既知の問題を検索
  const knownIssues = supportState.service
    ? await getKnownIssues(supportState.service)
    : [];

  // AIで応答生成
  const systemPrompt = generateSupportSystemPrompt({
    ticketType: supportState.ticketType || 'feedback',
    service: supportState.service,
    lang,
    knownIssues,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    let aiResponse =
      completion.choices[0]?.message?.content ||
      getSupportMessage('escalate', lang);

    // AI応答から不正なURL（FAQに存在しないURL）を除去
    aiResponse = sanitizeAiResponse(aiResponse);

    // サポートモードではトラッキングURL変換をスキップ（元URLをそのまま表示）

    conversationHistory.push({ role: 'assistant', content: aiResponse });

    // 会話を保存
    supportState.conversationHistory = conversationHistory;
    currentState.supportState = supportState;
    await saveConversationState(userId, currentState);

    // 応答を送信
    await replyMessage(replyToken, {
      type: 'text',
      text: aiResponse,
    });

    // 3往復したらチケット作成して完了
    const userMessages = conversationHistory.filter((m) => m.role === 'user');
    if (userMessages.length >= 3) {
      await completeSupport(userId, supportState, lang);
    }

    return true;
  } catch (error) {
    console.error('❌ サポートAI応答エラー:', error);
    await replyMessage(replyToken, {
      type: 'text',
      text: getSupportMessage('escalate', lang),
    });
    return true;
  }
}

/**
 * サポート完了処理
 */
async function completeSupport(
  userId: string,
  supportState: SupportModeState,
  _lang: string
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
  await createSupportTicket({
    userId,
    ticketType: supportState.ticketType || 'feedback',
    service: supportState.service,
    content,
    aiSummary,
  });

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
