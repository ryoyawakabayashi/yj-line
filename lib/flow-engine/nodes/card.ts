// =====================================================
// card ノードハンドラー
// 1枚: LINEボタンテンプレート / 複数枚: LINEカルーセルテンプレート（最大10枚）
// 本文にQ（質問）を表示し、ボタンを押すとA（回答）が送信される
// =====================================================

import { FlowNode, FlowEdge } from '@/lib/database/flow-queries';
import {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
  CardConfig,
  CardColumn,
} from '../types';
import { expandVariables } from '../utils';
import { processUrlsInText, UrlSourceType } from '@/lib/tracking/url-processor';

/** 多言語テキストから適切な言語のテキストを取得 */
function localize(
  value: string | Record<string, string> | undefined,
  lang: string
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.ja || Object.values(value)[0] || '';
}

/**
 * card ノードハンドラークラス
 */
export class CardHandler implements NodeHandler {
  constructor(private edges: FlowEdge[]) {}

  async execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.config as CardConfig;
    const sourceType = (context.variables?.urlSourceType as UrlSourceType) || 'flow';

    // --- カルーセルモード（columns がある場合） ---
    if (config.columns && config.columns.length > 0) {
      return this.executeCarousel(node, config.columns, context, sourceType);
    }

    // --- 単体カードモード（エッジをボタンとして使用） ---
    return this.executeSingle(node, config, context, sourceType);
  }

  /** 単体カード: エッジをボタンとして使用 */
  private async executeSingle(
    node: FlowNode,
    config: CardConfig,
    context: ExecutionContext,
    sourceType: UrlSourceType
  ): Promise<NodeExecutionResult> {
    const outgoingEdges = this.edges
      .filter((edge) => edge.source === node.id)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    if (outgoingEdges.length === 0) {
      return { success: false, error: 'card ノードには少なくとも1つの接続が必要です' };
    }

    let text = expandVariables(localize(config.text, context.lang), context);
    let title = config.title ? expandVariables(localize(config.title, context.lang), context) : undefined;
    text = await processUrlsInText(text, context.userId, sourceType);

    const actions = outgoingEdges.slice(0, 4).map((edge) => {
      const label = edge.labels
        ? (edge.labels[context.lang] || edge.labels.ja || edge.label || edge.target)
        : (edge.label || edge.target);
      const sendText = edge.texts
        ? (edge.texts[context.lang] || edge.texts.ja || edge.text || label)
        : (edge.text || label);
      return { type: 'message' as const, label, text: sendText };
    });

    // LINE API制限: titleは40文字、textはtitle/画像ありで60文字、なしで160文字
    if (title && title.length > 40) title = title.slice(0, 39) + '…';
    const hasExtra = !!(title || config.imageUrl);
    const maxTextLen = hasExtra ? 60 : 160;
    if (text.length > maxTextLen) text = text.slice(0, maxTextLen - 1) + '…';

    const template: any = { type: 'buttons', text, actions };
    if (title) template.title = title;
    if (config.imageUrl) {
      template.thumbnailImageUrl = config.imageUrl;
      template.imageAspectRatio = 'rectangle';
      template.imageSize = 'cover';
    }

    return {
      success: true,
      shouldWaitForInput: true,
      responseMessages: [{ type: 'template', altText: title || text, template }],
    };
  }

  /** カルーセル: columns 配列からカルーセルテンプレートを生成 */
  private async executeCarousel(
    node: FlowNode,
    columns: CardColumn[],
    context: ExecutionContext,
    sourceType: UrlSourceType
  ): Promise<NodeExecutionResult> {
    const config = node.data.config as CardConfig & { _siblingCardIds?: string[] };
    const siblingCardIds = config._siblingCardIds;

    // カルーセルは最大10枚（テキストが空のカラムは除外、対応するcardIdも同期）
    const colsWithIds = columns.slice(0, 10).map((col, i) => ({
      col,
      cardId: siblingCardIds?.[i] || node.id,
    })).filter(({ col }) => {
      const text = typeof col.text === 'string' ? col.text : (col.text?.ja || Object.values(col.text || {})[0] || '');
      return text.trim().length > 0;
    });

    const cols = colsWithIds.map(({ col }) => col);
    const cardIds = colsWithIds.map(({ cardId }) => cardId);

    // 全カラムのボタンが空でないか検証
    const hasAnyButtons = cols.some((col) => col.buttons && col.buttons.length > 0);
    if (!hasAnyButtons || cols.length === 0) {
      return { success: false, error: 'カルーセルには少なくとも1つの有効なカードが必要です' };
    }

    // LINE カルーセルは全カラムのアクション数を統一する必要がある
    const maxButtons = Math.min(
      3, // LINEカルーセルの制限
      Math.max(...cols.map((col) => (col.buttons || []).length))
    );

    const carouselColumns = await Promise.all(
      cols.map(async (col, colIndex) => {
        let text = expandVariables(localize(col.text, context.lang), context);
        let title = col.title ? expandVariables(localize(col.title, context.lang), context) : undefined;
        text = await processUrlsInText(text, context.userId, sourceType);

        const cardNodeId = cardIds[colIndex];

        // ボタンアクション（足りない分はダミーで埋める）
        const buttons = (col.buttons || []).slice(0, maxButtons);
        const colText = expandVariables(localize(col.text, context.lang), context);
        const actions = await Promise.all(buttons.map(async (btn) => {
          let label = localize(btn.label, context.lang);
          // LINE APIはlabelが空だとメッセージ全体を拒否するためフォールバック
          if (!label) {
            label = btn.text || colText.slice(0, 20) || '選択';
          }
          // labelは最大20文字
          if (label.length > 20) label = label.slice(0, 20);

          // URIアクション: URLボタン
          if (btn.type === 'uri' && btn.url) {
            let uri = await processUrlsInText(btn.url, context.userId, sourceType);
            return {
              type: 'uri' as const,
              label,
              uri,
            };
          }

          // postbackアクション: cardNodeIdでどのカードのボタンか識別
          const displayText = btn.text || label;
          return {
            type: 'postback' as const,
            label,
            data: `action=card_choice&cardId=${cardNodeId}&text=${encodeURIComponent(displayText)}`,
            displayText,
          };
        }));

        // アクション数を統一（足りない分は最後のボタンを繰り返す）
        while (actions.length < maxButtons && actions.length > 0) {
          actions.push({ ...actions[actions.length - 1] });
        }

        const column: any = { text, actions };
        if (title) column.title = title;
        if (col.imageUrl) {
          column.thumbnailImageUrl = col.imageUrl;
          column.imageAspectRatio = 'rectangle';
          column.imageSize = 'cover';
        }

        return column;
      })
    );

    // タイトルの有無を統一（LINE制限: 全カラムで統一が必要）
    const hasTitle = carouselColumns.some((c) => c.title);
    if (hasTitle) {
      for (const col of carouselColumns) {
        if (!col.title) col.title = ' ';
      }
    }

    // LINE API制限: titleは40文字、textはタイトル/画像ありで60文字、なしで120文字
    for (const col of carouselColumns) {
      if (col.title && col.title.length > 40) col.title = col.title.slice(0, 39) + '…';
      const hasExtra = !!(col.title || col.thumbnailImageUrl);
      const maxTextLen = hasExtra ? 60 : 120;
      if (col.text && col.text.length > maxTextLen) col.text = col.text.slice(0, maxTextLen - 1) + '…';
    }

    const altText = carouselColumns[0]?.title || carouselColumns[0]?.text || 'カード';

    return {
      success: true,
      shouldWaitForInput: true,
      responseMessages: [{
        type: 'template',
        altText,
        template: {
          type: 'carousel',
          columns: carouselColumns,
        },
      }],
    };
  }
}

