// =====================================================
// Flow Engine Type Definitions
// フロー実行エンジンの型定義
// =====================================================

import { FlowDefinition, FlowNode, FlowEdge } from '@/lib/database/flow-queries';

/**
 * 実行コンテキスト
 * フロー実行中に必要な情報を保持
 */
export interface ExecutionContext {
  userId: string;
  replyToken?: string;
  userMessage: string;
  service?: string;
  lang: string;
  variables: Record<string, any>;
  conversationHistory: Array<{ role: string; content: string }>;
}

/**
 * ノード実行結果
 */
export interface NodeExecutionResult {
  success: boolean;
  nextNodeId?: string;  // 次に実行するノードID
  nextHandle?: string;  // 条件分岐時の出力ハンドル
  error?: string;
  shouldWaitForInput?: boolean;  // ユーザー入力を待つべきか
  variables?: Record<string, any>;  // 更新された変数
  responseMessages?: any[];  // LINEに返信するメッセージ
}

/**
 * フロー実行結果
 */
export interface FlowExecutionResult {
  success: boolean;
  handled: boolean;  // フローで処理できたか
  shouldWaitForInput?: boolean;
  waitNodeId?: string;  // 入力待機中のノードID
  responseMessages?: any[];
  error?: string;
  finalNodeId?: string;
  variables?: Record<string, any>;  // 更新された変数
}

/**
 * ノードハンドラーインターフェース
 */
export interface NodeHandler {
  execute(
    node: FlowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
}

/**
 * send_message ノードの設定
 */
export interface SendMessageConfig {
  messageType: 'text' | 'flex' | 'template';
  content: string | Record<string, string>;  // 変数埋め込み可: {{user.name}} / 多言語対応
  delayAfter?: number;  // 送信後の遅延秒数（1〜30秒）。次のノード実行前に待機する
  quickReply?: {
    items: Array<{
      type: 'action';
      action: {
        type: 'message' | 'postback';
        label: string;
        text?: string;
        data?: string;
      };
    }>;
  };
}

/**
 * wait_user_input ノードの設定
 */
export interface WaitUserInputConfig {
  timeout?: number;  // タイムアウト時間（秒）
  variableName: string;  // ユーザー入力を保存する変数名
  nextNodeId: string;  // 入力受信後に進むノード
}

/**
 * faq_search ノードの設定
 */
export interface FAQSearchConfig {
  service?: string;
  threshold: number;  // スコア閾値（例: 0.7）
  maxResults: number;
  outputHandles: {
    found: string;  // FAQが見つかった場合のノードID
    notFound: string;  // 見つからなかった場合のノードID
    multipleResults?: string;  // 複数候補がある場合のノードID
  };
}

/**
 * condition ノードの設定
 */
export interface ConditionConfig {
  conditions: Array<{
    variable: string;  // 'user.message', 'variables.category' など
    operator: 'contains' | 'equals' | 'regex' | 'gt' | 'lt';
    value: string | number;
    outputHandle: string;  // この条件が真の場合の次のノードID
  }>;
  defaultHandle: string;  // どの条件にも合わない場合のノードID
}

/**
 * escalation ノードの設定
 */
export interface EscalationConfig {
  reason: string;
  priority: 'normal' | 'high' | 'urgent';
  notifySlack: boolean;
  message?: string;  // エスカレーション時のメッセージ
}

/**
 * set_variable ノードの設定
 */
export interface SetVariableConfig {
  variableName: string;
  value: string | number | boolean;  // 変数埋め込み可
  nextNodeId: string;
}

/**
 * quick_reply ノードの設定
 * 複数の接続先エッジをLINEクイックリプライボタンとして表示
 */
export interface QuickReplyConfig {
  message: string | Record<string, string>;  // クイックリプライと一緒に送るメッセージ / 多言語対応
  delayAfter?: number;  // 送信前の遅延秒数（1〜30秒）。前のメッセージ送信後、この秒数待ってから表示
  // エッジのlabelがボタンのテキストになります
  // エッジのtargetが選択後の遷移先ノードIDになります
}

/**
 * カルーセルカラム（1枚分のカード）
 */
export interface CardColumn {
  title?: string | Record<string, string>;    // カードタイトル（任意） / 多言語対応
  text: string | Record<string, string>;      // カード本文（質問テキスト） / 多言語対応
  imageUrl?: string;                           // カード画像URL（任意）
  buttons: Array<{                             // ボタン（最大3つ）
    label: string | Record<string, string>;    // ボタンラベル / 多言語対応
    text: string;                              // ボタン押下時に送信されるテキスト（postback用）
    type?: 'postback' | 'uri';                 // ボタンタイプ（デフォルト: postback）
    url?: string;                              // URI action用のURL
    openExternal?: boolean;                    // 外部ブラウザで開く（LIFFリダイレクト）
  }>;
}

/**
 * card ノードの設定
 * 1枚: LINEボタンテンプレート / 複数枚: LINEカルーセルテンプレート（最大10枚）
 * 本文にQ（質問）を表示し、ボタンを押すとA（回答）が送信される
 */
export interface CardConfig {
  // --- 単体カードモード（エッジをボタンとして使用） ---
  title?: string | Record<string, string>;
  text: string | Record<string, string>;
  imageUrl?: string;
  delayAfter?: number;  // 送信前の遅延秒数（1〜30秒）。前のメッセージ送信後、この秒数待ってから表示
  // --- カルーセルモード（columns配列がある場合はこちらを優先） ---
  columns?: CardColumn[];                      // 複数枚カード（最大10枚）
}
