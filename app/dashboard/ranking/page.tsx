'use client';

import { useState, useEffect } from 'react';
import { TopUsersRanking } from '@/components/dashboard/TopUsersRanking';
import type { TopUser } from '@/types/dashboard';

export default function RankingPage() {
  const [ranking, setRanking] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/ranking?limit=10');
        if (res.ok) {
          setRanking(await res.json());
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ランキング</h1>
        <p className="text-slate-500 text-sm mt-1">アクティブユーザーTop 10</p>
      </div>
      <div className="max-w-2xl">
        <TopUsersRanking data={ranking} />
      </div>
    </div>
  );
}
