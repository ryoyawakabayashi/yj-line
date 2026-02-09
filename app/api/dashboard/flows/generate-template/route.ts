import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const SERVICES = ['YOLO_JAPAN', 'YOLO_DISCOVER', 'YOLO_HOME'] as const;
const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

const MAX_QUICK_REPLY_ITEMS = 13; // LINEクイックリプライ上限

interface FaqWithTranslations {
  id: string;
  service: string;
  faq_key: string;
  keywords: string[];
  priority: number;
  faq_translations: Array<{
    lang: string;
    question: string;
    answer: string;
  }>;
}

interface CategoryResult {
  faq_key: string;
  category: string;
}

/**
 * OpenAIでFAQを自動カテゴリ分類
 */
async function categorizeFaqs(
  faqs: FaqWithTranslations[],
  serviceLabel: string
): Promise<Record<string, FaqWithTranslations[]>> {
  if (faqs.length <= MAX_QUICK_REPLY_ITEMS) {
    // 13件以下なら分類不要、1カテゴリにまとめる
    return { 'すべて': faqs };
  }

  // FAQ質問リストを作成
  const faqList = faqs.map((faq) => {
    const jaTranslation = faq.faq_translations.find((t) => t.lang === 'ja');
    return {
      faq_key: faq.faq_key,
      question: jaTranslation?.question || faq.faq_key,
      keywords: faq.keywords || [],
    };
  });

  // カテゴリ数を計算（各カテゴリが13件以下になるように）
  const maxCategories = Math.min(MAX_QUICK_REPLY_ITEMS, Math.ceil(faqs.length / 6));
  const minCategories = Math.ceil(faqs.length / MAX_QUICK_REPLY_ITEMS);
  const targetCategories = Math.max(minCategories, Math.min(maxCategories, Math.ceil(faqs.length / 8)));

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `あなたはLINEチャットボットのサポートFAQを分類するエキスパートです。

以下の条件でFAQを中カテゴリに分類してください：
- カテゴリ数: ${targetCategories}個程度（${minCategories}〜${maxCategories}個の範囲）
- 各カテゴリのFAQ数: 最大${MAX_QUICK_REPLY_ITEMS}件以下
- カテゴリ名: 短く分かりやすい日本語（8文字以内推奨）
- 全てのFAQを必ずいずれかのカテゴリに分類すること
- ユーザーが直感的に選べるカテゴリ名にすること

出力JSON形式:
{
  "categories": [
    { "faq_key": "FAQ識別キー", "category": "カテゴリ名" }
  ]
}`,
      },
      {
        role: 'user',
        content: `${serviceLabel}サービスの以下のFAQを分類してください:\n\n${JSON.stringify(faqList, null, 2)}`,
      },
    ],
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  const categories: CategoryResult[] = result.categories || [];

  // カテゴリ別にFAQをグループ化
  const grouped: Record<string, FaqWithTranslations[]> = {};

  for (const cat of categories) {
    const faq = faqs.find((f) => f.faq_key === cat.faq_key);
    if (!faq) continue;

    if (!grouped[cat.category]) {
      grouped[cat.category] = [];
    }
    grouped[cat.category].push(faq);
  }

  // AIが分類し損ねたFAQを「その他」に振り分け
  const classifiedKeys = new Set(categories.map((c) => c.faq_key));
  const unclassified = faqs.filter((f) => !classifiedKeys.has(f.faq_key));
  if (unclassified.length > 0) {
    if (!grouped['その他']) {
      grouped['その他'] = [];
    }
    grouped['その他'].push(...unclassified);
  }

  return grouped;
}

// --- レイアウト定数 ---
const CAT_COL_WIDTH = 350;  // カテゴリ列の幅
const SVC_GAP = 300;        // サービス間の間隔
const ROW_GAP = 100;        // 行間の間隔
const FAQ_NODE_HEIGHT = 90; // FAQ回答+終了ノードの高さ

