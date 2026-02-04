// =====================================================
// Reminder Database Queries
// リマインダー関連のDBクエリ
// =====================================================

import { supabase } from './client';
import { DiagnosisAnswers } from '@/types/conversation';

/**
 * リマインダー対象ユーザー情報
 */
export interface ReminderTargetUser {
  userId: string;
  applicationCount: number;
  firstAppliedAt: string;
  lastAppliedAt: string;
  lang?: string;
}

/**
 * 3日前に応募したユーザーを取得（リマインダー対象）
 * - tracking_tokensのconverted_atを使用（GA4で検知された応募）
 * - 3日前に初回応募したユーザー
 * - まだリマインダーを送信していない
 * - 応募回数が10件未満
 */
export async function getReminderTargetUsers(
  reminderType: string = '3day_reminder'
): Promise<ReminderTargetUser[]> {
  // 3日前の日付範囲を計算（その日の0:00〜23:59）
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const startOfDay = new Date(threeDaysAgo);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(threeDaysAgo);
  endOfDay.setHours(23, 59, 59, 999);

  // tracking_tokensからconverted_atが設定されているレコードを取得
  const { data: allConversions, error: conversionsError } = await supabase
    .from('tracking_tokens')
    .select('user_id, converted_at')
    .not('converted_at', 'is', null);

  if (conversionsError || !allConversions) {
    console.error('Failed to get conversions:', conversionsError);
    return [];
  }

  // ユーザーごとに応募データを集約
  const userConversionMap = new Map<string, {
    firstConvertedAt: string;
    lastConvertedAt: string;
    count: number
  }>();

  for (const row of allConversions) {
    const existing = userConversionMap.get(row.user_id);
    if (existing) {
      existing.count++;
      if (row.converted_at < existing.firstConvertedAt) {
        existing.firstConvertedAt = row.converted_at;
      }
      if (row.converted_at > existing.lastConvertedAt) {
        existing.lastConvertedAt = row.converted_at;
      }
    } else {
      userConversionMap.set(row.user_id, {
        firstConvertedAt: row.converted_at,
        lastConvertedAt: row.converted_at,
        count: 1,
      });
    }
  }

  // 3日前に初回応募したユーザーをフィルタ
  const targetUserIds: string[] = [];
  for (const [userId, data] of userConversionMap) {
    const firstDate = new Date(data.firstConvertedAt);
    if (firstDate >= startOfDay && firstDate <= endOfDay) {
      targetUserIds.push(userId);
    }
  }

  if (targetUserIds.length === 0) {
    return [];
  }

  // すでにリマインダーを送信済みのユーザーを取得
  const { data: sentReminders, error: remindersError } = await supabase
    .from('application_reminders')
    .select('user_id')
    .eq('reminder_type', reminderType)
    .in('user_id', targetUserIds);

  if (remindersError) {
    console.error('Failed to get sent reminders:', remindersError);
    return [];
  }

  const sentUserIds = new Set(sentReminders?.map((r) => r.user_id) || []);

  // 対象ユーザーリストを作成
  const targetUsers: ReminderTargetUser[] = [];

  for (const userId of targetUserIds) {
    // 既に送信済みならスキップ
    if (sentUserIds.has(userId)) {
      continue;
    }

    const conversionData = userConversionMap.get(userId)!;
    const applicationCount = conversionData.count;

    // 10件以上の場合はスキップ
    if (applicationCount >= 10) {
      continue;
    }

    // ユーザーの言語設定を取得（conversation_stateから）
    const { data: stateData } = await supabase
      .from('conversation_state')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();

    const lang = stateData?.state?.lang || 'ja';

    targetUsers.push({
      userId,
      applicationCount,
      firstAppliedAt: conversionData.firstConvertedAt,
      lastAppliedAt: conversionData.lastConvertedAt,
      lang,
    });
  }

  return targetUsers;
}

/**
 * リマインダー送信履歴を記録
 */
export async function recordReminderSent(
  userId: string,
  reminderType: string,
  messageSent?: string
): Promise<boolean> {
  const { error } = await supabase.from('application_reminders').insert({
    user_id: userId,
    reminder_type: reminderType,
    message_sent: messageSent,
  });

  if (error) {
    console.error(`Failed to record reminder for ${userId}:`, error);
    return false;
  }

  return true;
}

/**
 * 特定ユーザーのリマインダー送信状況を確認
 */
export async function hasReminderBeenSent(
  userId: string,
  reminderType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('application_reminders')
    .select('id')
    .eq('user_id', userId)
    .eq('reminder_type', reminderType)
    .maybeSingle();

  if (error) {
    console.error(`Failed to check reminder status for ${userId}:`, error);
    return false;
  }

  return !!data;
}

/**
 * リマインダー送信統計を取得
 */
export async function getReminderStats(): Promise<{
  total: number;
  today: number;
  thisWeek: number;
}> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // 全体
  const { count: total } = await supabase
    .from('application_reminders')
    .select('*', { count: 'exact', head: true });

  // 今日
  const { count: today } = await supabase
    .from('application_reminders')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', todayStart.toISOString());

  // 今週
  const { count: thisWeek } = await supabase
    .from('application_reminders')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', weekAgo.toISOString());

  return {
    total: total || 0,
    today: today || 0,
    thisWeek: thisWeek || 0,
  };
}

/**
 * ユーザーの診断結果を取得
 */
export async function getUserDiagnosisAnswers(
  userId: string
): Promise<{ lang: string; answers: DiagnosisAnswers } | null> {
  const { data, error } = await supabase
    .from('conversation_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error(`Failed to get diagnosis answers for ${userId}:`, error);
    return null;
  }

  if (!data) {
    console.log(`No conversation_state found for ${userId}`);
    return null;
  }

  console.log(`Found conversation_state for ${userId}:`, JSON.stringify(data.state));

  const state = data.state as { lang?: string; answers?: DiagnosisAnswers } | null;

  return {
    lang: state?.lang || 'ja',
    answers: state?.answers || {},
  };
}
