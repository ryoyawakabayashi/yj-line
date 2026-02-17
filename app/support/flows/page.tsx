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

// --- テンプレート型 ---
interface ReplyTemplate {
  id: string;
  name: string;
  message: string;
  quickReplies: { label: string; text: string }[];
  isActive: boolean;
  sortOrder: number;
}

type Tab = 'flows' | 'templates';

export default function FlowManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('flows');

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
                  フローとリプライテンプレートを管理
                </p>
              </div>
            </div>
            {activeTab === 'flows' && (
              <Link
                href="/support/flows/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + 新規フロー
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('flows')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'flows'
                  ? 'bg-gray-50 text-blue-600 border border-b-0 border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              フロー
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
                activeTab === 'templates'
                  ? 'bg-gray-50 text-blue-600 border border-b-0 border-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              リプライテンプレート
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'flows' ? <FlowsTab /> : <TemplatesTab />}
    </div>
  );
}

// =====================================================
// フロータブ（既存のフロー一覧）
// =====================================================
function FlowsTab() {
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
  );
}

// =====================================================
// テンプレートタブ
// =====================================================
function TemplatesTab() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // フォーム状態
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formReplies, setFormReplies] = useState<{ label: string; text: string }[]>([
    { label: '', text: '' },
  ]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/templates?active=true');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormMessage('');
    setFormReplies([{ label: '', text: '' }]);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (tpl: ReplyTemplate) => {
    setFormName(tpl.name);
    setFormMessage(tpl.message);
    setFormReplies(tpl.quickReplies.length > 0 ? [...tpl.quickReplies] : [{ label: '', text: '' }]);
    setEditingId(tpl.id);
    setShowForm(true);
  };

  const addReplyRow = () => {
    setFormReplies([...formReplies, { label: '', text: '' }]);
  };

  const removeReplyRow = (index: number) => {
    if (formReplies.length <= 1) return;
    setFormReplies(formReplies.filter((_, i) => i !== index));
  };

  const updateReplyRow = (index: number, field: 'label' | 'text', value: string) => {
    const updated = [...formReplies];
    updated[index] = { ...updated[index], [field]: value };
    setFormReplies(updated);
  };

  const handleSave = async () => {
    const validReplies = formReplies.filter((r) => r.label.trim() && r.text.trim());
    if (!formName.trim() || !formMessage.trim() || validReplies.length === 0) {
      alert('名前、メッセージ、クイックリプライ（1つ以上）を入力してください');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        message: formMessage.trim(),
        quickReplies: validReplies,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/dashboard/templates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/dashboard/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        resetForm();
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('テンプレート保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`テンプレート「${name}」を削除しますか？`)) return;

    try {
      const res = await fetch(`/api/dashboard/templates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* 新規作成 / 編集フォーム */}
      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editingId ? 'テンプレート編集' : '新規テンプレート'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート名</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="例: 応募ガイド"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メッセージ本文</label>
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="例: お仕事への応募方法を選んでください："
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              クイックリプライボタン
            </label>
            <div className="space-y-2">
              {formReplies.map((reply, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={reply.label}
                    onChange={(e) => updateReplyRow(index, 'label', e.target.value)}
                    placeholder="ボタン表示名"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    value={reply.text}
                    onChange={(e) => updateReplyRow(index, 'text', e.target.value)}
                    placeholder="送信テキスト（例: AI_MODE）"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => removeReplyRow(index)}
                    disabled={formReplies.length <= 1}
                    className="text-red-500 hover:text-red-700 disabled:text-gray-300 text-sm px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addReplyRow}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + ボタン追加
            </button>
          </div>

          {/* プレビュー */}
          {formMessage.trim() && formReplies.some((r) => r.label.trim()) && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">プレビュー</p>
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-xs">
                <p className="text-sm whitespace-pre-wrap">{formMessage}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formReplies
                  .filter((r) => r.label.trim())
                  .map((r, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-600 rounded-full"
                    >
                      {r.label}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm transition"
            >
              {saving ? '保存中...' : editingId ? '更新' : '作成'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            + 新規テンプレート
          </button>
        </div>
      )}

      {/* テンプレート一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            テンプレートがありません。「+ 新規テンプレート」から作成してください。
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  テンプレート名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  メッセージ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ボタン
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{tpl.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {tpl.message}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tpl.quickReplies.map((qr, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full"
                        >
                          {qr.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 w-32">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => startEdit(tpl)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-500">
          テンプレート数: {templates.length}件
        </p>
      </div>
    </main>
  );
}
