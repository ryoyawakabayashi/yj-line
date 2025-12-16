'use client';

import type { Activity } from '@/types/dashboard';

interface ActivityTableProps {
  data: Activity[];
}

const LANG_LABELS: Record<string, string> = {
  ja: '🇯🇵 日本語',
  en: '🇬🇧 English',
  ko: '🇰🇷 한국어',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
  unknown: '❓ 不明',
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
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">最新アクティビティ</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">ユーザーID</th>
              <th className="px-4 py-3 font-semibold text-gray-700">言語</th>
              <th className="px-4 py-3 font-semibold text-gray-700">最終利用日時</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">診断回数</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">AIチャット回数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((activity, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {activity.userId.substring(0, 12)}...
                </td>
                <td className="px-4 py-3">{LANG_LABELS[activity.lang] || activity.lang}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(activity.lastUsed)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {activity.diagnosisCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
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
