'use client';

import { useState, useEffect } from 'react';
import { ActivityTable } from '@/components/dashboard/ActivityTable';
import type { Activity } from '@/types/dashboard';

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard/users?limit=20');
        if (res.ok) {
          setActivity(await res.json());
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
        <h1 className="text-2xl font-bold text-slate-900">アクティビティ</h1>
        <p className="text-slate-500 text-sm mt-1">最近のユーザーアクション</p>
      </div>
      <ActivityTable data={activity} />
    </div>
  );
}
