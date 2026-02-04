'use client';

import { useState, useEffect } from 'react';
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
  question: string;
  answer: string;
  translations: FAQTranslation[];
  createdAt: string;
  updatedAt: string;
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

export default function FAQManagementPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    service: 'all',
    lang: 'ja',
    search: '',
    showInactive: false,
  });

  useEffect(() => {
    fetchFAQs();
  }, [filter.service, filter.lang, filter.showInactive]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.service !== 'all') {
        params.set('service', filter.service);
      }
      params.set('lang', filter.lang);
      if (filter.showInactive) {
        params.set('includeInactive', 'true');
      }

      const res = await fetch(`/api/dashboard/faq?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFaqs(data.faqs || []);
      }
    } catch (error) {
      console.error('FAQ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, faqKey: string) => {
    if (!confirm(`FAQ "${faqKey}" を非表示にしますか？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dashboard/faq/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchFAQs();
      }
    } catch (error) {
      console.error('FAQ削除エラー:', error);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboard/faq/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });

      if (res.ok) {
        fetchFAQs();
      }
    } catch (error) {
      console.error('FAQ復元エラー:', error);
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        faq.faqKey.toLowerCase().includes(searchLower) ||
        faq.question.toLowerCase().includes(searchLower) ||
        faq.keywords.some((k) => k.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

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
                <h1 className="text-2xl font-bold text-gray-900">FAQ管理</h1>
                <p className="text-sm text-gray-500 mt-1">
                  よくある質問の追加・編集・削除
                </p>
              </div>
            </div>
            <Link
              href="/support/faq/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + 新規作成
            </Link>
          </div>
        </div>
      </header>

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
              value={filter.lang}
              onChange={(e) => setFilter({ ...filter, lang: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              {Object.entries(LANG_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
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
              非表示を含む
            </label>

            <button
              onClick={fetchFAQs}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              更新
            </button>
          </div>
        </div>

        {/* FAQ Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    FAQ Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    サービス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    質問
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    キーワード
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
                {filteredFaqs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      FAQがありません
                    </td>
                  </tr>
                ) : (
                  filteredFaqs.map((faq) => (
                    <tr
                      key={faq.id}
                      className={`hover:bg-gray-50 ${!faq.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {faq.faqKey}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {SERVICE_LABELS[faq.service] || faq.service}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs truncate">
                        {faq.question}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {faq.keywords.slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                          {faq.keywords.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{faq.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center w-20">
                        {faq.priority}
                      </td>
                      <td className="px-4 py-3 text-center w-20">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            faq.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {faq.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/support/faq/${faq.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            編集
                          </Link>
                          {faq.isActive ? (
                            <button
                              onClick={() => handleDelete(faq.id, faq.faqKey)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              無効化
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRestore(faq.id)}
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
            表示中: {filteredFaqs.length}件 / 全{faqs.length}件
          </p>
        </div>
      </main>
    </div>
  );
}
