import { NextRequest, NextResponse } from 'next/server';
import {
  getDashboardStats,
  getDashboardStatsByMonth,
  getUsersByLanguage,
  getJapaneseLevelDistribution,
  getIndustryDistribution,
  getRegionDistribution,
  getDailyUserTrend,
  getDailyDiagnosisTrend,
  getTopUsers,
} from '@/lib/database/dashboard-queries';
import {
  getConversionsBySource,
  getDailyConversionTrends,
  getYjYdConversionsByDateRange,
  getFunnelSessionsByDateRange,
  getFunnelConversionsByDateRange,
  getDiagnosisFunnelMetricsByDateRange,
  getDiagnosisFunnelConversionsByDateRange,
} from '@/lib/ga4/queries';
import { getFollowerStatistics } from '@/lib/line/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 日付ヘルパー
function getDateRange(period: string): { startDate: string; endDate: string; prevStartDate: string; prevEndDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  let daysBack = 1;
  if (period === 'week') daysBack = 7;
  if (period === '2week') daysBack = 14;
  if (period === 'month') daysBack = 30;

  const startDateObj = new Date(today);
  startDateObj.setDate(startDateObj.getDate() - daysBack + 1);
  const startDate = startDateObj.toISOString().split('T')[0];

  // 前期間（比較用）
  const prevEndDateObj = new Date(startDateObj);
  prevEndDateObj.setDate(prevEndDateObj.getDate() - 1);
  const prevEndDate = prevEndDateObj.toISOString().split('T')[0];

  const prevStartDateObj = new Date(prevEndDateObj);
  prevStartDateObj.setDate(prevStartDateObj.getDate() - daysBack + 1);
  const prevStartDate = prevStartDateObj.toISOString().split('T')[0];

  return { startDate, endDate, prevStartDate, prevEndDate };
}

