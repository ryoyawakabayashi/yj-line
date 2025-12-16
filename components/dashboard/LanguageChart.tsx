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
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">言語別ユーザー分布</h3>
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
