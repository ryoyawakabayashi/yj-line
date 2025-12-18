import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats, getDashboardStatsByMonth } from '@/lib/database/dashboard-queries';
import { getFollowerStatistics, getFollowersAddedByDateRange } from '@/lib/line/client';
import { getSessionsByDateRange, getYjYdConversionsByDateRange, getDiagnosisFunnelMetricsByDateRange } from '@/lib/ga4/queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM format
    const period = searchParams.get('period'); // today, yesterday

    // 本日・昨日・週間・2週間指定の場合
    if (period === 'today' || period === 'yesterday' || period === 'week' || period === '2week') {
      const now = new Date();
      let startDate: string;
      let endDate: string;

      if (period === 'today') {
        startDate = now.toISOString().split('T')[0];
        endDate = startDate;
      } else if (period === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = startDate;
      } else if (period === 'week') {
        endDate = now.toISOString().split('T')[0];
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        startDate = start.toISOString().split('T')[0];
      } else {
        // 2week
        endDate = now.toISOString().split('T')[0];
        const start = new Date(now);
        start.setDate(start.getDate() - 13);
        startDate = start.toISOString().split('T')[0];
      }

      // LINE Insight APIは前日までのデータしか取得できないため、日付を調整
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // LINE友だち追加数用の日付範囲
      let lineStartDate = startDate;
      let lineEndDate = endDate > yesterdayStr ? yesterdayStr : endDate;

      // 「今日」の場合は友だち追加数を取得不可（null）
      // それ以外の期間では通常通り取得
      let followersAdded: number | null = null;
      if (period !== 'today') {
        if (lineStartDate > yesterdayStr) {
          lineStartDate = yesterdayStr;
        }
        followersAdded = await getFollowersAddedByDateRange(lineStartDate, lineEndDate);
      }

      const [stats, lineStats, sessions, yjYdTotals, funnelMetrics] = await Promise.all([
        getDashboardStatsByMonth(startDate, endDate),
        getFollowerStatistics(),
        getSessionsByDateRange(startDate, endDate),
        getYjYdConversionsByDateRange(startDate, endDate),
        getDiagnosisFunnelMetricsByDateRange(startDate, endDate),
      ]);

      // LINE友だち数: LINE Insight APIから取得（昨日時点の累計）
      // 0の場合はそのまま0を表示（DBユーザー数とは別の指標）
      const enrichedStats = {
        ...stats,
        lineFollowers: lineStats?.followers || 0,
        lineFollowersAdded: followersAdded, // 「今日」の場合はnull
        sessions,
        yjRegistrations: yjYdTotals.yjRegistrations,
        yjApplications: yjYdTotals.yjApplications,
        ydRegistrations: yjYdTotals.ydRegistrations,
        ydApplications: yjYdTotals.ydApplications,
        siteTransitionSessions: funnelMetrics.sessions,
        siteTransitionUsers: funnelMetrics.activeUsers,
      };

      return NextResponse.json(enrichedStats);
    }

    if (month) {
      // 月指定の場合
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = `${month}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // 月末

      // LINE Insight APIは前日までのデータしか取得できないため、endDateを調整
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lineEndDate = endDate > yesterday.toISOString().split('T')[0]
        ? yesterday.toISOString().split('T')[0]
        : endDate;

      const [stats, lineStats, sessions, yjYdTotals, funnelMetrics, followersAdded] = await Promise.all([
        getDashboardStatsByMonth(startDate, endDate),
        getFollowerStatistics(),
        getSessionsByDateRange(startDate, endDate),
        getYjYdConversionsByDateRange(startDate, endDate),
        getDiagnosisFunnelMetricsByDateRange(startDate, endDate),
        getFollowersAddedByDateRange(startDate, lineEndDate),
      ]);

      // LINE友だち数: LINE Insight APIから取得（昨日時点の累計）
      const enrichedStats = {
        ...stats,
        lineFollowers: lineStats?.followers || 0,
        lineFollowersAdded: followersAdded,
        sessions,
        yjRegistrations: yjYdTotals.yjRegistrations,
        yjApplications: yjYdTotals.yjApplications,
        ydRegistrations: yjYdTotals.ydRegistrations,
        ydApplications: yjYdTotals.ydApplications,
        siteTransitionSessions: funnelMetrics.sessions,
        siteTransitionUsers: funnelMetrics.activeUsers,
      };

      return NextResponse.json(enrichedStats);
    }

    // デフォルト（過去30日）
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDateObj = new Date(now);
    startDateObj.setDate(startDateObj.getDate() - 29); // 30日間
    const startDate = startDateObj.toISOString().split('T')[0];

    // LINE Insight APIは前日までのデータしか取得できないため、endDateを調整
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lineEndDate = yesterday.toISOString().split('T')[0];

    const [stats, lineStats, sessions, yjYdTotals, funnelMetrics, followersAdded] = await Promise.all([
      getDashboardStats(),
      getFollowerStatistics(),
      getSessionsByDateRange(startDate, endDate),
      getYjYdConversionsByDateRange(startDate, endDate),
      getDiagnosisFunnelMetricsByDateRange(startDate, endDate),
      getFollowersAddedByDateRange(startDate, lineEndDate),
    ]);

    // LINE友だち数: LINE Insight APIから取得（昨日時点の累計）
    const enrichedStats = {
      ...stats,
      lineFollowers: lineStats?.followers || 0,
      lineFollowersAdded: followersAdded,
      sessions,
      yjRegistrations: yjYdTotals.yjRegistrations,
      yjApplications: yjYdTotals.yjApplications,
      ydRegistrations: yjYdTotals.ydRegistrations,
      ydApplications: yjYdTotals.ydApplications,
      siteTransitionSessions: funnelMetrics.sessions,
      siteTransitionUsers: funnelMetrics.activeUsers,
    };

    return NextResponse.json(enrichedStats);
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
