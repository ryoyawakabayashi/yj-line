'use client';

import { useState } from 'react';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { GA4DailyConversion } from '@/types/dashboard';

interface GA4ConversionTrendChartProps {
  data: GA4DailyConversion[];
}

// YJ/YD カラー
const COLORS = {
  yjRegistration: '#0ea5e9', // sky-500
  yjApplication: '#0284c7', // sky-600
  ydRegistration: '#8b5cf6', // violet-500
  ydApplication: '#7c3aed', // violet-600
  total: '#1f2937', // slate-800
};

type ViewMode = 'yjyd' | 'regapp' | 'all';

export function GA4ConversionTrendChart({ data }: GA4ConversionTrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('yjyd');

  if (!data || data.length === 0) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ArrowTrendingUpIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">CV 推移（過去30日）</h3>
            <p className="text-xs text-slate-500">YJ / YD の登録・応募トレンド</p>
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          データがありません
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => {
    const formattedDate = new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    return {
      date: formattedDate,
      yjRegistrations: item.yjRegistrations,
      yjApplications: item.yjApplications,
      ydRegistrations: item.ydRegistrations,
      ydApplications: item.ydApplications,
      registrations: item.registrations,
      applications: item.applications,
      total: item.conversions,
      yj: item.yjRegistrations + item.yjApplications,
      yd: item.ydRegistrations + item.ydApplications,
    };
  });

  // 合計値を計算
  const totals = data.reduce(
    (acc, item) => ({
      yjRegistrations: acc.yjRegistrations + item.yjRegistrations,
      yjApplications: acc.yjApplications + item.yjApplications,
      ydRegistrations: acc.ydRegistrations + item.ydRegistrations,
      ydApplications: acc.ydApplications + item.ydApplications,
      total: acc.total + item.conversions,
    }),
    { yjRegistrations: 0, yjApplications: 0, ydRegistrations: 0, ydApplications: 0, total: 0 }
  );

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ArrowTrendingUpIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">CV 推移（過去30日）</h3>
            <p className="text-xs text-slate-500">YJ / YD の登録・応募トレンド</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: 'yjyd', label: 'YJ/YD別' },
            { key: 'regapp', label: '登録/応募別' },
            { key: 'all', label: '詳細' },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key as ViewMode)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                viewMode === mode.key
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-5 gap-2 mb-4 text-center">
        <div className="p-2 rounded-lg bg-slate-100">
          <p className="text-lg font-bold text-slate-800">{totals.total.toLocaleString()}</p>
          <p className="text-xs text-slate-500">合計CV</p>
        </div>
        <div className="p-2 rounded-lg bg-sky-50 border border-sky-100">
          <p className="text-lg font-bold text-sky-600">{totals.yjRegistrations.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YJ登録</p>
        </div>
        <div className="p-2 rounded-lg bg-sky-50 border border-sky-100">
          <p className="text-lg font-bold text-sky-700">{totals.yjApplications.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YJ応募</p>
        </div>
        <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
          <p className="text-lg font-bold text-violet-600">{totals.ydRegistrations.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YD登録</p>
        </div>
        <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
          <p className="text-lg font-bold text-violet-700">{totals.ydApplications.toLocaleString()}</p>
          <p className="text-xs text-slate-500">YD応募</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Legend />

          {/* 合計線 */}
          <Line
            type="monotone"
            dataKey="total"
            stroke={COLORS.total}
            strokeWidth={2}
            name="合計"
            dot={false}
          />

          {viewMode === 'yjyd' && (
            <>
              <Line
                type="monotone"
                dataKey="yj"
                stroke={COLORS.yjRegistration}
                strokeWidth={2}
                name="YJ 合計"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="yd"
                stroke={COLORS.ydRegistration}
                strokeWidth={2}
                name="YD 合計"
                dot={false}
              />
            </>
          )}

          {viewMode === 'regapp' && (
            <>
              <Line
                type="monotone"
                dataKey="registrations"
                stroke="#3b82f6"
                strokeWidth={2}
                name="登録"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="#10b981"
                strokeWidth={2}
                name="応募"
                dot={false}
              />
            </>
          )}

          {viewMode === 'all' && (
            <>
              <Line
                type="monotone"
                dataKey="yjRegistrations"
                stroke={COLORS.yjRegistration}
                strokeWidth={1.5}
                name="YJ 登録"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="yjApplications"
                stroke={COLORS.yjApplication}
                strokeWidth={1.5}
                name="YJ 応募"
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ydRegistrations"
                stroke={COLORS.ydRegistration}
                strokeWidth={1.5}
                name="YD 登録"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ydApplications"
                stroke={COLORS.ydApplication}
                strokeWidth={1.5}
                name="YD 応募"
                strokeDasharray="4 2"
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
