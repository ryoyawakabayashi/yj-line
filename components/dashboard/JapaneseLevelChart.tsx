'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LevelDistribution } from '@/types/dashboard';
import { JAPANESE_LEVEL } from '@/lib/masters';

interface JapaneseLevelChartProps {
  data: LevelDistribution[];
}

export function JapaneseLevelChart({ data }: JapaneseLevelChartProps) {
  const chartData = data.map((item) => ({
    level: JAPANESE_LEVEL[item.level as keyof typeof JAPANESE_LEVEL]?.label_ja || item.level,
    count: item.count,
  }));

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">日本語レベル分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="level" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3B82F6" name="ユーザー数" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
