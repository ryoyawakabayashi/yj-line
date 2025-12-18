'use client';

import { useState, useEffect } from 'react';
import { LanguageChart } from '@/components/dashboard/LanguageChart';
import { JapaneseLevelChart } from '@/components/dashboard/JapaneseLevelChart';
import { IndustryChart } from '@/components/dashboard/IndustryChart';
import { RegionChart } from '@/components/dashboard/RegionChart';
import type {
  LanguageDistribution,
  LevelDistribution,
  IndustryDistribution,
  RegionDistribution,
} from '@/types/dashboard';

interface Analytics {
  languages: LanguageDistribution[];
  levels: LevelDistribution[];
  industries: IndustryDistribution[];
  regions: RegionDistribution[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/analytics');
        if (res.ok) {
          setAnalytics(await res.json());
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

  if (!analytics) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">分析</h1>
        <p className="text-slate-500 text-sm mt-1">ユーザー属性の分布</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LanguageChart data={analytics.languages} />
        <JapaneseLevelChart data={analytics.levels} />
        <IndustryChart data={analytics.industries} />
        <RegionChart data={analytics.regions} />
      </div>
    </div>
  );
}
