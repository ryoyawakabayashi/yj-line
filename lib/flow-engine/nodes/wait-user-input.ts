// =====================================================
// Wait User Input Node Handler
// ユーザー入力待機ノード
// =====================================================

import {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
  WaitUserInputConfig,
} from '../types';
import { FlowNode } from '@/lib/database/flow-queries';

/**
 * wait_user_input ノードハンドラー
 * ユーザーからの入力を待つ
 */
export class WaitUserInputHandler implements NodeHandler {
  async execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = node.data.config as WaitUserInputConfig;

      if (!config.variableName) {
        return {
          success: false,
          error: 'variableName is required',
        };
      }

      // ユーザー入力を変数に保存
      const updatedVariables = {
        ...context.variables,
        [config.variableName]: context.userMessage,
      };

      return {
        success: true,
        nextNodeId: config.nextNodeId,
        shouldWaitForInput: false,  // 入力は既に受信済み
        variables: updatedVariables,
      };
    } catch (error) {
      console.error('WaitUserInputHandler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
