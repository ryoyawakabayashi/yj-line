'use client';

import { TrophyIcon } from '@heroicons/react/24/outline';
import type { TopUser } from '@/types/dashboard';

interface TopUsersRankingProps {
  data: TopUser[];
}

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
  unknown: '不明',
};

export function TopUsersRanking({ data }: TopUsersRankingProps) {
  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <TrophyIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">利用回数ランキング</h3>
            <p className="text-xs text-slate-500">ヘビーユーザー Top 10</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center w-16">#</th>
              <th className="px-4 py-3 font-semibold text-slate-700">ユーザーID</th>
              <th className="px-4 py-3 font-semibold text-slate-700">言語</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">診断</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">チャット</th>
              <th className="px-4 py-3 font-semibold text-slate-700 text-center">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((user) => (
              <tr key={user.userId} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-center">
                  {user.rank <= 3 ? (
                    <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                      user.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      user.rank === 2 ? 'bg-slate-200 text-slate-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {user.rank}
                    </span>
                  ) : (
                    <span className="text-slate-500">{user.rank}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {user.userId.substring(0, 12)}...
                </td>
                <td className="px-4 py-3 text-slate-600">{LANG_LABELS[user.lang] || user.lang}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    {user.diagnosisCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {user.aiChatCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-bold bg-blue-100 text-blue-800">
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
