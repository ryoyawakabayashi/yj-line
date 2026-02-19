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
          content: `You are a professional translator for a LINE chatbot support system.

For EACH input Japanese text, produce 5 outputs:

1. "ja" — Convert into やさしい日本語 (Easy Japanese):
   - Only use kanji from elementary school grades 1-2 (小学1〜2年生の漢字のみ)
   - All other kanji MUST be written in hiragana (e.g. 診断→しんだん, 応募→おうぼ, 選択→えらぶ)
   - Do NOT add furigana in parentheses — just write in hiragana directly
   - Keep katakana words as-is (e.g. メッセージ, サイト, エラー)
   - Keep emoji as-is

2. "en", "ko", "zh", "vi" — Translate from the ORIGINAL Japanese meaning (not from the Easy Japanese). Keep the tone friendly and helpful.

Rules for ALL outputs:
- Preserve template variables like {{user.name}} or {{userMessage}} exactly as-is
- Preserve line breaks
- Preserve URLs exactly as-is

Output JSON format:
{
  "translations": [
    {
      "ja": "やさしい日本語 version",
      "en": "English translation",
      "ko": "Korean translation",
      "zh": "Simplified Chinese translation",
      "vi": "Vietnamese translation"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Process the following Japanese texts (convert ja to Easy Japanese, translate others from original meaning) to ${langList}:\n\n${textsJson}`,
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