/**
 * エッジからユーザーメッセージにマッチするものを探すヘルパー
 */
function findMatchingEdge(
  outgoingEdges: FlowEdge[],
  userMessage: string
): FlowEdge | undefined {
  return outgoingEdges.find((edge) => {
    if (edge.text && edge.text === userMessage) return true;
    if (edge.texts && Object.values(edge.texts).includes(userMessage)) return true;
    if (edge.label === userMessage) return true;
    if (edge.labels && Object.values(edge.labels).includes(userMessage)) return true;
    return false;
  });
}

/**
 * ユーザーの選択に基づいて次のノードIDを決定
 * selectedCardId が渡された場合（postback経由）、そのカードのエッジを直接使用
 * allNodes が渡された場合、兄弟cardノードのエッジも検索する
 */
export function resolveCardChoice(
  node: FlowNode,
  userMessage: string,
  edges: FlowEdge[],
  allNodes?: FlowNode[],
  selectedCardId?: string
): string | undefined {
  // --- postback経由: 選択されたカードノードのエッジを直接使用 ---
  if (selectedCardId) {
    const cardEdges = edges
      .filter((e) => e.source === selectedCardId)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (cardEdges.length > 0) {
      console.log(`card: postback経由 cardId=${selectedCardId} → ${cardEdges[0].target}`);
      return cardEdges[0].target;
    }
  }

  // --- このノード自身のエッジでマッチング ---
  const ownEdges = edges
    .filter((edge) => edge.source === node.id)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  const ownMatch = findMatchingEdge(ownEdges, userMessage);
  if (ownMatch) return ownMatch.target;

  // --- 兄弟cardノードのエッジでマッチング ---
  if (allNodes) {
    const parentEdge = edges.find((e) => e.target === node.id);
    if (parentEdge) {
      const siblingCardIds = edges
        .filter((e) => e.source === parentEdge.source && e.target !== node.id)
        .map((e) => e.target)
        .filter((targetId) => {
          const n = allNodes.find((nd) => nd.id === targetId);
          return n?.type === 'card';
        });

      for (const sibId of siblingCardIds) {
        const sibEdges = edges
          .filter((e) => e.source === sibId)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        const sibMatch = findMatchingEdge(sibEdges, userMessage);
        if (sibMatch) return sibMatch.target;
      }
    }
  }

  // --- フォールバック: ボタンtextでのマッチング（カルーセルモード） ---
  const config = node.data.config as CardConfig;
  if (config.columns && config.columns.length > 0) {
    const allButtonTexts = new Set<string>();
    for (const col of config.columns) {
      for (const btn of col.buttons || []) {
        if (btn.text) allButtonTexts.add(btn.text);
      }
    }
    if (allButtonTexts.has(userMessage)) {
      if (ownEdges.length > 0) return ownEdges[0].target;
    }
  }

  // 何もマッチしない → undefined を返して同じノードに留まる
  console.log(
    `card: ユーザーの入力 "${userMessage}" がどのボタンとも一致しませんでした。再入力を促します。`
  );
  return undefined;
}
