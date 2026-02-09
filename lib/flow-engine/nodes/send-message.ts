// =====================================================
// Send Message Node Handler
// メッセージ送信ノード
// =====================================================

import {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
  SendMessageConfig,
} from '../types';
import { FlowNode, FlowEdge } from '@/lib/database/flow-queries';
import { expandVariables, createTextMessage } from '../utils';
import { processUrlsInText, UrlSourceType } from '@/lib/tracking/url-processor';

/**
 * send_message ノードハンドラー
 * ユーザーにメッセージを送信する
 */
export class SendMessageHandler implements NodeHandler {
  constructor(private edges: FlowEdge[]) {}

  async execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = node.data.config as SendMessageConfig;

      // 多言語対応: contentがオブジェクトの場合はユーザー言語のテキストを取得
      const rawContent = config.content
        ? (typeof config.content === 'object'
          ? ((config.content as Record<string, string>)[context.lang] || (config.content as Record<string, string>).ja || Object.values(config.content)[0])
          : config.content)
        : '';

      if (!rawContent) {
        return {
          success: false,
          error: 'Message content is required',
        };
      }

      // 変数展開
      let expandedContent = expandVariables(String(rawContent), context);

      // URL処理（LIFF外部ブラウザリダイレクト + トラッキングパラメータ付与）
      const sourceType = (context.variables?.urlSourceType as UrlSourceType) || 'flow';
      expandedContent = await processUrlsInText(expandedContent, context.userId, sourceType);

      // メッセージオブジェクトを作成
      let message: any;

      switch (config.messageType) {
        case 'text':
          message = createTextMessage(expandedContent, config.quickReply);
          break;

        case 'flex':
          // Flex Message の場合は content が JSON 文字列であることを期待
          try {
            const flexContent = JSON.parse(expandedContent);
            message = {
              type: 'flex',
              altText: 'メッセージ',
              contents: flexContent,
            };
          } catch (e) {
            console.error('Invalid flex message JSON:', e);
            message = createTextMessage(expandedContent);
          }
          break;

        case 'template':
          // Template Message の場合も JSON 文字列
          try {
            const templateContent = JSON.parse(expandedContent);
            message = {
              type: 'template',
              altText: 'メッセージ',
              template: templateContent,
            };
          } catch (e) {
            console.error('Invalid template message JSON:', e);
            message = createTextMessage(expandedContent);
          }
          break;

        default:
          message = createTextMessage(expandedContent);
      }

      // 次のノードを探す
      const nextEdge = this.edges.find((e) => e.source === node.id);
      const nextNodeId = nextEdge?.target;

      return {
        success: true,
        nextNodeId,
        responseMessages: [message],
      };
    } catch (error) {
      console.error('SendMessageHandler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
