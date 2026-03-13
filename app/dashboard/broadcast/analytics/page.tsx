'use client';

import Link from 'next/link';
import { ArrowLeftIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline';

export default function BroadcastAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/broadcast" className="text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配信分析</h1>
          <p className="text-sm text-gray-500 mt-1">配信のパフォーマンス分析</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <PresentationChartLineIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">配信分析機能は準備中です</p>
        <p className="text-gray-400 text-xs mt-1">配信履歴の統計データはメッセージリストから確認できます</p>
        <Link
          href="/dashboard/broadcast/history"
          className="inline-block mt-4 px-4 py-2 bg-[#eaae9e] hover:bg-[#d4917f] text-white rounded-lg text-sm font-medium transition-colors"
        >
          メッセージリストを見る
        </Link>
      </div>
    </div>
  );
}
