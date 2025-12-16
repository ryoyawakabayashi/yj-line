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

    const totalDiagnosis = statsData?.reduce((sum, row) => sum + (row.diagnosis_count || 0), 0) || 0;
    const totalAIChats = statsData?.reduce((sum, row) => sum + (row.ai_chat_count || 0), 0) || 0;

    // 本日のアクティブユーザー数
    const today = new Date().toISOString().split('T')[0];
    const { count: todayActiveUsers } = await supabase
      .from('user_status')
      .select('*', { count: 'exact', head: true })
      .gte('last_used', today);

    return {
      totalUsers: totalUsers || 0,
      totalDiagnosis,
      totalAIChats,
      todayActiveUsers: todayActiveUsers || 0,
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return {
      totalUsers: 0,
      totalDiagnosis: 0,
      totalAIChats: 0,
      todayActiveUsers: 0,
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

    // カンマ区切りを展開してカウント
    const industryCounts: Record<string, number> = {};
    data.forEach((row) => {
      if (row.q6_industry) {
        row.q6_industry.split(',').forEach((industry: string) => {
          const trimmed = industry.trim();
          industryCounts[trimmed] = (industryCounts[trimmed] || 0) + 1;
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
