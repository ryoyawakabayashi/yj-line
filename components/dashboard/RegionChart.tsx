'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { RegionDistribution } from '@/types/dashboard';
import { REGION_MASTER } from '@/lib/masters';

interface RegionChartProps {
  data: RegionDistribution[];
}

export function RegionChart({ data }: RegionChartProps) {
  const chartData = data.map((item) => ({
    region: REGION_MASTER[item.region as keyof typeof REGION_MASTER]?.label_ja || item.region,
    count: item.count,
  }));

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
          🗾
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">地域別分布</h3>
          <p className="text-xs text-slate-500">地域ごとのユーザー熱量を比較</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="region" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#F59E0B" name="ユーザー数" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
