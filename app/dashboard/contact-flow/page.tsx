'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ChatBubbleLeftRightIcon, CheckCircleIcon, CursorArrowRaysIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import type { ContactFlowQuestionRank, ContactFlowDailyTrend } from '@/types/dashboard';

interface ContactFlowData {
  ranking: ContactFlowQuestionRank[];
  trend: ContactFlowDailyTrend[];
  kpi: {
    totalExecutions: number;
    completedExecutions: number;
    totalCardClicks: number;
    uniqueUsers: number;
  };
  flows: { id: string; name: string; service: string | null }[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#E11D48', '#7C3AED', '#0EA5E9', '#D946EF', '#22C55E',
];

export default function ContactFlowPage() {
  const [data, setData] = useState<ContactFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');

  const fetchData = async (flowId?: string) => {
    try {
      setLoading(true);
      const params = flowId ? `?flowId=${flowId}` : '';
      const res = await fetch(`/api/dashboard/contact-flow${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch contact flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFlowFilter = (flowId: string) => {
    setSelectedFlowId(flowId);
    fetchData(flowId || undefined);
  };

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
    'フロー実行': item.executions,
    'カードクリック': item.cardClicks,
  }));

  // 質問テキストを短縮（棒グラフ用）
  const rankingChartData = data.ranking.map((item) => ({
    name: item.questionText.length > 30 ? item.questionText.slice(0, 30) + '…' : item.questionText,
    fullName: item.questionText,
    'クリック数': item.count,
    'ユニークユーザー': item.uniqueUsers,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お問い合わせフロー分析</h1>
        <p className="text-sm text-slate-500 mt-1">チャットフロー内の質問カードクリック数・フロー利用状況</p>
      </div>

      {/* フローフィルター */}
      {data.flows.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">フロー:</label>
          <select
            value={selectedFlowId}
            onChange={(e) => handleFlowFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#eaae9e]"
          >
            <option value="">全フロー</option>
            {data.flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name} {flow.service ? `(${flow.service})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={ChatBubbleLeftRightIcon}
          label="総フロー実行回数"
          value={data.kpi.totalExecutions}
          color="blue"
        />
        <KpiCard
          icon={CheckCircleIcon}
          label="完了数"
          value={data.kpi.completedExecutions}
          color="green"
        />
        <KpiCard
          icon={CursorArrowRaysIcon}
          label="総カードクリック数"
          value={data.kpi.totalCardClicks}
          color="amber"
        />
        <KpiCard
          icon={UsersIcon}
          label="ユニークユーザー"
          value={data.kpi.uniqueUsers}
          color="purple"
        />
      </div>

      {/* 質問ランキング（横棒グラフ） */}
      {data.ranking.length > 0 && (
        <div className="dashboard-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-[#fdf2ef] border border-[#f0c4b8] text-[#d10a1c] flex items-center justify-center">
              <CursorArrowRaysIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">質問カードランキング</h3>
              <p className="text-xs text-slate-500">クリック数が多い質問カード順</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, rankingChartData.length * 45)}>
            <BarChart data={rankingChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" fontSize={11} width={200} />
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label: string) => {
                  const item = rankingChartData.find((d) => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey="クリック数" radius={[0, 4, 4, 0]}>
                {rankingChartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 質問ランキングテーブル */}
      {data.ranking.length > 0 && (
        <div className="dashboard-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">質問カード詳細</h3>
              <p className="text-xs text-slate-500">各質問のクリック数とユニークユーザー数</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-600 w-8">#</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">質問テキスト</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-600">クリック数</th>
                  <th className="text-right py-3 px-2 font-medium text-slate-600">ユニークユーザー</th>
                </tr>
              </thead>
              <tbody>
                {data.ranking.map((row, idx) => (
                  <tr key={row.cardNodeId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-2 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-2.5 px-2 text-slate-700">{row.questionText}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-[#d10a1c]">{row.count}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-600">{row.uniqueUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 日別トレンド */}
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg bg-green-50 border border-green-100 text-green-600 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">日別トレンド</h3>
            <p className="text-xs text-slate-500">過去30日間のフロー実行回数・カードクリック数</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="フロー実行" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="カードクリック" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* データなし */}
      {data.ranking.length === 0 && (
        <div className="dashboard-panel p-12 text-center text-slate-400">
          カード選択データがまだありません
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-[#fdf2ef] border-[#f0c4b8] text-[#d10a1c]',
    green: 'bg-green-50 border-green-100 text-green-600',
    amber: 'bg-amber-50 border-amber-100 text-amber-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
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
