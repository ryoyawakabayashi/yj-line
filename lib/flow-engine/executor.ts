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
import { scheduleDelayedPush } from './delayed-push';
import {
  createFlowExecution,
  updateFlowExecution,
} from '@/lib/database/flow-queries';

// Node Handlers
import { SendMessageHandler } from './nodes/send-message';
import { WaitUserInputHandler } from './nodes/wait-user-input';
import { FAQSearchHandler } from './nodes/faq-search';
import { QuickReplyHandler, resolveQuickReplyChoice } from './nodes/quick-reply';
import { CardHandler, resolveCardChoice } from './nodes/card';

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

        // quick_reply / card ノードから再開する場合、ユーザーの選択に基づいて次のノードを決定
        if (resumeNode.type === 'quick_reply' || resumeNode.type === 'card') {
          // 離脱確認の応答を先にチェック
          if (userMessage === '続ける') {
            // 同じノードを再実行 → 元のクイックリプライ/カードを再送
            startNodeId = resumeFromNodeId;
          } else if (userMessage === '終了する') {
            // フロー終了
            console.log('🛑 ユーザーがフローを終了しました');
            return {
              success: true,
              handled: true,
              responseMessages: [{ type: 'text', text: 'フローを終了しました。' }],
              // waitNodeId なし → フロー終了（event.ts側でconversationState がクリアされる）
            };
          } else {
            // 選択肢のマッチングを試行
            let nextNodeId: string | undefined;

            if (resumeNode.type === 'quick_reply') {
              nextNodeId = resolveQuickReplyChoice(
                resumeNode,
                userMessage,
                flow.flowDefinition.edges
              );
            } else {
              const selectedCardId = context.variables?._selectedCardId as string | undefined;
              nextNodeId = resolveCardChoice(
                resumeNode,
                userMessage,
                flow.flowDefinition.edges,
                flow.flowDefinition.nodes,
                selectedCardId
              );
            }

            if (nextNodeId) {
              startNodeId = nextNodeId;
            } else {
              // マッチしない入力 → 離脱確認メッセージを送信
              return {
                success: true,
                handled: true,
                responseMessages: [{
                  type: 'text',
                  text: '選択肢以外が入力されました。\nフローを終了しますか？',
                  quickReply: {
                    items: [
                      { type: 'action', action: { type: 'message', label: '続ける', text: '続ける' } },
                      { type: 'action', action: { type: 'message', label: '終了する', text: '終了する' } },
                    ],
                  },
                }],
                shouldWaitForInput: true,
                waitNodeId: resumeFromNodeId,
                variables: context.variables,
              };
            }
          }
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
      let pendingDelaySec = 0;  // 次のメッセージに適用する遅延秒数

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

        // quick_reply/card の遅延処理: このノード自身にdelayAfterが設定されている場合
        // 溜まったメッセージを先にpushMessageで送信し、このノードのメッセージを遅延送信予約
        if ((currentNode.type === 'quick_reply' || currentNode.type === 'card') && currentNode.data?.config?.delayAfter > 0) {
          const delaySec = Math.min(currentNode.data.config.delayAfter, 30);
          console.log(`⏱️  ${currentNode.type} delay処理: ${delaySec}秒後に送信予約`);
          if (allResponseMessages.length > 0) {
            const { pushMessage } = await import('@/lib/line/client');
            await pushMessage(context.userId, [...allResponseMessages]);
            allResponseMessages.length = 0;
          }
          // このノード自身のdelayと、前のsend_messageからの持ち越しdelayの大きい方を使用
          pendingDelaySec = Math.max(delaySec, pendingDelaySec);
        }

        // カードノードの場合: 兄弟cardを自動マージしてカルーセルを生成
        let nodeToExecute = currentNode;
        if (currentNode.type === 'card') {
          nodeToExecute = this.mergeCardSiblings(
            currentNode,
            flow.flowDefinition.nodes,
            flow.flowDefinition.edges
          );
        }

        // ノードを実行
        const result = await this.executeNode(
          nodeToExecute,
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
          if (pendingDelaySec > 0) {
            // 遅延送信: 別APIリクエストで非同期送信（awaitして確実にリクエストを送る）
            await scheduleDelayedPush(context.userId, result.responseMessages, pendingDelaySec);
            pendingDelaySec = 0;
          } else {
            allResponseMessages.push(...result.responseMessages);
          }
        }

        // send_messageのdelay処理: メッセージを先にpushMessageで送信し、
        // 次のノードのメッセージを遅延送信するようフラグを立てる
        if (currentNode.type === 'send_message' && result.variables?._delayAfterSeconds) {
          const delaySec = result.variables._delayAfterSeconds as number;
          console.log(`⏱️  send_message delay: ${delaySec}秒後に次のメッセージを送信予約`);
          if (allResponseMessages.length > 0) {
            const { pushMessage } = await import('@/lib/line/client');
            await pushMessage(context.userId, [...allResponseMessages]);
            allResponseMessages.length = 0;
          }
          delete context.variables._delayAfterSeconds;
          pendingDelaySec = delaySec;  // 次のノードのメッセージに遅延を適用
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
          // カード + クイックリプライ同時送信: linkedQuickReplyNodeId が設定されている場合
          if (currentNode.type === 'card' && currentNode.data?.config?.linkedQuickReplyNodeId) {
            const linkedQrId = currentNode.data.config.linkedQuickReplyNodeId as string;
            const qrNode = flow.flowDefinition.nodes.find((n) => n.id === linkedQrId);
            if (qrNode && qrNode.type === 'quick_reply') {
              console.log(`🔗 カード + クイックリプライ同時送信: card=${currentNode.id}, qr=${linkedQrId}`);
              const qrHandler = this.getNodeHandler('quick_reply', flow.flowDefinition.edges);
              if (qrHandler) {
                const qrResult = await qrHandler.execute(qrNode, context);
                if (qrResult.responseMessages) {
                  allResponseMessages.push(...qrResult.responseMessages);
                }
              }
              await updateFlowExecution(executionId, {
                status: 'running',
                currentNodeId: linkedQrId,
                executionLog,
              });
              return {
                success: true,
                handled: true,
                shouldWaitForInput: true,
                waitNodeId: linkedQrId,  // QRノードで入力待ち（テキスト入力はQR側で処理）
                responseMessages: allResponseMessages,
                variables: context.variables,
              };
            }
          }

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

      case 'card':
        return new CardHandler(edges);

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

  /**
   * 兄弟cardノードをマージして1つのカルーセルカードノードを生成
   * 親ノードから複数のcardノードが接続されている場合、各cardのcolumns[0]を集約
   */
  private mergeCardSiblings(
    currentCard: FlowNode,
    allNodes: FlowNode[],
    allEdges: FlowEdge[]
  ): FlowNode {
    // この card の親を探す
    const parentEdge = allEdges.find((e) => e.target === currentCard.id);
    if (!parentEdge) return currentCard;

    // 親から出ている全エッジのうち card ノードを取得（order順）
    const siblingCardEdges = allEdges
      .filter((e) => e.source === parentEdge.source)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    const siblingCards = siblingCardEdges
      .map((e) => allNodes.find((n) => n.id === e.target))
      .filter((n): n is FlowNode => !!n && n.type === 'card');

    // 兄弟が1つだけなら元のノードをそのまま返す
    if (siblingCards.length <= 1) return currentCard;

    console.log(`🃏 カルーセルマージ: ${siblingCards.length}枚のカードを統合`);

    // 各兄弟cardのcolumns[0]（または単体カード設定）をカラムとして集約
    const mergedColumns = siblingCards.map((card) => {
      const config = card.data.config || {};
      if (config.columns && config.columns.length > 0) {
        return config.columns[0];
      }
      // 単体カードモードの場合: text/title/imageUrl からカラムを生成
      return {
        title: config.title || '',
        text: config.text || '',
        imageUrl: config.imageUrl || '',
        buttons: [{ label: '', text: '' }],
      };
    });

    // マージしたカードノードを返す（最大10枚）
    return {
      ...currentCard,
      data: {
        ...currentCard.data,
        config: {
          ...currentCard.data.config,
          columns: mergedColumns.slice(0, 10),
          _siblingCardIds: siblingCards.map((c) => c.id), // resolveCardChoice用
        },
      },
    };
  }
}

// シングルトンインスタンス
export const flowExecutor = new FlowExecutor();
