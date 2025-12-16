'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { GA4ConversionBySource } from '@/types/dashboard';

interface GA4ConversionPieChartProps {
  data: GA4ConversionBySource[];
}

// Color palette for different sources
const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#EC4899'];

export function GA4ConversionPieChart({ data }: GA4ConversionPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            📊
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">LINE CV 流入元分布</h3>
            <p className="text-xs text-slate-500">GA4 から取得した CV の流入元</p>
          </div>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          データがありません
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.source,
    value: item.conversions,
  }));

  const totalConversions = data.reduce((sum, item) => sum + item.conversions, 0);

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            📊
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">LINE CV 流入元分布</h3>
            <p className="text-xs text-slate-500">GA4 で記録された流入チャネル別 CV</p>
          </div>
        </div>
        <div className="text-sm text-slate-600">
          総CV数:{' '}
          <span className="font-bold text-purple-600">{totalConversions.toLocaleString()}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
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
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
