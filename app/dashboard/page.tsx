'use client';

import { useState, useEffect } from 'react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { LanguageChart } from '@/components/dashboard/LanguageChart';
import { JapaneseLevelChart } from '@/components/dashboard/JapaneseLevelChart';
import { IndustryChart } from '@/components/dashboard/IndustryChart';
import { RegionChart } from '@/components/dashboard/RegionChart';
import { UserTrendChart } from '@/components/dashboard/UserTrendChart';
import { UsageTrendChart } from '@/components/dashboard/UsageTrendChart';
import { TopUsersRanking } from '@/components/dashboard/TopUsersRanking';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import { GA4ConversionPieChart } from '@/components/dashboard/GA4ConversionPieChart';
import { GA4ConversionTrendChart } from '@/components/dashboard/GA4ConversionTrendChart';
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
  GA4ConversionBySource,
  GA4DailyConversion,
} from '@/types/dashboard';

interface Analytics {
  languages: LanguageDistribution[];
  levels: LevelDistribution[];
  industries: IndustryDistribution[];
  regions: RegionDistribution[];
  trend: DailyTrend[];
  usageTrend: DailyUsageTrend[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [ranking, setRanking] = useState<TopUser[]>([]);
  const [ga4Data, setGa4Data] = useState<{
    bySource: GA4ConversionBySource[];
    dailyTrends: GA4DailyConversion[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [statsRes, analyticsRes, activityRes, rankingRes, ga4Res] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/analytics'),
          fetch('/api/dashboard/users?limit=20'),
          fetch('/api/dashboard/ranking?limit=10'),
          fetch('/api/dashboard/ga4-conversions?days=30&type=both'),
        ]);

        if (!statsRes.ok || !analyticsRes.ok || !activityRes.ok || !rankingRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const statsData = await statsRes.json();
        const analyticsData = await analyticsRes.json();
        const activityData = await activityRes.json();
        const rankingData = await rankingRes.json();

        setStats(statsData);
        setAnalytics(analyticsData);
        setActivity(activityData);
        setRanking(rankingData);

        // GA4 data is optional - don't fail if it's not available
        if (ga4Res.ok) {
          const ga4Response = await ga4Res.json();
          setGa4Data(ga4Response);
        } else {
          console.warn('GA4 data not available');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 max-w-md">
          <h2 className="text-red-800 text-xl font-bold mb-2">エラーが発生しました</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">YOLO JAPAN LINE Bot Dashboard</h1>
            <p className="text-gray-600 mt-2">リアルタイム統計とユーザー分析</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 更新
          </button>
        </div>

        {/* Summary Cards */}
        <SummaryCards stats={stats} />

        {/* Charts - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {analytics && (
            <>
              <LanguageChart data={analytics.languages} />
              <JapaneseLevelChart data={analytics.levels} />
            </>
          )}
        </div>

        {/* Charts - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {analytics && (
            <>
              <IndustryChart data={analytics.industries} />
              <RegionChart data={analytics.regions} />
            </>
          )}
        </div>

        {/* User Trend Chart - Full Width */}
        {analytics && <UserTrendChart data={analytics.trend} />}

        {/* Usage Trend Chart - Full Width */}
        {analytics && <UsageTrendChart data={analytics.usageTrend} />}

        {/* GA4 Analytics Section */}
        {ga4Data && (
          <>
            <div className="border-t-4 border-purple-500 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Google Analytics 4 - LINE CV データ</h2>
            </div>

            {/* GA4 Charts - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GA4ConversionPieChart data={ga4Data.bySource} />
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">流入元別 CV 詳細</h3>
                <div className="space-y-3">
                  {ga4Data.bySource.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">{item.source}</span>
                        <span className="text-xl font-bold text-purple-600">{item.conversions.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm mt-2">
                        <div>
                          <div className="text-gray-500">セッション</div>
                          <div className="font-semibold text-gray-700">{item.sessions.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">CVR</div>
                          <div className="font-semibold text-gray-700">{((item.conversions / item.sessions) * 100).toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">滞在時間</div>
                          <div className="font-semibold text-gray-700">{Math.floor(item.averageSessionDuration)}秒</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-gray-500 text-sm">エンゲージメント率</div>
                        <div className="font-semibold text-gray-700">{(item.engagementRate * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GA4 Trend Chart - Full Width */}
            <GA4ConversionTrendChart data={ga4Data.dailyTrends} />
          </>
        )}

        {/* Top Users Ranking - Full Width */}
        <TopUsersRanking data={ranking} />

        {/* Activity Table - Full Width */}
        <ActivityTable data={activity} />
      </div>
    </div>
  );
}
