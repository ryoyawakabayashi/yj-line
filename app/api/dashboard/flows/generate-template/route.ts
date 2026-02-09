import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

const SERVICES = ['YOLO_JAPAN', 'YOLO_DISCOVER', 'YOLO_HOME'] as const;
const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

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

/**
 * POST /api/dashboard/flows/generate-template
 * FAQデータからフローテンプレートを自動生成
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

    // ノードとエッジを生成
    const nodes: any[] = [];
    const edges: any[] = [];

    // レイアウト定数
    const COL_WIDTH = 400;
    const ROW_HEIGHT = 120;
    const FAQ_ROW_HEIGHT = 100;
    const startX = 250;
    let nodeCounter = 0;

    const makeId = (prefix: string) => `${prefix}-${++nodeCounter}`;

    // --- Row 0: Trigger ---
    const triggerId = 'trigger-1';
    nodes.push({
      id: triggerId,
      type: 'default',
      position: { x: startX, y: 0 },
      data: {
        label: '開始 (Trigger)',
        nodeType: 'trigger',
        config: {},
      },
    });

    // --- Row 1: Greeting message ---
    const greetingId = makeId('send_message');
    nodes.push({
      id: greetingId,
      type: 'default',
      position: { x: startX, y: ROW_HEIGHT },
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
    const serviceSelectId = makeId('quick_reply');
    nodes.push({
      id: serviceSelectId,
      type: 'default',
      position: { x: startX, y: ROW_HEIGHT * 2 },
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

    // --- Row 3+: Per-service FAQ branches ---
    const serviceCount = SERVICES.length;
    const totalWidth = (serviceCount - 1) * COL_WIDTH;
    const baseX = startX - totalWidth / 2;

    SERVICES.forEach((svc, svcIndex) => {
      const svcX = baseX + svcIndex * COL_WIDTH;
      const svcFaqs = faqsByService[svc];
      const svcLabel = SERVICE_LABELS[svc];

      // Service guide message
      const guideId = makeId('send_message');
      nodes.push({
        id: guideId,
        type: 'default',
        position: { x: svcX, y: ROW_HEIGHT * 3 },
        data: {
          label: `${svcLabel} ガイド`,
          nodeType: 'send_message',
          config: {
            messageType: 'text',
            content: `${svcLabel}についてですね。\n以下のよくある質問から選んでください。`,
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
          position: { x: svcX, y: ROW_HEIGHT * 4 },
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

      // FAQ selection (quick_reply)
      const faqSelectId = makeId('quick_reply');
      nodes.push({
        id: faqSelectId,
        type: 'default',
        position: { x: svcX, y: ROW_HEIGHT * 4 },
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

      // Per-FAQ answer nodes
      svcFaqs.forEach((faq, faqIndex) => {
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

        // FAQ answer node (send_message)
        const answerId = makeId('send_message');
        const faqY = ROW_HEIGHT * 5 + faqIndex * FAQ_ROW_HEIGHT;

        // Spread FAQ answer nodes horizontally within the service column
        const faqSpread = svcFaqs.length > 1
          ? (faqIndex - (svcFaqs.length - 1) / 2) * 200
          : 0;

        nodes.push({
          id: answerId,
          type: 'default',
          position: { x: svcX + faqSpread, y: faqY },
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
          id: `edge-${faqSelectId}-${answerId}`,
          source: faqSelectId,
          target: answerId,
          label: question,
          labels: Object.keys(questionLabels).length > 1 ? questionLabels : undefined,
          order: faqIndex,
        });

        // End node for each FAQ
        const endId = makeId('end');
        nodes.push({
          id: endId,
          type: 'default',
          position: { x: svcX + faqSpread, y: faqY + FAQ_ROW_HEIGHT },
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
