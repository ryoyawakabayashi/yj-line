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
 * ダッシュボードの全体統計を取得
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // 総ユーザー数
    const { count: totalUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true });

    // ユーザー統計の合計値を取得
    const { data: statsData } = await supabase
      .from('user_status')
      .select('ai_chat_count, diagnosis_count, last_used');

    const totalAIChats = statsData?.reduce((sum, row) => sum + (row.ai_chat_count || 0), 0) || 0;

    // 診断実施数（diagnosis_resultsテーブルの総レコード数）
    const { count: totalDiagnosis } = await supabase
      .from('diagnosis_results')
      .select('*', { count: 'exact', head: true });

    // 診断人数（診断を1回以上実施したユニークユーザー数）
    const { count: diagnosisUserCount } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('diagnosis_count', 1);

    // 本日のアクティブユーザー数
    const today = new Date().toISOString().split('T')[0];
    const { count: todayActiveUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('last_used', today);

    // リピートユーザー数（診断を2回以上実施したユーザー）
    const { count: repeatUserCount } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('diagnosis_count', 2);

    // リピート率の計算
    const repeatRate = totalUsers && totalUsers > 0
      ? Math.round((repeatUserCount || 0) / totalUsers * 100 * 10) / 10
      : 0;

    return {
      totalUsers: totalUsers || 0,
      totalDiagnosis: totalDiagnosis || 0,
      diagnosisUserCount: diagnosisUserCount || 0,
      totalAIChats,
      todayActiveUsers: todayActiveUsers || 0,
      repeatUserCount: repeatUserCount || 0,
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
 * 月指定でダッシュボード統計を取得
 */
export async function getDashboardStatsByMonth(
  startDate: string,
  endDate: string
): Promise<DashboardStats> {
  try {
    // 期間内の新規ユーザー数
    const { count: newUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('first_used', startDate)
      .lte('first_used', endDate + 'T23:59:59');

    // 総ユーザー数（累計）
    const { count: totalUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true });

    // 期間内の診断実施数
    const { count: totalDiagnosis } = await supabase
      .from('diagnosis_results')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    // 期間内に診断を実施したユニークユーザー数
    const { data: diagnosisData } = await supabase
      .from('diagnosis_results')
      .select('user_id')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    const uniqueDiagnosisUsers = new Set(diagnosisData?.map(d => d.user_id) || []);
    const diagnosisUserCount = uniqueDiagnosisUsers.size;

    // 期間内のアクティブユーザー数
    const { count: activeUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('last_used', startDate)
      .lte('last_used', endDate + 'T23:59:59');

    // 期間内にリピート診断したユーザー数（期間内に2回以上診断を実施）
    // diagnosis_resultsから期間内のデータを取得し、2回以上診断したユーザーをカウント
    const { data: periodDiagnosisData } = await supabase
      .from('diagnosis_results')
      .select('user_id')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate + 'T23:59:59');

    // ユーザーごとの診断回数をカウント
    const userDiagnosisCounts: Record<string, number> = {};
    periodDiagnosisData?.forEach(d => {
      userDiagnosisCounts[d.user_id] = (userDiagnosisCounts[d.user_id] || 0) + 1;
    });
    // 2回以上診断したユーザー数
    const repeatUserCount = Object.values(userDiagnosisCounts).filter(count => count >= 2).length;

    // リピート率の計算（期間内の診断人数に対する割合）
    const repeatRate = diagnosisUserCount > 0
      ? Math.round((repeatUserCount / diagnosisUserCount) * 100 * 10) / 10
      : 0;

    return {
      totalUsers: newUsers || 0, // 期間内の新規ユーザー
      totalDiagnosis: totalDiagnosis || 0,
      diagnosisUserCount,
      totalAIChats: 0,
      todayActiveUsers: activeUsers || 0,
      repeatUserCount: repeatUserCount || 0,
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
 * 言語別ユーザー分布を取得
 */
export async function getUsersByLanguage(): Promise<LanguageDistribution[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('lang');

    if (!data) return [];

    // グループ化してカウント
    const langCounts: Record<string, number> = {};
    data.forEach((row) => {
      const lang = row.lang || 'unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    return Object.entries(langCounts).map(([lang, count]) => ({
      lang,
      count,
    }));
  } catch (error) {
    console.error('getUsersByLanguage error:', error);
    return [];
  }
}

/**
 * 日本語レベル別分布を取得
 */
export async function getJapaneseLevelDistribution(): Promise<LevelDistribution[]> {
  try {
    const { data } = await supabase
      .from('diagnosis_results')
      .select('q5_japanese_level')
      .not('q5_japanese_level', 'is', null);

    if (!data) return [];

    // グループ化してカウント
    const levelCounts: Record<string, number> = {};
    data.forEach((row) => {
      const level = row.q5_japanese_level || 'unknown';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    return Object.entries(levelCounts).map(([level, count]) => ({
      level,
      count,
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
 * 地域別分布を取得
 */
export async function getRegionDistribution(): Promise<RegionDistribution[]> {
  try {
    const { data } = await supabase
      .from('diagnosis_results')
      .select('q4_region')
      .not('q4_region', 'is', null);

    if (!data) return [];

    // グループ化してカウント
    const regionCounts: Record<string, number> = {};
    data.forEach((row) => {
      const region = row.q4_region || 'unknown';
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    return Object.entries(regionCounts)
      .map(([region, count]) => ({
        region,
        count,
      }))
      .sort((a, b) => b.count - a.count); // 降順でソート
  } catch (error) {
    console.error('getRegionDistribution error:', error);
    return [];
  }
}

/**
 * 日別ユーザー登録推移を取得
 */
export async function getDailyUserTrend(days: number = 30): Promise<DailyTrend[]> {
  try {
    const { data } = await supabase
      .from('user_status')
      .select('first_used')
      .not('first_used', 'is', null)
      .order('first_used', { ascending: true });

    if (!data) return [];

    // 日付ごとにグループ化
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.first_used) {
        const date = row.first_used.split('T')[0]; // YYYY-MM-DD形式に
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    // 過去N日間のデータのみ抽出
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return Object.entries(dateCounts)
      .filter(([date]) => date >= cutoffStr)
      .map(([date, count]) => ({
        date,
        count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)); // 日付昇順
  } catch (error) {
    console.error('getDailyUserTrend error:', error);
    return [];
  }
}

/**
 * 日別診断実施数の推移を取得
 */
export async function getDailyDiagnosisTrend(days: number = 30): Promise<DailyUsageTrend[]> {
  try {
    const { data } = await supabase
      .from('diagnosis_results')
      .select('timestamp')
      .not('timestamp', 'is', null)
      .order('timestamp', { ascending: true });

    if (!data) return [];

    // 日付ごとにグループ化
    const dateCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.timestamp) {
        const date = row.timestamp.split('T')[0]; // YYYY-MM-DD形式に
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
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

    // 診断結果を取得
    const { data: diagnosisData } = await supabase
      .from('diagnosis_results')
      .select('timestamp, q1_living_in_japan, q2_gender, q3_urgency, q4_region, q5_japanese_level, q6_industry, q7_work_style')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);

    const history = (historyData?.history as ConversationMessage[]) || [];

    return {
      userId,
      lang: userData?.lang || 'unknown',
      history,
      diagnosisResults: diagnosisData || [],
    };
  } catch (error) {
    console.error('getUserConversationDetail error:', error);
    return null;
  }
}
