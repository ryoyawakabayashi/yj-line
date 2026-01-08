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
  | 'select_type'      // ご意見 or 不具合報告 選択
  | 'select_service'   // サービス選択（不具合報告時）
  | 'describe_issue'   // 詳細入力
  | 'confirm'          // 確認
  | 'complete';        // 完了

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
}

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
