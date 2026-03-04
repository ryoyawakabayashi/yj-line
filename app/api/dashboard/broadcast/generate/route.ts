import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _openai;
}

const SYSTEM_PROMPT = `あなたはLINE公式アカウントのメッセージ配信アシスタントです。
入力されたテキストから求人情報やお知らせ内容を自動的に読み取り、LINEで配信する魅力的なメッセージを生成してください。

## 入力について
- 求人詳細ページの本文がそのまま貼り付けられます（職種名、時給、勤務地、仕事内容、応募要件、勤務時間、交通費、ハッシュタグなど色々混ざっています）
- テンプレート形式で入力されることもあります
- どんな形式でも、内容を正確に読み取り、重要なポイントを抽出してメッセージを作成してください

## メッセージ作成の方針
- **「この仕事（しごと）で働（はたら）きたい！」と思わせる魅力的な文章**にする
- 求人ページの情報をただコピーするのではなく、**読者の心に響く言葉に変換**する
- 求人の場合:
  - 時給・給料の良さを目立たせる（例: 「時給（じきゅう）1,400円（えん）〜！」）
  - 働きやすさをアピール（例: 「週（しゅう）1日（にち）からOK」「未経験（みけいけん）でも大丈夫（だいじょうぶ）」）
  - 交通費支給、まかない等の待遇を具体的に伝える
  - 勤務地のアクセスの良さ（駅チカなど）
  - 外国人が安心できるポイント（日本語レベル、チームワーク、研修あり等）
- 1通目（テキスト）: 親しみやすい挨拶 + この仕事の一番の魅力を短くキャッチーに伝える
- 2通目（カード）: 職種名をタイトルに、条件を整理してbodyに、「応募する」ボタン付き

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

### 画像メッセージ
{ "type": "image", "altText": "画像の説明（20文字以内）" }
※画像URLはユーザーがアップロードするので、altTextのみ生成してください

## ルール
- 最大5メッセージまで
- テキストメッセージは500文字以内
- やさしい日本語を使う（外国人求職者向け）
  - 漢字には読み仮名をつける（例：仕事（しごと）、時給（じきゅう）、応募（おうぼ））
  - 短い文を使う
  - 難しい言葉は避ける（例: 「インセンティブ」→「がんばったらボーナスあり」）
- LINE Messaging APIの制約:
  - テキスト: 5000文字以内
  - カードのaltText: 400文字以内
  - ボタンは最大4個
  - ボタンのラベルは20文字以内
- 求人メッセージの場合、応募URLにはプレースホルダー「https://www.yolo-japan.com/ja/job/」を使用
- 絵文字やLINEらしい親しみやすい表現を適度に使用
- JSON以外の文字は出力しないでください`;

// ─── 単一メッセージ生成用の定義 ────────────────────

const ROLE_DESCRIPTIONS: Record<string, string> = {
  intro: '導入・挨拶: 読者の注目を引く冒頭メッセージ。「こんにちは」や興味を引く一言で始める',
  main: '本文・詳細: 具体的な情報や説明。仕事内容、条件、イベント詳細などを伝える',
  cta: 'CTA・行動喚起: 応募・登録・参加を促すメッセージ。明確なアクションを促す',
  closing: '締め: 補足情報や挨拶。問い合わせ先やフォローアップ情報を添える',
};

const APPEAL_DESCRIPTIONS: Record<string, string> = {
  benefit: 'メリット訴求: 具体的な利点・メリットを強調する（例: 高時給、交通費支給、スキルアップ）',
  urgency: '緊急性: 「今すぐ」「期間限定」「残りわずか」など急がせる表現を使う',
  curiosity: '好奇心: 「知ってましたか？」「実は…」など読者の興味を引く疑問形やフックを使う',
  exclusivity: '限定感: 「あなただけに」「LINE友だち限定」など特別感を演出する',
  empathy: '共感: 「〜で困っていませんか？」「わかります」など感情に寄り添う表現を使う',
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  friendly: 'フレンドリー: 親しみやすい口調、絵文字多め、「〜だよ」「〜ね」など',
  formal: 'フォーマル: ビジネス的で丁寧、「〜です」「〜ございます」',
  casual: 'カジュアル: 軽い口調、話しかけるような表現、短文',
  energetic: '熱量高め: テンション高く、「！」多め、ポジティブなエネルギー',
};

