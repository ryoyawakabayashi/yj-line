import { supabase } from './supabase';
import type {
  DashboardStats,
  LanguageDistribution,
  LevelDistribution,
  IndustryDistribution,
  RegionDistribution,
  DailyTrend,
  Activity,
  DailyUsageTrend,
  TopUser,
  ActiveUserHistory,
} from '@/types/dashboard';

/**
 * ダッシュボードの全体統計を取得（RPC使用で1クエリに最適化）
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
      console.error('getDashboardStats RPC error:', error);
      throw error;
    }

    const totalUsers = data?.total_users || 0;
    const repeatUserCount = data?.repeat_user_count || 0;
    const repeatRate = totalUsers > 0
      ? Math.round((repeatUserCount / totalUsers) * 100 * 10) / 10
      : 0;

    return {
      totalUsers,
      totalDiagnosis: data?.total_diagnosis || 0,
      diagnosisUserCount: data?.diagnosis_user_count || 0,
      totalAIChats: data?.total_ai_chats || 0,
      todayActiveUsers: data?.today_active_users || 0,
      repeatUserCount,
      repeatRate,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      totalUsers: 0,
      totalDiagnosis: 0,
      diagnosisUserCount: 0,
      totalAIChats: 0,
      todayActiveUsers: 0,
      repeatUserCount: 0,
      repeatRate: 0,
    };
  }
}

/**
 * 月指定でダッシュボード統計を取得（RPC使用で最適化）
 */
export async function getDashboardStatsByMonth(
  startDate: string,
  endDate: string
): Promise<DashboardStats> {
  try {
    const { data, error } = await supabase.rpc('get_dashboard_stats_by_month', {
      start_date: startDate,
      end_date: endDate
    });

    if (error) {
      console.error('getDashboardStatsByMonth RPC error:', error);
      throw error;
    }

    const diagnosisUserCount = data?.diagnosis_user_count || 0;
    const repeatUserCount = data?.repeat_user_count || 0;
    const repeatRate = diagnosisUserCount > 0
      ? Math.round((repeatUserCount / diagnosisUserCount) * 100 * 10) / 10
      : 0;

    return {
      totalUsers: data?.new_users || 0,
      totalDiagnosis: data?.total_diagnosis || 0,
      diagnosisUserCount,
      totalAIChats: 0,
      todayActiveUsers: data?.active_users || 0,
      repeatUserCount,
      repeatRate,
    };
  } catch (error) {
    console.error('getDashboardStatsByMonth error:', error);
    return {
      totalUsers: 0,
      totalDiagnosis: 0,
      diagnosisUserCount: 0,
      totalAIChats: 0,
      todayActiveUsers: 0,
      repeatUserCount: 0,
      repeatRate: 0,
    };
  }
}

/**
 * 言語別ユーザー分布を取得（RPC使用で最適化）
 */
