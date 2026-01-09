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
} from '../support/faq';
import { ConversationState } from '@/types/conversation';
import {
  ServiceType,
  SupportModeState,
  SupportStep,
} from '@/types/support';
import OpenAI from 'openai';
import { config } from '../config';
import { processUrlsInText } from '../tracking/url-processor';

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

    // AI応答内のURLをトラッキングURL化
    aiResponse = await processUrlsInText(aiResponse, userId, 'support');

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
