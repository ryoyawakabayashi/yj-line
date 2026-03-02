'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrashIcon, PaperAirplaneIcon, ClockIcon, DocumentIcon,
  ArrowUpIcon, ArrowDownIcon, UserPlusIcon, XMarkIcon, PhotoIcon,
  Squares2X2Icon, ChatBubbleLeftIcon, LinkIcon, ArrowUpTrayIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';

// =====================================================
// Types
// =====================================================

interface MessageItem {
  type: 'text' | 'card' | 'image';
  text?: string;
  imageUrl?: string;
  title?: string;
  body?: string;
  altText?: string;
  buttons?: { label: string; url: string; campaign?: string }[];
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
}

interface TestUser {
  id: string;
  lineUserId: string;
  label: string | null;
  displayName: string | null;
  pictureUrl: string | null;
}

interface RecentCampaign {
  id: string;
  name: string | null;
  delivery_method: string;
  executed_at: string | null;
  result: any;
  messages: any[];
  status: string;
}

interface CampaignStats {
  uniqueImpression?: number;
  uniqueClick?: number;
}

const AREA_OPTIONS = [
  { value: 'kanto', label: '関東' },
  { value: 'kansai', label: '関西' },
  { value: 'chubu', label: '中部' },
  { value: 'hokkaido', label: '北海道' },
  { value: 'tohoku', label: '東北' },
  { value: 'chugoku', label: '中国' },
  { value: 'shikoku', label: '四国' },
  { value: 'kyushu', label: '九州' },
];

const METHOD_OPTIONS: { value: 'broadcast' | 'narrowcast' | 'test'; label: string }[] = [
  { value: 'broadcast', label: 'LINE友達全員' },
  { value: 'narrowcast', label: 'LINE友達（絞込）' },
  { value: 'test', label: '登録ユーザー' },
];

// =====================================================
// Helper: API calls
// =====================================================

async function api(method: 'GET' | 'POST', params?: Record<string, string>, body?: any) {
  if (method === 'GET') {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`/api/dashboard/broadcast?${qs}`);
    return res.json();
  }
  const res = await fetch('/api/dashboard/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** 画像をSupabase Storageにアップロードし、公開URLを返す */
async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok || data.error) return { error: data.error || 'アップロード失敗' };
  return { url: data.url };
}

// =====================================================
// Component
// =====================================================

