// =====================================================
// Flow Execution Engine
// フロー実行エンジン
// =====================================================

import { FlowNode, FlowEdge, getFlowById } from '@/lib/database/flow-queries';
import {
  ExecutionContext,
  FlowExecutionResult,
  NodeExecutionResult,
  NodeHandler,
} from './types';
import {
  createFlowExecution,
  updateFlowExecution,
} from '@/lib/database/flow-queries';

// Node Handlers
import { SendMessageHandler } from './nodes/send-message';
import { WaitUserInputHandler } from './nodes/wait-user-input';
import { FAQSearchHandler } from './nodes/faq-search';
import { QuickReplyHandler, resolveQuickReplyChoice } from './nodes/quick-reply';

/**
 * フロー実行エンジン
 */
export class FlowExecutor {
  private maxIterations = 50;  // 無限ループ防止

  /**
   * フローを実行
   * @param resumeFromNodeId 指定された場合、このノードから実行を再開（quick_reply等の入力待ちからの再開時に使用）
   */
  async execute(
    flowId: string,
    userId: string,
    userMessage: string,
    initialContext?: Partial<ExecutionContext>,
    resumeFromNodeId?: string
  ): Promise<FlowExecutionResult> {
    console.log('🚀 フロー実行開始:', { flowId, userId, resumeFromNodeId });

    try {
      // フロー定義を取得
      const flow = await getFlowById(flowId);
      if (!flow) {
        return {
          success: false,
          handled: false,
          error: `Flow not found: ${flowId}`,
        };
      }

      // 実行履歴を記録
      const executionId = await createFlowExecution(flowId, userId);

      // 実行コンテキストを初期化
      // flowDefinition.variablesからurlSourceTypeなどの設定を取得
      const flowVariables = flow.flowDefinition.variables || {};
      const context: ExecutionContext = {
        userId,
        userMessage,
        lang: initialContext?.lang || 'ja',
        service: initialContext?.service,
        variables: { ...flowVariables, ...(initialContext?.variables || {}) },
        conversationHistory: initialContext?.conversationHistory || [],
        ...initialContext,
      };

      // 開始ノードを決定
      let startNodeId: string | undefined;

      if (resumeFromNodeId) {
        // quick_reply等から再開する場合
        const resumeNode = flow.flowDefinition.nodes.find(
          (node) => node.id === resumeFromNodeId
        );

        if (!resumeNode) {
          return {
            success: false,
            handled: false,
            error: `Resume node not found: ${resumeFromNodeId}`,
          };
        }

        // quick_replyノードから再開する場合、ユーザーの選択に基づいて次のノードを決定
        if (resumeNode.type === 'quick_reply') {
          const nextNodeId = resolveQuickReplyChoice(
            resumeNode,
            userMessage,
            flow.flowDefinition.edges
          );

          if (!nextNodeId) {
            return {
              success: false,
              handled: false,
              error: 'No matching choice found for quick_reply',
            };
          }

          startNodeId = nextNodeId;
        } else {
          startNodeId = resumeFromNodeId;
        }
      } else {
        // 通常の開始（triggerノードから）
        const startNode = flow.flowDefinition.nodes.find(
          (node) => node.type === 'trigger'
        );

        if (!startNode) {
          return {
            success: false,
            handled: false,
            error: 'No trigger node found in flow',
          };
        }

        startNodeId = startNode.id;
      }

      // ノード実行ループ
      let currentNodeId: string | undefined = startNodeId;
      let iteration = 0;
      const allResponseMessages: any[] = [];
      const executionLog: any[] = [];

      while (currentNodeId && iteration < this.maxIterations) {
        iteration++;

        // 現在のノードを取得
        const currentNode = flow.flowDefinition.nodes.find(
          (node) => node.id === currentNodeId
        );

        if (!currentNode) {
          console.error('ノードが見つかりません:', currentNodeId);
          break;
        }

        console.log(`📍 ノード実行: ${currentNode.type} (${currentNode.id})`);

        // ノードを実行
        const result = await this.executeNode(
          currentNode,
          flow.flowDefinition.edges,
          context
        );

        // 実行ログに記録
        executionLog.push({
          nodeId: currentNode.id,
          nodeType: currentNode.type,
          timestamp: new Date().toISOString(),
          input: { userMessage, variables: context.variables },
          output: result,
        });

        // 変数を更新
        if (result.variables) {
          context.variables = {
            ...context.variables,
            ...result.variables,
          };
        }

        // レスポンスメッセージを収集
        if (result.responseMessages) {
          allResponseMessages.push(...result.responseMessages);
        }

        // エラーチェック
        if (!result.success) {
          console.error('ノード実行エラー:', result.error);
          await updateFlowExecution(executionId, {
            status: 'failed',
            currentNodeId: currentNode.id,
            executionLog,
            errorMessage: result.error,
          });

          return {
            success: false,
            handled: false,
            error: result.error,
          };
        }

        // 入力待ちチェック
        if (result.shouldWaitForInput) {
          console.log('⏸️  ユーザー入力待ち');
          await updateFlowExecution(executionId, {
            status: 'running',
            currentNodeId: currentNode.id,
            executionLog,
          });

          return {
            success: true,
            handled: true,
            shouldWaitForInput: true,
            waitNodeId: currentNode.id,
            responseMessages: allResponseMessages,
            variables: context.variables,
          };
        }

        // 次のノードへ進む
        currentNodeId = result.nextNodeId;

        // 終了ノードに到達
        if (currentNode.type === 'end' || !currentNodeId) {
          console.log('✅ フロー実行完了');
          await updateFlowExecution(executionId, {
            status: 'completed',
            currentNodeId: currentNode.id,
            executionLog,
          });

          return {
            success: true,
            handled: true,
            responseMessages: allResponseMessages,
            finalNodeId: currentNode.id,
          };
        }
      }

      // 最大反復回数に到達
      if (iteration >= this.maxIterations) {
        console.error('⚠️  最大反復回数に到達（無限ループ防止）');
        await updateFlowExecution(executionId, {
          status: 'failed',
          executionLog,
          errorMessage: 'Maximum iterations reached',
        });

        return {
          success: false,
          handled: false,
          error: 'Maximum iterations reached (possible infinite loop)',
        };
      }

      // 正常終了
      await updateFlowExecution(executionId, {
        status: 'completed',
        executionLog,
      });

      return {
        success: true,
        handled: true,
        responseMessages: allResponseMessages,
      };
    } catch (error) {
      console.error('❌ フロー実行エラー:', error);
      return {
        success: false,
        handled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ノードを実行
   */
  private async executeNode(
    node: FlowNode,
    edges: FlowEdge[],
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    // ノードタイプに応じたハンドラーを取得
    const handler = this.getNodeHandler(node.type, edges);

    if (!handler) {
      return {
        success: false,
        error: `Unsupported node type: ${node.type}`,
      };
    }

    // ハンドラーを実行
    return await handler.execute(node, context);
  }

  /**
   * ノードハンドラーを取得
   */
  private getNodeHandler(
    nodeType: string,
    edges: FlowEdge[]
  ): NodeHandler | null {
    switch (nodeType) {
      case 'trigger':
        // トリガーノードは何もしない（開始点として機能）
        return {
          execute: async (node: FlowNode) => {
            const nextEdge = edges.find((e) => e.source === node.id);
            return {
              success: true,
              nextNodeId: nextEdge?.target,
            };
          },
        };

      case 'send_message':
        return new SendMessageHandler(edges);

      case 'quick_reply':
        return new QuickReplyHandler(edges);

      case 'wait_user_input':
        return new WaitUserInputHandler();

      case 'faq_search':
        return new FAQSearchHandler();

      case 'end':
        // 終了ノードは何もしない
        return {
          execute: async () => {
            return {
              success: true,
            };
          },
        };

      default:
        console.warn('Unsupported node type:', nodeType);
        return null;
    }
  }
}

// シングルトンインスタンス
export const flowExecutor = new FlowExecutor();
