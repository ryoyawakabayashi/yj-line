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
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">地域別分布</h3>
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
