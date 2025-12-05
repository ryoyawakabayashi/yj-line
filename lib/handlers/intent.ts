import { IntentDetection } from '@/types/conversation';

export function detectUserIntentAdvanced(
  message: string,
  lang: string = 'ja'
): IntentDetection {
  const lowerMessage = message.toLowerCase();
  
  console.log('🔍 インテント検出開始');
  console.log('元のメッセージ:', message);
  console.log('小文字変換後:', lowerMessage);
  console.log('設定言語:', lang);

  // 仕事探しパターン - 全言語をチェック
  const jobSearchPatterns = {
    ja: [/仕事/, /しごと/, /求人/, /バイト/, /アルバイト/, /パート/, /就職/, /転職/, /働/, /はたら/, /さが/, /探/],
    en: [/job/, /work/, /employment/, /looking/, /search/, /find/],
    ko: [/일자리/, /구직/, /취업/, /일/, /아르바이트/, /알바/, /찾/],
    zh: [/工作/, /求职/, /找/],
    vi: [/việc/, /công việc/, /tìm/],
  };

  // 全言語のパターンをチェック
  for (const [checkLang, patterns] of Object.entries(jobSearchPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(message) || pattern.test(lowerMessage)) {
        console.log(`✅ マッチ成功 (${checkLang}):`, pattern.toString());
        return {
          intent: 'job_search',
          confidence: 0.95,
          pattern: 'exact',
          trigger: pattern.toString(),
          action: 'start_diagnosis_immediately',
        };
      }
    }
  }
  
  console.log('❌ 仕事探しパターンにマッチせず');

  // 挨拶パターン - 全言語をチェック
  const greetingPatterns = {
    ja: [/^(こんにちは|こんばんは|おはよう|はじめまして|よろしく)$/i],
    en: [/^(hello|hi|hey|good morning|good afternoon|good evening)$/i],
    ko: [/^(안녕|안녕하세요|처음 뵙겠습니다)$/i],
    zh: [/^(你好|您好|嗨|早上好)$/i],
    vi: [/^(xin chào|chào)$/i],
  };

  for (const patterns of Object.values(greetingPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return {
          intent: 'greeting',
          confidence: 0.95,
          pattern: 'exact',
          trigger: pattern.toString(),
          action: 'greet',
        };
      }
    }
  }

  // 問い合わせパターン - 全言語をチェック
  const contactPatterns = {
    ja: [/問い合わせ/, /質問/, /相談/, /聞きたい/, /教えて/, /わからない/, /知りたい/, /連絡/],
    en: [/contact/, /question/, /ask/, /inquiry/, /help/, /support/],
    ko: [/문의/, /질문/, /상담/, /도움/],
    zh: [/咨询/, /问题/, /询问/, /帮助/],
    vi: [/liên hệ/, /hỏi/, /tư vấn/, /giúp đỡ/],
  };

  for (const patterns of Object.values(contactPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage) || pattern.test(message)) {
        return {
          intent: 'contact',
          confidence: 0.90,
          pattern: 'exact',
          trigger: pattern.toString(),
          action: 'show_contact',
        };
      }
    }
  }

  return {
    intent: 'unknown',
    confidence: 0,
    pattern: 'none',
    trigger: null,
    action: 'use_openai',
  };
}

export function extractJobConditions(message: string, lang: string) {
  const conditions: {
    location: string | null;
    industry: string | null;
    japaneseLevel: string | null;
    urgency: string | null;
  } = {
    location: null,
    industry: null,
    japaneseLevel: null,
    urgency: null,
  };

  const locationPatterns: Record<string, RegExp> = {
    tokyo: /(東京|とうきょう|tokyo)/i,
    osaka: /(大阪|おおさか|osaka)/i,
    kyoto: /(京都|きょうと|kyoto)/i,
    fukuoka: /(福岡|ふくおか|fukuoka)/i,
  };

  for (const [key, pattern] of Object.entries(locationPatterns)) {
    if (pattern.test(message)) {
      conditions.location = key;
      break;
    }
  }

  if (/N[1-5]/i.test(message)) {
    const match = message.match(/N([1-5])/i);
    if (match) {
      conditions.japaneseLevel = `n${match[1]}`;
    }
  } else if (/(日本語.*できない|日本語.*不要|日本語.*話せない)/i.test(message)) {
    conditions.japaneseLevel = 'no_japanese';
  }

  if (/(すぐ|今すぐ|即日|急|immediately)/i.test(message)) {
    conditions.urgency = 'immediate';
  }

  return conditions;
}
