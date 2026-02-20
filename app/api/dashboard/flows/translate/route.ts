import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getGlossaryForPrompt } from '@/lib/database/glossary-queries';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const TARGET_LANGS = ['en', 'ko', 'zh', 'vi'] as const;

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]\u3000-\u9FFF\uF900-\uFAFF\uFF01-\uFF60]+/gi;

/**
 * テキスト内のURLをプレースホルダに置換し、翻訳後に復元する
 */
function extractUrls(text: string): { cleaned: string; urls: string[] } {
  const urls: string[] = [];
  const cleaned = text.replace(URL_REGEX, (match) => {
    urls.push(match);
    return `__URL_${urls.length - 1}__`;
  });
  return { cleaned, urls };
}

function restoreUrls(text: string, urls: string[]): string {
  return text.replace(/__URL_(\d+)__/g, (_, idx) => urls[parseInt(idx)] || '');
}

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
    const { texts, jaMode = 'standard' } = body as { texts: string[]; jaMode?: 'standard' | 'easy' };

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    // URLをプレースホルダに置換（GPTがURLを壊すのを防止）
    const extracted = texts.map((t) => extractUrls(t));
    const cleanedTexts = extracted.map((e) => e.cleaned);

    // 全テキストをまとめて翻訳リクエスト
    const textsJson = JSON.stringify(cleanedTexts);
    const langList = TARGET_LANGS.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ');

    // 用語集をプロンプトに追加
    const glossaryPrompt = await getGlossaryForPrompt();

    const jaInstruction = jaMode === 'easy'
      ? `## 1. "ja" — やさしい日本語 (Easy Japanese)
Imagine you are explaining to a 1st-2nd grade elementary school student (小学1〜2年生). DO NOT just convert kanji to hiragana — you must REWRITE with simpler words and concepts.

### Word Replacement (most important):
Replace difficult/formal words with simple everyday equivalents:
- 「個別」→「一人一人」
- 「確認」→「見る」「たしかめる」
- 「申し訳ございません」→「すみません」「ごめんなさい」
- 「お問い合わせ」→「れんらく」
- 「ご了承ください」→「わかってください」
- 「詳細」→「くわしいこと」
- 「対応」→「やる」「する」
- 「提供」→「あげる」「出す」
- 「選択」→「えらぶ」
- 「登録」→「入れる」「書く」
- 「完了」→「おわり」「できました」
- 「変更」→「かえる」
- 「検索」→「さがす」
- 「利用」→「つかう」
- 「必要」→「いる」
- 「可能」→「できる」
- 「設定」→「きめる」
- 「情報」→「おしらせ」「こと」
- 「送信」→「おくる」
- 「受信」→「もらう」「とどく」
- 「機能」→「できること」
- 「質問」→「きくこと」「しつもん」
- 「回答」→「こたえ」
- 「応募」→「もうしこむ」
- 「求人」→「おしごと」
- 「条件」→「きまり」「やくそく」
- 「経験」→「やったこと」
- 「資格」→「もっているもの」
- 「勤務」→「はたらく」
- 「給与」→「おかね」「おきゅうりょう」
- 「面接」→「めんせつ」
- 「採用」→「えらばれる」
- 「職種」→「しごとの しゅるい」
- 「業界」→「しごとの ぶんや」

### Kanji rules:
- USE kanji that 小1〜2 students learn: 人、大、小、中、日、月、上、下、左、右、手、足、目、口、耳、出、入、見、行、来、学、校、先、生、年、花、草、山、川、田、森、林、空、天、気、雨、水、火、土、石、金、玉、王、男、女、子、犬、虫、貝、力、本、文、字、名、正、白、赤、青、円、休、百、千、万、早、夕、立、音、etc.
- All other kanji → write in hiragana directly (NOT furigana in parentheses)

### Sentence structure:
- Use short, direct sentences. Split long sentences into 2-3 short ones.
- Use です/ます form. Avoid keigo (敬語) and complex grammar.
- Keep katakana words as-is (メッセージ, サイト, エラー, etc.)
- Keep emoji as-is.`
      : `## 1. "ja" — 日本語 (Standard Japanese)
Write natural, polite Japanese suitable for a customer-facing chatbot.
- Use です/ます form (polite but not overly formal keigo).
- Keep the meaning faithful to the original text.
- Use natural, conversational phrasing appropriate for a LINE chat app.
- Keep emoji as-is.
- Keep katakana words as-is.`;

    const jaUserInstruction = jaMode === 'easy'
      ? 'For "ja", rewrite into genuinely easy Japanese (not just kanji→hiragana).'
      : 'For "ja", write natural polite Japanese.';

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional localization specialist for a customer-facing LINE chatbot that provides support to foreigners living in Japan.
The bot helps users find jobs, get life support information, and navigate services in Japan.

For EACH input Japanese text, produce 5 outputs:

${jaInstruction}

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
}${glossaryPrompt}`,
        },
        {
          role: 'user',
          content: `Localize the following Japanese texts. ${jaUserInstruction} For other languages, write as a native speaker would naturally say it.\n\n${textsJson}`,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    // プレースホルダをURLに復元
    const translations = (result.translations || []).map((t: any, i: number) => {
      const urls = extracted[i]?.urls || [];
      if (urls.length === 0) return t;
      return {
        ja: restoreUrls(t.ja || '', urls),
        en: restoreUrls(t.en || '', urls),
        ko: restoreUrls(t.ko || '', urls),
        zh: restoreUrls(t.zh || '', urls),
        vi: restoreUrls(t.vi || '', urls),
      };
    });

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}
