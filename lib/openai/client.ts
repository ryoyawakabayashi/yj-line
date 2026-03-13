import OpenAI from 'openai';
import { config, FAQ_CONTENT } from '../config';
import { buildYoloAutochatUrl } from '../utils/url';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

export async function callOpenAIWithHistory(
  lang: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  // AIトーク経由の求人サイトURL（GA4でautochatとして計測される）
  const jobSearchUrl = buildYoloAutochatUrl(lang);

  const systemPrompt = `あなたはYOLO JAPANの求人サポートAIアシスタントです。
外国人求職者に対して、親切で丁寧なやさしい日本語で応答してください。

【やさしい日本語のルール】
- 漢字にはひらがなで読み方をつける（例：仕事（しごと））
- 難しい言葉は使わない
- 短い文で話す
- 「〜です」「〜ます」を使う
- カタカナ語は避ける

【重要な応答ルール】
1. ユーザーの質問がFAQに該当する場合は、FAQ情報を参考に正確に回答してください
2. 「仕事を探している」「バイト探してます」などの言葉があれば、具体的な希望条件を聞いてください（場所、業界、日本語レベルなど）
3. 不明な点はお問い合わせ先を案内してください: https://www.yolo-japan.com/ja/inquiry/input
4. 簡潔で分かりやすい表現を使ってください
5. **登録を促す案内は不要です。ユーザーは既にLINE Botを通じて診断を利用できます。**
6. **仕事を探すサイトのURLを案内する場合は、必ず以下のURLを使用してください:**
   ${jobSearchUrl}

【FAQ情報】
${FAQ_CONTENT}

上記のFAQ情報を参考にして、ユーザーの質問に適切に回答してください。
必ずやさしい日本語で、外国人にもわかりやすく答えてください。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('OpenAI response is empty');
    }

    return aiResponse;
  } catch (error) {
    console.error('OpenAI API呼び出しエラー:', error);
    return getErrorMessage(lang);
  }
}

/**
 * JLPT問題をAIで一括生成
 */
export interface GeneratedJlptQuestion {
  question_text: string;
  correct: string;
  wrong: string[];
}

export async function generateJlptQuestions(
  level: string,
  category: string,
  count: number = 10
): Promise<GeneratedJlptQuestion[]> {
  const categoryNames: Record<string, string> = {
    grammar: '文法',
    vocabulary: '語彙',
    kanji: '漢字',
    reading: '読解',
  };
  const catName = categoryNames[category] || category;

  // カテゴリ別の出題形式ガイド（レベル別）
  const categoryGuides: Record<string, string> = {
    kanji: level === 'N5' || level === 'N4' ? `【漢字カテゴリの出題形式 - ${level}】
以下のサブタイプを混ぜて出題してください：

1. 漢字読み
   指示文: 「＿＿のことばは ひらがなで どう かきますか。」
   問題文: 「新しい くるまですね。」（＿＿部分を明示）
   correct: "あたらしい", wrong: ["あだしい", "あらたしい", "あらだしい"]

2. 表記
   指示文: 「＿＿のことばは どう かきますか。」
   問題文: 「あの ほてるは ゆうめいです。」（＿＿部分を明示）
   correct: "ホテル", wrong: ["ホラル", "ホラハ", "ホテハ"]`
    : `【漢字カテゴリの出題形式 - ${level}】
漢字読み形式のみで出題してください：

指示文: 「＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つ選びなさい。」
問題文に下線部の漢字を含む文を書き、その読み方を4択で問う。

${level === 'N3' ? `例: 「彼は会議で重要な役割を＿果たした＿。」
correct: "はたした", wrong: ["かたした", "あたした", "わたした"]

出題する漢字の例: 届ける、届く、預ける、預かる、比べる、届ける、祈る、届く、預ける、届ける` : ''}
${level === 'N2' ? `例: 「この地域は＿穏やかな＿気候で知られている。」
correct: "おだやかな", wrong: ["おどやかな", "おたやかな", "おなやかな"]

N2レベルの漢字（常用漢字の読み、特殊な読み、熟語）を中心に出題。` : ''}
${level === 'N1' ? `例: 「彼は今、新薬の研究開発に＿挑んで＿いる。」
correct: "いどんで", wrong: ["はげんで", "のぞんで", "からんで"]

N1レベルの難読漢字・特殊な読み・文脈による読み分けを出題。
例: 挑む(いどむ)、培う(つちかう)、携わる(たずさわる)、阻む(はばむ)、覆す(くつがえす)、潤う(うるおう)、拭う(ぬぐう)、貪る(むさぼる)` : ''}`,

    vocabulary: level === 'N5' || level === 'N4' ? `【語彙カテゴリの出題形式 - ${level}】
以下のサブタイプを混ぜて出題してください：

1. 文脈規定: 文の意味に合う語彙を選ぶ穴埋め
   指示文: 「（　　）に なにを いれますか。」
   問題文: 「ここは（　　）です。べんきょうできません。」
   correct: "うるさい", wrong: ["くらい", "さむい", "あぶない"]

2. 言い換え類義: 下線部と同じ意味の語を選ぶ
   指示文: 「＿＿の ことばと だいたい おなじ いみの ことばを えらんでください。」
   問題文: 「この かばんは ＿おもい＿ です。」
   correct: "かるくない", wrong: ["ちいさい", "ふるい", "やすい"]`
    : `【語彙カテゴリの出題形式 - ${level}】
以下のサブタイプを均等に混ぜて出題してください：

1. 文脈規定
   指示文: 「（　　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。」
   文中の空欄に入る最適な語彙を選ぶ。
   例: 「私の主張は単なる（　　）ではなく、確たる証拠に基づいている。」
   correct: "推測", wrong: ["模索", "思索", "推移"]

2. 言い換え類義
   指示文: 「＿＿の言葉に意味が最も近いものを、1・2・3・4から一つ選びなさい。」
   下線部の語と最も意味が近い語を選ぶ。
   例: 「このマニュアルの説明は＿ややこしい＿。」
   correct: "複雑だ", wrong: ["明確だ", "奇妙だ", "簡潔だ"]

3. 用法
   指示文: 「次の言葉の使い方として最もよいものを、1・2・3・4から一つ選びなさい。」
   提示された語の正しい用法を含む文を選ぶ。question_textに語を書き、選択肢に4つの例文を書く。
   例: question_text: 「いたわる」
   correct: "弱い立場の人をいたわるのは大切なことです。"
   wrong: ["山田さんはこれまでの努力をいたわってくれました。", "母は孫が遊びに来たら、いつもいたわっていました。", "政治家は国民の生活をいたわるべきです。"]

${level === 'N1' ? '用法問題ではN1レベルの語彙（慣用句、四字熟語、書き言葉の語彙等）を出題すること。' : ''}
${level === 'N2' ? '用法問題ではN2レベルの語彙（やや硬い表現、慣用表現等）を出題すること。' : ''}
${level === 'N3' ? '用法問題ではN3レベルの語彙（日常的だがやや難しい表現）を出題すること。' : ''}`,

    grammar: level === 'N5' || level === 'N4' ? `【文法カテゴリの出題形式 - ${level}】
指示文: 「次の文の（　　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。」

例: 「弟は へや（　　）そうじを しました。」
correct: "を", wrong: ["が", "に", "の"]

出題範囲：
- 助詞（は/が/を/に/で/と/も/から/まで/より 等）
- 接続表現（て形、ば形、たら、ながら 等）
- 文末表現（〜たい、〜てください、〜てもいい 等）
をバランスよく出題すること。`
    : `【文法カテゴリの出題形式 - ${level}】
指示文: 「次の文の（　　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。」

${level === 'N3' ? `出題範囲（N3レベルの文法項目）：
- 〜ようにする / 〜ようになる / 〜ことにする / 〜ことになる
- 〜てしまう / 〜ておく / 〜てある / 〜ていく / 〜てくる
- 〜ばかり / 〜たばかり / 〜ところだ / 〜はずだ / 〜わけだ
- 〜ために / 〜ように / 〜のに / 〜くせに
- 〜らしい / 〜みたいだ / 〜ようだ / 〜そうだ（様態・伝聞）
- 〜ても / 〜のに / 〜けれども / 〜ながら
- 受身・使役・使役受身
例: 「毎日 練習した（　　）、試合に 負けてしまった。」
correct: "のに", wrong: ["ために", "ように", "ことに"]` : ''}
${level === 'N2' ? `出題範囲（N2レベルの文法項目）：
- 〜に対して / 〜にとって / 〜について / 〜に関して / 〜において
- 〜ものの / 〜にもかかわらず / 〜一方で / 〜反面
- 〜次第 / 〜を通じて / 〜をきっかけに / 〜を中心に
- 〜ざるを得ない / 〜ないわけにはいかない / 〜わけがない
- 〜っぽい / 〜がちだ / 〜気味 / 〜向きだ
- 〜に限って / 〜に限らず / 〜どころか / 〜ばかりか
- 〜からこそ / 〜からといって / 〜以上（は）
例: 「彼女の努力（　　）、プロジェクトは成功した。」
correct: "のおかげで", wrong: ["にとって", "に対して", "について"]` : ''}
${level === 'N1' ? `出題範囲（N1レベルの文法項目）：
- 〜をもって / 〜をもってしても / 〜にあたって / 〜に先立ち
- 〜ともなると / 〜ともなれば / 〜たりとも〜ない
- 〜ならでは / 〜ではあるまいし / 〜ないものでもない
- 〜とはいえ / 〜といえども / 〜たところで / 〜ものを
- 〜きらいがある / 〜嫌いがある / 〜極まりない / 〜極まる
- 〜を禁じ得ない / 〜てやまない / 〜に堪えない / 〜に足る
- 〜まじき / 〜べくもない / 〜んばかりだ / 〜が最後
例: 「いまさら後悔してみた（　　）、してしまったことは取り返しがつかない。」
correct: "ところで", wrong: ["といえども", "にせよ", "ばかりに"]` : ''}

助詞だけでなく、上記の文法項目を中心に出題すること。
選択肢は似ているが意味・用法が異なる文法表現を並べること。`,

    reading: `【読解カテゴリの出題形式】
内容理解（短文）形式で出題してください：

- 短い文章（手紙、メモ、お知らせなど）を読んで質問に答える
- 例: 先生がアンナさんに書いた手紙を読む
  「アンナさん、今週は しごとが たくさん あります。土曜日と 日曜日も いそがしいです。来週の 月曜日に 来て ください。」
  質問: 「先生は いつ 時間が ありますか。」
  選択肢: 1 今週 / 2 土曜日 / 3 日曜日 / 4 月曜日
- question_text に本文と質問の両方を含めること（改行で区切る）`,
  };

  const systemPrompt = `あなたはJLPT（日本語能力試験）の問題作成の専門家です。
実際の試験問題と同じ形式・難易度で問題を作成してください。

${categoryGuides[category] || ''}

【重要なルール】
- 動詞の活用形そのものを穴埋めにしない。穴埋めは文法表現・助詞・接続表現に限定すること
- 実際のJLPT ${level} レベルの出題形式・難易度に厳密に準拠すること
- ${level === 'N5' || level === 'N4' ? '問題文はひらがな中心で、漢字にはふりがなの代わりにスペースで区切って読みやすくする' : '問題文は該当レベルに適した漢字使用量にする'}
- 各サブタイプをバランスよく混ぜること

【最重要：正解が1つだけであることの検証】
問題を作成したら、必ず以下の検証を行うこと：
1. 不正解の3つをそれぞれ（　）に入れて文を読み、意味が通じないか確認する
2. 入れ替え可能な表現（例:「から/ので」「に/へ」「は/が」）を不正解に含めない
3. 不正解を入れると日本語として不自然または文法的に誤りになることを確認する

【レスポンス形式】
以下のJSON配列のみを返してください（他のテキストは不要）:
[
  {
    "question_text": "問題文",
    "correct": "正解の選択肢",
    "wrong": ["不正解1", "不正解2", "不正解3"]
  }
]`;

  const userPrompt = `JLPT ${level} の${catName}問題を${count}問作成してください。
実際の試験と同じ形式で、サブタイプを混ぜてバランスよく出題してください。
JSON配列のみを返してください。`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI response is empty');

    // JSONを抽出（```json ... ``` で囲まれている場合も対応）
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const questions: GeneratedJlptQuestion[] = JSON.parse(jsonMatch[0]);

    // 入れ替え可能な助詞ペア（同じ文で両方成立しうる組み合わせ）
    const synonymPairs = [
      ['から', 'ので'],
      ['に', 'へ'],
      ['は', 'が'],
      ['が', 'の'],
      ['けど', 'が'],
      ['けれど', 'が'],
      ['けど', 'けれど'],
      ['けど', 'のに'],
      ['けれど', 'のに'],
      ['たら', 'ば'],
      ['たら', 'と'],
      ['ば', 'と'],
      ['も', 'でも'],
      ['より', 'のほうが'],
      ['だけ', 'しか'],
      ['まで', 'までに'],
    ];

    const hasSynonymConflict = (allOptions: string[]): boolean => {
      const trimmed = allOptions.map(o => o.trim());
      for (const [a, b] of synonymPairs) {
        if (trimmed.includes(a) && trimmed.includes(b)) return true;
      }
      return false;
    };

    // バリデーション
    return questions.filter(q => {
      if (!q.question_text || !q.correct) return false;
      if (!Array.isArray(q.wrong) || q.wrong.length !== 3) return false;
      // 同義ペアチェック（正解+不正解の全4つ）
      if (hasSynonymConflict([q.correct, ...q.wrong])) return false;
      return true;
    });
  } catch (error) {
    console.error('JLPT問題生成エラー:', error);
    throw error;
  }
}

function getErrorMessage(lang: string): string {
  const messages: Record<string, string> = {
    ja: 'エラーが発生しました。もう一度お試しください。',
    en: 'An error occurred. Please try again.',
    ko: '오류가 발생했습니다. 다시 시도해주세요.',
    zh: '发生错误。请重试。',
    vi: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  };
  return messages[lang] || messages.ja;
}
