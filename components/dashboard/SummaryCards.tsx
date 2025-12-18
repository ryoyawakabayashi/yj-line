'use client';

import { useState, useEffect } from 'react';
import {
  UsersIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
  UserPlusIcon,
  CursorArrowRaysIcon,
  DocumentCheckIcon,
  BriefcaseIcon,
  XMarkIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import type { DashboardStats, ActiveUserHistory } from '@/types/dashboard';
import type { ComponentType, SVGProps } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { FunnelType, PeriodType as DashboardPeriodType } from '@/contexts/DashboardPeriodContext';
import { FUNNEL_TYPE_LABELS } from '@/contexts/DashboardPeriodContext';

interface FunnelMetricsData {
  sessions: number;
  activeUsers: number;
  yjRegistrations: number;
  yjApplications: number;
}

interface SummaryCardsProps {
  stats: DashboardStats | null;
  periodLabel?: string; // 例: "本日の", "昨日の", "12月の"
  funnelType?: FunnelType;
  periodType?: DashboardPeriodType;
  selectedMonth?: string;
}

interface CardConfig {
  id: string;
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tag: string;
  subtitle?: string;
  helper: string;
  border: string;
  iconBg: string;
  historyType?: string; // API の type パラメータ
  chartColor?: string;
  chartLabel?: string;
}

type HistoryPeriodType = '7days' | '14days' | '30days' | 'custom';

export function SummaryCards({
  stats,
  periodLabel = '本日の',
  funnelType = 'all',
  periodType = 'week',
  selectedMonth,
}: SummaryCardsProps) {
  const [showModal, setShowModal] = useState(false);
  const [historyData, setHistoryData] = useState<ActiveUserHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriodType>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeCard, setActiveCard] = useState<CardConfig | null>(null);
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetricsData | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  // 経由別メトリクスを取得
  useEffect(() => {
    if (funnelType !== 'all') {
      fetchFunnelMetrics();
    } else {
      setFunnelMetrics(null);
    }
  }, [funnelType, periodType, selectedMonth]);

  const fetchFunnelMetrics = async () => {
    setFunnelLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('type', funnelType);

      if (periodType === 'today') {
        searchParams.set('period', 'today');
      } else if (periodType === 'yesterday') {
        searchParams.set('period', 'yesterday');
      } else if (periodType === 'week') {
        searchParams.set('period', 'week');
      } else if (periodType === '2week') {
        searchParams.set('period', '2week');
      } else if (selectedMonth) {
        searchParams.set('month', selectedMonth);
      }

      const res = await fetch(`/api/dashboard/funnel?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFunnelMetrics({
          sessions: data.breakdown?.sessions || 0,
          activeUsers: data.breakdown?.activeUsers || 0,
          yjRegistrations: data.breakdown?.yjRegistrations || 0,
          yjApplications: data.breakdown?.yjApplications || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch funnel metrics:', error);
    } finally {
      setFunnelLoading(false);
    }
  };

  if (!stats) return null;

  // 経由別かどうかで表示する値を切り替え
  const isSpecificFunnel = funnelType !== 'all';
  const funnelLabel = FUNNEL_TYPE_LABELS[funnelType];

  const fetchHistory = async (
    historyType: string,
    period: HistoryPeriodType,
    startDate?: string,
    endDate?: string
  ) => {
    setLoading(true);
    try {
      let start: string;
      let end: string;

      if (period === 'custom' && startDate && endDate) {
        start = startDate;
        end = endDate;
      } else {
        const days = period === '7days' ? 7 : period === '14days' ? 14 : 30;
        const endDt = new Date();
        const startDt = new Date();
        startDt.setDate(startDt.getDate() - days + 1);
        start = startDt.toISOString().split('T')[0];
        end = endDt.toISOString().split('T')[0];
      }

      const res = await fetch(
        `/api/dashboard/history?type=${historyType}&startDate=${start}&endDate=${end}`
      );
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (card: CardConfig) => {
    if (card.historyType) {
      setActiveCard(card);
      setShowModal(true);
      fetchHistory(card.historyType, selectedPeriod);
    }
  };

  const handlePeriodChange = (period: HistoryPeriodType) => {
    setSelectedPeriod(period);
    if (period !== 'custom' && activeCard?.historyType) {
      fetchHistory(activeCard.historyType, period);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate && activeCard?.historyType) {
      fetchHistory(activeCard.historyType, 'custom', customStartDate, customEndDate);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveCard(null);
  };

  // コンバージョンファネル: アクティブ → 友だち追加 → セッション → 登録 → 応募
  // 経由別の場合は funnelMetrics から値を取得
  const sessionsValue = isSpecificFunnel && funnelMetrics
    ? funnelMetrics.sessions
    : (stats.siteTransitionSessions || 0);
  const registrationsValue = isSpecificFunnel && funnelMetrics
    ? funnelMetrics.yjRegistrations
    : (stats.yjRegistrations || 0);
  const applicationsValue = isSpecificFunnel && funnelMetrics
    ? funnelMetrics.yjApplications
    : (stats.yjApplications || 0);

  const funnelCards: CardConfig[] = [
    {
      id: 'activeUsers',
      title: `${periodLabel}アクティブ`,
      value: stats.todayActiveUsers.toLocaleString(),
      icon: BoltIcon,
      tag: isSpecificFunnel ? funnelLabel : 'ファネル',
      helper: isSpecificFunnel ? `${funnelLabel}含む全経由` : 'クリックで履歴表示',
      border: 'border-orange-200',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      historyType: isSpecificFunnel ? undefined : 'activeUsers',
      chartColor: '#f97316',
      chartLabel: 'アクティブユーザー',
    },
    {
      id: 'lineFollowersAdded',
      title: `${periodLabel}友だち追加`,
      value: stats.lineFollowersAdded === null ? '-' : (stats.lineFollowersAdded || 0).toLocaleString(),
      icon: UserPlusIcon,
      tag: isSpecificFunnel ? funnelLabel : 'ファネル',
      helper: stats.lineFollowersAdded === null ? '本日のデータは取得不可' : 'LINE APIより算出',
      border: 'border-green-200',
      iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
    },
    {
      id: 'sessions',
      title: `${periodLabel}セッション`,
      value: funnelLoading ? '...' : sessionsValue.toLocaleString(),
      icon: CursorArrowRaysIcon,
      tag: isSpecificFunnel ? funnelLabel : 'ファネル',
      subtitle: isSpecificFunnel ? `${funnelLabel}経由` : `${stats.siteTransitionUsers || 0}人`,
      helper: isSpecificFunnel ? `${funnelLabel}経由のセッション` : '診断経由のクリック数',
      border: 'border-blue-200',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      id: 'yjRegistration',
      title: `${periodLabel}登録`,
      value: funnelLoading ? '...' : registrationsValue.toLocaleString(),
      icon: DocumentCheckIcon,
      tag: isSpecificFunnel ? funnelLabel : 'ファネル',
      helper: isSpecificFunnel ? `${funnelLabel}経由の登録` : 'クリックで履歴表示',
      border: 'border-sky-200',
      iconBg: 'bg-gradient-to-br from-sky-500 to-sky-600',
      historyType: isSpecificFunnel ? undefined : 'yjRegistration',
      chartColor: '#0ea5e9',
      chartLabel: '登録',
    },
    {
      id: 'yjApplication',
      title: `${periodLabel}応募`,
      value: funnelLoading ? '...' : applicationsValue.toLocaleString(),
      icon: BriefcaseIcon,
      tag: isSpecificFunnel ? funnelLabel : 'ファネル',
      helper: isSpecificFunnel ? `${funnelLabel}経由の応募` : 'クリックで履歴表示',
      border: 'border-sky-200',
      iconBg: 'bg-gradient-to-br from-sky-600 to-sky-700',
      historyType: isSpecificFunnel ? undefined : 'yjApplication',
      chartColor: '#0284c7',
      chartLabel: '応募',
    },
  ];

  // 診断セクション: 診断人数 → 診断数 → 診断リピート
  const diagnosisCards: CardConfig[] = [
    {
      id: 'diagnosisUsers',
      title: `${periodLabel}診断人数`,
      value: (stats.diagnosisUserCount || 0).toLocaleString(),
      icon: UsersIcon,
      tag: '診断',
      helper: '診断を実施した人数',
      border: 'border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
    },
    {
      id: 'diagnosis',
      title: `${periodLabel}診断数`,
      value: stats.totalDiagnosis.toLocaleString(),
      icon: ClipboardDocumentListIcon,
      tag: '診断',
      helper: 'クリックで履歴表示',
      border: 'border-amber-200',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
      historyType: 'diagnosis',
      chartColor: '#f59e0b',
      chartLabel: '診断数',
    },
    {
      id: 'repeatUsers',
      title: '診断リピート',
      value: stats.repeatUserCount.toLocaleString(),
      icon: ArrowPathIcon,
      tag: '診断',
      subtitle: `リピート率: ${stats.repeatRate}%`,
      helper: '2回以上診断実施',
      border: 'border-emerald-200',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
  ];

  // その他の情報カード
  const infoCards: CardConfig[] = [
    {
      id: 'lineFollowers',
      title: 'LINE友だち数',
      value: (stats.lineFollowers || 0).toLocaleString(),
      icon: UsersIcon,
      tag: 'LINE',
      helper: '総友だち数（累計）',
      border: 'border-green-200',
      iconBg: 'bg-gradient-to-br from-green-600 to-green-700',
    },
  ];

  // カードをレンダリングする関数
  const renderCard = (card: CardConfig) => {
    const Icon = card.icon;
    const isClickable = !!card.historyType;
    return (
      <div
        key={card.id}
        onClick={() => isClickable && handleCardClick(card)}
        className={`dashboard-panel p-4 border-l-4 ${card.border} hover:-translate-y-0.5 transition duration-200 ${
          isClickable ? 'cursor-pointer hover:shadow-lg' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.tag}</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{card.title}</p>
            <p className="text-2xl font-black text-slate-900">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs font-semibold text-slate-600">{card.subtitle}</p>
            )}
            <p className="text-xs text-slate-400">{card.helper}</p>
          </div>
          <div
            className={`h-10 w-10 rounded-lg text-white flex items-center justify-center shadow-md ${card.iconBg} flex-shrink-0`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* コンバージョンファネル */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
          <span className="h-1 w-4 bg-gradient-to-r from-orange-500 to-sky-500 rounded-full"></span>
          コンバージョンファネル
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {funnelCards.map(renderCard)}
        </div>
      </div>

      {/* 診断指標 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
          <span className="h-1 w-4 bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full"></span>
          診断指標
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {diagnosisCards.map(renderCard)}
          {infoCards.map(renderCard)}
        </div>
      </div>

      {/* 汎用履歴モーダル */}
      {showModal && activeCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center ${activeCard.iconBg}`}
                >
                  <activeCard.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeCard.title}の履歴</h2>
                  <p className="text-sm text-slate-500">日別の推移</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <XMarkIcon className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Period Selector */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  {(['7days', '14days', '30days'] as HistoryPeriodType[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => handlePeriodChange(period)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedPeriod === period
                          ? 'text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                      style={
                        selectedPeriod === period
                          ? { backgroundColor: activeCard.chartColor }
                          : undefined
                      }
                    >
                      {period === '7days' ? '1週間' : period === '14days' ? '2週間' : '1ヶ月'}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedPeriod('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                      selectedPeriod === 'custom'
                        ? 'text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    style={
                      selectedPeriod === 'custom'
                        ? { backgroundColor: activeCard.chartColor }
                        : undefined
                    }
                  >
                    <CalendarIcon className="h-4 w-4" />
                    カスタム
                  </button>
                </div>

                {selectedPeriod === 'custom' && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-slate-400">〜</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleCustomDateApply}
                      className="px-4 py-2 text-white rounded-lg text-sm font-medium transition"
                      style={{ backgroundColor: activeCard.chartColor }}
                    >
                      適用
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="p-6">
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: activeCard.chartColor }}
                  />
                </div>
              ) : historyData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                        formatter={(value: number) => [value, activeCard.chartLabel]}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={activeCard.chartColor}
                        strokeWidth={2}
                        dot={{ fill: activeCard.chartColor, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  データがありません
                </div>
              )}
            </div>

            {/* Summary */}
            {historyData.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {historyData.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">合計</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {Math.round(
                        historyData.reduce((sum, d) => sum + d.count, 0) / historyData.length
                      ).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">日平均</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {Math.max(...historyData.map((d) => d.count)).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">最大</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
