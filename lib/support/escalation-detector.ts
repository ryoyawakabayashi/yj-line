// =====================================================
// Escalation Detector - エスカレーション必要性の判定
// =====================================================

import OpenAI from 'openai';
import { config } from '../config';
import { ServiceType } from '@/types/support';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

// =====================================================
// Types
// =====================================================

export interface EscalationResult {
  shouldEscalate: boolean;
  reason: string;
  category: 'urgent' | 'emotional' | 'complex' | 'issue' | 'repeated' | 'ai_detected' | 'none';
  confidence: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// =====================================================
// Keyword-based Detection
// =====================================================

/**
 * エスカレーションを示唆するキーワード（多言語対応）
 */
const ESCALATION_KEYWORDS: Record<string, string[]> = {
  // 緊急性
  urgent: [
    // 日本語
    '急ぎ', '緊急', '至急', 'すぐに', '今すぐ', '急いで', 'いそいで',
    // 英語
    'urgent', 'asap', 'immediately', 'right now', 'emergency',
    // 韓国語
    '급해', '긴급', '빨리',
    // 中国語
    '紧急', '急', '马上',
    // ベトナム語
    'khẩn cấp', 'ngay lập tức',
  ],

  // 感情的
  emotional: [
    // 日本語
    '怒り', '怒って', '困って', '困っている', '助けて', '悲しい', 'ひどい', '最悪',
    'イライラ', 'ムカつく', '許せない', '信じられない', 'どうして',
    // 英語
    'angry', 'frustrated', 'upset', 'help me', 'terrible', 'worst', 'unacceptable',
    'disappointed', 'annoyed',
    // 韓国語
    '화가', '도와주세요', '답답해',
    // 中国語
    '生气', '帮帮我', '很烦',
    // ベトナム語
    'tức giận', 'giúp tôi', 'thất vọng',
  ],

  // 繰り返し・未解決
  complex: [
    // 日本語
    '何度も', '何回も', '解決しない', '解決できない', 'まだ', 'いまだに',
    'ずっと', '前から', '以前から', '同じ問題', 'また',
    // 英語
    'not working', 'still', 'again', 'multiple times', 'keeps happening',
    'same problem', 'not resolved',
    // 韓国語
    '여러 번', '아직도', '계속',
    // 中国語
    '还是', '一直', '多次',
    // ベトナム語
    'vẫn', 'nhiều lần', 'không được',
  ],

  // トラブル・問題
  issue: [
    // 日本語
    '被害', '詐欺', 'トラブル', '返金', '賠償', '訴え', '弁護士',
    '警察', '消費者センター', '消費生活センター', '法的', '違法',
    'クレーム', '苦情',
    // 英語
    'fraud', 'scam', 'refund', 'compensation', 'lawyer', 'police',
    'legal', 'illegal', 'complaint', 'report',
    // 韓国語
    '사기', '환불', '신고',
    // 中国語
    '诈骗', '退款', '投诉',
    // ベトナム語
    'lừa đảo', 'hoàn tiền', 'khiếu nại',
  ],
};

/**
 * キーワードベースのエスカレーション検出
 */
export function detectEscalationByKeywords(message: string): EscalationResult {
  const lowerMessage = message.toLowerCase();

  for (const [category, keywords] of Object.entries(ESCALATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          shouldEscalate: true,
          reason: `キーワード "${keyword}" を検出`,
          category: category as EscalationResult['category'],
          confidence: 0.9,
        };
      }
    }
  }

  return {
    shouldEscalate: false,
    reason: '',
    category: 'none',
    confidence: 0,
  };
}

/**
 * 会話履歴から繰り返しパターンを検出
 */
export function detectRepeatedIssue(
  conversationHistory: ConversationMessage[]
): EscalationResult {
  // 会話が3往復以上かつ同じような質問をしている場合
  const userMessages = conversationHistory.filter((m) => m.role === 'user');

  if (userMessages.length >= 3) {
    // 質問が似ているかチェック（簡易的な実装）
    const lastMessage = userMessages[userMessages.length - 1].content.toLowerCase();
    const similarCount = userMessages.slice(0, -1).filter((m) => {
      const content = m.content.toLowerCase();
      // 同じ単語が3つ以上含まれているか
      const words1 = new Set(lastMessage.split(/\s+/));
      const words2 = new Set(content.split(/\s+/));
      let commonCount = 0;
      for (const word of words1) {
        if (words2.has(word)) commonCount++;
      }
      return commonCount >= 3;
    }).length;

    if (similarCount >= 2) {
      return {
        shouldEscalate: true,
        reason: '同じ質問を複数回繰り返しています',
        category: 'repeated',
        confidence: 0.85,
      };
    }
  }

  return {
    shouldEscalate: false,
    reason: '',
    category: 'none',
    confidence: 0,
  };
}

