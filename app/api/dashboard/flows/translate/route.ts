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
          content: `You are a professional translator for a LINE chatbot support system. Translate Japanese text naturally for each target language. Keep the tone friendly and helpful. Preserve any template variables like {{user.name}} or {{userMessage}} exactly as-is. Preserve line breaks.

Output JSON format:
{
  "translations": [
    {
      "ja": "original Japanese text",
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
          content: `Translate the following Japanese texts to ${langList}:\n\n${textsJson}`,
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