/**
 * POST /api/dashboard/flows/generate-template
 * FAQデータからフローテンプレートを自動生成（AI中カテゴリ分類版）
 */
export async function POST(request: NextRequest) {
  try {
    // FAQ全件取得（翻訳含む）
    const { data: faqs, error } = await supabase
      .from('faqs')
      .select(`
        id,
        service,
        faq_key,
        keywords,
        priority,
        faq_translations (
          lang,
          question,
          answer
        )
      `)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const allFaqs = (faqs || []) as FaqWithTranslations[];

    // サービス別にFAQを分類
    const faqsByService: Record<string, FaqWithTranslations[]> = {};
    for (const svc of SERVICES) {
      faqsByService[svc] = allFaqs.filter((f) => f.service === svc);
    }

    // サービス別にAIカテゴリ分類を実行（並列）
    const categoryResults: Record<string, Record<string, FaqWithTranslations[]>> = {};
    await Promise.all(
      SERVICES.map(async (svc) => {
        const svcFaqs = faqsByService[svc];
        if (svcFaqs.length > 0) {
          categoryResults[svc] = await categorizeFaqs(svcFaqs, SERVICE_LABELS[svc]);
        } else {
          categoryResults[svc] = {};
        }
      })
    );

    // --- 各サービスの幅を事前計算 ---
    const serviceWidths: Record<string, number> = {};
    for (const svc of SERVICES) {
      const catCount = Math.max(1, Object.keys(categoryResults[svc]).length);
      serviceWidths[svc] = catCount * CAT_COL_WIDTH;
    }

    // サービスのx位置を計算（中央揃え、重ならないように）
    const totalWidth = SERVICES.reduce((sum, svc) => sum + serviceWidths[svc], 0)
      + (SERVICES.length - 1) * SVC_GAP;
    let currentX = -totalWidth / 2;
    const serviceCenterX: Record<string, number> = {};
    for (const svc of SERVICES) {
      serviceCenterX[svc] = currentX + serviceWidths[svc] / 2;
      currentX += serviceWidths[svc] + SVC_GAP;
    }

    // 共通ノードのx位置（全体の中央）
    const centerX = 0;

    // ノードとエッジを生成
    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeCounter = 0;
    const makeId = (prefix: string) => `${prefix}-${++nodeCounter}`;

    // Y座標管理
    let y = 0;

    // --- Row 0: Trigger ---
    const triggerId = 'trigger-1';
    nodes.push({
      id: triggerId,
      type: 'default',
      position: { x: centerX, y },
      data: {
        label: '開始 (Trigger)',
        nodeType: 'trigger',
        config: {},
      },
    });

    // --- Row 1: Greeting message ---
    y += ROW_GAP;
    const greetingId = makeId('send_message');
    nodes.push({
      id: greetingId,
      type: 'default',
      position: { x: centerX, y },
      data: {
        label: '挨拶メッセージ',
        nodeType: 'send_message',
        config: {
          messageType: 'text',
          content: 'こんにちは！サポートへようこそ。\nどのサービスについてお困りですか？',
        },
      },
    });
    edges.push({
      id: `edge-${triggerId}-${greetingId}`,
      source: triggerId,
      target: greetingId,
    });

    // --- Row 2: Service selection (quick_reply) ---
    y += ROW_GAP;
    const serviceSelectId = makeId('quick_reply');
    nodes.push({
      id: serviceSelectId,
      type: 'default',
      position: { x: centerX, y },
      data: {
        label: 'サービス選択',
        nodeType: 'quick_reply',
        config: {
          message: '以下からサービスを選んでください',
        },
      },
    });
    edges.push({
      id: `edge-${greetingId}-${serviceSelectId}`,
      source: greetingId,
      target: serviceSelectId,
    });

    // --- Row 3: Service guide messages ---
    const svcGuideY = y + ROW_GAP;

    // カテゴリ統計情報
    const categoryStats: Record<string, Record<string, number>> = {};

    SERVICES.forEach((svc, svcIndex) => {
      const svcX = serviceCenterX[svc];
      const svcFaqs = faqsByService[svc];
      const svcLabel = SERVICE_LABELS[svc];
      const categories = categoryResults[svc];
      const categoryNames = Object.keys(categories);

      categoryStats[svc] = {};
      for (const [catName, catFaqs] of Object.entries(categories)) {
        categoryStats[svc][catName] = catFaqs.length;
      }

      // Service guide message
      const guideId = makeId('send_message');
      nodes.push({
        id: guideId,
        type: 'default',
        position: { x: svcX, y: svcGuideY },
        data: {
          label: `${svcLabel} ガイド`,
          nodeType: 'send_message',
          config: {
            messageType: 'text',
            content: categoryNames.length > 1
              ? `${svcLabel}についてですね。\nどのカテゴリについてお困りですか？`
              : `${svcLabel}についてですね。\n以下のよくある質問から選んでください。`,
          },
        },
      });

      // Edge: service selection → guide
      edges.push({
        id: `edge-${serviceSelectId}-${guideId}`,
        source: serviceSelectId,
        target: guideId,
        label: svcLabel,
        order: svcIndex,
      });

      if (svcFaqs.length === 0) {
        // FAQがない場合はendノードへ
        const endId = makeId('end');
        nodes.push({
          id: endId,
          type: 'default',
          position: { x: svcX, y: svcGuideY + ROW_GAP },
          data: {
            label: '終了',
            nodeType: 'end',
            config: {},
          },
        });
        edges.push({
          id: `edge-${guideId}-${endId}`,
          source: guideId,
          target: endId,
        });
        return;
      }

      // カテゴリが1つだけの場合（13件以下）→ 直接FAQ選択へ
      if (categoryNames.length <= 1) {
        const catFaqs = categories[categoryNames[0]] || svcFaqs;
        const faqSelectY = svcGuideY + ROW_GAP;
        const faqSelectId = makeId('quick_reply');
        nodes.push({
          id: faqSelectId,
          type: 'default',
          position: { x: svcX, y: faqSelectY },
          data: {
            label: `${svcLabel} FAQ選択`,
            nodeType: 'quick_reply',
            config: {
              message: '知りたい内容を選んでください',
            },
          },
        });
        edges.push({
          id: `edge-${guideId}-${faqSelectId}`,
          source: guideId,
          target: faqSelectId,
        });

        // FAQ回答ノード生成（縦に積む）
        generateFaqAnswerNodes(
          catFaqs, faqSelectId, svcX, faqSelectY + ROW_GAP,
          nodes, edges, makeId
        );
        return;
      }

      // --- 複数カテゴリの場合 ---

      // カテゴリ選択 (quick_reply)
      const catSelectY = svcGuideY + ROW_GAP;
      const catSelectId = makeId('quick_reply');
      nodes.push({
        id: catSelectId,
        type: 'default',
        position: { x: svcX, y: catSelectY },
        data: {
          label: `${svcLabel} カテゴリ選択`,
          nodeType: 'quick_reply',
          config: {
            message: 'どのカテゴリについてお困りですか？',
          },
        },
      });
      edges.push({
        id: `edge-${guideId}-${catSelectId}`,
        source: guideId,
        target: catSelectId,
      });

      // 各カテゴリの分岐
      // カテゴリ列のx位置を計算（サービスの範囲内で均等配置）
      const catCount = categoryNames.length;
      const svcWidth = serviceWidths[svc];
      const catStartX = svcX - svcWidth / 2 + CAT_COL_WIDTH / 2;

      categoryNames.forEach((catName, catIndex) => {
        const catFaqs = categories[catName];
        const catX = catStartX + catIndex * CAT_COL_WIDTH;

        // カテゴリガイドメッセージ
        const catGuideY = catSelectY + ROW_GAP;
        const catGuideId = makeId('send_message');
        nodes.push({
          id: catGuideId,
          type: 'default',
          position: { x: catX, y: catGuideY },
          data: {
            label: `${catName}`,
            nodeType: 'send_message',
            config: {
              messageType: 'text',
              content: `「${catName}」に関する質問です。\n以下から選んでください。`,
            },
          },
        });

        // Edge: category selection → category guide
        edges.push({
          id: `edge-${catSelectId}-${catGuideId}`,
          source: catSelectId,
          target: catGuideId,
          label: catName,
          order: catIndex,
        });

        // カテゴリ別FAQ選択 (quick_reply)
        const faqSelectY = catGuideY + ROW_GAP;
        const faqSelectId = makeId('quick_reply');
        nodes.push({
          id: faqSelectId,
          type: 'default',
          position: { x: catX, y: faqSelectY },
          data: {
            label: `${catName} FAQ選択`,
            nodeType: 'quick_reply',
            config: {
              message: '知りたい内容を選んでください',
            },
          },
        });
        edges.push({
          id: `edge-${catGuideId}-${faqSelectId}`,
          source: catGuideId,
          target: faqSelectId,
        });

        // FAQ回答ノード生成（縦に積む）
        generateFaqAnswerNodes(
          catFaqs, faqSelectId, catX, faqSelectY + ROW_GAP,
          nodes, edges, makeId
        );
      });
    });

    return NextResponse.json({
      success: true,
      nodes,
      edges,
      stats: {
        totalFaqs: allFaqs.length,
        byService: Object.fromEntries(
          SERVICES.map((svc) => [svc, faqsByService[svc].length])
        ),
        categories: categoryStats,
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * FAQ回答ノードとエッジを生成するヘルパー
 * ノードは縦に積む（横に広げない）
 */
function generateFaqAnswerNodes(
  faqs: FaqWithTranslations[],
  parentSelectId: string,
  baseX: number,
  baseY: number,
  nodes: any[],
  edges: any[],
  makeId: (prefix: string) => string
) {
  faqs.forEach((faq, faqIndex) => {
    const jaTranslation = faq.faq_translations.find((t) => t.lang === 'ja');
    const question = jaTranslation?.question || faq.faq_key;
    const answer = jaTranslation?.answer || '回答が設定されていません';

    // Build multilingual content from translations
    const contentObj: Record<string, string> = {};
    const questionLabels: Record<string, string> = {};
    faq.faq_translations.forEach((t) => {
      contentObj[t.lang] = t.answer;
      questionLabels[t.lang] = t.question;
    });

    // FAQ answer node (send_message) — 縦に積む
    const answerId = makeId('send_message');
    const faqY = baseY + faqIndex * FAQ_NODE_HEIGHT;

    nodes.push({
      id: answerId,
      type: 'default',
      position: { x: baseX, y: faqY },
      data: {
        label: question.length > 20 ? question.substring(0, 20) + '...' : question,
        nodeType: 'send_message',
        config: {
          messageType: 'text',
          content: Object.keys(contentObj).length > 1 ? contentObj : answer,
        },
      },
    });

    // Edge: FAQ selection → answer
    edges.push({
      id: `edge-${parentSelectId}-${answerId}`,
      source: parentSelectId,
      target: answerId,
      label: question,
      labels: Object.keys(questionLabels).length > 1 ? questionLabels : undefined,
      order: faqIndex,
    });

    // End node for each FAQ（回答ノードの直下）
    const endId = makeId('end');
    nodes.push({
      id: endId,
      type: 'default',
      position: { x: baseX, y: faqY + FAQ_NODE_HEIGHT / 2 },
      data: {
        label: '終了',
        nodeType: 'end',
        config: {},
      },
    });
    edges.push({
      id: `edge-${answerId}-${endId}`,
      source: answerId,
      target: endId,
    });
  });
}
