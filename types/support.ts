// =====================================================
// Support Types for Customer Support AI
// =====================================================

/**
 * サポートチケットの種別
 */
export type TicketType = 'feedback' | 'bug';

/**
 * サービス種別
 */
export type ServiceType = 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN';

/**
 * チケットステータス
 */
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

/**
 * 既知問題のステータス
 */
export type IssueStatus = 'investigating' | 'resolved' | 'wontfix';

/**
 * サポートモードのステップ
 */
export type SupportStep =
  | 'select_type'           // ご意見 or 不具合報告 選択
  | 'select_service'        // サービス選択（不具合報告時）
  | 'describe_issue'        // 詳細入力
  | 'describe_other_issue'  // 「その他」選択後の詳細入力（FAQ検索→エスカレーション）
  | 'confirm'               // 確認
  | 'complete';             // 完了

/**
 * 確認待ちの状態（イエスドリ用）
 */
export interface PendingConfirmation {
  type: string;           // 確認の種類 (e.g., 'withdraw', 'cancel', 'change_email')
  question: string;       // ユーザーに表示した確認質問
  faqAnswer?: string;     // 「はい」の場合に返すFAQの回答
}

/**
 * クイックリプライ選択待ちの状態
 */
export interface PendingQuickReply {
  type: 'ambiguous' | 'faq_confirm' | 'faq_candidates';  // ambiguous: 曖昧パターン, faq_confirm: FAQ確認, faq_candidates: FAQ複数候補
  choices: Array<{
    label: string;
    faqId: string;
    response?: string;  // faq_candidates用: 各候補の回答
  }>;
  // faq_confirm用: 確認対象のFAQ情報
  confirmFaq?: {
    faqId: string;
    response: string;
  };
}

/**
 * サポートモードの状態
 */
export interface SupportModeState {
  step: SupportStep;
  ticketType?: TicketType;
  service?: ServiceType;
  description?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  pendingConfirmation?: PendingConfirmation;
  pendingQuickReply?: PendingQuickReply;
  currentCategoryId?: string;  // ファネルフロー用: 現在選択中のカテゴリーID
  pendingMessage?: string;     // サービス選択待ち時に保存するメッセージ
}

/**
 * チケット優先度
 */
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * メッセージロール
 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'operator';

/**
 * サポートチケット
 */
export interface SupportTicket {
  id: string;
  userId: string;
  ticketType: TicketType;
  service: ServiceType | null;
  content: string;
  aiSummary: string | null;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  // 拡張フィールド
  escalatedAt?: Date | null;
  escalationReason?: string | null;
  priority?: TicketPriority;
  userDisplayName?: string | null;
  userLang?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown>;
  humanTakeover?: boolean;
  humanTakeoverAt?: Date | null;
  humanOperatorName?: string | null;
}

/**
 * サポートメッセージ
 */
export interface SupportMessage {
  id: string;
  ticketId: string;
  role: MessageRole;
  content: string;
  senderName?: string | null;
  createdAt: Date;
}

/**
 * DBから取得したサポートメッセージ（snake_case）
 */
export interface SupportMessageRow {
  id: string;
  ticket_id: string;
  role: MessageRole;
  content: string;
  sender_name: string | null;
  created_at: string;
}

/**
 * 既知の不具合
 */
export interface KnownIssue {
  id: string;
  service: ServiceType;
  title: string;
  description: string | null;
  keywords: string[];
  status: IssueStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * サポート統計
 */
export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  feedbackCount: number;
  bugCount: number;
  todayTickets: number;
  knownIssuesCount: number;
}

/**
 * DBから取得したサポートチケット（snake_case）
 */
export interface SupportTicketRow {
  id: string;
  user_id: string;
  ticket_type: TicketType;
  service: ServiceType | null;
  content: string;
  ai_summary: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  // 拡張フィールド
  escalated_at?: string | null;
  escalation_reason?: string | null;
  priority?: TicketPriority;
  user_display_name?: string | null;
  user_lang?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown>;
  human_takeover?: boolean;
  human_takeover_at?: string | null;
  human_operator_name?: string | null;
}

/**
 * DBから取得した既知の不具合（snake_case）
 */
export interface KnownIssueRow {
  id: string;
  service: ServiceType;
  title: string;
  description: string | null;
  keywords: string[] | null;
  status: IssueStatus;
  created_at: string;
  resolved_at: string | null;
}

/**
 * サポートチケット作成パラメータ
 */
export interface CreateTicketParams {
  userId: string;
  ticketType: TicketType;
  service?: ServiceType;
  content: string;
  aiSummary?: string;
}

/**
 * 既知問題検索パラメータ
 */
export interface SearchKnownIssuesParams {
  service?: ServiceType;
  keyword?: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * SupportTicketRow を SupportTicket に変換
 */
export function toSupportTicket(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    ticketType: row.ticket_type,
    service: row.service,
    content: row.content,
    aiSummary: row.ai_summary,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    // 拡張フィールド
    escalatedAt: row.escalated_at ? new Date(row.escalated_at) : null,
    escalationReason: row.escalation_reason,
    priority: row.priority,
    userDisplayName: row.user_display_name,
    userLang: row.user_lang,
    category: row.category,
    metadata: row.metadata,
    humanTakeover: row.human_takeover,
    humanTakeoverAt: row.human_takeover_at ? new Date(row.human_takeover_at) : null,
    humanOperatorName: row.human_operator_name,
  };
}

/**
 * SupportMessageRow を SupportMessage に変換
 */
export function toSupportMessage(row: SupportMessageRow): SupportMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    role: row.role,
    content: row.content,
    senderName: row.sender_name,
    createdAt: new Date(row.created_at),
  };
}

/**
 * KnownIssueRow を KnownIssue に変換
 */
export function toKnownIssue(row: KnownIssueRow): KnownIssue {
  return {
    id: row.id,
    service: row.service,
    title: row.title,
    description: row.description,
    keywords: row.keywords || [],
    status: row.status,
    createdAt: new Date(row.created_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
  };
}

/**
 * サービス名を日本語に変換
 */
export function getServiceDisplayName(service: ServiceType): string {
  const names: Record<ServiceType, string> = {
    YOLO_HOME: 'YOLO HOME',
    YOLO_DISCOVER: 'YOLO DISCOVER',
    YOLO_JAPAN: 'YOLO JAPAN（求人サイト）',
  };
  return names[service];
}

/**
 * チケット種別を日本語に変換
 */
export function getTicketTypeDisplayName(type: TicketType, lang: string = 'ja'): string {
  if (lang === 'ja') {
    return type === 'feedback' ? 'ご意見・ご要望' : '不具合報告';
  }
  return type === 'feedback' ? 'Feedback' : 'Bug Report';
}
