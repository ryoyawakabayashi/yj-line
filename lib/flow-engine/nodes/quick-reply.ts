// =====================================================
// quick_reply ノードハンドラー
// 複数の接続先エッジをLINEクイックリプライボタンとして表示
// =====================================================

import { FlowNode, FlowEdge } from '@/lib/database/flow-queries';
import {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
  QuickReplyConfig
} from '../types';
import { expandVariables } from '../utils';
import { processUrlsInText, UrlSourceType } from '@/lib/tracking/url-processor';

/**
 * quick_reply ノードハンドラークラス
 */
export class QuickReplyHandler implements NodeHandler {
  constructor(private edges: FlowEdge[]) {}

  async execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.data.config as QuickReplyConfig;

    // このノードから出ているエッジを取得し、order順にソート
    const outgoingEdges = this.edges
      .filter((edge) => edge.source === node.id)
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });

    if (outgoingEdges.length === 0) {
      return {
        success: false,
        error: 'quick_reply ノードには少なくとも1つの接続が必要です',
      };
    }

    // 多言語対応: messageがオブジェクトの場合はユーザー言語のテキストを取得
    const rawMessage = config.message
      ? (typeof config.message === 'object'
        ? ((config.message as Record<string, string>)[context.lang] || (config.message as Record<string, string>).ja || Object.values(config.message)[0])
        : config.message)
      : '';

    // メッセージ内の変数を展開
    let message = expandVariables(String(rawMessage), context);

    // URL処理（LIFF外部ブラウザリダイレクト + トラッキングパラメータ付与）
    const sourceType = (context.variables?.urlSourceType as UrlSourceType) || 'flow';
    message = await processUrlsInText(message, context.userId, sourceType);

    // クイックリプライアイテムを作成（多言語対応）
    const quickReplyItems = outgoingEdges.map((edge) => {
      // 多言語ラベル: edge.labelsがあればユーザー言語のラベルを使用
      const localizedLabel = edge.labels
        ? (edge.labels[context.lang] || edge.labels.ja || edge.label || edge.target)
        : (edge.label || edge.target);

      // 送信テキスト: edge.text/textsがあれば使用、なければラベルと同じ
      const localizedText = edge.texts
        ? (edge.texts[context.lang] || edge.texts.ja || edge.text || localizedLabel)
        : (edge.text || localizedLabel);

      return {
        type: 'action' as const,
        action: {
          type: 'message' as const,
          label: localizedLabel,  // ボタンの表示テキスト
          text: localizedText,    // ユーザーが選択したときに送信されるテキスト
        },
      };
    });

    // LINEメッセージを作成
    const lineMessage = {
      type: 'text',
      text: message,
      quickReply: {
        items: quickReplyItems,
      },
    };

    // ユーザー入力を待つ必要がある
    // 次回のメッセージ受信時に、ユーザーが選択したテキストに基づいて適切なエッジを選択
    return {
      success: true,
      shouldWaitForInput: true,
      responseMessages: [lineMessage],
      // nextNodeIdは設定しない（ユーザー入力待ち）
      // 次回実行時にユーザーのメッセージとエッジのラベルをマッチングして遷移先を決定
    };
  }
}

/**
 * ユーザーの選択に基づいて次のノードIDを決定
 * @param node quick_replyノード
 * @param userMessage ユーザーが選択したテキスト
 * @param edges 全エッジ
 * @returns 次のノードID
 */
export function resolveQuickReplyChoice(
  node: FlowNode,
  userMessage: string,
  edges: FlowEdge[]
): string | undefined {
  const outgoingEdges = edges
    .filter((edge) => edge.source === node.id)
    .sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });

  // ユーザーのメッセージとエッジのtext/label/labelsが一致するものを探す
  const matchedEdge = outgoingEdges.find((edge) => {
    // text フィールド（送信テキスト）で一致
    if (edge.text && edge.text === userMessage) return true;
    // texts（多言語送信テキスト）で一致
    if (edge.texts && Object.values(edge.texts).includes(userMessage)) return true;
    // label で一致
    if (edge.label === userMessage) return true;
    // labels（多言語ラベル）で一致
    if (edge.labels && Object.values(edge.labels).includes(userMessage)) return true;
    return false;
  });

  if (matchedEdge) {
    return matchedEdge.target;
  }

  // 完全一致しない場合、最初のエッジをデフォルトとして使用
  if (outgoingEdges.length > 0) {
    console.warn(
      `quick_reply: ユーザーの選択 "${userMessage}" がどのエッジとも一致しませんでした。最初のエッジを使用します。`
    );
    return outgoingEdges[0].target;
  }

  return undefined;
}
