'use client';

import { useState, useEffect } from 'react';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { FunnelChart } from '@/components/dashboard/FunnelChart';
import { FunnelComparisonChart } from '@/components/dashboard/FunnelComparisonChart';
import { ChevronDownIcon, CalendarDaysIcon, FunnelIcon } from '@heroicons/react/24/outline';
import type { DashboardStats } from '@/types/dashboard';
import { useDashboardPeriod, type PeriodType, type FunnelType, FUNNEL_TYPE_LABELS } from '@/contexts/DashboardPeriodContext';

// 経由タイプの選択肢
const FUNNEL_OPTIONS: { value: FunnelType; label: string }[] = [
  { value: 'all', label: '統合' },
  { value: 'diagnosis', label: 'AI診断' },
  { value: 'menu', label: 'メニュー' },
  { value: 'feature', label: '特集' },
  { value: 'message', label: '配信' },
  { value: 'autochat', label: 'AIトーク' },
];

// 過去12ヶ月分の選択肢を生成
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

// 期間の表示文字列を生成
function getPeriodDisplay(periodType: PeriodType, month: string): string {
  const now = new Date();

  if (periodType === 'today') {
    return `${now.getMonth() + 1}月${now.getDate()}日（本日）`;
  }

  if (periodType === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getMonth() + 1}月${yesterday.getDate()}日（昨日）`;
  }

  if (periodType === 'week') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    return `${startDate.getMonth() + 1}月${startDate.getDate()}日〜${now.getMonth() + 1}月${now.getDate()}日（過去7日）`;
  }

  if (periodType === '2week') {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 13);
    return `${startDate.getMonth() + 1}月${startDate.getDate()}日〜${now.getMonth() + 1}月${now.getDate()}日（過去14日）`;
  }

  // month
  const [year, monthNum] = month.split('-').map(Number);
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNum;
  const startDay = 1;
  const endDay = isCurrentMonth ? now.getDate() : new Date(year, monthNum, 0).getDate();

  return `${monthNum}月${startDay}日〜${monthNum}月${endDay}日`;
}

// 期間タイプのラベルを取得
function getLocalPeriodLabel(periodType: PeriodType, month: string): string {
  if (periodType === 'today') return '本日の';
  if (periodType === 'yesterday') return '昨日の';
  if (periodType === 'week') return '週間';
  if (periodType === '2week') return '2週間';

  const [, monthNum] = month.split('-').map(Number);
  return `${monthNum}月の`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Contextから期間・経由状態を取得（AIチャットと共有）
  const { periodType, selectedMonth, funnelType, setPeriodType, setSelectedMonth, setFunnelType } = useDashboardPeriod();

  const monthOptions = getMonthOptions();

  useEffect(() => {
    fetchData();
  }, [periodType, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/dashboard/stats';
      if (periodType === 'today') {
        url += '?period=today';
      } else if (periodType === 'yesterday') {
        url += '?period=yesterday';
      } else if (periodType === 'week') {
        url += '?period=week';
      } else if (periodType === '2week') {
        url += '?period=2week';
      } else {
        url += `?month=${selectedMonth}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
  };

  const periodDisplay = getPeriodDisplay(periodType, selectedMonth);
  const periodLabel = getLocalPeriodLabel(periodType, selectedMonth);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Funnel & Period Selectors */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* 左: 経由セレクター */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-slate-600">経由:</span>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {FUNNEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFunnelType(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  funnelType === option.value
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 右: 期間セレクター */}
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium text-slate-600">期間:</span>
          <button
            onClick={() => handlePeriodTypeChange('today')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              periodType === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            本日
          </button>
          <button
            onClick={() => handlePeriodTypeChange('yesterday')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              periodType === 'yesterday'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            昨日
          </button>
          <button
            onClick={() => handlePeriodTypeChange('week')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              periodType === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            1週
          </button>
          <button
            onClick={() => handlePeriodTypeChange('2week')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              periodType === '2week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            2週
          </button>
          <button
            onClick={() => handlePeriodTypeChange('month')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              periodType === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            月間
          </button>
          {periodType === 'month' && (
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-md px-3 py-1.5 pr-8 text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* サブヘッダー: 現在の選択状態 */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="font-medium text-slate-700">{FUNNEL_TYPE_LABELS[funnelType]}</span>
        <span>|</span>
        <span>{periodDisplay}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <SummaryCards stats={stats} periodLabel={periodLabel} funnelType={funnelType} periodType={periodType} selectedMonth={selectedMonth} />
          {funnelType === 'all' ? (
            <FunnelComparisonChart
              month={periodType === 'month' ? selectedMonth : undefined}
              periodType={periodType}
            />
          ) : (
            <FunnelChart
              month={periodType === 'month' ? selectedMonth : undefined}
              periodType={periodType}
              funnelType={funnelType as Exclude<FunnelType, 'all'>}
            />
          )}
        </>
      )}
    </div>
  );
}
