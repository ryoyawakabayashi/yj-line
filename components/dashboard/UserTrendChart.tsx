'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyTrend } from '@/types/dashboard';

interface UserTrendChartProps {
  data: DailyTrend[];
}

export function UserTrendChart({ data }: UserTrendChartProps) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    count: item.count,
  }));

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            📈
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">ユーザー登録推移（過去30日）</h3>
            <p className="text-xs text-slate-500">新規登録の勢いを確認</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-full">
          トレンド
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} name="新規ユーザー数" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
