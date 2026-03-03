import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _openai;
}

const SYSTEM_PROMPT = `あなたはLINE公式アカウントのメッセージ配信アシスタントです。
ユーザーの要望に合わせて、LINEで配信するメッセージを生成してください。

## 出力フォーマット
JSON配列で出力してください。各要素は以下のいずれかの型です:

### テキストメッセージ
{ "type": "text", "text": "メッセージ本文" }

### カードメッセージ（Flex Message）
{
  "type": "card",
  "title": "カードタイトル",
  "body": "カード本文",
  "altText": "通知テキスト（20文字以内）",
  "buttons": [
    { "label": "ボタンラベル", "url": "https://..." }
  ]
}

## ルール
- 最大5メッセージまで
- テキストメッセージは500文字以内
- やさしい日本語を使う（外国人求職者向け）
  - 漢字には読み仮名をつける（例：仕事（しごと））
  - 短い文を使う
  - 難しい言葉は避ける
- LINE Messaging APIの制約:
  - テキスト: 5000文字以内
  - カードのaltText: 400文字以内
  - ボタンは最大4個
  - ボタンのラベルは20文字以内
- 求人メッセージの場合、応募URLにはプレースホルダー「https://www.yolo-japan.com/ja/job/」を使用
- 絵文字やLINEらしい親しみやすい表現を適度に使用
- JSON以外の文字は出力しないでください`;

export async function POST(request: NextRequest) {
  try {
    const { prompt, messageType } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'プロンプトが必要です' }, { status: 400 });
    }

    const typeHint = messageType === 'text'
      ? '\nメッセージタイプ: テキストのみで作成してください。'
      : messageType === 'card'
        ? '\nメッセージタイプ: カード形式（Flex Message）を含めて作成してください。'
        : '\nメッセージタイプ: 最適な形式をAIが選んでください。';

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt + typeHint },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json({ error: 'AIからの応答がありません' }, { status: 500 });
    }

    // Parse the response - may be { messages: [...] } or just [...]
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: 'AIの応答をパースできませんでした', raw: rawContent }, { status: 500 });
    }

    const messages = Array.isArray(parsed) ? parsed : (parsed.messages || [parsed]);

    // Validate and sanitize
    const sanitized = messages
      .filter((m: any) => m && (m.type === 'text' || m.type === 'card'))
      .slice(0, 5)
      .map((m: any) => {
        if (m.type === 'text') {
          return { type: 'text' as const, text: String(m.text || '') };
        }
        return {
          type: 'card' as const,
          title: String(m.title || ''),
          body: String(m.body || ''),
          altText: String(m.altText || m.title || '').slice(0, 400),
          buttons: Array.isArray(m.buttons)
            ? m.buttons.slice(0, 4).map((b: any) => ({
                label: String(b.label || '').slice(0, 20),
                url: String(b.url || ''),
              }))
            : [],
        };
      });

    return NextResponse.json({ messages: sanitized });
  } catch (error) {
    console.error('AI generate error:', error);
    return NextResponse.json({ error: 'AI生成中にエラーが発生しました' }, { status: 500 });
  }
}
