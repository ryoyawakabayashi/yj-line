import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 許可するモデルのリスト
const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-5.1', 'o3', 'o3-mini'];

// 推論モデル（o1/o3系）かどうかを判定
const isReasoningModel = (model: string) => model.startsWith('o');

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, model } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // モデルの検証（デフォルトはgpt-4o-mini）
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : 'gpt-4o-mini';

    const systemMessage = systemPrompt || `あなたは優秀なAIアシスタントです。
会議のサポート、議事録の作成、質問への回答などを行います。
簡潔で分かりやすい回答を心がけてください。`;

    // o1/o3系の推論モデルは特別な処理が必要
    const isReasoning = isReasoningModel(selectedModel);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestPayload: any = {
      model: selectedModel,
      messages: isReasoning
        ? [
            // 推論モデルはsystem roleをサポートしないため、userメッセージとして埋め込む
            {
              role: 'user',
              content: `以下の指示に従って分析・回答してください:\n\n${systemMessage}`,
            },
            { role: 'assistant', content: '承知しました。指示に従って分析します。' },
            ...messages,
          ]
        : [{ role: 'system', content: systemMessage }, ...messages],
    };

    if (isReasoning) {
      // 推論モデルはmax_completion_tokensを使用、temperatureは指定不可
      requestPayload.max_completion_tokens = 4000;
    } else {
      requestPayload.max_tokens = 2000;
      requestPayload.temperature = 0.7;
    }

    const completion = await openai.chat.completions.create(requestPayload);

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
