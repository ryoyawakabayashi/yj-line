import { LineEvent } from '@/types/line';
import {
  getConversationState,
  getUserLang,
  getConversationHistory,
  saveConversationHistory,
  incrementAIChatCount,
} from '../database/queries';
import { replyMessage, showLoadingAnimation, replyWithQuickReply } from '../line/client';
import { callOpenAIWithHistory } from '../openai/client';
import { detectUserIntentAdvanced } from './intent';
import { handleGreeting, handleContact } from './buttons';
import { handleFollowupAnswer } from './followup';
import { processUrlsInText } from '../tracking/url-processor';

export async function handleConversation(
  userId: string,
  replyToken: string,
  text: string
): Promise<void> {
  const state = await getConversationState(userId);

  if (!state || !state.mode) {
    console.log('⚠️ 会話状態がありません');
    return;
  }

  const lang = await getUserLang(userId);

  if (state.mode === 'diagnosis') {
    console.log('📋 診断モードで処理');
    const { handleDiagnosisAnswer } = await import('./diagnosis');
    await handleDiagnosisAnswer({ source: { userId }, replyToken, message: { text, type: 'text' } } as LineEvent);
    return;
  }

  if (state.mode === 'career_diagnosis') {
    console.log('🎯 キャリアタイプ診断モードで処理');
    const { handleCareerDiagnosisAnswer } = await import('./career-diagnosis');
    await handleCareerDiagnosisAnswer({ source: { userId }, replyToken, message: { text, type: 'text' } } as LineEvent);
    return;
  }

  if (state.mode === 'followup') {
    console.log('🤝 フォローアップモードで処理');
    await handleFollowupAnswer({ source: { userId }, replyToken, message: { text, type: 'text' } } as LineEvent);
    return;
  }

  if (state.mode === 'jlpt_chat') {
    console.log('📚 JLPT学習チャットモードで処理');
    const { handleJlptChatMessage } = await import('./jlpt-chat');
    await handleJlptChatMessage(userId, replyToken, text, lang);
    return;
  }

  if (state.mode === 'ai_chat') {
    console.log('🤖 AIチャットモードで処理');

    const detection = detectUserIntentAdvanced(text, lang);
    console.log('🔍 AIチャット中インテント検出:', detection);

    switch (detection.action) {
      case 'greet':
        await handleGreeting(userId, replyToken, lang);
        break;

      case 'show_contact':
        await handleContact(replyToken, userId);
        break;

      case 'start_diagnosis_immediately':
        await askJobSearchMethod(userId, replyToken, lang);
        break;

      default:
        await handleAIChatMessage(userId, replyToken, text, lang);
        break;
    }
  }
}

async function handleAIChatMessage(
  userId: string,
  replyToken: string,
  userMessage: string,
  lang: string
): Promise<void> {
  await incrementAIChatCount(userId);
  await showLoadingAnimation(userId, 5);

  const conversationHistory = await getConversationHistory(userId);
  const now = new Date().toISOString();

  conversationHistory.push({ role: 'user', content: userMessage, timestamp: now });

  let aiText = await callOpenAIWithHistory(lang, conversationHistory);

  // AI応答内のURLをトラッキングURL化
  aiText = await processUrlsInText(aiText, userId, 'autochat');

  conversationHistory.push({ role: 'assistant', content: aiText, timestamp: new Date().toISOString() });
  await saveConversationHistory(userId, conversationHistory);

  await replyMessage(replyToken, {
    type: 'text',
    text: aiText,
  });
}

export async function handlePredictiveResponse(
  userId: string,
  replyToken: string,
  messageText: string
): Promise<void> {
  console.log('🧠 予測的応答処理を開始');
  const lang = await getUserLang(userId);

  const detection = detectUserIntentAdvanced(messageText, lang);
  console.log('🔍 検出結果:', detection);

  switch (detection.action) {
    case 'start_diagnosis_immediately':
      console.log('💼 仕事探しを検知 → 選択肢を提示');
      await askJobSearchMethod(userId, replyToken, lang);
      break;

    case 'greet':
      console.log('👋 挨拶応答 + 誘導');
      await handleGreeting(userId, replyToken, lang);
      break;

    case 'show_contact':
      console.log('📞 お問い合わせ情報を表示');
      await handleContact(replyToken, userId);
      break;

    case 'use_openai':
    default:
      console.log('🤖 OpenAI応答 (デフォルト)');
      await handleAIChatMessage(userId, replyToken, messageText, lang);
      break;
  }
}

async function askJobSearchMethod(
  userId: string,
  replyToken: string,
  lang: string
): Promise<void> {
  const messages: Record<string, string> = {
    ja: 'お仕事探しですね！\nどちらの方法で探しますか？',
    en: 'Looking for a job!\nHow would you like to search?',
    ko: '일자리를 찾고 계시네요!\n어떻게 찾으시겠어요?',
    zh: '找工作！\n您想如何搜索？',
    vi: 'Tìm việc!\nBạn muốn tìm như thế nào?',
  };

 const diagnosisLabel: Record<string, string> = {
  ja: '🤖 AI診断(30秒)',
  en: '🤖 AI (30sec)',
  ko: '🤖 AI (30초)',
  zh: '🤖 AI（30秒）',
  vi: '🤖 AI (30s)',
};

const siteLabel: Record<string, string> = {
  ja: '🔍 サイトで探す',
  en: '🔍 On website',
  ko: '🔍 웹사이트',
  zh: '🔍 网站搜索',
  vi: '🔍 Trang web',
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
        label: diagnosisLabel[lang] || diagnosisLabel.ja,
        text: 'AI_MODE',
      },
    },
    {
      type: 'action',
      action: {
        type: 'message',
        label: siteLabel[lang] || siteLabel.ja,
        text: 'SITE_MODE_AUTOCHAT', // AIトーク経由を識別
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
