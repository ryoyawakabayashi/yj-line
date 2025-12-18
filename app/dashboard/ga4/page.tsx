'use client';

import { useState, useEffect } from 'react';
import { GA4ConversionPieChart } from '@/components/dashboard/GA4ConversionPieChart';
import { GA4ConversionTrendChart } from '@/components/dashboard/GA4ConversionTrendChart';
import type { GA4ConversionBySource, GA4DailyConversion } from '@/types/dashboard';

interface GA4Data {
  bySource: GA4ConversionBySource[];
  dailyTrends: GA4DailyConversion[];
}

export default function GA4Page() {
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/ga4-conversions?days=30&type=both');
        if (res.ok) {
          setData(await res.json());
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

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500 py-12">
          GA4データが利用できません
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GA4 CV</h1>
        <p className="text-slate-500 text-sm mt-1">Google Analytics 4 コンバージョン分析</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GA4ConversionPieChart data={data.bySource} />

        <div className="dashboard-panel p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">流入元別 CV 詳細</h3>
          <div className="space-y-3">
            {data.bySource.map((item, index) => (
              <div key={index} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-800">{item.source}</span>
                  <span className="text-xl font-bold text-purple-600">{item.conversions.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <div className="text-blue-600 text-xs">登録 CV</div>
                    <div className="text-blue-900 font-bold">{item.registrations.toLocaleString()}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <div className="text-emerald-600 text-xs">応募 CV</div>
                    <div className="text-emerald-900 font-bold">{item.applications.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>CVR: {((item.conversions / item.sessions) * 100).toFixed(2)}%</span>
                  <span>セッション: {item.sessions.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GA4ConversionTrendChart data={data.dailyTrends} />
    </div>
  );
}
