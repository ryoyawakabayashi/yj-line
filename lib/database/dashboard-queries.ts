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
  CareerDiagnosisDailyTrend,
  CareerTypeDistribution,
  CareerTypeConversion,
  ContactFlowQuestionRank,
  ContactFlowDailyTrend,
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
  displayName: string | null;
  pictureUrl: string | null;
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
    const { data: historyData, error: historyError } = await supabase
      .from('ai_conversation_history')
      .select('history')
      .eq('user_id', userId)
      .maybeSingle();

    if (historyError) {
      console.error('❌ ai_conversation_history取得エラー:', historyError);
    }

    // ユーザー情報を取得（プロフィール含む）
    const { data: userData } = await supabase
      .from('user_status')
      .select('lang, display_name, picture_url')
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
      displayName: userData?.display_name || null,
      pictureUrl: userData?.picture_url || null,
      history,
      diagnosisResults,
    };
  } catch (error) {
    console.error('getUserConversationDetail error:', error);
    return null;
  }
}

// =====================================================
// キャリア診断分析クエリ
// =====================================================

const CAREER_TYPE_NAMES: Record<string, string> = {
  GARJ: 'チームで動く お世話タイプ',
  GARO: 'チームで動く ものづくりタイプ',
  GAVJ: 'チームで動く おもてなしタイプ',
  GAVO: 'チームで動く アウトドアタイプ',
  GDRJ: 'チームで学ぶ オフィスタイプ',
  GDRO: 'チームで働く テクニカルタイプ',
  GDVJ: 'チームで考える クリエイティブタイプ',
  GDVO: 'チームで挑戦する グローバルタイプ',
  LARJ: '一人で動く 職人タイプ',
  LARO: '一人で動く もくもくタイプ',
  LAVJ: '一人で動く フリーランスタイプ',
  LAVO: '一人で動く 自然派タイプ',
  LDRJ: '一人で学ぶ 研究者タイプ',
  LDRO: '一人で集中 コツコツタイプ',
  LDVJ: '一人で考える プランナータイプ',
  LDVO: '一人で挑戦する デジタルタイプ',
};

/** 日別診断回数（過去N日） */
export async function getCareerDiagnosisTrend(days = 30): Promise<CareerDiagnosisDailyTrend[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('career_diagnosis_results')
      .select('created_at')
      .gte('created_at', since.toISOString());

    if (error) throw error;
    if (!data) return [];

    // 日別にグループ化
    const countByDate: Record<string, number> = {};
    for (const row of data) {
      const date = new Date(row.created_at).toISOString().split('T')[0];
      countByDate[date] = (countByDate[date] || 0) + 1;
    }

    // 全日付を埋める
    const result: CareerDiagnosisDailyTrend[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({ date: dateStr, count: countByDate[dateStr] || 0 });
    }
    return result;
  } catch (error) {
    console.error('getCareerDiagnosisTrend error:', error);
    return [];
  }
}

