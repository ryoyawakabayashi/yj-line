'use client';

import type { TopUser } from '@/types/dashboard';

interface TopUsersRankingProps {
  data: TopUser[];
}

const LANG_LABELS: Record<string, string> = {
  ja: '🇯🇵 日本語',
  en: '🇬🇧 English',
  ko: '🇰🇷 한국어',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
  unknown: '❓ 不明',
};

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function TopUsersRanking({ data }: TopUsersRankingProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">利用回数トップランキング</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">順位</th>
              <th className="px-4 py-3 font-semibold text-gray-700">ユーザーID</th>
              <th className="px-4 py-3 font-semibold text-gray-700">言語</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">診断回数</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">AIチャット回数</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">合計利用回数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-center">
                  <span className="text-xl">
                    {RANK_MEDALS[user.rank] || `#${user.rank}`}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {user.userId.substring(0, 12)}...
                </td>
                <td className="px-4 py-3">{LANG_LABELS[user.lang] || user.lang}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user.diagnosisCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {user.aiChatCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                    {user.totalUsage}
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
