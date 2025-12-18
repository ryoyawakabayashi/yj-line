'use client';

import { ClockIcon } from '@heroicons/react/24/outline';
import type { Activity } from '@/types/dashboard';

interface ActivityTableProps {
  data: Activity[];
}

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
  unknown: '不明',
};

export function ActivityTable({ data }: ActivityTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">最新アクティビティ</h3>
            <p className="text-xs text-slate-500">直近でアクティブなユーザー</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">ユーザーID</th>
              <th className="px-4 py-3 font-semibold text-slate-700">言語</th>
              <th className="px-4 py-3 font-semibold text-slate-700">最終利用日時</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">診断</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">チャット</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((activity, index) => (
              <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {activity.userId.substring(0, 12)}...
                </td>
                <td className="px-4 py-3 text-slate-600">{LANG_LABELS[activity.lang] || activity.lang}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(activity.lastUsed)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {activity.diagnosisCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {activity.aiChatCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
