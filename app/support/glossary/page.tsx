'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface GlossaryTerm {
  id: string;
  ja: string;
  ja_easy: string | null;
  en: string | null;
  ko: string | null;
  zh: string | null;
  vi: string | null;
  note: string | null;
}

const EMPTY_TERM = { ja: '', ja_easy: '', en: '', ko: '', zh: '', vi: '', note: '' };
const LANGS = [
  { key: 'ja', label: 'JA（標準）' },
  { key: 'ja_easy', label: 'JA（やさしい）' },
  { key: 'en', label: 'EN' },
  { key: 'ko', label: 'KO' },
  { key: 'zh', label: 'ZH' },
  { key: 'vi', label: 'VI' },
] as const;

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_TERM);
  const [newForm, setNewForm] = useState(EMPTY_TERM);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTerms = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/glossary');
      const data = await res.json();
      if (data.success) setTerms(data.terms);
    } catch (error) {
      console.error('用語集取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  const handleCreate = async () => {
    if (!newForm.ja.trim()) return alert('日本語（標準）は必須です');
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (data.success) {
        setTerms((prev) => [...prev, data.term]);
        setNewForm(EMPTY_TERM);
        setShowNew(false);
      } else {
        alert('作成に失敗しました');
      }
    } catch { alert('エラーが発生しました'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/glossary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setTerms((prev) => prev.map((t) => (t.id === id ? data.term : t)));
        setEditingId(null);
      } else {
        alert('更新に失敗しました');
      }
    } catch { alert('エラーが発生しました'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この用語を削除しますか？')) return;
    try {
      const res = await fetch(`/api/dashboard/glossary/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTerms((prev) => prev.filter((t) => t.id !== id));
      }
    } catch { alert('削除に失敗しました'); }
  };

  const startEdit = (term: GlossaryTerm) => {
    setEditingId(term.id);
    setEditForm({
      ja: term.ja,
      ja_easy: term.ja_easy || '',
      en: term.en || '',
      ko: term.ko || '',
      zh: term.zh || '',
      vi: term.vi || '',
      note: term.note || '',
    });
  };

  const filtered = terms.filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [t.ja, t.ja_easy, t.en, t.ko, t.zh, t.vi, t.note]
      .some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/support" className="text-gray-500 hover:text-gray-700">&larr; 戻る</Link>
          <h1 className="text-xl font-bold">用語集（グロッサリー）</h1>
          <span className="text-sm text-gray-400">{terms.length}件</span>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewForm(EMPTY_TERM); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          + 用語を追加
        </button>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* 説明 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          フロー翻訳時に、ここで定義した用語が自動的に使用されます。サイトと同じ表現に統一できます。
        </div>

        {/* 検索 */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="用語を検索..."
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* 新規追加フォーム */}
        {showNew && (
          <div className="mb-6 p-4 bg-white border border-blue-300 rounded-lg shadow-sm">
            <h3 className="font-bold text-sm mb-3">新しい用語を追加</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {LANGS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label} {key === 'ja' && <span className="text-red-500">*</span>}</label>
                  <input
                    type="text"
                    value={(newForm as any)[key]}
                    onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    placeholder={label}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">メモ</label>
                <input
                  type="text"
                  value={newForm.note}
                  onChange={(e) => setNewForm({ ...newForm, note: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  placeholder="用途・コンテキスト"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '追加'}
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* テーブル */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? '検索結果がありません' : '用語がまだありません。「+ 用語を追加」から始めましょう。'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">JA（標準）</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">JA（やさしい）</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">EN</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">KO</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ZH</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">VI</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">メモ</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((term) => (
                  <tr key={term.id} className="hover:bg-gray-50">
                    {editingId === term.id ? (
                      <>
                        {LANGS.map(({ key }) => (
                          <td key={key} className="px-2 py-1.5">
                            <input
                              type="text"
                              value={(editForm as any)[key]}
                              onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                              className="w-full px-1.5 py-1 text-xs border border-blue-300 rounded"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            className="w-full px-1.5 py-1 text-xs border border-blue-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleUpdate(term.id)}
                              disabled={saving}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-medium">{term.ja}</td>
                        <td className="px-3 py-2 text-gray-600">{term.ja_easy || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{term.en || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{term.ko || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{term.zh || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-gray-600">{term.vi || <span className="text-gray-300">-</span>}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{term.note || ''}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => startEdit(term)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(term.id)}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
