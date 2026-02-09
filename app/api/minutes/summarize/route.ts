import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export async function POST(req: NextRequest) {
  try {
    const { content, type } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    let systemPrompt = '';

    if (type === 'summarize') {
      systemPrompt = `あなたは議事録作成の専門家です。
以下のテキストを簡潔な議事録形式にまとめてください。

フォーマット:
## 会議概要
- 日時:
- 参加者:

## 議題・決定事項
1.
2.

## アクションアイテム
- [ ] 担当者: タスク内容

## 次回予定
`;
    } else if (type === 'action-items') {
      systemPrompt = `以下のテキストからアクションアイテム（ToDo、タスク、宿題）を抽出してください。
各アイテムには担当者と期限があれば含めてください。

フォーマット:
- [ ] 担当者: タスク内容 (期限: )`;
    } else {
      systemPrompt = `以下のテキストを整理して、読みやすくフォーマットしてください。`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json({ result: response });
  } catch (error) {
    console.error('Minutes API error:', error);
    return NextResponse.json(
      { error: 'Failed to process minutes' },
      { status: 500 }
    );
  }
}
