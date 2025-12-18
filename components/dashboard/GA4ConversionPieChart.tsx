'use client';

import { useState } from 'react';
import { ChartPieIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { GA4ConversionBySource } from '@/types/dashboard';

interface GA4ConversionPieChartProps {
  data: GA4ConversionBySource[];
}

// YJ: スカイブルー系, YD: パープル系
const COLORS = {
  yjRegistration: '#0ea5e9', // sky-500
  yjApplication: '#0284c7', // sky-600
  ydRegistration: '#8b5cf6', // violet-500
  ydApplication: '#7c3aed', // violet-600
};

type ViewMode = 'all' | 'yj' | 'yd';

export function GA4ConversionPieChart({ data }: GA4ConversionPieChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  if (!data || data.length === 0) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <ChartPieIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">CV 種別分布</h3>
            <p className="text-xs text-slate-500">YJ / YD の登録・応募別</p>
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          データがありません
        </div>
      </div>
    );
  }

  // 全データを集計
  const totals = data.reduce(
    (acc, item) => ({
      yjRegistrations: acc.yjRegistrations + item.yjRegistrations,
      yjApplications: acc.yjApplications + item.yjApplications,
      ydRegistrations: acc.ydRegistrations + item.ydRegistrations,
      ydApplications: acc.ydApplications + item.ydApplications,
    }),
    { yjRegistrations: 0, yjApplications: 0, ydRegistrations: 0, ydApplications: 0 }
  );

  // ビューモードに応じたチャートデータを生成
  const getChartData = () => {
    if (viewMode === 'yj') {
      return [
        { name: 'YJ 登録', value: totals.yjRegistrations, color: COLORS.yjRegistration },
        { name: 'YJ 応募', value: totals.yjApplications, color: COLORS.yjApplication },
      ].filter((d) => d.value > 0);
    }
    if (viewMode === 'yd') {
      return [
        { name: 'YD 登録', value: totals.ydRegistrations, color: COLORS.ydRegistration },
        { name: 'YD 応募', value: totals.ydApplications, color: COLORS.ydApplication },
      ].filter((d) => d.value > 0);
    }
    return [
      { name: 'YJ 登録', value: totals.yjRegistrations, color: COLORS.yjRegistration },
      { name: 'YJ 応募', value: totals.yjApplications, color: COLORS.yjApplication },
      { name: 'YD 登録', value: totals.ydRegistrations, color: COLORS.ydRegistration },
      { name: 'YD 応募', value: totals.ydApplications, color: COLORS.ydApplication },
    ].filter((d) => d.value > 0);
  };

  const chartData = getChartData();
  const totalConversions = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <ChartPieIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">CV 種別分布</h3>
            <p className="text-xs text-slate-500">YJ / YD の登録・応募別</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'yj', 'yd'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === mode
                  ? mode === 'yj'
                    ? 'bg-sky-500 text-white'
                    : mode === 'yd'
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'all' ? '全体' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 4分割サマリー */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-sky-50 border border-sky-100">
          <p className="text-lg font-bold text-sky-600">{totals.yjRegistrations.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YJ 登録</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-sky-50 border border-sky-100">
          <p className="text-lg font-bold text-sky-700">{totals.yjApplications.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YJ 応募</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-violet-50 border border-violet-100">
          <p className="text-lg font-bold text-violet-600">{totals.ydRegistrations.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YD 登録</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-violet-50 border border-violet-100">
          <p className="text-lg font-bold text-violet-700">{totals.ydApplications.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YD 応募</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[250px] flex items-center justify-center text-slate-400">
          選択された条件にデータがありません
        </div>
      )}

      <div className="text-center pt-2 border-t border-slate-100">
        <span className="text-sm text-slate-500">
          合計CV: <span className="font-bold text-slate-700">{totalConversions.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
