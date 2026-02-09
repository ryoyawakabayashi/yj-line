// =====================================================
// FAQ Search Node Handler
// FAQ検索ノード
// =====================================================

import {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
  FAQSearchConfig,
} from '../types';
import { FlowNode } from '@/lib/database/flow-queries';
import { searchFAQsByKeyword } from '@/lib/database/faq-queries';

/**
 * faq_search ノードハンドラー
 * ユーザーの質問からFAQを検索する
 */
export class FAQSearchHandler implements NodeHandler {
  async execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = node.data.config as FAQSearchConfig;

      // デフォルト値
      const threshold = config.threshold || 0.7;
      const maxResults = config.maxResults || 3;
      const service = config.service || context.service;

      // FAQ検索を実行
      const searchResults = await searchFAQsByKeyword(
        context.userMessage,
        service as 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN' | undefined,
        context.lang
      );

      console.log('📚 FAQ検索結果:', {
        query: context.userMessage,
        resultsCount: searchResults.length,
      });

      // 最大件数でフィルタ
      const filteredResults = searchResults.slice(0, maxResults);

      let nextNodeId: string;
      const updatedVariables = {
        ...context.variables,
        faqResults: filteredResults,
        faqTopResult: filteredResults[0] || null,
      };

      if (filteredResults.length === 0) {
        // FAQが見つからなかった
        nextNodeId = config.outputHandles.notFound;
      } else if (filteredResults.length === 1) {
        // 1件だけ見つかった
        nextNodeId = config.outputHandles.found;
      } else {
        // 複数の候補が見つかった
        nextNodeId = config.outputHandles.multipleResults || config.outputHandles.found;
      }

      return {
        success: true,
        nextNodeId,
        variables: updatedVariables,
      };
    } catch (error) {
      console.error('FAQSearchHandler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