export default function BroadcastPage() {
  // --- State ---
  const [campaignName, setCampaignName] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'broadcast' | 'narrowcast' | 'test'>('broadcast');
  const [area, setArea] = useState('kanto');
  const [broadcastLang, setBroadcastLang] = useState('ja');
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [newTestUserId, setNewTestUserId] = useState('');
  const [newTestLabel, setNewTestLabel] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedHour, setSchedHour] = useState('12');
  const [schedMin, setSchedMin] = useState('00');
  const [uploading, setUploading] = useState<number | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [recentStats, setRecentStats] = useState<Record<string, CampaignStats | null>>({});
  const [areaEstimates, setAreaEstimates] = useState<Record<string, number>>({});
  const [targetedReaches, setTargetedReaches] = useState<number | null>(null);

  // --- Load initial data ---
  const loadData = useCallback(async () => {
    const [followerRes, testRes, recentRes, demoRes] = await Promise.all([
      api('GET', { action: 'follower_count' }),
      api('GET', { action: 'test_users' }),
      api('GET', { action: 'recent_campaigns' }),
      api('GET', { action: 'demographic' }),
    ]);
    if (followerRes.followers !== undefined) setFollowerCount(followerRes.followers);
    if (demoRes.available && demoRes.estimates) {
      setAreaEstimates(demoRes.estimates);
      setTargetedReaches(demoRes.targetedReaches || null);
    }
    if (testRes.users) setTestUsers(testRes.users);
    if (recentRes.campaigns) {
      setRecentCampaigns(recentRes.campaigns);
      // Fetch stats for campaigns with aggUnit
      const withUnit = (recentRes.campaigns as RecentCampaign[]).filter((c) => c.result?.aggUnit);
      const statsResults: Record<string, CampaignStats | null> = {};
      await Promise.all(
        withUnit.map(async (c) => {
          try {
            const data = await api('GET', { action: 'broadcast_stats', unit: c.result.aggUnit });
            if (data.overview) {
              statsResults[c.id] = { uniqueImpression: data.overview.uniqueImpression, uniqueClick: data.overview.uniqueClick };
            } else {
              statsResults[c.id] = null;
            }
          } catch { statsResults[c.id] = null; }
        })
      );
      setRecentStats(statsResults);
    }
  }, []);

  useEffect(() => {
    loadData();
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get('draft');
    if (draftId) loadDraft(draftId);
  }, [loadData]);

  const loadDraft = async (id: string) => {
    const res = await api('GET', { action: 'campaign_detail', id });
    const draft = res.campaign;
    if (draft) {
      setEditingDraftId(draft.id);
      setCampaignName(draft.name || '');
      setMessages(draft.messages || []);
      setDeliveryMethod(draft.delivery_method || 'broadcast');
      setArea(draft.area || 'kanto');
      setBroadcastLang(draft.broadcast_lang || 'ja');
    }
  };

  // --- Message editor helpers ---
  const addMessage = (type: 'text' | 'card' | 'image') => {
    if (messages.length >= 5) return;
    if (type === 'text') setMessages([...messages, { type: 'text', text: '' }]);
    else if (type === 'card') setMessages([...messages, { type: 'card', title: '', body: '', buttons: [] }]);
    else setMessages([...messages, { type: 'image', originalUrl: '' }]);
  };

  const updateMessage = (idx: number, patch: Partial<MessageItem>) => {
    setMessages(messages.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMessage = (idx: number) => {
    setMessages(messages.filter((_, i) => i !== idx));
  };

  const moveMessage = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= messages.length) return;
    const copy = [...messages];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setMessages(copy);
  };

  const addButton = (msgIdx: number) => {
    const msg = messages[msgIdx];
    const buttons = [...(msg.buttons || []), { label: '', url: '' }];
    updateMessage(msgIdx, { buttons });
  };

  const updateButton = (msgIdx: number, btnIdx: number, patch: Partial<{ label: string; url: string; campaign: string }>) => {
    const msg = messages[msgIdx];
    const buttons = (msg.buttons || []).map((b, i) => (i === btnIdx ? { ...b, ...patch } : b));
    updateMessage(msgIdx, { buttons });
  };

  const removeButton = (msgIdx: number, btnIdx: number) => {
    const msg = messages[msgIdx];
    const buttons = (msg.buttons || []).filter((_, i) => i !== btnIdx);
    updateMessage(msgIdx, { buttons });
  };

  // --- Image upload ---
  const handleImageUpload = async (msgIdx: number, file: File, field: 'originalUrl' | 'imageUrl') => {
    setUploading(msgIdx);
    try {
      const result = await uploadImage(file);
      if ('error' in result) {
        setResultMsg({ type: 'error', text: result.error });
      } else {
        updateMessage(msgIdx, { [field]: result.url });
      }
    } catch {
      setResultMsg({ type: 'error', text: '画像のアップロードに失敗しました' });
    } finally {
      setUploading(null);
    }
  };

  // --- Actions ---
  const handleSend = async () => {
    const methodLabel = deliveryMethod === 'broadcast' ? '全友達に配信' : deliveryMethod === 'narrowcast' ? `${AREA_OPTIONS.find(a => a.value === area)?.label || area}に配信` : 'テスト配信';
    if (!confirm(`${methodLabel}しますか？`)) return;

    setSending(true);
    setResultMsg(null);
    try {
      const res = await api('POST', undefined, {
        action: 'send',
        name: campaignName || undefined,
        messages,
        deliveryMethod,
        area: deliveryMethod === 'narrowcast' ? area : undefined,
        broadcastLang,
      });
      if (res.success) {
        setResultMsg({ type: 'success', text: `配信成功${res.requestId ? ` (requestId: ${res.requestId})` : res.successCount !== undefined ? ` (${res.successCount}/${res.testUsers}人)` : ''}` });
      } else {
        setResultMsg({ type: 'error', text: res.error || '配信に失敗しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '通信エラーが発生しました' });
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await api('POST', undefined, {
        action: 'save_draft',
        id: editingDraftId || undefined,
        name: campaignName || undefined,
        messages,
        deliveryMethod,
        area: deliveryMethod === 'narrowcast' ? area : undefined,
        broadcastLang,
      });
      if (res.success) {
        setEditingDraftId(res.id);
        setResultMsg({ type: 'success', text: '下書き保存しました' });
      }
    } catch {
      setResultMsg({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const buildScheduledISOString = () => {
    if (!schedDate) return '';
    const jstDate = new Date(`${schedDate}T${schedHour.padStart(2, '0')}:${schedMin.padStart(2, '0')}:00+09:00`);
    return jstDate.toISOString();
  };

  const handleSchedule = async (isTest = false) => {
    const isoStr = buildScheduledISOString();
    if (!isoStr) return;
    setSending(true);
    try {
      const res = await api('POST', undefined, {
        action: 'schedule',
        id: editingDraftId || undefined,
        name: campaignName || undefined,
        messages,
        deliveryMethod: isTest ? 'test' : deliveryMethod,
        area: deliveryMethod === 'narrowcast' && !isTest ? area : undefined,
        broadcastLang,
        scheduledAt: isoStr,
      });
      if (res.success) {
        setShowScheduleModal(false);
        const jstStr = `${schedDate} ${schedHour.padStart(2, '0')}:${schedMin.padStart(2, '0')}`;
        setResultMsg({ type: 'success', text: `${jstStr} (JST) に${isTest ? 'テスト' : ''}予約しました` });
      }
    } catch {
      setResultMsg({ type: 'error', text: '予約に失敗しました' });
    } finally {
      setSending(false);
    }
  };

  const handleAddTestUser = async () => {
    if (!newTestUserId.trim()) return;
    const res = await api('POST', undefined, {
      action: 'add_test_user',
      lineUserId: newTestUserId.trim(),
      label: newTestLabel.trim() || undefined,
    });
    if (res.success) {
      setNewTestUserId('');
      setNewTestLabel('');
      loadData();
    }
  };

  const handleDeleteTestUser = async (id: string) => {
    await api('POST', undefined, { action: 'delete_test_user', id });
    loadData();
  };

  const targetCount = deliveryMethod === 'test'
    ? testUsers.length
    : deliveryMethod === 'narrowcast' && areaEstimates[area]
      ? areaEstimates[area]
      : (targetedReaches ?? followerCount);
  const isEstimate = deliveryMethod === 'narrowcast' && !!areaEstimates[area];

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メッセージ配信</h1>
        </div>
        <Link
          href="/dashboard/broadcast/history"
          className="text-sm text-[#d10a1c] hover:text-[#b00917] font-medium"
        >
          配信履歴 &rarr;
        </Link>
      </div>

      {/* Result message */}
      {resultMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${resultMsg.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {resultMsg.text}
        </div>
      )}

      {/* テストユーザー管理 (top section) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">テストユーザー</h3>
        <div className="flex gap-2 items-center mb-3">
          <input
            type="text"
            value={newTestUserId}
            onChange={(e) => setNewTestUserId(e.target.value)}
            placeholder="LINE User ID (U...)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
          />
          <input
            type="text"
            value={newTestLabel}
            onChange={(e) => setNewTestLabel(e.target.value)}
            placeholder="ラベル"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
          />
          <button onClick={handleAddTestUser} className="flex items-center gap-1.5 px-4 py-2 bg-[#eaae9e] hover:bg-[#d4917f] text-white rounded-lg text-sm font-medium whitespace-nowrap">
            <UserPlusIcon className="h-4 w-4" /> 追加
          </button>
        </div>
        {testUsers.length > 0 && (
          <div className="space-y-2">
            {testUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-1">
                {u.pictureUrl ? (
                  <img src={u.pictureUrl} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">?</div>
                )}
                <span className="text-sm font-medium text-gray-800">{u.displayName || u.label || '(不明)'}</span>
                <span className="text-xs text-gray-400 truncate">{u.lineUserId.slice(0, 16)}...</span>
                <button onClick={() => handleDeleteTestUser(u.id)} className="ml-auto p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {testUsers.length === 0 && (
          <p className="text-xs text-gray-400">テストユーザーが未登録です</p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ═══════ 左カラム: 設定 + エディタ ═══════ */}
        <div className="xl:col-span-2 space-y-4">

          {/* 配信方式 (tab-style) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">配信方式</h3>
            <div className="flex gap-2">
              {METHOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setDeliveryMethod(m.value)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    deliveryMethod === m.value
                      ? 'bg-[#eaae9e] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* エリア選択 (Narrowcast時のみ) - chip style */}
            {deliveryMethod === 'narrowcast' && (
              <div className="mt-4">
                <h4 className="text-xs font-medium text-gray-500 mb-2">エリア選択</h4>
                <div className="flex flex-wrap gap-2">
                  {AREA_OPTIONS.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setArea(a.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        area === a.value
                          ? 'bg-[#eaae9e] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {a.label}
                      {areaEstimates[a.value] ? (
                        <span className={`ml-1 ${area === a.value ? 'text-white/70' : 'text-gray-400'}`}>
                          ≈{areaEstimates[a.value].toLocaleString()}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 配信対象数 */}
            <div className="mt-3 text-sm text-gray-600">
              配信対象:{' '}
              <span className="font-bold text-gray-900">
                {targetCount !== null
                  ? `${isEstimate ? '≈ ' : ''}${targetCount.toLocaleString()}人`
                  : '取得中...'}
              </span>
              {isEstimate && (
                <span className="text-xs text-gray-400 ml-1.5">（デモグラフィック推定）</span>
              )}
            </div>
          </div>

          {/* タイトル */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="タイトル（管理用・配信には含まれません）"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
            />
          </div>

          {/* メッセージセクション */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                メッセージ ({messages.length}/5)
              </h3>
              <div className="flex gap-1.5">
                <button
                  onClick={() => addMessage('text')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5" /> +テキスト
                </button>
                <button
                  onClick={() => addMessage('card')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <Squares2X2Icon className="h-3.5 w-3.5" /> +カード
                </button>
                <button
                  onClick={() => addMessage('image')}
                  disabled={messages.length >= 5}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  <PhotoIcon className="h-3.5 w-3.5" /> +画像
                </button>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 text-sm">
                上のボタンからメッセージを追加してください
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {msg.type === 'text' ? 'テキスト' : msg.type === 'card' ? 'カード' : '画像'} #{idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => moveMessage(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded hover:bg-gray-100">
                          <ArrowUpIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => moveMessage(idx, 1)} disabled={idx === messages.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20 rounded hover:bg-gray-100">
                          <ArrowDownIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeMessage(idx)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Text */}
                    {msg.type === 'text' && (
                      <textarea
                        value={msg.text || ''}
                        onChange={(e) => updateMessage(idx, { text: e.target.value })}
                        placeholder="メッセージテキスト..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                      />
                    )}

                    {/* Card */}
                    {msg.type === 'card' && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={msg.title || ''}
                          onChange={(e) => updateMessage(idx, { title: e.target.value })}
                          placeholder="タイトル"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                        <textarea
                          value={msg.body || ''}
                          onChange={(e) => updateMessage(idx, { body: e.target.value })}
                          placeholder="本文"
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">画像 (任意)</label>
                          {msg.imageUrl ? (
                            <div className="relative inline-block">
                              <img src={msg.imageUrl} alt="" className="h-20 rounded-lg object-cover border border-gray-200" />
                              <button
                                onClick={() => updateMessage(idx, { imageUrl: '' })}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className={`inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors text-xs text-gray-500 ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              {uploading === idx ? 'アップロード中...' : '画像を選択'}
                              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(idx, f, 'imageUrl'); e.target.value = ''; }} />
                            </label>
                          )}
                        </div>
                        <input
                          type="text"
                          value={msg.altText || ''}
                          onChange={(e) => updateMessage(idx, { altText: e.target.value })}
                          placeholder="Alt テキスト (プッシュ通知テキスト)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                        {/* Buttons */}
                        <div className="space-y-2">
                          {(msg.buttons || []).map((btn, bi) => (
                            <div key={bi} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={btn.label}
                                onChange={(e) => updateButton(idx, bi, { label: e.target.value })}
                                placeholder="ラベル"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                              />
                              <input
                                type="text"
                                value={btn.url}
                                onChange={(e) => updateButton(idx, bi, { url: e.target.value })}
                                placeholder="URL"
                                className="flex-[2] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                              />
                              <button onClick={() => removeButton(idx, bi)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                <XMarkIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => addButton(idx)} className="text-xs text-[#d10a1c] font-medium hover:underline">
                            + ボタン追加
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    {msg.type === 'image' && (
                      <div className="space-y-3">
                        {msg.originalUrl ? (
                          <div className="relative inline-block">
                            <img src={msg.originalUrl} alt="" className="h-28 rounded-lg object-cover border border-gray-200" />
                            <button
                              onClick={() => updateMessage(idx, { originalUrl: '' })}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#eaae9e] hover:bg-[#fdf2ef] transition-colors ${uploading === idx ? 'opacity-50 pointer-events-none' : ''}`}>
                            <ArrowUpTrayIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">{uploading === idx ? 'アップロード中...' : '画像を選択'}</span>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(idx, f, 'originalUrl'); e.target.value = ''; }} />
                          </label>
                        )}
                        <input
                          type="text"
                          value={msg.linkUrl || ''}
                          onChange={(e) => updateMessage(idx, { linkUrl: e.target.value })}
                          placeholder="リンク先URL (任意: タップ時に遷移)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setDeliveryMethod('test'); handleSend(); }}
                disabled={sending || messages.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" /> テスト配信
              </button>
              <button
                onClick={handleSend}
                disabled={sending || messages.length === 0}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#d10a1c] hover:bg-[#b00917] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {sending ? '送信中...' : '配信する'}
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                disabled={messages.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <ClockIcon className="h-4 w-4" /> 予約配信
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || messages.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <DocumentIcon className="h-4 w-4" /> {saving ? '保存中...' : '下書き保存'}
              </button>
              <Link
                href="/dashboard/broadcast/history"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
              >
                <BookmarkIcon className="h-4 w-4" /> 下書き読み込み
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════ 右カラム: プレビュー ═══════ */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">プレビュー</h3>
              <select
                value={broadcastLang}
                onChange={(e) => setBroadcastLang(e.target.value)}
                className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-[#eaae9e]"
              >
                <option value="ja">JA</option>
                <option value="en">EN</option>
              </select>
            </div>
            <div className="bg-[#7B9EBC] rounded-xl p-3 space-y-2 min-h-[300px]">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-[280px] text-white/60 text-xs">
                  メッセージ未追加
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <PreviewBubble key={idx} msg={msg} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ 最近の配信 ═══════ */}
      {recentCampaigns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">最近の配信</h3>
            <Link href="/dashboard/broadcast/history" className="text-xs text-[#d10a1c] hover:text-[#b00917] font-medium">
              配信履歴を見る &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentCampaigns.map((c) => {
              const stats = recentStats[c.id];
              const isTest = c.delivery_method === 'test';
              const methodLabel = isTest ? 'Test' : c.delivery_method === 'narrowcast' ? 'Narrowcast' : 'Broadcast';
              const execDate = c.executed_at
                ? new Date(c.executed_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '-';
              return (
                <div key={c.id} className={`rounded-lg border px-4 py-3 ${c.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-gray-800 truncate flex-1">{c.name || '無題の配信'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isTest ? 'bg-gray-200 text-gray-600' : 'bg-[#fdf2ef] text-[#d10a1c]'}`}>
                      {methodLabel}
                    </span>
                    <span className="text-xs text-gray-500">{execDate}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-gray-500">
                    {c.status === 'failed' ? (
                      <span className="text-red-600 font-medium">配信失敗{c.result?.error ? `: ${c.result.error}` : ''}</span>
                    ) : isTest ? (
                      <span>送信: {c.result?.successCount ?? '-'}人（テスト配信のため統計なし）</span>
                    ) : stats ? (
                      <span>
                        開封: <span className="font-medium text-gray-700">{stats.uniqueImpression?.toLocaleString() ?? '-'}人</span>
                        {stats.uniqueImpression ? <span className="text-gray-400 ml-0.5">({((stats.uniqueClick || 0) / stats.uniqueImpression * 100).toFixed(0)}%クリック)</span> : null}
                        {' '}クリック: <span className="font-medium text-gray-700">{stats.uniqueClick?.toLocaleString() ?? '-'}人</span>
                      </span>
                    ) : c.result?.aggUnit ? (
                      <span className="text-gray-400">統計データ集計中...</span>
                    ) : (
                      <span className="text-gray-400">統計なし</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ 予約モーダル ═══════ */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">予約配信設定</h3>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">配信日</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">時刻 (JST)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={schedHour}
                    onChange={(e) => setSchedHour(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={String(i)}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-medium">時</span>
                  <select
                    value={schedMin}
                    onChange={(e) => setSchedMin(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#eaae9e] focus:border-[#eaae9e]"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const v = String(i * 5).padStart(2, '0');
                      return <option key={v} value={v}>{v}</option>;
                    })}
                  </select>
                  <span className="text-gray-500 font-medium">分</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>配信方式: {METHOD_OPTIONS.find(m => m.value === deliveryMethod)?.label}</p>
                <p>メッセージ数: {messages.length}件</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleSchedule(false)}
                disabled={!schedDate || sending}
                className="flex-1 py-2.5 bg-[#d10a1c] hover:bg-[#b00917] text-white font-medium rounded-lg disabled:opacity-50 text-sm"
              >
                {sending ? '予約中...' : '予約する'}
              </button>
            </div>
            <button
              onClick={() => handleSchedule(true)}
              disabled={!schedDate || sending}
              className="w-full mt-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs disabled:opacity-50"
            >
              テスト予約 (テストユーザーのみ)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// LINE Preview Bubble Components
// =====================================================

function PreviewBubble({ msg }: { msg: MessageItem }) {
  if (msg.type === 'text') {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] shadow-sm">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text || '(テキスト未入力)'}</p>
        </div>
      </div>
    );
  }

  if (msg.type === 'image') {
    return (
      <div className="flex justify-start mb-2">
        <div className="bg-white rounded-2xl rounded-tl-sm overflow-hidden max-w-[85%] shadow-sm relative">
          {msg.originalUrl ? (
            <>
              <img src={msg.originalUrl} alt="" className="w-full h-36 object-cover" />
              {msg.linkUrl && (
                <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">(画像未選択)</div>
          )}
        </div>
      </div>
    );
  }

  // Card
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white rounded-2xl rounded-tl-sm overflow-hidden max-w-[85%] shadow-sm">
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="" className="w-full h-28 object-cover" />
        )}
        <div className="px-3 py-2.5">
          {msg.title && <p className="text-sm font-bold text-gray-800">{msg.title}</p>}
          {msg.body && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{msg.body}</p>}
        </div>
        {(msg.buttons || []).length > 0 && (
          <div className="border-t border-gray-100">
            {(msg.buttons || []).map((btn, i) => (
              <div
                key={i}
                className="px-3 py-2.5 text-center text-sm font-bold text-white border-b border-white/20 last:border-b-0"
                style={{ backgroundColor: '#eaae9e' }}
              >
                {btn.label || '(ラベル未入力)'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
