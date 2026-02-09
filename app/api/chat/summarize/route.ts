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
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 会話内容を整形
    const conversationText = messages
      .map((msg: { role: string; content: string }) =>
        `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`
      )
      .join('\n\n');

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini', // 要約は軽量モデルで十分
      messages: [
        {
          role: 'system',
          content: `あなたはダッシュボード分析の会話を要約するアシスタントです。
以下の会話を簡潔に要約してください。

要約のルール:
1. 箇条書きで主要なトピックをまとめる
2. 具体的な数値や日付があれば含める
3. ユーザーが質問した内容と、AIが出した主な結論・提案を含める
4. 200文字程度に収める
5. 日本語で出力

出力形式:
- [日付/トピック]: [内容の要約]
- [日付/トピック]: [内容の要約]
...`,
        },
        {
          role: 'user',
          content: `以下の会話を要約してください:\n\n${conversationText}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize conversation' },
      { status: 500 }
    );
  }
}
