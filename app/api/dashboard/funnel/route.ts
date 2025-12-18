import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { getYjYdConversionsByDateRange, getDiagnosisFunnelMetricsByDateRange, getFunnelMetricsByType, getAllFunnelMetricsByDateRange } from '@/lib/ga4/queries';
import { getFollowersAddedByDateRange } from '@/lib/line/client';
import { FUNNEL_LABELS, type FunnelType } from '@/lib/ga4/config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM format
    const period = searchParams.get('period'); // today, yesterday
    const funnelType = searchParams.get('type') as FunnelType | null; // diagnosis, menu, feature, message, autochat
    const allTypes = searchParams.get('all') === 'true'; // 全ファネル一括取得

    // 日付範囲を計算
    let startDate: string;
    let endDate: string;

    if (period === 'today') {
      const now = new Date();
      startDate = now.toISOString().split('T')[0];
      endDate = startDate;
    } else if (period === 'yesterday') {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = yesterday.toISOString().split('T')[0];
      endDate = startDate;
    } else if (period === 'week') {
      const now = new Date();
      endDate = now.toISOString().split('T')[0];
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      startDate = start.toISOString().split('T')[0];
    } else if (period === '2week') {
      const now = new Date();
      endDate = now.toISOString().split('T')[0];
      const start = new Date(now);
      start.setDate(start.getDate() - 13);
      startDate = start.toISOString().split('T')[0];
    } else if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      startDate = `${month}-01`;
      endDate = new Date(year, monthNum, 0).toISOString().split('T')[0]; // 月末
    } else {
      // デフォルトは当月
      const now = new Date();
      const year = now.getFullYear();
      const monthNum = now.getMonth() + 1;
      startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
    }

    // LINE Insight APIは前日までのデータしか取得できないため、日付を調整
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // LINE友だち追加数用の日付範囲
    let lineStartDate = startDate;
    let lineEndDate = endDate > yesterdayStr ? yesterdayStr : endDate;

    // 「今日」の場合は友だち追加数を取得不可（null）
    let followersAdded: number | null = null;
    if (period !== 'today') {
      if (lineStartDate > yesterdayStr) {
        lineStartDate = yesterdayStr;
      }
      followersAdded = await getFollowersAddedByDateRange(lineStartDate, lineEndDate);
    }

    // 全ファネル一括取得モード
    if (allTypes) {
      const [
        activeUsersResult,
        diagnosisData,
        diagnosisCountResult,
        allFunnelMetrics,
      ] = await Promise.all([
        supabase
          .from('user_status')
          .select('*', { count: 'exact', head: true })
          .gte('last_used', startDate)
          .lte('last_used', endDate + 'T23:59:59'),
        supabase
          .from('diagnosis_results')
          .select('user_id')
          .gte('timestamp', startDate)
          .lte('timestamp', endDate + 'T23:59:59'),
        supabase
          .from('diagnosis_results')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', startDate)
          .lte('timestamp', endDate + 'T23:59:59'),
        getAllFunnelMetricsByDateRange(startDate, endDate),
      ]);

      const activeUsers = activeUsersResult.count || 0;
      const userDiagnosisCounts: Record<string, number> = {};
      diagnosisData.data?.forEach(d => {
        userDiagnosisCounts[d.user_id] = (userDiagnosisCounts[d.user_id] || 0) + 1;
      });
      const diagnosisUsers = Object.keys(userDiagnosisCounts).length;
      const repeatUsers = Object.values(userDiagnosisCounts).filter(count => count >= 2).length;
      const diagnosisCount = diagnosisCountResult.count || 0;

      // 各ファネルタイプのデータを構築
      const funnelTypes: FunnelType[] = ['diagnosis', 'menu', 'feature', 'message', 'autochat'];
      const allFunnels = funnelTypes.map((type) => {
        const metrics = allFunnelMetrics[type];
        return {
          type,
          label: FUNNEL_LABELS[type],
          sessions: metrics.sessions,
          activeUsers: metrics.activeUsers,
          yjRegistrations: metrics.yjRegistrations,
          yjApplications: metrics.yjApplications,
          totalCV: metrics.yjRegistrations + metrics.yjApplications,
        };
      });

      return NextResponse.json({
        allFunnels,
        period: { startDate, endDate },
        summary: {
          activeUsers,
          diagnosisUsers,
          diagnosisCount,
          repeatUsers,
          repeatRate: diagnosisUsers > 0 ? Math.round((repeatUsers / diagnosisUsers) * 100 * 10) / 10 : 0,
          followersAdded,
        },
      });
    }

    // 特定ファネルタイプ指定モード（type パラメータ）
    const targetFunnelType: FunnelType = funnelType && ['diagnosis', 'menu', 'feature', 'message', 'autochat'].includes(funnelType)
      ? funnelType
      : 'diagnosis';

    // 並列でデータ取得
    const [
      activeUsersResult,
      diagnosisData,
      diagnosisCountResult,
      funnelMetrics,
      yjYdTotals,
    ] = await Promise.all([
      // 1. アクティブユーザー数
      supabase
        .from('user_status')
        .select('*', { count: 'exact', head: true })
        .gte('last_used', startDate)
        .lte('last_used', endDate + 'T23:59:59'),
      // 2. 診断実施ユーザー（ユニーク）- リピート計算にも使用
      supabase
        .from('diagnosis_results')
        .select('user_id')
        .gte('timestamp', startDate)
        .lte('timestamp', endDate + 'T23:59:59'),
      // 3. 診断数（総数）
      supabase
        .from('diagnosis_results')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', startDate)
        .lte('timestamp', endDate + 'T23:59:59'),
      // 4. セッション数（指定されたファネルタイプのGA4データ）
      getFunnelMetricsByType(targetFunnelType, startDate, endDate),
      // 5. CV数（GA4 - 全体）
      getYjYdConversionsByDateRange(startDate, endDate),
    ]);

    const activeUsers = activeUsersResult.count || 0;

    // 診断データからユニークユーザーとリピートユーザーを計算
    const userDiagnosisCounts: Record<string, number> = {};
    diagnosisData.data?.forEach(d => {
      userDiagnosisCounts[d.user_id] = (userDiagnosisCounts[d.user_id] || 0) + 1;
    });
    const diagnosisUsers = Object.keys(userDiagnosisCounts).length;
    // 期間内に2回以上診断したユーザー数
    const repeatUsers = Object.values(userDiagnosisCounts).filter(count => count >= 2).length;

    const diagnosisCount = diagnosisCountResult.count || 0;
    const sessions = funnelMetrics.sessions;

    // ファネルの起点を決定（診断ファネル以外はセッションから開始）
    const isDiagnosisFunnel = targetFunnelType === 'diagnosis';
    const startCount = isDiagnosisFunnel ? diagnosisUsers : sessions;
    const startLabel = isDiagnosisFunnel ? '診断人数' : 'セッション';
    const startDescription = isDiagnosisFunnel ? '診断を実施した人数' : `${FUNNEL_LABELS[targetFunnelType]}からのクリック`;

    // CVファネル構築
    const funnel = isDiagnosisFunnel
      ? [
          {
            stage: '診断人数',
            count: diagnosisUsers,
            rate: 100,
            color: '#f59e0b',
            description: '診断を実施した人数',
          },
          {
            stage: 'セッション',
            count: sessions,
            rate: diagnosisUsers > 0 ? Math.round((sessions / diagnosisUsers) * 100 * 10) / 10 : 0,
            color: '#3b82f6',
            description: '診断経由のクリック',
          },
          {
            stage: '登録',
            count: funnelMetrics.yjRegistrations,
            rate: sessions > 0 ? Math.round((funnelMetrics.yjRegistrations / sessions) * 100 * 10) / 10 : 0,
            color: '#0ea5e9',
            description: 'YJ新規登録',
          },
          {
            stage: '応募',
            count: funnelMetrics.yjApplications,
            rate: sessions > 0 ? Math.round((funnelMetrics.yjApplications / sessions) * 100 * 10) / 10 : 0,
            color: '#0284c7',
            description: 'YJ応募完了',
          },
        ]
      : [
          {
            stage: 'セッション',
            count: sessions,
            rate: 100,
            color: '#3b82f6',
            description: `${FUNNEL_LABELS[targetFunnelType]}からのクリック`,
          },
          {
            stage: '登録',
            count: funnelMetrics.yjRegistrations,
            rate: sessions > 0 ? Math.round((funnelMetrics.yjRegistrations / sessions) * 100 * 10) / 10 : 0,
            color: '#0ea5e9',
            description: 'YJ新規登録',
          },
          {
            stage: '応募',
            count: funnelMetrics.yjApplications,
            rate: sessions > 0 ? Math.round((funnelMetrics.yjApplications / sessions) * 100 * 10) / 10 : 0,
            color: '#0284c7',
            description: 'YJ応募完了',
          },
        ];

    // 診断指標（期間内のデータに基づく）
    const diagnosis = {
      diagnosisUsers,
      diagnosisCount,
      repeatUsers,
      repeatRate: diagnosisUsers > 0 ? Math.round((repeatUsers / diagnosisUsers) * 100 * 10) / 10 : 0,
    };

    return NextResponse.json({
      funnel,
      funnelType: targetFunnelType,
      funnelLabel: FUNNEL_LABELS[targetFunnelType],
      diagnosis,
      month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      period: { startDate, endDate },
      breakdown: {
        activeUsers,
        followersAdded,
        diagnosisUsers,
        diagnosisCount,
        sessions,
        siteTransitionUsers: funnelMetrics.activeUsers,
        yjRegistrations: funnelMetrics.yjRegistrations,
        yjApplications: funnelMetrics.yjApplications,
        totalCV: funnelMetrics.yjRegistrations + funnelMetrics.yjApplications,
      },
      rates: {
        diagnosisSessionRate: diagnosisUsers > 0 ? Math.round((sessions / diagnosisUsers) * 100 * 10) / 10 : 0,
        sessionRegistrationRate: sessions > 0 ? Math.round((funnelMetrics.yjRegistrations / sessions) * 100 * 10) / 10 : 0,
        sessionApplicationRate: sessions > 0 ? Math.round((funnelMetrics.yjApplications / sessions) * 100 * 10) / 10 : 0,
        overallCVRate: startCount > 0 ? Math.round(((funnelMetrics.yjRegistrations + funnelMetrics.yjApplications) / startCount) * 100 * 10) / 10 : 0,
      },
    });
  } catch (error) {
    console.error('Funnel API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    );
  }
}
