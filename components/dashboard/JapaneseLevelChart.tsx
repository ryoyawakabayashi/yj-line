'use client';

import { AcademicCapIcon } from '@heroicons/react/24/outline';
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
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
          <AcademicCapIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">日本語レベル分布</h3>
          <p className="text-xs text-slate-500">応募者の日本語到達度</p>
        </div>
      </div>
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
