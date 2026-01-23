'use client';

import { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  CursorArrowRaysIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  HandRaisedIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

interface ConversionStats {
  uniqueIssuedUsers: number;
  uniqueClickedUsers: number;
  totalTokens: number;
  totalClicks: number;
  totalConversions: number;
  uniqueConvertedUsers: number;
  clickRate: number;
  conversionRate: number;
}

type PeriodType = 'today' | 'yesterday' | 'week' | '2weeks' | 'month' | 'all';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '1週間' },
  { value: '2weeks', label: '2週間' },
  { value: 'month', label: '月間' },
  { value: 'all', label: '全期間' },
];

interface ConvertedUser {
  userId: string;
  firstConversion: string;
  lastConversion: string;
  conversionCount: number;
  urlTypes: string[];
  displayName: string | null;
  pictureUrl: string | null;
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

interface ApplicationLog {
  id: string;
  userId: string;
  token: string;
  urlType: string | null;
  utmCampaign: string | null;
  appliedAt: string;
  displayName: string | null;
  pictureUrl: string | null;
  eventName: string | null;
}

interface ClicksByType {
  urlType: string;
  issued: number;
  clicked: number;
  clickRate: number;
}

interface Issuer {
  userId: string;
  displayName: string | null;
  pictureUrl: string | null;
  tokenCount: number;
  clickCount: number;
  urlTypes: string[];
  firstIssued: string;
  lastIssued: string;
  hasConverted: boolean;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UserConversationDetail {
  userId: string;
  lang: string;
  displayName: string | null;
  pictureUrl: string | null;
  history: ConversationMessage[];
  diagnosisResults: Array<{
    timestamp: string;
    q1_living_in_japan: string | null;
    q2_gender: string | null;
    q3_urgency: string | null;
    q4_region: string | null;
    q5_japanese_level: string | null;
    q6_industry: string | null;
    q7_work_style: string | null;
  }>;
}

export default function ConversionsPage() {
  const [stats, setStats] = useState<ConversionStats | null>(null);
  const [users, setUsers] = useState<ConvertedUser[]>([]);
  const [details, setDetails] = useState<TrackingDetail[]>([]);
  const [applications, setApplications] = useState<ApplicationLog[]>([]);
  const [clicksByType, setClicksByType] = useState<ClicksByType[]>([]);
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'issuers' | 'clicks' | 'details'>('applications');
  const [period, setPeriod] = useState<PeriodType>('all');

  // モーダル関連
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [conversationDetail, setConversationDetail] = useState<UserConversationDetail | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  useEffect(() => {
    fetchData(period);
  }, [period]);

  const fetchData = async (selectedPeriod: PeriodType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversions?period=${selectedPeriod}`);
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users || []);
      setDetails(data.details || []);
      setApplications(data.applications || []);
      setClicksByType(data.clicksByType || []);
      setIssuers(data.issuers || []);
    } catch (error) {
      console.error('Failed to fetch conversion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversationModal = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingConversation(true);
    try {
      const res = await fetch(`/api/dashboard/conversations?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setConversationDetail(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      setLoadingConversation(false);
    }
  };

  const closeModal = () => {
    setSelectedUserId(null);
    setConversationDetail(null);
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">応募者追跡</h1>
          <p className="text-sm text-slate-500 mt-1">
            GA4で検知されたキーイベント（complete_work等）を持つユーザー
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 期間フィルター */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  period === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            CSVエクスポート
          </button>
        </div>
      </div>

      {/* Stats Cards - ファネル表示 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="発行者数"
          value={stats?.uniqueIssuedUsers || 0}
          icon={CursorArrowRaysIcon}
          color="blue"
        />
        <StatCard
          title="クリック者数"
          value={stats?.uniqueClickedUsers || 0}
          subValue={`${stats?.clickRate || 0}%`}
          icon={HandRaisedIcon}
          color="orange"
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
          <nav className="flex gap-4 px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              応募履歴 ({applications.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              応募者一覧 ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('issuers')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'issuers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              発行者一覧 ({issuers.length})
            </button>
            <button
              onClick={() => setActiveTab('clicks')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
                activeTab === 'clicks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              クリック分析 ({clicksByType.length})
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition whitespace-nowrap ${
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
          {activeTab === 'applications' ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    応募日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    イベント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    経由
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      GA4で検知された応募履歴はまだありません
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {formatDate(app.appliedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {app.pictureUrl ? (
                            <img
                              src={app.pictureUrl}
                              alt={app.displayName || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-slate-500 text-sm">?</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {app.displayName || '名前未取得'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {app.userId.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {app.eventName || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {app.urlType || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openConversationModal(app.userId)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="会話履歴を見る"
                        >
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'users' ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    ユーザー
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      GA4で検知された応募者はまだいません
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.pictureUrl ? (
                            <img
                              src={user.pictureUrl}
                              alt={user.displayName || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-slate-500 text-sm">?</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {user.displayName || '名前未取得'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {user.userId.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
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
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openConversationModal(user.userId)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="会話履歴を見る"
                        >
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'issuers' ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    発行数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    クリック
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    経由
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    最終発行
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    応募
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {issuers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      発行者データはまだありません
                    </td>
                  </tr>
                ) : (
                  issuers.map((issuer) => (
                    <tr key={issuer.userId} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {issuer.pictureUrl ? (
                            <img
                              src={issuer.pictureUrl}
                              alt={issuer.displayName || 'User'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-slate-500 text-sm">?</span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {issuer.displayName || '名前未取得'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {issuer.userId.slice(0, 12)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {issuer.tokenCount}
                      </td>
                      <td className="px-6 py-4">
                        {issuer.clickCount > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {issuer.clickCount}回
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {issuer.urlTypes.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="inline-block mr-1 px-2 py-0.5 bg-slate-100 rounded text-xs"
                          >
                            {type}
                          </span>
                        ))}
                        {issuer.urlTypes.length > 3 && (
                          <span className="text-xs text-slate-400">+{issuer.urlTypes.length - 3}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(issuer.lastIssued)}
                      </td>
                      <td className="px-6 py-4">
                        {issuer.hasConverted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            済
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openConversationModal(issuer.userId)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="会話履歴を見る"
                        >
                          <ChatBubbleLeftRightIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'clicks' ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    種別 (url_type)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    発行数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    クリック数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    クリック率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clicksByType.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      クリックデータはまだありません
                    </td>
                  </tr>
                ) : (
                  clicksByType.map((item) => (
                    <tr key={item.urlType} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {item.urlType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {item.issued.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {item.clicked.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(item.clickRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {item.clickRate}%
                          </span>
                        </div>
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

      {/* Conversation Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {conversationDetail?.pictureUrl ? (
                  <img
                    src={conversationDetail.pictureUrl}
                    alt={conversationDetail.displayName || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">?</span>
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-900">
                    {conversationDetail?.displayName || '名前未取得'}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {selectedUserId.slice(0, 20)}...
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingConversation ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : conversationDetail ? (
                <div className="space-y-6">
                  {/* 診断結果 */}
                  {conversationDetail.diagnosisResults.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">診断結果</h3>
                      {conversationDetail.diagnosisResults.map((result, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 mb-2">
                          <div className="text-xs text-slate-400">{formatDate(result.timestamp)}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {result.q4_region && <div><span className="text-slate-500">地域:</span> {result.q4_region}</div>}
                            {result.q5_japanese_level && <div><span className="text-slate-500">日本語:</span> {result.q5_japanese_level}</div>}
                            {result.q6_industry && <div><span className="text-slate-500">業界:</span> {result.q6_industry}</div>}
                            {result.q7_work_style && <div><span className="text-slate-500">雇用形態:</span> {result.q7_work_style}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AIチャット履歴 */}
                  {conversationDetail.history.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-slate-700 mb-2">AIチャット履歴</h3>
                      <div className="space-y-3">
                        {conversationDetail.history.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                msg.role === 'user'
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 py-8">
                      AIチャット履歴はありません
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">
                  データの取得に失敗しました
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
