'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DailyUsageTrend } from '@/types/dashboard';

interface UsageTrendChartProps {
  data: DailyUsageTrend[];
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    診断数: item.diagnosisCount,
  }));

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI診断利用状況推移（過去30日）</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="診断数"
            stroke="#3B82F6"
            strokeWidth={2}
            name="AI診断実施数"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
