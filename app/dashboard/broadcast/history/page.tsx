'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PaperAirplaneIcon, ClockIcon, DocumentIcon, XMarkIcon, ArrowLeftIcon,
  TrashIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface Campaign {
  id: string;
  name: string | null;
  status: string;
  delivery_method: string;
  messages: any[];
  area: string | null;
  broadcast_lang: string;
  scheduled_at: string | null;
  executed_at: string | null;
  result: any;
  admin_email: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CampaignStats {
  uniqueImpression?: number;
  uniqueClick?: number;
}

type TabType = 'sent' | 'scheduled' | 'draft';

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'sent', label: '配信済み', icon: PaperAirplaneIcon },
  { key: 'scheduled', label: '予約中', icon: ClockIcon },
  { key: 'draft', label: '下書き', icon: DocumentIcon },
];

const METHOD_LABELS: Record<string, string> = {
  broadcast: 'Broadcast',
  narrowcast: 'Narrowcast',
  test: 'テスト',
};

const AREA_LABELS: Record<string, string> = {
  kanto: '関東', tokyo: '東京', osaka: '大阪', kansai: '関西',
  chubu: '中部', hokkaido: '北海道', tohoku: '東北',
  chugoku: '中国', shikoku: '四国', kyushu: '九州',
};

async function apiGet(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/dashboard/broadcast?${qs}`);
  return res.json();
}

async function apiPost(body: any) {
  const res = await fetch('/api/dashboard/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function BroadcastHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sent');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats | null>>({});

  const fetchCampaigns = async (status: string) => {
    setLoading(true);
    setStatsMap({});
    try {
      if (status === 'sent') {
        const [sentRes, failedRes] = await Promise.all([
          apiGet({ action: 'campaigns', status: 'sent' }),
          apiGet({ action: 'campaigns', status: 'failed' }),
        ]);
        const all = [...(sentRes.campaigns || []), ...(failedRes.campaigns || [])];
        all.sort((a: Campaign, b: Campaign) => new Date(b.executed_at || b.created_at).getTime() - new Date(a.executed_at || a.created_at).getTime());
        setCampaigns(all);
        // Fetch stats for each campaign with aggUnit
        fetchStatsForCampaigns(all);
      } else {
        const res = await apiGet({ action: 'campaigns', status });
        setCampaigns(res.campaigns || []);
      }
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsForCampaigns = async (campaigns: Campaign[]) => {
    const withUnit = campaigns.filter((c) => c.result?.aggUnit);
    const results: Record<string, CampaignStats | null> = {};
    await Promise.all(
      withUnit.map(async (c) => {
        try {
          const data = await apiGet({ action: 'broadcast_stats', unit: c.result.aggUnit });
          if (data.overview) {
            results[c.id] = {
              uniqueImpression: data.overview.uniqueImpression,
              uniqueClick: data.overview.uniqueClick,
            };
          } else {
            results[c.id] = null; // data not ready
          }
        } catch {
          results[c.id] = null;
        }
      })
    );
    setStatsMap(results);
  };

  useEffect(() => {
    fetchCampaigns(activeTab);
  }, [activeTab]);

  const handleCancelSchedule = async (id: string) => {
    if (!confirm('予約をキャンセルしますか？')) return;
    await apiPost({ action: 'cancel_schedule', id });
    fetchCampaigns('scheduled');
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('下書きを削除しますか？')) return;
    await apiPost({ action: 'delete_draft', id });
    fetchCampaigns('draft');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/broadcast" className="text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配信履歴</h1>
          <p className="text-sm text-gray-500 mt-1">過去の配信・予約・下書き一覧</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  isActive ? 'border-[#eaae9e] text-[#d10a1c]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#eaae9e]" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          {activeTab === 'sent' ? '配信履歴がありません' : activeTab === 'scheduled' ? '予約中の配信がありません' : '下書きがありません'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">名前</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">方式</th>
                  {activeTab === 'sent' && (
                    <>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">配信日時</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">MSG数</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">送信</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">開封</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-600">クリック</th>
                    </>
                  )}
                  {activeTab === 'scheduled' && (
                    <th className="text-left py-3 px-4 font-medium text-gray-600">予約日時</th>
                  )}
                  {activeTab === 'draft' && (
                    <th className="text-left py-3 px-4 font-medium text-gray-600">更新日時</th>
                  )}
                  <th className="text-right py-3 px-4 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const stats = statsMap[c.id];
                  const hasAggUnit = !!c.result?.aggUnit;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {/* 名前 */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{c.name || '無題の配信'}</span>
                          {activeTab === 'sent' && c.status === 'sent' && (
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">配信済み</span>
                          )}
                          {c.status === 'failed' && (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">失敗</span>
                          )}
                        </div>
                      </td>
                      {/* 方式 */}
                      <td className="py-3 px-4 text-gray-600">
                        {METHOD_LABELS[c.delivery_method] || c.delivery_method}
                        {c.area && <span className="text-gray-400 ml-1">/ {AREA_LABELS[c.area] || c.area}</span>}
                      </td>

                      {/* 配信済みタブ */}
                      {activeTab === 'sent' && (
                        <>
                          <td className="py-3 px-4 text-gray-600">{formatDate(c.executed_at)}</td>
                          <td className="py-3 px-4 text-center text-gray-600">{Array.isArray(c.messages) ? c.messages.length : '-'}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-800">
                            {c.delivery_method === 'test'
                              ? (c.result?.successCount ?? '-')
                              : (stats?.uniqueImpression !== undefined ? stats.uniqueImpression.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-')
                            }
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-800">
                            {c.delivery_method === 'test'
                              ? '-'
                              : (stats?.uniqueImpression !== undefined ? stats.uniqueImpression.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-')
                            }
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-800">
                            {c.delivery_method === 'test'
                              ? '-'
                              : (stats?.uniqueClick !== undefined ? stats.uniqueClick.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-')
                            }
                          </td>
                        </>
                      )}

                      {/* 予約中タブ */}
                      {activeTab === 'scheduled' && (
                        <td className="py-3 px-4 text-gray-600">{formatDate(c.scheduled_at)}</td>
                      )}

                      {/* 下書きタブ */}
                      {activeTab === 'draft' && (
                        <td className="py-3 px-4 text-gray-600">{formatDate(c.updated_at || c.created_at)}</td>
                      )}

                      {/* 操作 */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === 'scheduled' && (
                            <button
                              onClick={() => handleCancelSchedule(c.id)}
                              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                            >
                              キャンセル
                            </button>
                          )}
                          {activeTab === 'draft' && (
                            <>
                              <Link
                                href={`/dashboard/broadcast?draft=${c.id}`}
                                className="px-3 py-1.5 text-xs bg-[#eaae9e] hover:bg-[#d4917f] text-white rounded-lg font-medium inline-flex items-center gap-1"
                              >
                                <PencilSquareIcon className="h-3.5 w-3.5" /> 編集
                              </Link>
                              <button
                                onClick={() => handleDeleteDraft(c.id)}
                                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium inline-flex items-center gap-1"
                              >
                                <TrashIcon className="h-3.5 w-3.5" /> 削除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activeTab === 'sent' && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
              ※ 統計（送信/開封/クリック）はLINE Insight APIから取得。配信直後は「集計中」と表示され、翌日以降に反映されます。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
