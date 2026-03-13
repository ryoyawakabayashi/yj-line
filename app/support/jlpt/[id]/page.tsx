'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
const CATEGORIES = ['grammar', 'vocabulary', 'kanji', 'reading'] as const;
const LANGS = ['ja', 'en', 'ko', 'zh', 'vi'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  grammar: '文法',
  vocabulary: '語彙',
  kanji: '漢字',
  reading: '読解',
};

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
};

export default function JlptEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState('N5');
  const [category, setCategory] = useState('grammar');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState<Record<string, string>>({});
  const [isApproved, setIsApproved] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ja');

  useEffect(() => {
    fetch(`/api/dashboard/jlpt/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.question) {
          const q = data.question;
          setLevel(q.level);
          setCategory(q.category);
          setQuestionText(q.question_text);
          setOptions(q.options || ['', '', '', '']);
          setCorrectIndex(q.correct_index);
          setExplanation(q.explanation || {});
          setIsApproved(q.is_approved);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!questionText.trim()) {
      alert('問題文を入力してください');
      return;
    }
    if (options.some((o) => !o.trim())) {
      alert('全ての選択肢を入力してください');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/jlpt/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          category,
          question_text: questionText,
          options,
          correct_index: correctIndex,
          explanation,
          is_approved: isApproved,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('保存しました');
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (e) {
      alert('通信エラー');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この問題を削除しますか？')) return;
    try {
      await fetch(`/api/dashboard/jlpt/${id}`, { method: 'DELETE' });
      router.push('/support/jlpt');
    } catch (e) {
      alert('削除に失敗しました');
    }
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const updateExplanation = (lang: string, value: string) => {
    setExplanation((prev) => ({ ...prev, [lang]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const numberEmoji = ['①', '②', '③', '④'];

  return (
    <div className="p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/support/jlpt" className="text-blue-600 hover:underline text-sm">
              &larr; 問題一覧
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">問題を編集</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
            >
              削除
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-lg text-white font-medium text-sm ${
                saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">基本情報</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">レベル</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">承認ステータス</label>
              <button
                onClick={() => setIsApproved(!isApproved)}
                className={`w-full px-4 py-2 rounded font-medium text-sm ${
                  isApproved
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-orange-100 text-orange-700 border border-orange-300'
                }`}
              >
                {isApproved ? '承認済み' : '未承認'}
              </button>
            </div>
          </div>
        </div>

        {/* 問題文 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">問題文</h2>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="次の文の（　）に入るものはどれですか？..."
          />
        </div>

        {/* 選択肢 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">選択肢</h2>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-3">
                <button
                  onClick={() => setCorrectIndex(i)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    correctIndex === i
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={correctIndex === i ? '正解' : 'クリックで正解に設定'}
                >
                  {numberEmoji[i]}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className={`flex-1 border rounded px-3 py-2 text-sm ${
                    correctIndex === i ? 'border-green-400 bg-green-50' : ''
                  }`}
                  placeholder={`選択肢${i + 1}`}
                />
                {correctIndex === i && (
                  <span className="text-green-600 text-xs font-medium">正解</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">番号ボタンをクリックして正解を設定</p>
        </div>

        {/* 解説（多言語） */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">解説</h2>
          <div className="flex gap-2 mb-4">
            {LANGS.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1.5 rounded text-sm ${
                  selectedLang === lang
                    ? 'bg-blue-600 text-white'
                    : explanation[lang]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {LANG_LABELS[lang]} {explanation[lang] ? '✓' : ''}
              </button>
            ))}
          </div>
          <textarea
            value={explanation[selectedLang] || ''}
            onChange={(e) => updateExplanation(selectedLang, e.target.value)}
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={`${LANG_LABELS[selectedLang]}の解説...`}
          />
        </div>

        {/* プレビュー */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">LINEプレビュー</h2>
          <div className="bg-green-50 rounded-lg p-4 max-w-sm">
            <p className="text-sm whitespace-pre-wrap">
              {'📝 (1/10)\n\n'}
              {questionText || '（問題文）'}
              {'\n\n'}
              {options.map((opt, i) => `${numberEmoji[i]} ${opt || '（選択肢）'}`).join('\n')}
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              {options.map((opt, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded-full text-xs ${
                    correctIndex === i ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {`${numberEmoji[i]} ${(opt || '?').slice(0, 12)}`}
                </span>
              ))}
            </div>
          </div>
        </div>
    </div>
  );
}
