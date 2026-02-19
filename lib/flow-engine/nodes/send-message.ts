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
          message = createTextMessage(expandedContent);
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

      // クイックリプライが設定されている場合、メッセージに付与
      if (config.quickReply?.items && config.quickReply.items.length > 0) {
        message.quickReply = {
          items: config.quickReply.items
            .filter((item) => item.action?.label)
            .map((item) => ({
              type: 'action',
              action: {
                type: item.action.type || 'message',
                label: item.action.label.length > 20 ? item.action.label.slice(0, 20) : item.action.label,
                ...(item.action.type === 'postback'
                  ? { data: item.action.data || item.action.text || item.action.label }
                  : { text: item.action.text || item.action.label }),
              },
            })),
        };
      }

      // 次のノードを探す
      const nextEdge = this.edges.find((e) => e.source === node.id);
      const nextNodeId = nextEdge?.target;

      // delayAfter が設定されている場合、変数経由でexecutorに伝達
      const delayAfter = config.delayAfter;
      const variables = delayAfter && delayAfter > 0
        ? { _delayAfterSeconds: Math.min(delayAfter, 30) }
        : undefined;

      return {
        success: true,
        nextNodeId,
        responseMessages: [message],
        variables,
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
