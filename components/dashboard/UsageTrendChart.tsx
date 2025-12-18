'use client';

import { CpuChipIcon } from '@heroicons/react/24/outline';
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
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
          <CpuChipIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">AI診断利用推移（過去30日）</h3>
          <p className="text-xs text-slate-500">診断セッションの推移</p>
        </div>
      </div>
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