export async function getUsersByLanguage(): Promise<LanguageDistribution[]> {
  try {
    const { data, error } = await supabase.rpc('get_language_distribution');

    if (error) {
      console.error('getUsersByLanguage RPC error:', error);
      throw error;
    }

    return (data || []).map((row: { lang: string; count: number }) => ({
      lang: row.lang,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error('getUsersByLanguage error:', error);
    return [];
  }
}

/**
 * 日本語レベル別分布を取得（RPC使用で最適化）
 */
export async function getJapaneseLevelDistribution(): Promise<LevelDistribution[]> {
  try {
    const { data, error } = await supabase.rpc('get_japanese_level_distribution');

    if (error) {
      console.error('getJapaneseLevelDistribution RPC error:', error);
      throw error;
    }

    return (data || []).map((row: { level: string; count: number }) => ({
      level: row.level,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error('getJapaneseLevelDistribution error:', error);
    return [];
  }
}

/**
 * 業界別分布を取得（カンマ区切りを展開）
 */
export async function getIndustryDistribution(): Promise<IndustryDistribution[]> {
  try {
    const { data } = await supabase
      .from('diagnosis_results')
      .select('q6_industry')
      .not('q6_industry', 'is', null);

    if (!data) return [];

    // 有効な業界キーのみを許可
    const validIndustryKeys = new Set([
      'food',
      'building_maintenance',
      'hotel_ryokan',
      'retail_service',
      'logistics_driver',
    ]);

    // カンマ区切りを展開してカウント（有効なキーのみ）
    const industryCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.q6_industry) {
        row.q6_industry.split(',').forEach((industry: string) => {
          const trimmed = industry.trim();
          // 有効なキーのみカウント
          if (validIndustryKeys.has(trimmed)) {
            industryCounts[trimmed] = (industryCounts[trimmed] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(industryCounts)
      .map(([industry, count]) => ({
        industry,
        count,
      }))
      .sort((a, b) => b.count - a.count); // 降順でソート
  } catch (error) {
    console.error('getIndustryDistribution error:', error);
    return [];
  }
}

/**
 * 地域別分布を取得（RPC使用で最適化）
 */
export async function getRegionDistribution(): Promise<RegionDistribution[]> {
  try {
    const { data, error } = await supabase.rpc('get_region_distribution');

    if (error) {
      console.error('getRegionDistribution RPC error:', error);
      throw error;
    }

    return (data || []).map((row: { region: string; count: number }) => ({
      region: row.region,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error('getRegionDistribution error:', error);
    return [];
  }
}

/**
 * 日別ユーザー登録推移を取得（RPC使用で最適化）
 */
export async function getDailyUserTrend(days: number = 30): Promise<DailyTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_daily_user_trend', {
      days_back: days
    });

    if (error) {
      console.error('getDailyUserTrend RPC error:', error);
      throw error;
    }

    return (data || []).map((row: { date: string; count: number }) => ({
      date: row.date,
      count: Number(row.count),
    }));
  } catch (error) {
    console.error('getDailyUserTrend error:', error);
    return [];
  }
}

/**
 * 日別診断実施数の推移を取得（RPC使用で最適化）
 */
export async function getDailyDiagnosisTrend(days: number = 30): Promise<DailyUsageTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_daily_diagnosis_trend', {
      days_back: days
    });

    if (error) {
      console.error('getDailyDiagnosisTrend RPC error:', error);
      throw error;
    }

    // RPCから取得したデータをマップに変換
    const dateCounts: Record<string, number> = {};
    (data || []).forEach((row: { date: string; count: number }) => {
      dateCounts[row.date] = Number(row.count);
    });

    // 過去N日間の全日付を生成（欠損日を0で埋める）
    const result: DailyUsageTrend[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];

      result.push({
        date: dateStr,
        diagnosisCount: dateCounts[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('getDailyDiagnosisTrend error:', error);
    return [];
  }
}

/**
 * 最新のユーザーアクティビティを取得
 */
export async function getRecentActivity(limit: number = 20): Promise<Activity[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('user_id, lang, last_used, diagnosis_count, ai_chat_count')
      .not('last_used', 'is', null)
      .order('last_used', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map((row) => ({
      userId: row.user_id,
      lang: row.lang || 'unknown',
      lastUsed: row.last_used,
      diagnosisCount: row.diagnosis_count || 0,
      aiChatCount: row.ai_chat_count || 0,
    }));
  } catch (error) {
    console.error('getRecentActivity error:', error);
    return [];
  }
}

/**
 * 利用回数トップユーザーランキングを取得
 */
export async function getTopUsers(limit: number = 10): Promise<TopUser[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('user_id, lang, diagnosis_count, ai_chat_count')
      .order('diagnosis_count', { ascending: false });

    if (!data) return [];

    // 診断数 + AIチャット数の合計でソートしてランキング作成
    const sortedUsers = data
      .map((row) => ({
        userId: row.user_id,
        lang: row.lang || 'unknown',
        diagnosisCount: row.diagnosis_count || 0,
        aiChatCount: row.ai_chat_count || 0,
        totalUsage: (row.diagnosis_count || 0) + (row.ai_chat_count || 0),
        rank: 0, // 後で設定
      }))
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    return sortedUsers;
  } catch (error) {
    console.error('getTopUsers error:', error);
    return [];
  }
}

/**
 * アクティブユーザー履歴を取得（日別）
 */
export async function getActiveUserHistory(
  startDate: string,
  endDate: string
): Promise<ActiveUserHistory[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('last_used')
      .gte('last_used', startDate)
      .lte('last_used', endDate + 'T23:59:59');

    if (!data) return [];

    // 日付ごとにグループ化してカウント
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.last_used) {
        const date = row.last_used.split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // startDateからendDateまでの全日付を生成（欠損日を0で埋める）
    const result: ActiveUserHistory[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('getActiveUserHistory error:', error);
    return [];
  }
}

/**
 * 診断実施数の履歴を取得（日別）
 */
export async function getDiagnosisHistory(
  startDate: string,
  endDate: string
): Promise<ActiveUserHistory[]> {
  try {
    const { data } = await supabase
      .from('diagnosis_results')
      .select('timestamp')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    if (!data) return [];

    // 日付ごとにグループ化してカウント
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.timestamp) {
        const date = row.timestamp.split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // startDateからendDateまでの全日付を生成
    const result: ActiveUserHistory[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('getDiagnosisHistory error:', error);
    return [];
  }
}

/**
 * ユーザー登録数の履歴を取得（日別）
 */
export async function getUserRegistrationHistory(
  startDate: string,
  endDate: string
): Promise<ActiveUserHistory[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('first_used')
      .gte('first_used', startDate)
      .lte('first_used', endDate + 'T23:59:59');

    if (!data) return [];

    // 日付ごとにグループ化してカウント
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.first_used) {
        const date = row.first_used.split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // startDateからendDateまでの全日付を生成
    const result: ActiveUserHistory[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('getUserRegistrationHistory error:', error);
    return [];
  }
}

/**
 * LINE友だち追加数を期間で取得
 */
export async function getFollowEventCount(
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    const { count } = await supabase
      .from('follow_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'follow')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    return count || 0;
  } catch (error) {
    console.error('getFollowEventCount error:', error);
    return 0;
  }
}

/**
 * LINE友だち追加の履歴を取得（日別）
 */
export async function getFollowEventHistory(
  startDate: string,
  endDate: string
): Promise<ActiveUserHistory[]> {
  try {
    const { data } = await supabase
      .from('follow_events')
      .select('timestamp')
      .eq('event_type', 'follow')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    if (!data) return [];

    // 日付ごとにグループ化してカウント
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.timestamp) {
        const date = row.timestamp.split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // startDateからendDateまでの全日付を生成
    const result: ActiveUserHistory[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateCounts[dateStr] || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('getFollowEventHistory error:', error);
    return [];
  }
}

/**
 * 会話履歴があるユーザー一覧を取得
 */
export interface ConversationUser {
  userId: string;
  lang: string;
  lastUsed: string | null;
  diagnosisCount: number;
  aiChatCount: number;
  lastMessage: string | null;
}

export async function getUsersWithConversations(limit: number = 50): Promise<ConversationUser[]> {
  try {
    // 診断またはAIチャットを使用したユーザーを取得（最新のlast_used順）
    const { data: usersData } = await supabase
      .from('user_status')
      .select('user_id, lang, last_used, diagnosis_count, ai_chat_count')
      .or('diagnosis_count.gt.0,ai_chat_count.gt.0')
      .order('last_used', { ascending: false })
      .limit(limit);

    if (!usersData || usersData.length === 0) return [];

    const userIds = usersData.map(u => u.user_id);

    // AIチャット履歴を取得
    const { data: conversationsData } = await supabase
      .from('ai_conversation_history')
      .select('user_id, history')
      .in('user_id', userIds);

    const conversationsMap = new Map(conversationsData?.map(c => [c.user_id, c.history]) || []);

    // 結果を組み立て
    return usersData.map(user => {
      const history = conversationsMap.get(user.user_id) as Array<{ role: string; content: string }> | null;
      const lastMessage = history && history.length > 0
        ? history[history.length - 1].content.substring(0, 50)
        : (user.diagnosis_count > 0 ? '(診断履歴あり)' : null);

      return {
        userId: user.user_id,
        lang: user.lang || 'unknown',
        lastUsed: user.last_used || null,
        diagnosisCount: user.diagnosis_count || 0,
        aiChatCount: user.ai_chat_count || 0,
        lastMessage,
      };
    });
  } catch (error) {
    console.error('getUsersWithConversations error:', error);
    return [];
  }
}

/**
 * 特定ユーザーの会話履歴を取得
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface UserConversationDetail {
  userId: string;
  lang: string;
  history: ConversationMessage[];
  diagnosisResults: DiagnosisResult[];
}

export interface DiagnosisResult {
  timestamp: string;
  q1_living_in_japan: string | null;
  q2_gender: string | null;
  q3_urgency: string | null;
  q4_region: string | null;
  q5_japanese_level: string | null;
  q6_industry: string | null;
  q7_work_style: string | null;
}

export async function getUserConversationDetail(userId: string): Promise<UserConversationDetail | null> {
  try {
    // 会話履歴を取得
    const { data: historyData } = await supabase
      .from('ai_conversation_history')
      .select('history, updated_at')
      .eq('user_id', userId)
      .single();

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('user_status')
      .select('lang')
      .eq('user_id', userId)
      .single();

    // 診断結果を取得（新テーブル）
    const { data: diagnosisData } = await supabase
      .from('diagnosis_results')
      .select('timestamp, q1_living_in_japan, q2_gender, q3_urgency, q4_region, q5_japanese_level, q6_industry, q7_work_style')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);

    // 診断結果がない場合、user_answersから取得（後方互換性）
    let diagnosisResults = diagnosisData || [];
    if (diagnosisResults.length === 0) {
      const { data: answersData } = await supabase
        .from('user_answers')
        .select('question, answer, timestamp')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (answersData && answersData.length > 0) {
        // user_answersからの回答を診断結果形式に変換
        const answersMap: Record<string, string> = {};
        let latestTimestamp = '';
        answersData.forEach(a => {
          answersMap[a.question] = a.answer;
          if (!latestTimestamp && a.timestamp) {
            latestTimestamp = a.timestamp;
          }
        });

        if (Object.keys(answersMap).length > 0) {
          diagnosisResults = [{
            timestamp: latestTimestamp || new Date().toISOString(),
            q1_living_in_japan: answersMap['q1'] || null,
            q2_gender: answersMap['q2'] || null,
            q3_urgency: answersMap['q3'] || null,
            q4_region: answersMap['q4'] || null,
            q5_japanese_level: answersMap['q5'] || null,
            q6_industry: answersMap['q6_1'] || null,
            q7_work_style: answersMap['q7'] || null,
          }];
        }
      }
    }

    const history = (historyData?.history as ConversationMessage[]) || [];

    return {
      userId,
      lang: userData?.lang || 'unknown',
      history,
      diagnosisResults,
    };
  } catch (error) {
    console.error('getUserConversationDetail error:', error);
    return null;
  }
}
