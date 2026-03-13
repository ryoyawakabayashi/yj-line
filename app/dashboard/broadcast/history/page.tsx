'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PaperAirplaneIcon, ClockIcon, DocumentIcon, ArrowLeftIcon,
  TrashIcon, PencilSquareIcon, ChevronDownIcon, ChevronUpIcon,
  DocumentDuplicateIcon,
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

interface ClickDetail {
  url: string;
  uniqueClick: number;
}

interface CampaignStats {
  uniqueImpression?: number;
  uniqueClick?: number;
  clicks?: ClickDetail[];
}

interface NarrowcastProgress {
  phase: 'waiting' | 'sending' | 'succeeded' | 'failed';
  successCount?: number;
  failureCount?: number;
  targetCount?: number;
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
  prefecture: '都道府県',
  recent_followers: '新規友達',
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

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 50 ? url.slice(0, 50) + '...' : url;
  }
}

export default function BroadcastHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sent');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, CampaignStats | null>>({});
  const [progressMap, setProgressMap] = useState<Record<string, NarrowcastProgress | null>>({});
  const [conversionsMap, setConversionsMap] = useState<Record<string, number | null>>({});
  const [expandedClicks, setExpandedClicks] = useState<string | null>(null);

  const fetchNarrowcastProgress = async (campaigns: Campaign[]) => {
    const narrowcasts = campaigns.filter(
      (c) => c.delivery_method === 'narrowcast' && c.result?.requestId && c.status === 'sent'
    );
    const results: Record<string, NarrowcastProgress | null> = {};
    await Promise.all(
      narrowcasts.map(async (c) => {
        try {
          const data = await apiGet({ action: 'narrowcast_progress', requestId: c.result.requestId });
          if (data.phase) {
            results[c.id] = data;
          } else {
            results[c.id] = null;
          }
        } catch {
          results[c.id] = null;
        }
      })
    );
    setProgressMap(results);
  };

  const fetchCampaigns = async (status: string) => {
    setLoading(true);
    setStatsMap({});
    setProgressMap({});
    setConversionsMap({});
    try {
      if (status === 'sent') {
        const [sentRes, failedRes] = await Promise.all([
          apiGet({ action: 'campaigns', status: 'sent' }),
          apiGet({ action: 'campaigns', status: 'failed' }),
        ]);
        const all = [...(sentRes.campaigns || []), ...(failedRes.campaigns || [])];
        all.sort((a: Campaign, b: Campaign) => new Date(b.executed_at || b.created_at).getTime() - new Date(a.executed_at || a.created_at).getTime());
        setCampaigns(all);
        fetchStatsForCampaigns(all);
        fetchNarrowcastProgress(all);
        fetchConversionsForCampaigns(all);
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
          const execDate = (c.executed_at || c.created_at).slice(0, 10).replace(/-/g, '');
          const data = await apiGet({ action: 'broadcast_stats', unit: c.result.aggUnit, from: execDate });
          if (data.overview) {
            results[c.id] = {
              uniqueImpression: data.overview.uniqueImpression,
              uniqueClick: data.overview.uniqueClick,
              clicks: data.clicks?.map((cl: any) => ({ url: cl.url, uniqueClick: cl.uniqueClick })) || [],
            };
          } else {
            results[c.id] = null;
          }
        } catch {
          results[c.id] = null;
        }
      })
    );
    setStatsMap(results);
  };

  const fetchConversionsForCampaigns = async (campaigns: Campaign[]) => {
    const sent = campaigns.filter((c) => c.status === 'sent' && c.delivery_method !== 'test');
    const results: Record<string, number | null> = {};
    await Promise.all(
      sent.map(async (c) => {
        try {
          const data = await apiGet({ action: 'broadcast_conversions', campaignId: c.id });
          results[c.id] = data.conversions ?? null;
        } catch {
          results[c.id] = null;
        }
      })
    );
    setConversionsMap(results);
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

  const sentColSpan = 9; // 名前,方式,日時,MSG,送信,開封,クリック,応募,操作

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
                      <th className="text-right py-3 px-4 font-medium text-gray-600">応募</th>
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
                  const progress = progressMap[c.id];
                  const conversions = conversionsMap[c.id];
                  const hasAggUnit = !!c.result?.aggUnit;
                  const isNarrowcast = c.delivery_method === 'narrowcast';
                  const isTest = c.delivery_method === 'test';
                  const hasClicks = stats?.clicks && stats.clicks.length > 0;
                  const isExpanded = expandedClicks === c.id;
                  return (
                    <>
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
                            {/* 送信数 */}
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {isTest
                                ? (c.result?.successCount ?? '-')
                                : isNarrowcast && progress
                                  ? (progress.phase === 'succeeded' || progress.phase === 'sending'
                                    ? <span>{(progress.successCount ?? 0).toLocaleString()}<span className="text-gray-400 text-xs ml-0.5">人</span></span>
                                    : progress.phase === 'waiting'
                                      ? <span className="text-gray-400 text-xs">送信待ち</span>
                                      : <span className="text-red-500 text-xs">失敗</span>)
                                  : (stats?.uniqueImpression !== undefined ? stats.uniqueImpression.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-')
                              }
                            </td>
                            {/* 開封数 */}
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {isTest
                                ? '-'
                                : (stats?.uniqueImpression !== undefined ? stats.uniqueImpression.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-')
                              }
                            </td>
                            {/* クリック数 */}
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {isTest ? '-' : (
                                <span className="inline-flex items-center gap-1">
                                  {stats?.uniqueClick !== undefined ? stats.uniqueClick.toLocaleString() : hasAggUnit ? <span className="text-gray-400 text-xs">集計中</span> : '-'}
                                  {hasClicks && (
                                    <button
                                      onClick={() => setExpandedClicks(isExpanded ? null : c.id)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      {isExpanded ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                                    </button>
                                  )}
                                </span>
                              )}
                            </td>
                            {/* 応募数 */}
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {isTest
                                ? '-'
                                : conversions !== undefined && conversions !== null
                                  ? conversions > 0
                                    ? <span className="text-green-700">{conversions}</span>
                                    : <span className="text-gray-400">0</span>
                                  : <span className="text-gray-400 text-xs">-</span>
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
                            <Link
                              href={`/dashboard/broadcast?copy=${c.id}`}
                              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium inline-flex items-center gap-1"
                            >
                              <DocumentDuplicateIcon className="h-3.5 w-3.5" /> コピー
                            </Link>
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
                      {/* URL別クリック展開行 */}
                      {isExpanded && hasClicks && (
                        <tr key={`${c.id}-clicks`} className="bg-gray-50">
                          <td colSpan={sentColSpan} className="px-4 py-3">
                            <div className="ml-4">
                              <p className="text-xs font-semibold text-gray-500 mb-2">URL別クリック内訳</p>
                              <div className="space-y-1.5">
                                {stats!.clicks!.map((cl, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 truncate max-w-[400px]" title={cl.url}>{shortenUrl(cl.url)}</span>
                                    <span className="font-medium text-gray-800 ml-4 whitespace-nowrap">{cl.uniqueClick.toLocaleString()} クリック</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activeTab === 'sent' && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
              ※ 統計（送信/開封/クリック）はLINE Insight APIから取得。配信直後は「集計中」と表示され、翌日以降に反映されます。応募数は配信経由のコンバージョンを集計します。
            </div>
          )}
        </div>
      )}
    </div>
  );
}