// 変化率を計算
function calcChange(current: number, previous: number): { changePercent: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { changePercent: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  const change = ((current - previous) / previous) * 100;
  return {
    changePercent: Math.abs(Math.round(change * 10) / 10),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'today';

    const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period);
    const days = period === 'month' ? 30 : period === '2week' ? 14 : period === 'week' ? 7 : 1;

    // 並列でデータ取得
    const [
      currentStats,
      prevStats,
      languages,
      levels,
      industries,
      regions,
      userTrend,
      diagnosisTrend,
      conversionsBySource,
      conversionTrends,
      yjYdTotals,
      lineFollowers,
      topUsers,
      totalStats,
      // ファネル用データ（menu, chatbot, messageのみ）
      funnelSessions,
      funnelConversions,
      // 診断ファネル用データ（chatbotのみ）
      diagnosisFunnelMetrics,
      prevDiagnosisFunnelMetrics,
      diagnosisFunnelConversions,
    ] = await Promise.all([
      getDashboardStatsByMonth(startDate, endDate),
      getDashboardStatsByMonth(prevStartDate, prevEndDate),
      getUsersByLanguage(),
      getJapaneseLevelDistribution(),
      getIndustryDistribution(),
      getRegionDistribution(),
      getDailyUserTrend(days),
      getDailyDiagnosisTrend(days),
      getConversionsBySource(days),
      getDailyConversionTrends(days),
      getYjYdConversionsByDateRange(startDate, endDate),
      getFollowerStatistics(),
      getTopUsers(5),
      getDashboardStats(), // 累計データ
      // ファネル専用（LINE Bot経由のみ: menu, chatbot, message）
      getFunnelSessionsByDateRange(startDate, endDate),
      getFunnelConversionsByDateRange(startDate, endDate),
      // 診断ファネル専用（chatbotのみ: 診断→サイト遷移→CV）
      // sessions = クリック数, activeUsers = ユニークユーザー数
      getDiagnosisFunnelMetricsByDateRange(startDate, endDate),
      getDiagnosisFunnelMetricsByDateRange(prevStartDate, prevEndDate),
      getDiagnosisFunnelConversionsByDateRange(startDate, endDate),
    ]);

    // 変化率を計算（セッションはchatbot-onlyを使用）
    const changes = {
      activeUsers: calcChange(currentStats.todayActiveUsers, prevStats.todayActiveUsers),
      diagnosisCount: calcChange(currentStats.totalDiagnosis, prevStats.totalDiagnosis),
      diagnosisUsers: calcChange(currentStats.diagnosisUserCount, prevStats.diagnosisUserCount),
      sessions: calcChange(diagnosisFunnelMetrics.sessions, prevDiagnosisFunnelMetrics.sessions),
      yjRegistrations: calcChange(yjYdTotals.yjRegistrations, 0), // TODO: 前期間比較
      yjApplications: calcChange(yjYdTotals.yjApplications, 0),
      ydRegistrations: calcChange(yjYdTotals.ydRegistrations, 0),
      ydApplications: calcChange(yjYdTotals.ydApplications, 0),
    };

    // ファネル転換率（歩留まり表用）
    // 診断ファネル: アクティブ → 診断実施 → サイト遷移(chatbot) → CV
    // ※サイト遷移はユニークユーザー数（activeUsers）を使用（セッション数だと複数クリックで100%超える）
    const diagnosisTotalCV = diagnosisFunnelConversions.yjRegistrations + diagnosisFunnelConversions.yjApplications + diagnosisFunnelConversions.ydRegistrations + diagnosisFunnelConversions.ydApplications;
    const funnel = {
      // 各ステージの実数
      activeUsers: currentStats.todayActiveUsers,
      diagnosisUsers: currentStats.diagnosisUserCount,
      // サイト遷移（line/chatbot経由）
      siteTransitionSessions: diagnosisFunnelMetrics.sessions,      // セッション数（クリック数）
      siteTransitionUsers: diagnosisFunnelMetrics.activeUsers,      // ユニークユーザー数
      totalCV: diagnosisTotalCV,
      // CV内訳（診断経由のみ）
      yjRegistrations: diagnosisFunnelConversions.yjRegistrations,
      yjApplications: diagnosisFunnelConversions.yjApplications,
      ydRegistrations: diagnosisFunnelConversions.ydRegistrations,
      ydApplications: diagnosisFunnelConversions.ydApplications,
      // 歩留まり率
      diagnosisRate: currentStats.todayActiveUsers > 0
        ? Math.round((currentStats.diagnosisUserCount / currentStats.todayActiveUsers) * 1000) / 10
        : 0,
      // 診断実施 → サイト遷移（診断結果URLクリックしたユニークユーザー）
      siteTransitionRate: currentStats.diagnosisUserCount > 0
        ? Math.round((diagnosisFunnelMetrics.activeUsers / currentStats.diagnosisUserCount) * 1000) / 10
        : 0,
      // サイト遷移 → CV（ユニークユーザーベース）
      siteTransitionCVRate: diagnosisFunnelMetrics.activeUsers > 0
        ? Math.round((diagnosisTotalCV / diagnosisFunnelMetrics.activeUsers) * 1000) / 10
        : 0,
      // 全体転換率
      overallCVRate: currentStats.todayActiveUsers > 0
        ? Math.round((diagnosisTotalCV / currentStats.todayActiveUsers) * 1000) / 10
        : 0,
    };

    // トレンドから異常検知
    const anomalies = detectAnomalies(conversionTrends, diagnosisTrend);

    return NextResponse.json({
      period: {
        type: period,
        startDate,
        endDate,
        label: period === 'today' ? '本日' : period === 'week' ? '過去7日間' : period === '2week' ? '過去14日間' : '過去30日間',
      },

      // 主要KPI（現在値 + 変化）- セッションはchatbot-only（診断経由）
      kpi: {
        activeUsers: { value: currentStats.todayActiveUsers, ...changes.activeUsers },
        diagnosisCount: { value: currentStats.totalDiagnosis, ...changes.diagnosisCount },
        diagnosisUsers: { value: currentStats.diagnosisUserCount, ...changes.diagnosisUsers },
        sessions: { value: diagnosisFunnelMetrics.sessions, ...changes.sessions },
        yjRegistrations: { value: yjYdTotals.yjRegistrations, ...changes.yjRegistrations },
        yjApplications: { value: yjYdTotals.yjApplications, ...changes.yjApplications },
        ydRegistrations: { value: yjYdTotals.ydRegistrations, ...changes.ydRegistrations },
        ydApplications: { value: yjYdTotals.ydApplications, ...changes.ydApplications },
        repeatRate: { value: currentStats.repeatRate, direction: 'flat' as const },
        lineFollowers: { value: lineFollowers?.followers || 0, direction: 'flat' as const },
      },

      // 累計データ
      totals: {
        totalUsers: totalStats.totalUsers,
        totalDiagnosis: totalStats.totalDiagnosis,
        totalAIChats: totalStats.totalAIChats,
      },

      // ファネル
      funnel,

      // セグメント分布
      segments: {
        languages: languages.slice(0, 5),
        japaneseLevel: levels,
        industries: industries.slice(0, 5),
        regions: regions.slice(0, 5),
      },

      // トレンド（日別推移）
      trends: {
        users: userTrend,
        diagnosis: diagnosisTrend,
        conversions: conversionTrends.map(d => ({
          date: d.date,
          yjRegistrations: d.yjRegistrations,
          yjApplications: d.yjApplications,
          ydRegistrations: d.ydRegistrations,
          ydApplications: d.ydApplications,
          sessions: d.sessions,
        })),
      },

      // ソース別分析
      sourceAnalysis: conversionsBySource.slice(0, 5).map(s => ({
        source: s.source,
        sessions: s.sessions,
        yjRegistrations: s.yjRegistrations,
        yjApplications: s.yjApplications,
        ydRegistrations: s.ydRegistrations,
        ydApplications: s.ydApplications,
        engagementRate: s.engagementRate,
      })),

      // トップユーザー
      topUsers: topUsers.map(u => ({
        userId: u.userId.slice(0, 8) + '...', // プライバシー保護
        lang: u.lang,
        diagnosisCount: u.diagnosisCount,
        aiChatCount: u.aiChatCount,
      })),

      // 異常・注目ポイント
      anomalies,
    });
  } catch (error) {
    console.error('AI Context API error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI context' }, { status: 500 });
  }
}

