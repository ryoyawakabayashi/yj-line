'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { SparklesIcon, UserGroupIcon, CursorArrowRaysIcon, DocumentCheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import type { CareerDiagnosisDailyTrend, CareerTypeDistribution, CareerTypeConversion } from '@/types/dashboard';

const LANG_FLAGS: Record<string, string> = { ja: '🇯🇵', en: '🇬🇧', ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳' };

interface DiagnosisUser {
  userId: string;
  displayName: string | null;
  lang: string;
  typeCode: string;
  typeName: string;
  createdAt: string;
}

interface CareerDiagnosisData {
  trend: CareerDiagnosisDailyTrend[];
  distribution: CareerTypeDistribution[];
  conversion: CareerTypeConversion[];
  kpi: {
    totalDiagnoses: number;
    uniqueUsers: number;
    totalClicks: number;
    totalApplications: number;
  };
  users: DiagnosisUser[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF', '#22C55E',
];

export default function CareerDiagnosisPage() {
  const [data, setData] = useState<CareerDiagnosisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/career-diagnosis');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch career diagnosis data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#eaae9e]" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500 py-12">データの取得に失敗しました</div>;
  }

  const trendChartData = data.trend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
    '診断数': item.count,
  }));

  const distributionChartData = data.distribution.map((item) => ({
    name: item.typeCode,
    typeName: item.typeName,
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">キャリア診断分析</h1>
        <p className="text-sm text-slate-500 mt-1">キャリアタイプ診断の利用状況・タイプ分布・CV分析</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={SparklesIcon}
          label="総診断回数"
          value={data.kpi.totalDiagnoses}
          color="blue"
        />
        <KpiCard
          icon={UserGroupIcon}
          label="ユニークユーザー"
          value={data.kpi.uniqueUsers}
          color="green"
        />
        <KpiCard
          icon={CursorArrowRaysIcon}
          label="総クリック数"
          value={data.kpi.totalClicks}
          color="amber"
        />
        <KpiCard
          icon={DocumentCheckIcon}
          label="総応募数"
          value={data.kpi.totalApplications}
          color="red"
        />
      </div>

      {/* 日別トレンド */}
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-[#fdf2ef] border border-[#f0c4b8] text-[#d10a1c] flex items-center justify-center">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">診断回数トレンド</h3>
            <p className="text-xs text-slate-500">過去30日間の日別診断回数</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="診断数" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* タイプ分布（棒グラフ） */}
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <UserGroupIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">タイプ分布</h3>
            <p className="text-xs text-slate-500">診断結果のタイプ別分布</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={distributionChartData} layout="vertical" margin={{ left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} fontSize={12} />
            <YAxis type="category" dataKey="name" fontSize={11} width={50} />
            <Tooltip
              formatter={(value: number) => [`${value}件`, '診断数']}
              labelFormatter={(label: string) => {
                const item = distributionChartData.find((d) => d.name === label);
                return item ? `${item.name}: ${item.typeName}` : label;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {distributionChartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* タイプ別CVテーブル */}
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <DocumentCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">タイプ別コンバージョン</h3>
            <p className="text-xs text-slate-500">タイプごとの診断数・クリック数・応募数</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 font-medium text-slate-600">コード</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">タイプ名</th>
                <th className="text-right py-3 px-2 font-medium text-slate-600">診断数</th>
                <th className="text-right py-3 px-2 font-medium text-slate-600">クリック数</th>
                <th className="text-right py-3 px-2 font-medium text-slate-600">応募数</th>
                <th className="text-right py-3 px-2 font-medium text-slate-600">クリック率</th>
                <th className="text-right py-3 px-2 font-medium text-slate-600">応募率</th>
              </tr>
            </thead>
            <tbody>
              {data.conversion.map((row) => {
                const clickRate = row.diagnosisCount > 0 ? ((row.clickCount / row.diagnosisCount) * 100).toFixed(1) : '0.0';
                const appRate = row.diagnosisCount > 0 ? ((row.applicationCount / row.diagnosisCount) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={row.typeCode} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-mono text-xs font-medium text-slate-700">{row.typeCode}</td>
                    <td className="py-2.5 px-2 text-slate-700">{row.typeName}</td>
                    <td className="py-2.5 px-2 text-right font-medium">{row.diagnosisCount}</td>
                    <td className="py-2.5 px-2 text-right text-[#d10a1c] font-medium">{row.clickCount}</td>
                    <td className="py-2.5 px-2 text-right text-red-600 font-medium">{row.applicationCount}</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{clickRate}%</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{appRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 診断者一覧 */}
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-green-50 border border-green-100 text-green-600 flex items-center justify-center">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">診断者一覧</h3>
            <p className="text-xs text-slate-500">最新100件</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 font-medium text-slate-600">ユーザー</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">言語</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">タイプ</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">タイプ名</th>
                <th className="text-left py-3 px-2 font-medium text-slate-600">診断日時</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">データなし</td></tr>
              )}
              {data.users.map((user, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-2">
                    <div className="font-medium text-slate-700">{user.displayName || '—'}</div>
                    <div className="text-xs text-slate-400 font-mono">{user.userId.substring(0, 12)}...</div>
                  </td>
                  <td className="py-2.5 px-2">{LANG_FLAGS[user.lang] || ''} {user.lang}</td>
                  <td className="py-2.5 px-2 font-mono text-xs font-medium text-slate-700">{user.typeCode}</td>
                  <td className="py-2.5 px-2 text-slate-700">{user.typeName}</td>
                  <td className="py-2.5 px-2 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-[#fdf2ef] border-[#f0c4b8] text-[#d10a1c]',
    green: 'bg-green-50 border-green-100 text-green-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    red: 'bg-red-50 border-red-100 text-red-600',
  };
  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