/** タイプ別分布 */
export async function getCareerTypeDistribution(): Promise<CareerTypeDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('career_diagnosis_results')
      .select('type_code');

    if (error) throw error;
    if (!data) return [];

    const countByType: Record<string, number> = {};
    for (const row of data) {
      countByType[row.type_code] = (countByType[row.type_code] || 0) + 1;
    }

    return Object.entries(countByType)
      .map(([typeCode, count]) => ({
        typeCode,
        typeName: CAREER_TYPE_NAMES[typeCode] || typeCode,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('getCareerTypeDistribution error:', error);
    return [];
  }
}

/** タイプ別クリック・応募（user_idで結合） */
export async function getCareerTypeConversion(): Promise<CareerTypeConversion[]> {
  try {
    // 1. 診断結果（user_id → type_code）
    const { data: diagnosisData, error: dErr } = await supabase
      .from('career_diagnosis_results')
      .select('user_id, type_code');
    if (dErr) throw dErr;

    // 2. クリック（url_type='career_diagnosis' かつ clicked_at IS NOT NULL）
    const { data: clickData, error: cErr } = await supabase
      .from('tracking_tokens')
      .select('user_id')
      .eq('url_type', 'career_diagnosis')
      .not('clicked_at', 'is', null);
    if (cErr) throw cErr;

    // 3. 応募
    const { data: appData, error: aErr } = await supabase
      .from('application_logs')
      .select('user_id')
      .eq('url_type', 'career_diagnosis');
    if (aErr) throw aErr;

    // user_id → 最新のtype_code マッピング
    const userToType: Record<string, string> = {};
    for (const row of diagnosisData || []) {
      userToType[row.user_id] = row.type_code;
    }

    // type_code別の診断数
    const diagnosisByType: Record<string, number> = {};
    for (const row of diagnosisData || []) {
      diagnosisByType[row.type_code] = (diagnosisByType[row.type_code] || 0) + 1;
    }

    // type_code別のクリック数
    const clicksByType: Record<string, number> = {};
    for (const row of clickData || []) {
      const tc = userToType[row.user_id];
      if (tc) clicksByType[tc] = (clicksByType[tc] || 0) + 1;
    }

    // type_code別の応募数
    const appsByType: Record<string, number> = {};
    for (const row of appData || []) {
      const tc = userToType[row.user_id];
      if (tc) appsByType[tc] = (appsByType[tc] || 0) + 1;
    }

    // 全タイプを集約
    const allTypes = new Set([...Object.keys(diagnosisByType), ...Object.keys(clicksByType), ...Object.keys(appsByType)]);
    return Array.from(allTypes)
      .map((typeCode) => ({
        typeCode,
        typeName: CAREER_TYPE_NAMES[typeCode] || typeCode,
        diagnosisCount: diagnosisByType[typeCode] || 0,
        clickCount: clicksByType[typeCode] || 0,
        applicationCount: appsByType[typeCode] || 0,
      }))
      .sort((a, b) => b.diagnosisCount - a.diagnosisCount);
  } catch (error) {
    console.error('getCareerTypeConversion error:', error);
    return [];
  }
}

/** キャリア診断KPI（総数・ユニークユーザー数） */
export async function getCareerDiagnosisKpi(): Promise<{ totalDiagnoses: number; uniqueUsers: number; totalClicks: number; totalApplications: number }> {
  try {
    const [diagResult, clickResult, appResult] = await Promise.all([
      supabase.from('career_diagnosis_results').select('user_id'),
      supabase.from('tracking_tokens').select('user_id').eq('url_type', 'career_diagnosis').not('clicked_at', 'is', null),
      supabase.from('application_logs').select('user_id').eq('url_type', 'career_diagnosis'),
    ]);

    const diagData = diagResult.data || [];
    const uniqueUsers = new Set(diagData.map((r) => r.user_id)).size;

    return {
      totalDiagnoses: diagData.length,
      uniqueUsers,
      totalClicks: clickResult.data?.length || 0,
      totalApplications: appResult.data?.length || 0,
    };
  } catch (error) {
    console.error('getCareerDiagnosisKpi error:', error);
    return { totalDiagnoses: 0, uniqueUsers: 0, totalClicks: 0, totalApplications: 0 };
  }
}

/** 診断者一覧（最新順、user_statusと結合） */
export async function getCareerDiagnosisUsers(limit = 100): Promise<Array<{
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  lang: string;
  typeCode: string;
  typeName: string;
  createdAt: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('career_diagnosis_results')
      .select('user_id, type_code, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // user_statusからdisplay_name, picture_url, langを取得
    const userIds = [...new Set(data.map((r) => r.user_id))];
    const { data: users } = await supabase
      .from('user_status')
      .select('user_id, display_name, picture_url, lang')
      .in('user_id', userIds);

    const userMap: Record<string, { displayName: string | null; pictureUrl: string | null; lang: string }> = {};
    for (const u of users || []) {
      userMap[u.user_id] = { displayName: u.display_name, pictureUrl: u.picture_url || null, lang: u.lang || 'en' };
    }

    return data.map((row) => ({
      userId: row.user_id,
      displayName: userMap[row.user_id]?.displayName || null,
      pictureUrl: userMap[row.user_id]?.pictureUrl || null,
      lang: userMap[row.user_id]?.lang || 'en',
      typeCode: row.type_code,
      typeName: CAREER_TYPE_NAMES[row.type_code] || row.type_code,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('getCareerDiagnosisUsers error:', error);
    return [];
  }
}

// =====================================================
// お問い合わせフロー分析
// =====================================================

/** support_buttonフローの一覧を取得 */
export async function getContactFlows(): Promise<{ id: string; name: string; service: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('chat_flows')
      .select('id, name, service')
      .eq('trigger_type', 'support_button')
      .order('name');

    if (error) throw error;
    return (data || []).map((f) => ({ id: f.id, name: f.name, service: f.service }));
  } catch (error) {
    console.error('getContactFlows error:', error);
    return [];
  }
}

/** 質問ランキング: card_selection_events を card_node_id でGROUP BY */
export async function getContactFlowQuestionRanking(flowId?: string): Promise<ContactFlowQuestionRank[]> {
  try {
    // 1. card_selection_events を取得（display_textも取得してフォールバック用）
    let query = supabase.from('card_selection_events').select('card_node_id, user_id, flow_id, display_text');
    if (flowId) query = query.eq('flow_id', flowId);
    const { data: events, error: eventsErr } = await query;
    if (eventsErr) throw eventsErr;
    if (!events || events.length === 0) return [];

    // 2. card_node_id ごとに集計 + display_textを保存（フォールバック用）
    const countMap: Record<string, { count: number; users: Set<string>; flowId: string; displayText: string }> = {};
    for (const ev of events) {
      if (!countMap[ev.card_node_id]) {
        countMap[ev.card_node_id] = { count: 0, users: new Set(), flowId: ev.flow_id, displayText: ev.display_text || '' };
      }
      countMap[ev.card_node_id].count++;
      countMap[ev.card_node_id].users.add(ev.user_id);
    }

    // 3. 関連するフロー定義を取得してcard_node_id → 質問テキストをマッピング
    const flowIds = [...new Set(events.map((e) => e.flow_id))];
    const { data: flows } = await supabase
      .from('chat_flows')
      .select('id, flow_definition')
      .in('id', flowIds);

    const nodeTextMap: Record<string, string> = {};
    for (const flow of flows || []) {
      const def = flow.flow_definition as { nodes?: any[]; edges?: any[] };
      if (!def?.nodes) continue;
      for (const node of def.nodes) {
        if (node.type !== 'card') continue;
        const cfg = node.data?.config;
        if (!cfg) continue;

        // config.text（単体カード）
        if (cfg.text) {
          const text = cfg.text;
          const resolved = typeof text === 'string' ? text : (text.ja || Object.values(text)[0] || '');
          if (resolved) { nodeTextMap[node.id] = resolved; continue; }
        }
        // config.columns[0].text（カルーセルの最初のカラム）
        if (cfg.columns && cfg.columns.length > 0 && cfg.columns[0].text) {
          const text = cfg.columns[0].text;
          const resolved = typeof text === 'string' ? text : (text.ja || Object.values(text)[0] || '');
          if (resolved) nodeTextMap[node.id] = resolved;
        }
      }
    }

    // 4. 結果を生成（降順）: フロー定義テキスト → display_text → cardNodeId の優先順
    return Object.entries(countMap)
      .map(([cardNodeId, info]) => ({
        cardNodeId,
        questionText: nodeTextMap[cardNodeId] || info.displayText || cardNodeId,
        count: info.count,
        uniqueUsers: info.users.size,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('getContactFlowQuestionRanking error:', error);
    return [];
  }
}

/** 日別トレンド: フロー実行回数 + カードクリック数 */
export async function getContactFlowTrend(days = 30): Promise<ContactFlowDailyTrend[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    // support_button フローIDの取得
    const { data: flows } = await supabase
      .from('chat_flows')
      .select('id')
      .eq('trigger_type', 'support_button');
    const flowIds = (flows || []).map((f) => f.id);

    // フロー実行回数
    const execMap: Record<string, number> = {};
    if (flowIds.length > 0) {
      const { data: execs } = await supabase
        .from('chat_flow_executions')
        .select('started_at')
        .in('flow_id', flowIds)
        .gte('started_at', sinceISO);
      for (const ex of execs || []) {
        const date = ex.started_at.split('T')[0];
        execMap[date] = (execMap[date] || 0) + 1;
      }
    }

    // カードクリック数
    const clickMap: Record<string, number> = {};
    const { data: clicks } = await supabase
      .from('card_selection_events')
      .select('created_at')
      .gte('created_at', sinceISO);
    for (const c of clicks || []) {
      const date = c.created_at.split('T')[0];
      clickMap[date] = (clickMap[date] || 0) + 1;
    }

    // 全日付を埋める
    const result: ContactFlowDailyTrend[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        executions: execMap[dateStr] || 0,
        cardClicks: clickMap[dateStr] || 0,
      });
    }
    return result;
  } catch (error) {
    console.error('getContactFlowTrend error:', error);
    return [];
  }
}

/** KPI: 総実行数・完了数・カードクリック数・ユニークユーザー数 */
export async function getContactFlowKpi(): Promise<{
  totalExecutions: number;
  completedExecutions: number;
  totalCardClicks: number;
  uniqueUsers: number;
}> {
  try {
    // support_button フローIDの取得
    const { data: flows } = await supabase
      .from('chat_flows')
      .select('id')
      .eq('trigger_type', 'support_button');
    const flowIds = (flows || []).map((f) => f.id);

    let totalExecutions = 0;
    let completedExecutions = 0;
    if (flowIds.length > 0) {
      const { count: total } = await supabase
        .from('chat_flow_executions')
        .select('*', { count: 'exact', head: true })
        .in('flow_id', flowIds);
      totalExecutions = total || 0;

      const { count: completed } = await supabase
        .from('chat_flow_executions')
        .select('*', { count: 'exact', head: true })
        .in('flow_id', flowIds)
        .eq('status', 'completed');
      completedExecutions = completed || 0;
    }

    // カードクリック
    const { count: clicks } = await supabase
      .from('card_selection_events')
      .select('*', { count: 'exact', head: true });
    const totalCardClicks = clicks || 0;

    // ユニークユーザー（card_selection_events）
    const { data: userRows } = await supabase
      .from('card_selection_events')
      .select('user_id');
    const uniqueUsers = new Set((userRows || []).map((r) => r.user_id)).size;

    return { totalExecutions, completedExecutions, totalCardClicks, uniqueUsers };
  } catch (error) {
    console.error('getContactFlowKpi error:', error);
    return { totalExecutions: 0, completedExecutions: 0, totalCardClicks: 0, uniqueUsers: 0 };
  }
}
