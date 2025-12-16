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
          <p className="text-slate-600 text-lg">読み込み中...</p>
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
    <div className="min-h-screen pb-12">
      <section id="overview" className="relative overflow-hidden bg-gradient-to-r from-[#1f2d3d] via-[#2c3a4a] to-[#409eff] text-white shadow-[0_25px_70px_rgba(0,0,0,0.18)]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.15),transparent_25%)]" />
        <div className="max-w-7xl mx-auto px-8 py-9 relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.18em] uppercase text-white/70">Vue Element Admin Inspired</p>
            <h1 className="text-3xl md:text-4xl font-black drop-shadow-sm">YOLO JAPAN LINE Bot Control Center</h1>
            <p className="text-white/80 max-w-3xl">
              vue-element-admin のダッシュボードを意識したレイアウトで、リアルタイムの KPI とユーザー行動をすばやく把握できます。
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="dashboard-chip bg-white/10 border-white/20 text-white">運用中</span>
              {stats && (
                <span className="dashboard-chip bg-white/10 border-white/20 text-white">
                  👥 {stats.totalUsers.toLocaleString()} ユーザー
                </span>
              )}
              <span className="dashboard-chip bg-white/10 border-white/20 text-white">更新頻度: リアルタイム</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20 transition"
            >
              🔄 最新に更新
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#1f2d3d] px-4 py-3 text-sm font-semibold shadow-lg shadow-black/10 hover:-translate-y-0.5 transition"
            >
              📄 レポート出力
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 -mt-10 space-y-8 relative z-10">
        <section className="dashboard-panel p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#409eff] to-[#66b1ff] text-white flex items-center justify-center shadow-lg shadow-[#409eff]/30">
              ⚡
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">リアルタイムモニター</p>
              <p className="text-xs text-slate-500">バックエンド API から最新データを取得しています</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="dashboard-chip">期間: 過去30日</span>
            <span className="dashboard-chip">環境: Production</span>
            <span className="dashboard-chip">データソース: LINE / GA4</span>
          </div>
        </section>

        <SummaryCards stats={stats} />

        {analytics && (
          <section id="analytics" className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-6">
              <LanguageChart data={analytics.languages} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <JapaneseLevelChart data={analytics.levels} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <IndustryChart data={analytics.industries} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <RegionChart data={analytics.regions} />
            </div>
          </section>
        )}

        {analytics && (
          <section id="trends" className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-8">
              <UserTrendChart data={analytics.trend} />
            </div>
            <div className="col-span-12 xl:col-span-4">
              <UsageTrendChart data={analytics.usageTrend} />
            </div>
          </section>
        )}

        {ga4Data && (
          <section id="ga4" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Google Analytics 4</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">LINE CV オペレーションビュー</h2>
              </div>
              <span className="dashboard-chip">流入別 / CVR</span>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5">
                <GA4ConversionPieChart data={ga4Data.bySource} />
              </div>
              <div className="col-span-12 lg:col-span-7">
                <div className="dashboard-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Traffic sources</p>
                      <h3 className="text-lg font-semibold text-slate-900">流入元別 CV 詳細</h3>
                    </div>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-full">
                      CV ボリュームを可視化
                    </span>
                  </div>
                  <div className="space-y-3">
                    {ga4Data.bySource.map((item, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white shadow-inner shadow-slate-100/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800">{item.source}</span>
                          <span className="text-xl font-bold text-purple-600">{item.conversions.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                            <div className="text-blue-600 text-xs font-semibold">登録 CV</div>
                            <div className="text-blue-900 text-lg font-bold">{item.registrations.toLocaleString()}</div>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
                            <div className="text-emerald-600 text-xs font-semibold">応募 CV</div>
                            <div className="text-emerald-900 text-lg font-bold">{item.applications.toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-slate-500">セッション</div>
                            <div className="font-semibold text-slate-800">{item.sessions.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">CVR</div>
                            <div className="font-semibold text-slate-800">{((item.conversions / item.sessions) * 100).toFixed(2)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-500">滞在時間</div>
                            <div className="font-semibold text-slate-800">{Math.floor(item.averageSessionDuration)}秒</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div className="text-slate-500">エンゲージメント率</div>
                          <div className="font-semibold text-slate-800">{(item.engagementRate * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <GA4ConversionTrendChart data={ga4Data.dailyTrends} />
          </section>
        )}

        <section id="ranking">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 xl:col-span-5">
              <TopUsersRanking data={ranking} />
            </div>
          </div>
        </section>

        <section id="activity">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12">
              <ActivityTable data={activity} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
