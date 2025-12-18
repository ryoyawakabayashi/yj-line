'use client';

import { useState, useEffect } from 'react';
import { UserTrendChart } from '@/components/dashboard/UserTrendChart';
import { UsageTrendChart } from '@/components/dashboard/UsageTrendChart';
import type { DailyTrend, DailyUsageTrend } from '@/types/dashboard';

interface TrendData {
  trend: DailyTrend[];
  usageTrend: DailyUsageTrend[];
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/analytics');
        if (res.ok) {
          const analytics = await res.json();
          setData({
            trend: analytics.trend,
            usageTrend: analytics.usageTrend,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">トレンド</h1>
        <p className="text-slate-500 text-sm mt-1">ユーザー数と利用頻度の推移</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <UserTrendChart data={data.trend} />
        </div>
        <div>
          <UsageTrendChart data={data.usageTrend} />
        </div>
      </div>
    </div>
  );
}
