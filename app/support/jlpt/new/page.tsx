'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function JlptNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState('N5');
  const [category, setCategory] = useState('grammar');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState<Record<string, string>>({});
  const [selectedLang, setSelectedLang] = useState('ja');

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
      const res = await fetch('/api/dashboard/jlpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          category,
          question_text: questionText,
          options,
          correct_index: correctIndex,
          explanation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/support/jlpt/${data.question.id}`);
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (e) {
      alert('通信エラー');
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const numberEmoji = ['①', '②', '③', '④'];

  return (
    <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/support/jlpt" className="text-blue-600 hover:underline text-sm">
              &larr; 問題一覧
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">問題を作成</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded-lg text-white font-medium text-sm ${
              saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saving ? '保存中...' : '作成'}
          </button>
        </div>

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">基本情報</h2>
          <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* 解説 */}
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
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
          <textarea
            value={explanation[selectedLang] || ''}
            onChange={(e) => setExplanation((prev) => ({ ...prev, [selectedLang]: e.target.value }))}
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder={`${LANG_LABELS[selectedLang]}の解説...`}
          />
        </div>
    </div>
  );
}
