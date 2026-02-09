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

    // メッセージ内の変数を展開
    let message = expandVariables(config.message, context);

    // URL処理（LIFF外部ブラウザリダイレクト + トラッキングパラメータ付与）
    const sourceType = (context.variables?.urlSourceType as UrlSourceType) || 'flow';
    message = await processUrlsInText(message, context.userId, sourceType);

    // クイックリプライアイテムを作成
    const quickReplyItems = outgoingEdges.map((edge) => ({
      type: 'action' as const,
      action: {
        type: 'message' as const,
        label: edge.label || edge.target,  // エッジのラベルをボタンテキストとして使用
        text: edge.label || edge.target,   // ユーザーが選択したときに送信されるテキスト
      },
    }));

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

  // ユーザーのメッセージとエッジのラベルが完全一致するものを探す
  const matchedEdge = outgoingEdges.find(
    (edge) => edge.label === userMessage
  );

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
