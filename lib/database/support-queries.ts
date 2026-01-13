// =====================================================
// Support Database Queries
// =====================================================

import { supabase } from './supabase';
import {
  SupportTicket,
  SupportMessage,
  KnownIssue,
  CreateTicketParams,
  SearchKnownIssuesParams,
  ServiceType,
  SupportStats,
  TicketPriority,
  MessageRole,
  toSupportTicket,
  toSupportMessage,
  toKnownIssue,
  SupportTicketRow,
  SupportMessageRow,
  KnownIssueRow,
} from '@/types/support';

/**
 * サポートチケットを作成
 */
export async function createSupportTicket(
  params: CreateTicketParams
): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_support_ticket', {
    p_user_id: params.userId,
    p_ticket_type: params.ticketType,
    p_service: params.service || null,
    p_content: params.content,
    p_ai_summary: params.aiSummary || null,
  });

  if (error) {
    console.error('❌ createSupportTicket エラー:', error);

    // RPCが存在しない場合は直接INSERT
    const { data: insertData, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: params.userId,
        ticket_type: params.ticketType,
        service: params.service || null,
        content: params.content,
        ai_summary: params.aiSummary || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ INSERT fallback エラー:', insertError);
      return null;
    }

    console.log('✅ サポートチケット作成（fallback）:', insertData.id);
    return insertData.id;
  }

  console.log('✅ サポートチケット作成:', data);
  return data as string;
}

/**
 * 既知の問題を検索
 */
export async function searchKnownIssues(
  params: SearchKnownIssuesParams
): Promise<KnownIssue[]> {
  const { data, error } = await supabase.rpc('search_known_issues', {
    p_service: params.service || null,
    p_keyword: params.keyword || null,
  });

  if (error) {
    console.error('❌ searchKnownIssues エラー:', error);

    // RPCが存在しない場合は直接SELECT
    let query = supabase
      .from('known_issues')
      .select('*')
      .neq('status', 'resolved');

    if (params.service) {
      query = query.eq('service', params.service);
    }

    if (params.keyword) {
      query = query.or(
        `title.ilike.%${params.keyword}%,description.ilike.%${params.keyword}%`
      );
    }

    const { data: fallbackData, error: fallbackError } = await query;

    if (fallbackError) {
      console.error('❌ SELECT fallback エラー:', fallbackError);
      return [];
    }

    return (fallbackData as KnownIssueRow[]).map(toKnownIssue);
  }

  return (data as KnownIssueRow[]).map(toKnownIssue);
}

/**
 * サービス別の既知の問題を取得
 */
export async function getKnownIssues(
  service?: ServiceType
): Promise<KnownIssue[]> {
  let query = supabase
    .from('known_issues')
    .select('*')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false });

  if (service) {
    query = query.eq('service', service);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ getKnownIssues エラー:', error);
    return [];
  }

  return (data as KnownIssueRow[]).map(toKnownIssue);
}

/**
 * ユーザーのサポートチケット履歴を取得
 */
export async function getUserTickets(
  userId: string,
  limit: number = 10
): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getUserTickets エラー:', error);
    return [];
  }

  return (data as SupportTicketRow[]).map(toSupportTicket);
}

/**
 * サポートチケットのステータスを更新
 */
export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'resolved'
): Promise<boolean> {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    console.error('❌ updateTicketStatus エラー:', error);
    return false;
  }

  console.log(`✅ チケットステータス更新: ${ticketId} -> ${status}`);
  return true;
}

/**
 * サポート統計を取得
 */
export async function getSupportStats(): Promise<SupportStats> {
  const { data, error } = await supabase.rpc('get_support_stats');

  if (error) {
    console.error('❌ getSupportStats エラー:', error);

    // フォールバック: 個別にクエリ
    const [
      totalResult,
      openResult,
      feedbackResult,
      bugResult,
      todayResult,
      issuesResult,
    ] = await Promise.all([
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type', 'feedback'),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_type', 'bug'),
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase
        .from('known_issues')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'investigating'),
    ]);

    return {
      totalTickets: totalResult.count || 0,
      openTickets: openResult.count || 0,
      feedbackCount: feedbackResult.count || 0,
      bugCount: bugResult.count || 0,
      todayTickets: todayResult.count || 0,
      knownIssuesCount: issuesResult.count || 0,
    };
  }

  const stats = data as {
    total_tickets: number;
    open_tickets: number;
    feedback_count: number;
    bug_count: number;
    today_tickets: number;
    known_issues_count: number;
  };

  return {
    totalTickets: stats.total_tickets,
    openTickets: stats.open_tickets,
    feedbackCount: stats.feedback_count,
    bugCount: stats.bug_count,
    todayTickets: stats.today_tickets,
    knownIssuesCount: stats.known_issues_count,
  };
}

/**
 * 最近のサポートチケットを取得（ダッシュボード用）
 */
