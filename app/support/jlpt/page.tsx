'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const CATEGORIES = ['grammar', 'vocabulary', 'kanji', 'reading'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  grammar: '文法',
  vocabulary: '語彙',
  kanji: '漢字',
  reading: '読解',
};

interface JlptQuestion {
  id: string;
  level: string;
  category: string;
  question_text: string;
  options: string[];
  correct_index: number;
  is_approved: boolean;
  created_at: string;
}

type Tab = 'approved' | 'draft';

export default function JlptListPage() {
  const [questions, setQuestions] = useState<JlptQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('draft');
  const [filterLevels, setFilterLevels] = useState<Set<string>>(new Set());
  const [filterCategories, setFilterCategories] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genLevel, setGenLevel] = useState('N5');
  const [genCategory, setGenCategory] = useState('grammar');
  const [genCount, setGenCount] = useState(10);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{ valid: number; errors: string[] } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    question_text: string;
    correct: string;
    wrong: [string, string, string];
  } | null>(null);
  const [editFocus, setEditFocus] = useState<'question' | 'correct' | number>('question');
  const [approvedCounts, setApprovedCounts] = useState<{
    levels: Record<string, number>;
    categories: Record<string, number>;
  }>({ levels: {}, categories: {} });

  const toEditData = (q: JlptQuestion) => ({
    question_text: q.question_text,
    correct: q.options[q.correct_index] || '',
    wrong: [
      ...q.options.filter((_, i) => i !== q.correct_index),
    ].slice(0, 3) as [string, string, string],
  });

  const fromEditData = (ed: { correct: string; wrong: [string, string, string]; question_text: string }) => ({
    question_text: ed.question_text,
    options: [ed.correct, ...ed.wrong],
    correct_index: 0,
  });

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterLevels.size > 0) params.set('level', Array.from(filterLevels).join(','));
    if (filterCategories.size > 0) params.set('category', Array.from(filterCategories).join(','));
    params.set('approved', tab === 'approved' ? 'true' : 'false');

    try {
      const res = await fetch(`/api/dashboard/jlpt?${params}`);
      const data = await res.json();
      if (data.success) setQuestions(data.questions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterLevels, filterCategories, tab]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/jlpt?mode=counts');
      const data = await res.json();
      if (data.success) {
        setApprovedCounts({ levels: data.levels, categories: data.categories });
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchCounts();
  }, [fetchQuestions, fetchCounts]);

  useEffect(() => {
    setSelectedIds(new Set());
    setEditingId(null);
    setEditData(null);
  }, [tab]);

  const toggleLevel = (level: string) => {
    setFilterLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setFilterCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleBulkApprove = async (approve: boolean) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setQuestions(prev => prev.filter(q => !ids.includes(q.id)));
    setSelectedIds(new Set());
    try {
      await fetch('/api/dashboard/jlpt', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, is_approved: approve }),
      });
    } catch {
      alert('エラーが発生しました');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の問題を削除しますか？`)) return;

    const ids = Array.from(selectedIds);
    setQuestions(prev => prev.filter(q => !ids.includes(q.id)));
    setSelectedIds(new Set());
    for (const id of ids) {
      await fetch(`/api/dashboard/jlpt/${id}`, { method: 'DELETE' });
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/dashboard/jlpt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: genLevel, category: genCategory, count: genCount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.generated}問を生成しました！`);
        setShowGenModal(false);
        if (tab === 'draft') fetchQuestions();
      } else {
        alert(`生成失敗: ${data.error}`);
      }
    } catch {
      alert('通信エラーが発生しました');
    } finally {
      setGenerating(false);
    }
  };

  const validateImportJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [];
      const errors: string[] = [];
      let valid = 0;
      const validLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];
      const validCats = ['grammar', 'vocabulary', 'kanji', 'reading'];
      arr.forEach((q: any, i: number) => {
        if (!q.question_text || !q.correct) {
          errors.push(`${i + 1}: question_text/correct が不足`);
        } else if (!Array.isArray(q.wrong) || q.wrong.length !== 3) {
          errors.push(`${i + 1}: wrong は3つ必要`);
        } else if (!validLevels.includes(q.level)) {
          errors.push(`${i + 1}: level "${q.level}" は無効`);
        } else if (!validCats.includes(q.category)) {
          errors.push(`${i + 1}: category "${q.category}" は無効`);
        } else if (q.wrong.includes(q.correct)) {
          errors.push(`${i + 1}: 正解「${q.correct}」が不正解にも含まれています`);
        } else if (new Set(q.wrong).size !== q.wrong.length) {
          errors.push(`${i + 1}: 不正解に重複があります`);
        } else {
          valid++;
        }
      });
      setImportPreview({ valid, errors });
    } catch {
      setImportPreview({ valid: 0, errors: ['JSONの形式が不正です'] });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch('/api/dashboard/jlpt/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.imported}問インポートしました${data.skipped > 0 ? `（${data.skipped}問スキップ）` : ''}`);
        setShowImportModal(false);
        setImportJson('');
        setImportPreview(null);
        if (tab === 'draft') fetchQuestions();
        fetchCounts();
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch {
      alert('通信エラーが発生しました');
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const saveAndClose = async () => {
    if (!editingId || !editData) return;
    const id = editingId;
    const fields = fromEditData(editData);
    setEditingId(null);
    setEditData(null);
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...fields } : q));
    try {
      await fetch(`/api/dashboard/jlpt/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
    } catch {
      // silent
    }
  };

  const startEdit = (q: JlptQuestion, focus: 'question' | 'correct' | number = 'question') => {
    if (editingId && editingId !== q.id && editData) {
      const prevId = editingId;
      const prevFields = fromEditData(editData);
      setQuestions(prev => prev.map(item => item.id === prevId ? { ...item, ...prevFields } : item));
      fetch(`/api/dashboard/jlpt/${prevId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prevFields),
      });
    }
    setEditFocus(focus);
    setEditingId(q.id);
    setEditData(toEditData(q));
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('この問題を削除しますか？')) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
    try {
      await fetch(`/api/dashboard/jlpt/${id}`, { method: 'DELETE' });
    } catch {
      alert('削除に失敗しました');
    }
  };

  const toggleApprove = async (q: JlptQuestion) => {
    setQuestions(prev => prev.filter(item => item.id !== q.id));
    try {
      await fetch(`/api/dashboard/jlpt/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !q.is_approved }),
      });
    } catch {
      alert('エラー');
    }
  };

  return (
    <div className="p-6 space-y-5" onClick={() => { if (editingId) saveAndClose(); }}>
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">JLPT問題管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          {questions.length}問表示中
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('approved')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition ${
            tab === 'approved'
              ? 'bg-white text-[#d10a1c] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          承認済み
        </button>
        <button
          onClick={() => setTab('draft')}
          className={`px-5 py-2 rounded-md text-sm font-medium transition ${
            tab === 'draft'
              ? 'bg-white text-[#d10a1c] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          編集中
        </button>
      </div>

      {/* フィルタ */}
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-14 shrink-0">レベル</span>
          <div className="flex gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => toggleLevel(l)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterLevels.has(l)
                    ? 'bg-[#d10a1c] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {l}
                <span className={`ml-1 ${filterLevels.has(l) ? 'text-white/70' : 'text-gray-400'}`}>
                  {approvedCounts.levels[l] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-14 shrink-0">カテゴリ</span>
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  filterCategories.has(c)
                    ? 'bg-[#d10a1c] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[c]}
                <span className={`ml-1 ${filterCategories.has(c) ? 'text-white/70' : 'text-gray-400'}`}>
                  {approvedCounts.categories[c] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* アクションバー */}
      <div className="flex items-center gap-2 flex-wrap">
        {tab === 'draft' && (
          <>
            <button
              onClick={() => setShowGenModal(true)}
              className="px-4 py-1.5 bg-[#d10a1c] text-white rounded-lg hover:bg-[#b0081a] transition text-sm font-medium"
            >
              AI一括生成
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-1.5 bg-white text-[#d10a1c] border border-[#d10a1c] rounded-lg hover:bg-[#fdf2ef] transition text-sm font-medium"
            >
              JSONインポート
            </button>
            <Link
              href="/support/jlpt/new"
              className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              手動作成
            </Link>
          </>
        )}

        {selectedIds.size > 0 && (
          <div className="flex gap-2 ml-auto items-center">
            <span className="text-sm text-gray-500">{selectedIds.size}件選択</span>
            {tab === 'draft' && (
              <button
                onClick={() => handleBulkApprove(true)}
                className="px-3 py-1.5 bg-[#d10a1c] text-white rounded text-sm hover:bg-[#b0081a]"
              >
                一括承認
              </button>
            )}
            {tab === 'approved' && (
              <button
                onClick={() => handleBulkApprove(false)}
                className="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                承認取消
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-white text-red-600 border border-red-300 rounded text-sm hover:bg-red-50"
            >
              一括削除
            </button>
          </div>
        )}
      </div>

      {/* 問題一覧 */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">読み込み中...</div>
      ) : questions.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {tab === 'draft'
            ? '未承認の問題がありません。「AI一括生成」または「手動作成」から追加してください。'
            : '承認済みの問題がありません。'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === questions.length && questions.length > 0}
              onChange={toggleSelectAll}
              className="accent-[#d10a1c]"
            />
            <span className="text-xs text-gray-500">全選択</span>
          </div>

          {questions.map((q) => {
            const isEditing = editingId === q.id && editData;
            const correctAnswer = q.options[q.correct_index] || '';
            const wrongAnswers = q.options.filter((_, i) => i !== q.correct_index);

            return (
              <div
                key={q.id}
                className={`bg-white rounded-lg shadow p-4 ${isEditing ? 'ring-2 ring-[#eaae9e]' : ''}`}
                onClick={(e) => { if (isEditing) e.stopPropagation(); }}
              >
                {/* ヘッダー行 */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="accent-[#d10a1c]"
                  />
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#fdf2ef] text-[#d10a1c]">
                    {q.level}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {CATEGORY_LABELS[q.category] || q.category}
                  </span>
                  <button
                    onClick={() => toggleApprove(q)}
                    className={`px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-80 ${
                      tab === 'draft'
                        ? 'bg-[#fdf2ef] text-[#d10a1c] hover:bg-[#f0c4b8]'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {tab === 'draft' ? '承認する' : '承認取消'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                    className="ml-auto text-xs text-gray-400 hover:text-red-500 hover:underline"
                  >
                    削除
                  </button>
                </div>

                {/* 問題文 */}
                <textarea
                  value={isEditing ? editData.question_text : q.question_text}
                  onChange={(e) => { if (isEditing && editData) setEditData({ ...editData, question_text: e.target.value }); }}
                  onFocus={() => { if (!isEditing) startEdit(q, 'question'); }}
                  readOnly={!isEditing}
                  rows={2}
                  autoFocus={isEditing && editFocus === 'question'}
                  className="w-full text-sm bg-transparent border border-transparent rounded px-2 py-1.5 mb-3 resize-none cursor-text hover:border-gray-200 focus:border-[#eaae9e] focus:outline-none focus:ring-1 focus:ring-[#eaae9e]"
                />

                {/* 正解・不正解 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#d10a1c] w-10 shrink-0">正解</span>
                    <input
                      type="text"
                      value={isEditing ? editData.correct : correctAnswer}
                      onChange={(e) => { if (isEditing && editData) setEditData({ ...editData, correct: e.target.value }); }}
                      onFocus={() => { if (!isEditing) startEdit(q, 'correct'); }}
                      readOnly={!isEditing}
                      autoFocus={isEditing && editFocus === 'correct'}
                      className="flex-1 text-sm bg-[#fdf2ef] border border-[#f0c4b8] rounded px-2 py-1.5 cursor-text focus:outline-none focus:ring-1 focus:ring-[#eaae9e]"
                    />
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10 shrink-0">不正解</span>
                      <input
                        type="text"
                        value={isEditing ? editData.wrong[i] : (wrongAnswers[i] || '')}
                        onChange={(e) => {
                          if (isEditing && editData) {
                            const next = [...editData.wrong] as [string, string, string];
                            next[i] = e.target.value;
                            setEditData({ ...editData, wrong: next });
                          }
                        }}
                        onFocus={() => { if (!isEditing) startEdit(q, i); }}
                        readOnly={!isEditing}
                        autoFocus={isEditing && editFocus === i}
                        className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1.5 cursor-text focus:outline-none focus:ring-1 focus:ring-[#eaae9e]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI生成モーダル */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h2 className="text-lg font-bold text-gray-900 mb-4">AI問題一括生成</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">レベル</label>
                <select
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">生成数</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={genCount}
                  onChange={(e) => setGenCount(parseInt(e.target.value) || 10)}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">最大20問</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowGenModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={generating}
              >
                キャンセル
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  generating ? 'bg-gray-400' : 'bg-[#d10a1c] hover:bg-[#b0081a]'
                }`}
              >
                {generating ? '生成中...' : '生成する'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* JSONインポートモーダル */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-2">JSONインポート</h2>
            <p className="text-xs text-gray-500 mb-3">
              外部AIで生成したJSONを貼り付けてインポートします。各問題に level と category が必要です。
            </p>
            <textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                if (e.target.value.trim()) validateImportJson(e.target.value);
                else setImportPreview(null);
              }}
              placeholder={`[\n  {\n    "level": "N1",\n    "category": "vocabulary",\n    "question_text": "問題文",\n    "correct": "正解",\n    "wrong": ["不正解1", "不正解2", "不正解3"]\n  }\n]`}
              rows={14}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#eaae9e] flex-1"
            />

            {/* プレビュー */}
            {importPreview && (
              <div className="mt-3 p-3 rounded-lg bg-gray-50 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-[#d10a1c] font-medium">{importPreview.valid}問 有効</span>
                  {importPreview.errors.length > 0 && (
                    <span className="text-red-500">{importPreview.errors.length}件 エラー</span>
                  )}
                </div>
                {importPreview.errors.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                    {importPreview.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-xs text-red-500">{err}</p>
                    ))}
                    {importPreview.errors.length > 10 && (
                      <p className="text-xs text-gray-400">...他{importPreview.errors.length - 10}件</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowImportModal(false); setImportJson(''); setImportPreview(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={importing}
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importPreview || importPreview.valid === 0}
                className={`px-4 py-2 rounded-lg text-white font-medium ${
                  importing || !importPreview || importPreview.valid === 0
                    ? 'bg-gray-400'
                    : 'bg-[#d10a1c] hover:bg-[#b0081a]'
                }`}
              >
                {importing ? 'インポート中...' : `インポート${importPreview ? `（${importPreview.valid}問）` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
