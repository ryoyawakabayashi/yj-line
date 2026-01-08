'use client';

import { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface ConversionStats {
  uniqueIssuedUsers: number;
  totalTokens: number;
  totalClicks: number;
  totalConversions: number;
  uniqueConvertedUsers: number;
  clickRate: number;
  conversionRate: number;
}

interface ConvertedUser {
  userId: string;
  firstConversion: string;
  lastConversion: string;
  conversionCount: number;
  urlTypes: string[];
}

interface TrackingDetail {
  id: string;
  token: string;
  urlType: string | null;
  destinationUrl: string | null;
  createdAt: string;
  clickedAt: string | null;
  convertedAt: string | null;
}

export default function ConversionsPage() {
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [users, setUsers] = useState<ConvertedUser[]>([]);
  const [details, setDetails] = useState<TrackingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'details'>('users');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/conversions');
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users || []);
      setDetails(data.details || []);
    } catch (error) {
      console.error('Failed to fetch conversion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['user_id', 'first_conversion', 'last_conversion', 'conversion_count', 'url_types'];
    const rows = users.map(u => [
      u.userId,
      u.firstConversion,
      u.lastConversion,
      u.conversionCount,
      u.urlTypes.join(';'),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">応募者追跡</h1>
          <p className="text-sm text-slate-500 mt-1">
            LINE Bot経由でサイト遷移→応募完了したユーザー
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          CSVエクスポート
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="発行者数"
          value={stats?.uniqueIssuedUsers || 0}
          icon={CursorArrowRaysIcon}
          color="blue"
        />
        <StatCard
          title="応募者数"
          value={stats?.uniqueConvertedUsers || 0}
          subValue={`${stats?.conversionRate || 0}%`}
          icon={UserGroupIcon}
          color="green"
        />
        <StatCard
          title="応募数"
          value={stats?.totalConversions || 0}
          icon={CheckCircleIcon}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              応募完了ユーザー ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              トラッキング詳細 ({details.length})
            </button>
          </nav>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {activeTab === 'users' ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    ユーザーID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    初回応募
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    最終応募
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    応募回数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    経由
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      応募完了ユーザーはまだいません
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-mono text-slate-700">
                        {user.userId.slice(0, 16)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.firstConversion)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(user.lastConversion)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {user.conversionCount}回
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.urlTypes.map((type) => (
                          <span
                            key={type}
                            className="inline-block mr-1 px-2 py-0.5 bg-slate-100 rounded text-xs"
                          >
                            {type}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    トークン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    種別
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    発行日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    クリック
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    応募完了
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {details.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      トラッキングデータはまだありません
                    </td>
                  </tr>
                ) : (
                  details.map((detail) => (
                    <tr key={detail.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-mono text-slate-700">
                        {detail.token}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {detail.urlType || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(detail.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {detail.clickedAt ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {detail.convertedAt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            完了
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  subValue?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm text-slate-600">{title}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {value.toLocaleString()}
        </span>
        {subValue && (
          <span className="text-sm text-slate-500">({subValue})</span>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
