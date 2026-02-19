import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const TARGET_LANGS = ['en', 'ko', 'zh', 'vi'] as const;

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ko: 'Korean',
  zh: 'Simplified Chinese',
  vi: 'Vietnamese',
};

/**
 * POST /api/dashboard/flows/translate
 * 日本語テキストを5言語に翻訳
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts } = body as { texts: string[] };

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    // 全テキストをまとめて翻訳リクエスト
    const textsJson = JSON.stringify(texts);
    const langList = TARGET_LANGS.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ');

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional localization specialist for a LINE chatbot used by foreigners living in Japan.

For EACH input Japanese text, produce 5 outputs:

## 1. "ja" — やさしい日本語 (Easy Japanese)
DO NOT just convert kanji to hiragana. You must REWRITE the sentence to be genuinely easy to understand:
- Use simple, everyday words (e.g. 「ご確認ください」→「見てください」、「申し訳ございません」→「すみません」、「お問い合わせ」→「れんらく」、「ご了承ください」→「わかってください」)
- Use short, direct sentences. Split long sentences into multiple short ones.
- Avoid keigo (敬語) and complex grammar. Use です/ます form.
- Only use kanji from elementary school grades 1-2 (小1〜2). All other kanji → hiragana.
- Do NOT add furigana in parentheses — write hiragana directly.
- Keep katakana words as-is (メッセージ, サイト, エラー, etc.)
- Keep emoji as-is.

## 2. "en" — English
Write natural, native-level English. Not a literal translation from Japanese.
Use casual-friendly tone appropriate for a chat app. Avoid stiff or overly formal phrasing.

## 3. "ko" — Korean
Write natural Korean as a native Korean speaker would. Use 해요체 (polite but friendly).
Avoid unnatural Konglish or stiff literal translations from Japanese.

## 4. "zh" — Simplified Chinese
Write natural Simplified Chinese. Use colloquial, friendly phrasing suitable for chat.
Not a word-for-word translation — convey the meaning naturally.

## 5. "vi" — Vietnamese
Write natural Vietnamese as a native speaker would. Use friendly, approachable tone.
Avoid literal translation patterns from Japanese grammar.

## Rules for ALL outputs:
- Preserve template variables like {{user.name}} or {{userMessage}} EXACTLY as-is
- Preserve line breaks
- Preserve URLs exactly as-is

Output JSON format:
{
  "translations": [
    { "ja": "...", "en": "...", "ko": "...", "zh": "...", "vi": "..." }
  ]
}`,
        },
        {
          role: 'user',
          content: `Localize the following Japanese texts. For "ja", rewrite into genuinely easy Japanese (not just kanji→hiragana). For other languages, write as a native speaker would naturally say it.\n\n${textsJson}`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      translations: result.translations || [],
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}
