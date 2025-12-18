'use client';

import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
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
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
          <BuildingOfficeIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">希望業界分布</h3>
          <p className="text-xs text-slate-500">応募意向の高いセクター</p>
        </div>
      </div>
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
