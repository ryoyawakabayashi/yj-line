'use client';

import { useState, useEffect } from 'react';
import { FunnelIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

// ファネルタイプ定義
type FunnelType = 'diagnosis' | 'menu' | 'feature' | 'message' | 'autochat';

// ファネルタイプのラベル
const FUNNEL_LABELS: Record<FunnelType, string> = {
  diagnosis: 'AI診断',
  menu: 'メニュータップ',
  feature: '特集タップ',
  message: 'メッセージ配信',
  autochat: 'AIトーク',
};

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
  color: string;
  description: string;
}

interface DiagnosisData {
  diagnosisUsers: number;
  diagnosisCount: number;
  repeatUsers: number;
  repeatRate: number;
}

interface FunnelData {
  funnel: FunnelStage[];
  diagnosis: DiagnosisData;
  month: string;
  period: { startDate: string; endDate: string };
  breakdown: {
    activeUsers: number;
    followersAdded: number | null;
    diagnosisUsers: number;
    diagnosisCount: number;
    sessions: number;
    siteTransitionUsers: number;
    yjRegistrations: number;
    yjApplications: number;
    totalCV: number;
  };
  rates: {
    diagnosisSessionRate: number;
    sessionRegistrationRate: number;
    sessionApplicationRate: number;
    overallCVRate: number;
  };
}

type PeriodType = 'today' | 'yesterday' | 'week' | '2week' | 'month';

interface FunnelChartProps {
  month?: string;
  periodType?: PeriodType;
  funnelType?: FunnelType;
}

export function FunnelChart({ month, periodType = 'month', funnelType = 'diagnosis' }: FunnelChartProps) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [month, periodType, funnelType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();

      // 期間パラメータ
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

      // ファネルタイプパラメータ
      searchParams.set('type', funnelType);

      const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await fetch(`/api/dashboard/funnel${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch funnel data:', error);
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
            <h3 className="text-lg font-semibold text-slate-900">コンバージョンファネル</h3>
            <p className="text-xs text-slate-500">ユーザー行動の流れ</p>
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

  const maxCount = Math.max(...data.funnel.map((s) => s.count));

  const currentFunnelLabel = FUNNEL_LABELS[funnelType];

  return (
    <div className="dashboard-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <FunnelIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">コンバージョンファネル</h3>
            <p className="text-xs text-slate-500">{currentFunnelLabel}経由のCV</p>
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-2">
        {data.funnel.map((stage, index) => {
          const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const nextStage = data.funnel[index + 1];

          return (
            <div key={stage.stage}>
              {/* Stage Bar */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-right">
                  <p className="text-sm font-medium text-slate-700">{stage.stage}</p>
                  <p className="text-xs text-slate-400">{stage.description}</p>
                </div>
                <div className="flex-1 relative">
                  <div className="h-12 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-4"
                      style={{
                        width: `${Math.max(widthPercent, 8)}%`,
                        backgroundColor: stage.color,
                      }}
                    >
                      <span className="text-white text-sm font-bold">
                        {stage.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right">
                  {index > 0 && stage.rate > 0 && (
                    <span className="text-sm font-semibold" style={{ color: stage.color }}>
                      {stage.rate}%
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow between stages */}
              {nextStage && (
                <div className="flex items-center gap-4 py-1">
                  <div className="w-32" />
                  <div className="flex-1 flex items-center justify-center">
                    <ArrowDownIcon className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="w-16" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 流入指標 & 転換率 */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-6">
          {/* 流入指標 */}
          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-orange-800 mb-3">流入指標</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">アクティブ</span>
                <span className="text-sm font-bold text-orange-600">
                  {data.breakdown.activeUsers.toLocaleString()}人
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">友だち追加</span>
                <span className="text-sm font-bold text-green-600">
                  {data.breakdown.followersAdded === null ? '-' : `${data.breakdown.followersAdded.toLocaleString()}人`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                <span className="text-sm font-medium text-slate-700">診断リピート</span>
                <span className="text-sm font-bold text-emerald-600">
                  {data.diagnosis.repeatUsers.toLocaleString()}人
                  <span className="text-xs text-slate-500 ml-1">({data.diagnosis.repeatRate}%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* 転換率 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">転換率</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">診断 → セッション</span>
                <span className="text-sm font-bold text-blue-600">
                  {data.rates.diagnosisSessionRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">セッション → 登録</span>
                <span className="text-sm font-bold text-sky-600">
                  {data.rates.sessionRegistrationRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">セッション → 応募</span>
                <span className="text-sm font-bold text-sky-700">
                  {data.rates.sessionApplicationRate}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-700">全体CV率</span>
                <span className="text-sm font-bold text-green-600">
                  {data.rates.overallCVRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
