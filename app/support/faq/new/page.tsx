'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SERVICE_OPTIONS = [
  { value: 'YOLO_JAPAN', label: 'YOLO JAPAN' },
  { value: 'YOLO_DISCOVER', label: 'YOLO DISCOVER' },
  { value: 'YOLO_HOME', label: 'YOLO HOME' },
];

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
};

const SUPPORTED_LANGS = ['ja', 'en', 'ko', 'zh', 'vi'];

export default function FAQNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ja');
  const [keywordsInput, setKeywordsInput] = useState('');

  // フォーム状態
  const [faqKey, setFaqKey] = useState('');
  const [service, setService] = useState('YOLO_JAPAN');
  const [priority, setPriority] = useState(0);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [translations, setTranslations] = useState<
    Record<string, { question: string; answer: string }>
  >(
    SUPPORTED_LANGS.reduce(
      (acc, lang) => ({
        ...acc,
        [lang]: { question: '', answer: '' },
      }),
      {}
    )
  );

  const handleSave = async () => {
    // バリデーション
    if (!faqKey.trim()) {
      alert('FAQ Keyを入力してください');
      return;
    }

    if (!translations.ja.question || !translations.ja.answer) {
      alert('日本語の質問と回答は必須です');
      return;
    }

    setSaving(true);
    try {
      const translationsArray = Object.entries(translations)
        .filter(([, data]) => data.question && data.answer)
        .map(([lang, data]) => ({
          lang,
          question: data.question,
          answer: data.answer,
        }));

      const res = await fetch('/api/dashboard/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          faqKey: faqKey.trim(),
          keywords,
          priority,
          translations: translationsArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert('FAQを作成しました');
        router.push(`/support/faq/${data.faqId}`);
      } else {
        const error = await res.json();
        alert(`作成に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert('作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordsInput.trim() && !keywords.includes(keywordsInput.trim())) {
      setKeywords([...keywords, keywordsInput.trim()]);
      setKeywordsInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const updateTranslation = (lang: string, field: 'question' | 'answer', value: string) => {
    setTranslations({
      ...translations,
      [lang]: {
        ...translations[lang],
        [field]: value,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/support/faq" className="text-gray-500 hover:text-gray-700">
                ← FAQ一覧
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FAQ新規作成</h1>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
            >
              {saving ? '作成中...' : '作成'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">基本情報</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FAQ Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={faqKey}
                onChange={(e) => setFaqKey(e.target.value)}
                placeholder="例: withdrawal, login_issue"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                英数字とアンダースコアのみ使用可能
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サービス <span className="text-red-500">*</span>
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              優先度（大きいほど優先）
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              className="w-32 border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="キーワードを入力"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                onClick={addKeyword}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                追加
              </button>
            </div>
          </div>
        </div>

        {/* 翻訳 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              翻訳 <span className="text-red-500">*</span>
            </h2>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {SUPPORTED_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {LANG_LABELS[lang]}
                  {translations[lang]?.question ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-gray-500">
            日本語は必須です。他の言語はオプションです。
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              質問 ({LANG_LABELS[selectedLang]})
              {selectedLang === 'ja' && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="text"
              value={translations[selectedLang]?.question || ''}
              onChange={(e) => updateTranslation(selectedLang, 'question', e.target.value)}
              placeholder="質問を入力"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              回答 ({LANG_LABELS[selectedLang]})
              {selectedLang === 'ja' && <span className="text-red-500"> *</span>}
            </label>
            <textarea
              value={translations[selectedLang]?.answer || ''}
              onChange={(e) => updateTranslation(selectedLang, 'answer', e.target.value)}
              placeholder="回答を入力"
              rows={10}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* プレビュー */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">プレビュー</h3>
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {translations[selectedLang]?.answer || '（回答なし）'}
            </div>
          </div>
        </div>

        {/* 翻訳状況 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            翻訳状況
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {SUPPORTED_LANGS.map((lang) => {
              const hasContent = translations[lang]?.question && translations[lang]?.answer;
              const isRequired = lang === 'ja';
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`p-3 rounded-lg text-center transition ${
                    selectedLang === lang
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : hasContent
                      ? 'bg-green-50 border border-green-300'
                      : isRequired
                      ? 'bg-red-50 border border-red-300'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <p className="font-medium text-sm">
                    {LANG_LABELS[lang]}
                    {isRequired && <span className="text-red-500">*</span>}
                  </p>
                  <p className="text-xs mt-1">
                    {hasContent ? '入力済み' : '未入力'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
