import OpenAI from 'openai';
import { config, FAQ_CONTENT } from '../config';
import { buildYoloAutochatUrl } from '../utils/url';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export async function callOpenAIWithHistory(
  lang: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  // AIトーク経由の求人サイトURL（GA4でautochatとして計測される）
  const jobSearchUrl = buildYoloAutochatUrl(lang);

  const systemPrompt = `あなたはYOLO JAPANの求人サポートAIアシスタントです。
外国人求職者に対して、親切で丁寧なやさしい日本語で応答してください。

【やさしい日本語のルール】
- 漢字にはひらがなで読み方をつける（例：仕事（しごと））
- 難しい言葉は使わない
- 短い文で話す
- 「〜です」「〜ます」を使う
- カタカナ語は避ける

【重要な応答ルール】
1. ユーザーの質問がFAQに該当する場合は、FAQ情報を参考に正確に回答してください
2. 「仕事を探している」「バイト探してます」などの言葉があれば、具体的な希望条件を聞いてください（場所、業界、日本語レベルなど）
3. 不明な点はお問い合わせ先を案内してください: https://www.yolo-japan.com/ja/inquiry/input
4. 簡潔で分かりやすい表現を使ってください
5. **登録を促す案内は不要です。ユーザーは既にLINE Botを通じて診断を利用できます。**
6. **仕事を探すサイトのURLを案内する場合は、必ず以下のURLを使用してください:**
   ${jobSearchUrl}

【FAQ情報】
${FAQ_CONTENT}

上記のFAQ情報を参考にして、ユーザーの質問に適切に回答してください。
必ずやさしい日本語で、外国人にもわかりやすく答えてください。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('OpenAI response is empty');
    }

    return aiResponse;
  } catch (error) {
    console.error('OpenAI API呼び出しエラー:', error);
    return getErrorMessage(lang);
  }
}

function getErrorMessage(lang: string): string {
  const messages: Record<string, string> = {
    ja: 'エラーが発生しました。もう一度お試しください。',
    en: 'An error occurred. Please try again.',
    ko: '오류가 발생했습니다. 다시 시도해주세요.',
    zh: '发生错误。请重试。',
    vi: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  };
  return messages[lang] || messages.ja;
}
