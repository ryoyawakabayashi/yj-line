'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { IndustryDistribution } from '@/types/dashboard';
import { INDUSTRY_MASTER } from '@/lib/masters';

interface IndustryChartProps {
  data: IndustryDistribution[];
}

export function IndustryChart({ data }: IndustryChartProps) {
  const chartData = data.map((item) => ({
    industry: INDUSTRY_MASTER[item.industry as keyof typeof INDUSTRY_MASTER]?.label_ja || item.industry,
    count: item.count,
  }));

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">希望業界分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="industry" type="category" width={120} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#10B981" name="ユーザー数" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