// 異常検知
function detectAnomalies(
  conversionTrends: Array<{ date: string; yjRegistrations: number; yjApplications: number; sessions: number }>,
  diagnosisTrend: Array<{ date: string; diagnosisCount: number }>
): string[] {
  const anomalies: string[] = [];

  if (conversionTrends.length < 3) return anomalies;

  // 直近3日の平均と比較
  const recent = conversionTrends.slice(-3);
  const earlier = conversionTrends.slice(-7, -3);

  if (earlier.length > 0) {
    const recentAvgReg = recent.reduce((sum, d) => sum + d.yjRegistrations, 0) / recent.length;
    const earlierAvgReg = earlier.reduce((sum, d) => sum + d.yjRegistrations, 0) / earlier.length;

    if (earlierAvgReg > 0 && recentAvgReg < earlierAvgReg * 0.5) {
      anomalies.push('直近3日間のYJ登録数が、その前4日間と比較して50%以上減少しています');
    }
    if (earlierAvgReg > 0 && recentAvgReg > earlierAvgReg * 1.5) {
      anomalies.push('直近3日間のYJ登録数が、その前4日間と比較して50%以上増加しています');
    }
  }

  // 診断数の変動
  if (diagnosisTrend.length >= 7) {
    const recentDiag = diagnosisTrend.slice(-3);
    const earlierDiag = diagnosisTrend.slice(-7, -3);

    const recentAvgDiag = recentDiag.reduce((sum, d) => sum + d.diagnosisCount, 0) / recentDiag.length;
    const earlierAvgDiag = earlierDiag.reduce((sum, d) => sum + d.diagnosisCount, 0) / earlierDiag.length;

    if (earlierAvgDiag > 0 && recentAvgDiag < earlierAvgDiag * 0.5) {
      anomalies.push('直近3日間の診断実施数が大幅に減少しています');
    }
  }

  return anomalies;
}
