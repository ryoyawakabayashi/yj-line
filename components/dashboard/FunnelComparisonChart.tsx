'use client';

import { useState, useEffect } from 'react';
import { FunnelIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

type PeriodType = 'today' | 'yesterday' | 'week' | '2week' | 'month';

interface FunnelMetrics {
  type: string;
  label: string;
  sessions: number;
  activeUsers: number;
  yjRegistrations: number;
  yjApplications: number;
  totalCV: number;
}

interface AllFunnelsData {
  allFunnels: FunnelMetrics[];
  period: { startDate: string; endDate: string };
  summary: {
    activeUsers: number;
    diagnosisUsers: number;
    diagnosisCount: number;
    repeatUsers: number;
    repeatRate: number;
    followersAdded: number | null;
  };
}

interface FunnelComparisonChartProps {
  month?: string;
  periodType?: PeriodType;
}

export function FunnelComparisonChart({ month, periodType = 'month' }: FunnelComparisonChartProps) {
  const [data, setData] = useState<AllFunnelsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [month, periodType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();

      if (periodType === 'today') {
        searchParams.set('period', 'today');
      } else if (periodType === 'yesterday') {
        searchParams.set('period', 'yesterday');
      } else if (periodType === 'week') {
        searchParams.set('period', 'week');
      } else if (periodType === '2week') {
        searchParams.set('period', '2week');
      } else if (month) {
        searchParams.set('month', month);
      }

      searchParams.set('all', 'true');

      const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await fetch(`/api/dashboard/funnel${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch all funnels data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <FunnelIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">経由別CV比較</h3>
            <p className="text-xs text-slate-500">全経由のセッション→登録→応募</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-panel p-6">
        <div className="h-64 flex items-center justify-center text-slate-400">
          データを取得できませんでした
        </div>
      </div>
    );
  }

  // 全経由の合計を計算
  const totals = data.allFunnels.reduce(
    (acc, f) => ({
      sessions: acc.sessions + f.sessions,
      registrations: acc.registrations + f.yjRegistrations,
      applications: acc.applications + f.yjApplications,
    }),
    { sessions: 0, registrations: 0, applications: 0 }
  );

  // 各経由の色を定義
  const funnelColors: Record<string, { bg: string; text: string; bar: string }> = {
    diagnosis: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
    menu: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    feature: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
    message: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
    autochat: { bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-500' },
  };

  const maxSessions = Math.max(...data.allFunnels.map((f) => f.sessions), 1);

  return (
    <div className="dashboard-panel p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
          <FunnelIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">経由別CV比較</h3>
          <p className="text-xs text-slate-500">全経由のセッション→登録→応募</p>
        </div>
      </div>

      {/* 合計サマリー */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">総セッション</p>
          <p className="text-2xl font-bold text-slate-900">{totals.sessions.toLocaleString()}</p>
        </div>
        <div className="text-center border-x border-slate-200">
          <p className="text-xs text-slate-500 mb-1">総登録</p>
          <p className="text-2xl font-bold text-sky-600">{totals.registrations.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-1">総応募</p>
          <p className="text-2xl font-bold text-blue-700">{totals.applications.toLocaleString()}</p>
        </div>
      </div>

      {/* 経由別テーブル */}
      <div className="space-y-3">
        {/* ヘッダー */}
        <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-slate-500">
          <div className="col-span-2">経由</div>
          <div className="col-span-4">セッション</div>
          <div className="col-span-2 text-right">登録</div>
          <div className="col-span-2 text-right">応募</div>
          <div className="col-span-2 text-right">CV率</div>
        </div>

        {/* 各経由の行 */}
        {data.allFunnels.map((funnel) => {
          const colors = funnelColors[funnel.type] || { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500' };
          const cvRate = funnel.sessions > 0 ? ((funnel.totalCV / funnel.sessions) * 100).toFixed(1) : '0';
          const barWidth = (funnel.sessions / maxSessions) * 100;

          return (
            <div
              key={funnel.type}
              className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg ${colors.bg}`}
            >
              <div className={`col-span-2 text-sm font-medium ${colors.text}`}>
                {funnel.label}
              </div>
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-6 bg-white rounded overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700 w-12 text-right">
                    {funnel.sessions.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold text-sky-600">
                  {funnel.yjRegistrations.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-semibold text-blue-700">
                  {funnel.yjApplications.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className={`text-sm font-bold ${Number(cvRate) > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  {cvRate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 診断サマリー */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 mb-1">診断人数</p>
            <p className="text-lg font-bold text-orange-700">{data.summary.diagnosisUsers.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 mb-1">診断回数</p>
            <p className="text-lg font-bold text-orange-700">{data.summary.diagnosisCount.toLocaleString()}</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs text-emerald-600 mb-1">リピート</p>
            <p className="text-lg font-bold text-emerald-700">
              {data.summary.repeatUsers.toLocaleString()}
              <span className="text-xs ml-1">({data.summary.repeatRate}%)</span>
            </p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 mb-1">友だち追加</p>
            <p className="text-lg font-bold text-green-700">
              {data.summary.followersAdded === null ? '-' : data.summary.followersAdded.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
