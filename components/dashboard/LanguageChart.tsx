'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { LanguageDistribution } from '@/types/dashboard';

interface LanguageChartProps {
  data: LanguageDistribution[];
}

const COLORS: Record<string, string> = {
  ja: '#3B82F6', // Blue
  en: '#10B981', // Green
  ko: '#F59E0B', // Yellow/Amber
  zh: '#EF4444', // Red
  vi: '#8B5CF6', // Purple
  unknown: '#6B7280', // Gray
};

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
  unknown: '不明',
};

export function LanguageChart({ data }: LanguageChartProps) {
  const chartData = data.map((item) => ({
    name: LANG_LABELS[item.lang] || item.lang,
    value: item.count,
    lang: item.lang,
  }));

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            🌐
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">言語別ユーザー分布</h3>
            <p className="text-xs text-slate-500">言語ごとのセグメントボリュームを俯瞰</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
          リアルタイム
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.lang] || COLORS.unknown} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
