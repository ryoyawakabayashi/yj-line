import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _openai;
}

const SYSTEM_PROMPT = `あなたはLINEメッセージの翻訳アシスタントです。
日本語のLINEメッセージを英語に翻訳してください。

## ルール
- 入力はJSON配列です。各要素の構造を保ったまま、テキスト部分だけを英語に翻訳してください
- type, actionType, url などの構造フィールドはそのまま維持してください
- 翻訳対象フィールド: text, title, body, altText, label, messageText
- **すべての日本語を完全に英語に翻訳してください。漢字・ひらがな・カタカナが一切残らないようにしてください**
- 固有名詞（地名、駅名、会社名など）もローマ字または英語表記にしてください（例: 西大島 → Nishi-Ojima）
- LINE向けのカジュアルで親しみやすいトーンを維持してください
- 絵文字はそのまま残してください
- URLはそのまま残してください
- JSON以外の文字は出力しないでください
- 出力は { "messages": [...] } の形式で返してください`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-5.2-chat-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(messages, null, 2) },
      ],
      max_tokens: 2000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: 'AIからの応答がありません' }, { status: 500 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: '翻訳結果のパースに失敗しました' }, { status: 500 });
    }

    const translated = Array.isArray(parsed) ? parsed : (parsed.messages || [parsed]);

    return NextResponse.json({ messages: translated });
  } catch (error) {
    console.error('Translate error:', error);
    return NextResponse.json({ error: '翻訳中にエラーが発生しました' }, { status: 500 });
  }
}
