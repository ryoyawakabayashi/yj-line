'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type PeriodType = 'today' | 'yesterday' | 'week' | '2week' | 'month';
export type FunnelType = 'all' | 'diagnosis' | 'menu' | 'feature' | 'message' | 'autochat';

// 経由タイプのラベル
export const FUNNEL_TYPE_LABELS: Record<FunnelType, string> = {
  all: '統合',
  diagnosis: 'AI診断',
  menu: 'メニュー',
  feature: '特集',
  message: '配信',
  autochat: 'AIトーク',
};

interface DashboardPeriodContextType {
  periodType: PeriodType;
  selectedMonth: string;
  funnelType: FunnelType;
  setPeriodType: (type: PeriodType) => void;
  setSelectedMonth: (month: string) => void;
  setFunnelType: (type: FunnelType) => void;
  // AI用のperiodIdを返す（APIパラメータ用）
  getAIPeriod: () => string;
  // 期間のラベルを返す
  getPeriodLabel: () => string;
  // 経由のラベルを返す
  getFunnelLabel: () => string;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextType | null>(null);

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [funnelType, setFunnelType] = useState<FunnelType>('all');

  // AIコンテキストAPI用のperiodを返す
  const getAIPeriod = useCallback(() => {
    if (periodType === 'today') return 'today';
    if (periodType === 'yesterday') return 'today'; // 昨日は本日相当
    if (periodType === 'week') return 'week';
    if (periodType === '2week') return '2week';
    return 'month';
  }, [periodType]);

  // 期間ラベルを返す
  const getPeriodLabel = useCallback(() => {
    if (periodType === 'today') return '本日';
    if (periodType === 'yesterday') return '昨日';
    if (periodType === 'week') return '週間';
    if (periodType === '2week') return '2週間';

    const [, monthNum] = selectedMonth.split('-').map(Number);
    return `${monthNum}月`;
  }, [periodType, selectedMonth]);

  // 経由ラベルを返す
  const getFunnelLabel = useCallback(() => {
    return FUNNEL_TYPE_LABELS[funnelType];
  }, [funnelType]);

  return (
    <DashboardPeriodContext.Provider
      value={{
        periodType,
        selectedMonth,
        funnelType,
        setPeriodType,
        setSelectedMonth,
        setFunnelType,
        getAIPeriod,
        getPeriodLabel,
        getFunnelLabel,
      }}
    >
      {children}
    </DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod() {
  const context = useContext(DashboardPeriodContext);
  if (!context) {
    throw new Error('useDashboardPeriod must be used within DashboardPeriodProvider');
  }
  return context;
}