// =====================================================
// AI-based Detection
// =====================================================

/**
 * AIベースのエスカレーション判定
 * キーワード検出で捕捉できない複雑なケースを判定
 */
export async function detectEscalationByAI(
  message: string,
  conversationHistory: ConversationMessage[],
  service: ServiceType | undefined
): Promise<EscalationResult> {
  try {
    const systemPrompt = `あなたはカスタマーサポートのエスカレーション判定AIです。
ユーザーのメッセージを分析し、有人対応（エスカレーション）が必要かどうかを判断してください。

## エスカレーションが必要なケース
1. 緊急性が高い（すぐに対応が必要）
2. 感情的になっている（怒り、悲しみ、フラストレーション）
3. 複雑な問題（FAQ で解決できない）
4. 深刻なトラブル（金銭被害、法的問題）
5. 繰り返し問い合わせている（解決していない）
6. 特殊なケース（企業間トラブル、システム障害など）

## エスカレーション不要なケース
1. 一般的な質問（FAQ で回答可能）
2. 単純な情報提供で解決できる
3. 挨拶や雑談

回答は以下のJSON形式で返してください:
{
  "shouldEscalate": true/false,
  "reason": "判断理由（日本語で簡潔に）",
  "confidence": 0.0-1.0
}`;

    const conversationContext = conversationHistory
      .slice(-5) // 直近5メッセージのみ
      .map((m) => `${m.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${m.content}`)
      .join('\n');

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `サービス: ${service || '未指定'}

会話履歴:
${conversationContext || '（なし）'}

最新メッセージ:
${message}

エスカレーションが必要か判断してください。`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        shouldEscalate: false,
        reason: '',
        category: 'none',
        confidence: 0,
      };
    }

    const result = JSON.parse(content);

    return {
      shouldEscalate: result.shouldEscalate === true,
      reason: result.reason || '',
      category: 'ai_detected',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
    };
  } catch (error) {
    console.error('AI エスカレーション判定エラー:', error);
    return {
      shouldEscalate: false,
      reason: '',
      category: 'none',
      confidence: 0,
    };
  }
}

// =====================================================
// Main Detection Function
// =====================================================

/**
 * エスカレーション必要性の総合判定
 *
 * 判定フロー:
 * 1. キーワード検出（高速）
 * 2. 繰り返しパターン検出
 * 3. AIベース判定（上記で検出できない場合）
 */
export async function shouldEscalate(
  message: string,
  conversationHistory: ConversationMessage[] = [],
  service: ServiceType | undefined = undefined,
  options: {
    skipAI?: boolean;
    aiThreshold?: number;
  } = {}
): Promise<EscalationResult> {
  const { skipAI = false, aiThreshold = 0.7 } = options;

  // 1. キーワード検出（高速）
  const keywordResult = detectEscalationByKeywords(message);
  if (keywordResult.shouldEscalate) {
    console.log(`🚨 エスカレーション検出（キーワード）: ${keywordResult.reason}`);
    return keywordResult;
  }

  // 2. 繰り返しパターン検出
  const repeatedResult = detectRepeatedIssue(conversationHistory);
  if (repeatedResult.shouldEscalate) {
    console.log(`🚨 エスカレーション検出（繰り返し）: ${repeatedResult.reason}`);
    return repeatedResult;
  }

  // 3. AIベース判定（オプショナル）
  if (!skipAI) {
    const aiResult = await detectEscalationByAI(message, conversationHistory, service);
    if (aiResult.shouldEscalate && aiResult.confidence >= aiThreshold) {
      console.log(`🚨 エスカレーション検出（AI）: ${aiResult.reason} (confidence=${aiResult.confidence})`);
      return aiResult;
    }
  }

  return {
    shouldEscalate: false,
    reason: '',
    category: 'none',
    confidence: 0,
  };
}