const SINGLE_SYSTEM_PROMPT = `あなたはLINE公式アカウントのメッセージ配信アシスタントです。
1つのメッセージだけを生成してください。

## メッセージ作成の方針
- **「この仕事で働きたい！」と思わせる魅力的な文章**にする
- 求人の場合: 給料・待遇の良さ、職場の魅力、成長機会などを前面に出す
- 読者が外国人求職者であることを意識し、ポジティブで歓迎する雰囲気を出す

## ルール
- やさしい日本語を使う（外国人求職者向け）
  - 漢字には読み仮名をつける（例：仕事（しごと））
  - 短い文を使う
  - 難しい言葉は避ける
- テキストメッセージは500文字以内
- LINE Messaging APIの制約:
  - テキスト: 5000文字以内
  - カードのaltText: 400文字以内
  - ボタンは最大4個、ラベルは20文字以内
- 求人関連の場合、応募URLは「https://www.yolo-japan.com/ja/job/」を使用
- 絵文字やLINEらしい親しみやすい表現を適度に使用
- JSON以外の文字は出力しないでください`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── 単一メッセージ生成モード ──────────────
    if (body.mode === 'single') {
      const { messageType, role, appeal, tone, keywords, context } = body;

      const roleDesc = ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.main;
      const appealDesc = APPEAL_DESCRIPTIONS[appeal] || APPEAL_DESCRIPTIONS.benefit;
      const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.friendly;

      const formatInstruction = messageType === 'card'
        ? `カード形式で出力してください:
{ "title": "タイトル", "body": "本文", "altText": "通知テキスト", "buttons": [{ "label": "ボタンラベル", "url": "https://..." }] }`
        : `テキスト形式で出力してください:
{ "text": "メッセージ本文" }`;

      const contextInfo = context?.campaignName ? `\nキャンペーン名: ${context.campaignName}` : '';
      const otherMsgs = context?.otherMessages?.filter(Boolean)?.join(' / ');
      const otherInfo = otherMsgs ? `\n他のメッセージ（重複を避けてください）: ${otherMsgs}` : '';
      const kwInfo = keywords ? `\nキーワード・補足情報: ${keywords}` : '';

      const userPrompt = `以下の条件で1つだけメッセージを作成してください。

## 役割
${roleDesc}

## 訴求スタイル
${appealDesc}

## トーン
${toneDesc}
${kwInfo}${contextInfo}${otherInfo}

## 出力フォーマット
${formatInstruction}`;

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SINGLE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
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
        return NextResponse.json({ error: 'AIの応答をパースできませんでした' }, { status: 500 });
      }

      // messageキーがある場合はその中身を使う
      const msg = parsed.message || parsed;

      if (messageType === 'card') {
        return NextResponse.json({
          message: {
            title: String(msg.title || ''),
            body: String(msg.body || ''),
            altText: String(msg.altText || msg.title || '').slice(0, 400),
            buttons: Array.isArray(msg.buttons)
              ? msg.buttons.slice(0, 4).map((b: any) => ({
                  label: String(b.label || '').slice(0, 20),
                  url: String(b.url || ''),
                }))
              : [],
          },
        });
      }
      return NextResponse.json({
        message: { text: String(msg.text || '') },
      });
    }

    // ─── 一括生成モード（既存） ──────────────
    const { prompt, messageType, combo } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'プロンプトが必要です' }, { status: 400 });
    }

    // combo指定がある場合、構成を指示に含める
    let typeHint: string;
    if (combo && Array.isArray(combo) && combo.length > 0) {
      const TYPE_LABELS: Record<string, string> = { text: 'テキスト', card: 'カード', image: '画像' };
      const comboDesc = combo.map((c: any, i: number) => {
        const label = TYPE_LABELS[c.type] || 'テキスト';
        const extra = c.type === 'card' && c.hasImage ? '（画像付き）' : '';
        return `${i + 1}番目: ${label}${extra}`;
      }).join('、');
      typeHint = `\n\n## メッセージ構成（必ずこの順番・型で生成してください）\n${comboDesc}\n合計${combo.length}件のメッセージを、指定された順番と型で生成してください。画像タイプの場合はaltTextのみ生成してください（画像URLはユーザーが別途アップロードします）。`;
    } else if (messageType === 'text') {
      typeHint = '\nメッセージタイプ: テキストのみで作成してください。';
    } else if (messageType === 'card') {
      typeHint = '\nメッセージタイプ: カード形式（Flex Message）を含めて作成してください。';
    } else {
      typeHint = '\nメッセージタイプ: 最適な形式をAIが選んでください。';
    }

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

    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: 'AIの応答をパースできませんでした', raw: rawContent }, { status: 500 });
    }

    const messages = Array.isArray(parsed) ? parsed : (parsed.messages || [parsed]);

    const sanitized = messages
      .filter((m: any) => m && (m.type === 'text' || m.type === 'card' || m.type === 'image'))
      .slice(0, 5)
      .map((m: any) => {
        if (m.type === 'text') {
          return { type: 'text' as const, text: String(m.text || '') };
        }
        if (m.type === 'image') {
          return { type: 'image' as const, altText: String(m.altText || '画像').slice(0, 400) };
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
