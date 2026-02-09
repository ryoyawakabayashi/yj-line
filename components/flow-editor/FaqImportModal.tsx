// =====================================================
// FAQ Import Modal Component
// FAQデータベースから質問をインポートしてクイックリプライエッジを作成
// =====================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ServiceType } from '@/types/support';

// =====================================================
// Types
// =====================================================

interface FAQ {
  id: string;
  service: ServiceType;
  faqKey: string;
  keywords: string[];
  isActive: boolean;
  priority: number;
  question: string;
  answer: string;
  lang: string;
}

interface FaqImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentService?: ServiceType;
  onImport: (selectedFaqs: Array<{ id: string; question: string }>) => void;
}

// =====================================================
// Component
// =====================================================

export function FaqImportModal({
  isOpen,
  onClose,
  currentService,
  onImport,
}: FaqImportModalProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [selectedFaqIds, setSelectedFaqIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FAQを取得
  useEffect(() => {
    if (!isOpen) return;

    const fetchFaqs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lang: 'ja',
          isActive: 'true',
        });

        if (currentService) {
          params.append('service', currentService);
        }

        const response = await fetch(`/api/dashboard/faq?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setFaqs(data.faqs || []);
        } else {
          setError('FAQの取得に失敗しました');
        }
      } catch (err) {
        console.error('FAQ取得エラー:', err);
        setError('FAQの取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchFaqs();
  }, [isOpen, currentService]);

  // モーダルを閉じる時に選択状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setSelectedFaqIds([]);
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen]);

  // 検索フィルタリング
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;

    const lowerQuery = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(lowerQuery) ||
        faq.keywords.some((keyword) =>
          keyword.toLowerCase().includes(lowerQuery)
        )
    );
  }, [faqs, searchQuery]);

  // チェックボックス変更ハンドラー
  const handleCheckboxChange = (faqId: string, checked: boolean) => {
    if (checked) {
      setSelectedFaqIds((prev) => [...prev, faqId]);
    } else {
      setSelectedFaqIds((prev) => prev.filter((id) => id !== faqId));
    }
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedFaqIds.length === filteredFaqs.length) {
      setSelectedFaqIds([]);
    } else {
      setSelectedFaqIds(filteredFaqs.map((faq) => faq.id));
    }
  };

  // インポート実行
  const handleImport = () => {
    if (selectedFaqIds.length === 0) return;

    // 選択されたFAQのIDと質問を抽出
    const selectedFaqsData = faqs
      .filter((faq) => selectedFaqIds.includes(faq.id))
      .map((faq) => ({
        id: faq.id,
        question: faq.question,
      }));

    onImport(selectedFaqsData);
    onClose();
  };

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">FAQから追加</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* Filter & Search */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="質問やキーワードで検索..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleSelectAll}
              disabled={loading || filteredFaqs.length === 0}
              className="px-3 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50 whitespace-nowrap"
            >
              {selectedFaqIds.length === filteredFaqs.length && filteredFaqs.length > 0
                ? '全解除'
                : '全選択'}
            </button>
          </div>
        </div>

        {/* FAQ List (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
              <p className="text-sm">FAQを読み込み中...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filteredFaqs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">
                {searchQuery
                  ? '検索条件に一致するFAQが見つかりませんでした'
                  : 'FAQがありません'}
              </p>
            </div>
          )}

          {!loading && !error && filteredFaqs.length > 0 && (
            <div className="space-y-2">
              {filteredFaqs.map((faq) => (
                <label
                  key={faq.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFaqIds.includes(faq.id)}
                    onChange={(e) =>
                      handleCheckboxChange(faq.id, e.target.checked)
                    }
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 leading-snug">
                      {faq.question}
                    </div>
                    {faq.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {faq.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      サービス: {faq.service}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedFaqIds.length > 0 ? (
              <span className="font-medium text-blue-600">
                {selectedFaqIds.length}件選択中
              </span>
            ) : (
              <span>FAQを選択してください</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleImport}
              disabled={selectedFaqIds.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              追加 ({selectedFaqIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
