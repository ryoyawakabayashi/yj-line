'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatFlow } from '@/lib/database/flow-queries';

const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  support_button: 'サポートボタン',
  keyword: 'キーワード',
  postback: 'ポストバック',
  message_pattern: 'メッセージパターン',
};

export default function FlowManagementPage() {
  const [flows, setFlows] = useState<ChatFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    service: 'all',
    triggerType: 'all',
    search: '',
    showInactive: false,
  });

  useEffect(() => {
    fetchFlows();
  }, [filter.service, filter.triggerType, filter.showInactive]);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.service !== 'all') {
        params.set('service', filter.service);
      }
      if (filter.triggerType !== 'all') {
        params.set('triggerType', filter.triggerType);
      }
      if (filter.showInactive) {
        params.set('isActive', 'false');
      } else {
        params.set('isActive', 'true');
      }

      const res = await fetch(`/api/dashboard/flows?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFlows(data.flows || []);
      }
    } catch (error) {
      console.error('フロー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`フロー "${name}" を無効化しますか？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/flows/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchFlows();
      }
    } catch (error) {
      console.error('フロー削除エラー:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboard/flows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        fetchFlows();
      }
    } catch (error) {
      console.error('フロー復元エラー:', error);
    }
  };

  const filteredFlows = flows.filter((flow) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        flow.name.toLowerCase().includes(searchLower) ||
        flow.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/support" className="text-gray-500 hover:text-gray-700">
                ← サポート
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">チャットフロー管理</h1>
                <p className="text-sm text-gray-500 mt-1">
                  ノードベースのビジュアルエディタでフローを作成
                </p>
              </div>
            </div>
            <Link
              href="/support/flows/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + 新規作成
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">フィルタ:</span>

            <select
              value={filter.service}
              onChange={(e) => setFilter({ ...filter, service: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">全サービス</option>
              <option value="YOLO_JAPAN">YOLO JAPAN</option>
              <option value="YOLO_DISCOVER">YOLO DISCOVER</option>
              <option value="YOLO_HOME">YOLO HOME</option>
            </select>

            <select
              value={filter.triggerType}
              onChange={(e) => setFilter({ ...filter, triggerType: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">全トリガー</option>
              <option value="support_button">サポートボタン</option>
              <option value="keyword">キーワード</option>
              <option value="postback">ポストバック</option>
              <option value="message_pattern">メッセージパターン</option>
            </select>

            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="検索..."
              className="flex-1 min-w-[200px] border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filter.showInactive}
                onChange={(e) => setFilter({ ...filter, showInactive: e.target.checked })}
                className="rounded border-gray-300"
              />
              無効を含む
            </label>

            <button
              onClick={fetchFlows}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              更新
            </button>
          </div>
        </div>

        {/* Flow Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    フロー名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    トリガー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    サービス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    説明
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                    優先度
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                    状態
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      フローがありません
                    </td>
                  </tr>
                ) : (
                  filteredFlows.map((flow) => (
                    <tr
                      key={flow.id}
                      className={`hover:bg-gray-50 ${!flow.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{flow.name}</div>
                        <div className="text-xs text-gray-500">
                          {flow.flowDefinition.nodes.length} ノード
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          {TRIGGER_TYPE_LABELS[flow.triggerType] || flow.triggerType}
                        </div>
                        {flow.triggerValue && (
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {flow.triggerValue}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {flow.service
                          ? SERVICE_LABELS[flow.service] || flow.service
                          : '全サービス'}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {flow.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center w-20">
                        {flow.priority}
                      </td>
                      <td className="px-4 py-3 text-center w-20">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            flow.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {flow.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/support/flows/${flow.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            編集
                          </Link>
                          {flow.isActive ? (
                            <button
                              onClick={() => handleDelete(flow.id, flow.name)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              無効化
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(flow.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              有効化
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">
            表示中: {filteredFlows.length}件 / 全{flows.length}件
          </p>
        </div>
      </main>
    </div>
  );
}