export async function getRecentTickets(
  limit: number = 20
): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getRecentTickets エラー:', error);
    return [];
  }

  return (data as SupportTicketRow[]).map(toSupportTicket);
}

/**
 * 既知の問題を登録（管理用）
 */
export async function addKnownIssue(params: {
  service: ServiceType;
  title: string;
  description?: string;
  keywords?: string[];
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('known_issues')
    .insert({
      service: params.service,
      title: params.title,
      description: params.description || null,
      keywords: params.keywords || [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ addKnownIssue エラー:', error);
    return null;
  }

  console.log('✅ 既知の問題登録:', data.id);
  return data.id;
}

/**
 * 既知の問題を解決済みに更新
 */
export async function resolveKnownIssue(issueId: string): Promise<boolean> {
  const { error } = await supabase
    .from('known_issues')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', issueId);

  if (error) {
    console.error('❌ resolveKnownIssue エラー:', error);
    return false;
  }

  console.log(`✅ 既知の問題解決: ${issueId}`);
  return true;
}

// =====================================================
// メッセージ永続化
// =====================================================

/**
 * サポートメッセージを保存
 */
export async function saveMessage(
  ticketId: string,
  role: MessageRole,
  content: string,
  senderName?: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      role,
      content,
      sender_name: senderName || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ saveMessage エラー:', error);
    return null;
  }

  return data.id;
}

/**
 * チケットのメッセージ一覧を取得
 */
export async function getTicketMessages(
  ticketId: string
): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ getTicketMessages エラー:', error);
    return [];
  }

  return (data as SupportMessageRow[]).map(toSupportMessage);
}

// =====================================================
// 有人対応機能
// =====================================================

/**
 * ユーザーのアクティブなチケットを取得
 */
export async function getActiveTicketByUserId(
  userId: string
): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('❌ getActiveTicketByUserId エラー:', error);
    }
    return null;
  }

  return toSupportTicket(data as SupportTicketRow);
}

/**
 * チケットを取得
 */
export async function getTicketById(
  ticketId: string
): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (error) {
    console.error('❌ getTicketById エラー:', error);
    return null;
  }

  return toSupportTicket(data as SupportTicketRow);
}

/**
 * 有人対応モードを切り替え
 */
export async function toggleHumanTakeover(
  ticketId: string,
  enable: boolean,
  operatorName?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      human_takeover: enable,
      human_takeover_at: enable ? new Date().toISOString() : null,
      human_operator_name: enable ? operatorName : null,
      status: enable ? 'in_progress' : 'open',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (error) {
    console.error('❌ toggleHumanTakeover エラー:', error);
    return false;
  }

  console.log(`✅ 有人対応モード: ${ticketId} -> ${enable ? 'ON' : 'OFF'}`);
  return true;
}

/**
 * チケットをエスカレーション
 */
export async function escalateTicket(
  ticketId: string,
  reason: string,
  priority: TicketPriority = 'normal'
): Promise<boolean> {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      escalated_at: new Date().toISOString(),
      escalation_reason: reason,
      priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (error) {
    console.error('❌ escalateTicket エラー:', error);
    return false;
  }

  console.log(`✅ チケットエスカレーション: ${ticketId}`);
  return true;
}

/**
 * チケットを更新
 */
export async function updateTicket(
  ticketId: string,
  updates: Partial<{
    status: string;
    category: string;
    priority: TicketPriority;
    userDisplayName: string;
    userLang: string;
    aiSummary: string;
    humanTakeover: boolean;
    humanOperatorName: string;
    escalatedAt: string;
    escalationReason: string;
  }>
): Promise<boolean> {
  const dbUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.userDisplayName !== undefined) dbUpdates.user_display_name = updates.userDisplayName;
  if (updates.userLang !== undefined) dbUpdates.user_lang = updates.userLang;
  if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary;
  if (updates.humanTakeover !== undefined) {
    dbUpdates.human_takeover = updates.humanTakeover;
    dbUpdates.human_takeover_at = updates.humanTakeover ? new Date().toISOString() : null;
  }
  if (updates.humanOperatorName !== undefined) dbUpdates.human_operator_name = updates.humanOperatorName;
  if (updates.escalatedAt !== undefined) dbUpdates.escalated_at = updates.escalatedAt;
  if (updates.escalationReason !== undefined) dbUpdates.escalation_reason = updates.escalationReason;

  const { error } = await supabase
    .from('support_tickets')
    .update(dbUpdates)
    .eq('id', ticketId);

  if (error) {
    console.error('❌ updateTicket エラー:', error);
    return false;
  }

  return true;
}

/**
 * 拡張統計を取得
 */
export async function getSupportStatsExtended(): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('get_support_stats_extended');

  if (error) {
    console.error('❌ getSupportStatsExtended エラー:', error);
    // フォールバック
    return getSupportStats() as unknown as Record<string, unknown>;
  }

  return data as Record<string, unknown>;
}
