'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { GA4DailyConversion } from '@/types/dashboard';

interface GA4ConversionTrendChartProps {
  data: GA4DailyConversion[];
}

// Color palette matching the pie chart
const SOURCE_COLORS: Record<string, string> = {
  メッセージ: '#8B5CF6',
  'AI チャット': '#10B981',
  リッチメニュー: '#F59E0B',
  'STEP 経由': '#3B82F6',
  チャットボット: '#EF4444',
  'Instagram 経由': '#EC4899',
};

export function GA4ConversionTrendChart({ data }: GA4ConversionTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            📈
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">LINE CV 推移（過去30日）</h3>
            <p className="text-xs text-slate-500">登録・応募のコンバージョン動向</p>
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          データがありません
        </div>
      </div>
    );
  }

  // Get all unique sources across all dates
  const allSources = new Set<string>();
  data.forEach((day) => {
    Object.keys(day.bySource).forEach((source) => allSources.add(source));
  });

  // Transform data for recharts
  const chartData = data.map((item) => {
    const formattedDate = new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    return {
      date: formattedDate,
      total: item.conversions,
      registrations: item.registrations,
      applications: item.applications,
      ...item.bySource,
    };
  });

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            📈
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">LINE CV 推移（過去30日）</h3>
            <p className="text-xs text-slate-500">流入チャネル別の CV を重ねて表示</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full">
          CV 推移
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {/* Total line */}
          <Line type="monotone" dataKey="total" stroke="#1F2937" strokeWidth={3} name="合計 CV" />
          {/* Registration and Application lines */}
          <Line type="monotone" dataKey="registrations" stroke="#3B82F6" strokeWidth={2.5} name="登録 CV" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="applications" stroke="#10B981" strokeWidth={2.5} name="応募 CV" strokeDasharray="5 5" />
          {/* Lines for each source */}
          {Array.from(allSources).map((source) => (
            <Line
              key={source}
              type="monotone"
              dataKey={source}
              stroke={SOURCE_COLORS[source] || '#9CA3AF'}
              strokeWidth={1.5}
              name={source}
              opacity={0.6}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
