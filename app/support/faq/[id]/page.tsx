'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface FAQTranslation {
  id: string;
  lang: string;
  question: string;
  answer: string;
}

interface FAQ {
  id: string;
  service: string;
  faqKey: string;
  keywords: string[];
  isActive: boolean;
  priority: number;
  translations: FAQTranslation[];
}

const SERVICE_LABELS: Record<string, string> = {
  YOLO_JAPAN: 'YOLO JAPAN',
  YOLO_DISCOVER: 'YOLO DISCOVER',
  YOLO_HOME: 'YOLO HOME',
};

const LANG_LABELS: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
};

const SUPPORTED_LANGS = ['ja', 'en', 'ko', 'zh', 'vi'];

export default function FAQEditPage() {
  const params = useParams();
  const router = useRouter();
  const faqId = params.id as string;

  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ja');
  const [keywordsInput, setKeywordsInput] = useState('');

  // 編集用の状態
  const [editedTranslations, setEditedTranslations] = useState<
    Record<string, { question: string; answer: string }>
  >({});
  const [editedPriority, setEditedPriority] = useState(0);
  const [editedKeywords, setEditedKeywords] = useState<string[]>([]);

  useEffect(() => {
    fetchFAQ();
  }, [faqId]);

  const fetchFAQ = async () => {
    try {
      const res = await fetch(`/api/dashboard/faq/${faqId}`);
      if (res.ok) {
        const data = await res.json();
        const faqData = data.faq;
        setFaq(faqData);
        setEditedPriority(faqData.priority);
        setEditedKeywords(faqData.keywords);

        // 翻訳データを初期化
        const translations: Record<string, { question: string; answer: string }> = {};
        for (const lang of SUPPORTED_LANGS) {
          const trans = faqData.translations.find((t: FAQTranslation) => t.lang === lang);
          translations[lang] = {
            question: trans?.question || '',
            answer: trans?.answer || '',
          };
        }
        setEditedTranslations(translations);
      } else {
        console.error('FAQ取得失敗');
        router.push('/support/faq');
      }
    } catch (error) {
      console.error('FAQ取得エラー:', error);
      router.push('/support/faq');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 翻訳データを配列に変換
      const translations = Object.entries(editedTranslations).map(([lang, data]) => ({
        lang,
        question: data.question,
        answer: data.answer,
      }));

      const res = await fetch(`/api/dashboard/faq/${faqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: editedPriority,
          keywords: editedKeywords,
          translations,
        }),
      });

      if (res.ok) {
        alert('保存しました');
        fetchFAQ();
      } else {
        alert('保存に失敗しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このFAQを無効化しますか？')) {
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/faq/${faqId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/support/faq');
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const addKeyword = () => {
    if (keywordsInput.trim() && !editedKeywords.includes(keywordsInput.trim())) {
      setEditedKeywords([...editedKeywords, keywordsInput.trim()]);
      setKeywordsInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setEditedKeywords(editedKeywords.filter((k) => k !== keyword));
  };

  const updateTranslation = (lang: string, field: 'question' | 'answer', value: string) => {
    setEditedTranslations({
      ...editedTranslations,
      [lang]: {
        ...editedTranslations[lang],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">FAQが見つかりません</p>
        <Link href="/support/faq" className="text-blue-600 hover:underline">
          一覧に戻る
        </Link>
      </div>
    );
  }

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
                <h1 className="text-xl font-bold text-gray-900">FAQ編集</h1>
                <p className="text-sm text-gray-500 mt-1">
                  <code className="bg-gray-100 px-2 py-0.5 rounded">{faq.faqKey}</code>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                無効化
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
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
                FAQ Key
              </label>
              <input
                type="text"
                value={faq.faqKey}
                disabled
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サービス
              </label>
              <input
                type="text"
                value={SERVICE_LABELS[faq.service] || faq.service}
                disabled
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              優先度（大きいほど優先）
            </label>
            <input
              type="number"
              value={editedPriority}
              onChange={(e) => setEditedPriority(parseInt(e.target.value) || 0)}
              className="w-32 border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {editedKeywords.map((kw, i) => (
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
            <h2 className="text-lg font-semibold text-gray-900">翻訳</h2>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {SUPPORTED_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {LANG_LABELS[lang]}
                  {editedTranslations[lang]?.question ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              質問 ({LANG_LABELS[selectedLang]})
            </label>
            <input
              type="text"
              value={editedTranslations[selectedLang]?.question || ''}
              onChange={(e) => updateTranslation(selectedLang, 'question', e.target.value)}
              placeholder="質問を入力"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              回答 ({LANG_LABELS[selectedLang]})
            </label>
            <textarea
              value={editedTranslations[selectedLang]?.answer || ''}
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
              {editedTranslations[selectedLang]?.answer || '（回答なし）'}
            </div>
          </div>
        </div>

        {/* 他の言語の状況 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            翻訳状況
          </h2>
          <div className="grid grid-cols-5 gap-4">
            {SUPPORTED_LANGS.map((lang) => {
              const hasContent = editedTranslations[lang]?.question && editedTranslations[lang]?.answer;
              return (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`p-3 rounded-lg text-center transition ${
                    selectedLang === lang
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : hasContent
                      ? 'bg-green-50 border border-green-300'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <p className="font-medium text-sm">{LANG_LABELS[lang]}</p>
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
