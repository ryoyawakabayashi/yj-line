'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const LANG_FLAGS: Record<string, string> = {
  ja: '🇯🇵',
  en: '🇬🇧',
  ko: '🇰🇷',
  zh: '🇨🇳',
  vi: '🇻🇳',
};

const LANG_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
};

interface RichmenuConfig {
  id: string;
  lang: string;
  menu_name: string;
  chat_bar_text: string;
  areas: any[];
  rich_menu_id: string | null;
  updated_at: string;
}

export default function RichmenuListPage() {
  const [configs, setConfigs] = useState<RichmenuConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard/richmenu')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setConfigs(data.configs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSyncAll = useCallback(async () => {
    const allHaveId = configs.every((c) => c.rich_menu_id);
    if (!allHaveId) {
      alert('全言語のリッチメニューがLINEに適用されている必要があります。未適用の言語があります。');
      return;
    }
    if (!confirm('全ユーザーのリッチメニューを一括更新します。\n\n- 言語未設定のユーザー → English\n- 言語設定済み → その言語のメニュー\n\n実行しますか？')) return;

    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/dashboard/richmenu/sync-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(`エラー: ${data.error}`);
      } else {
        setSyncResult(data.results);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setSyncing(false);
    }
  }, [configs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link href="/support" className="text-blue-600 hover:underline text-sm">
            ← サポート管理
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">リッチメニュー管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            各言語のリッチメニューボタン設定を管理します
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map((config) => (
            <Link
              key={config.lang}
              href={`/support/richmenu/${config.lang}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-5 block"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{LANG_FLAGS[config.lang] || ''}</span>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {LANG_NAMES[config.lang] || config.lang}
                  </h2>
                  <p className="text-xs text-gray-500">{config.menu_name}</p>
                </div>
              </div>

              {/* 2x3 ミニプレビュー */}
              <div className="grid grid-cols-3 grid-rows-2 gap-1 mb-3">
                {(config.areas || [])
                  .sort((a: any, b: any) => a.position - b.position)
                  .map((area: any, idx: number) => (
                    <div
                      key={idx}
                      className={`rounded text-center py-2 px-1 text-xs truncate ${
                        area.action_type === 'message'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                      title={`${area.label} (${area.action_type}: ${area.action_text})`}
                    >
                      {area.label}
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {config.rich_menu_id
                    ? `ID: ${config.rich_menu_id.substring(0, 12)}...`
                    : 'LINE未適用'}
                </span>
                <span>
                  {config.updated_at
                    ? new Date(config.updated_at).toLocaleDateString('ja-JP')
                    : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {configs.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            リッチメニュー設定がありません。Supabaseにマイグレーションを実行してください。
          </div>
        )}

        {/* 一括反映セクション */}
        {configs.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">全ユーザーに一括反映</h2>
            <p className="text-sm text-gray-500 mb-4">
              各ユーザーの言語設定に応じたリッチメニューを一括でリンクします。
              言語未設定のユーザーにはEnglishメニューがデフォルトで適用されます。
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className={`px-6 py-2.5 rounded-lg text-white font-medium transition ${
                  syncing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {syncing ? '反映中...' : '全ユーザーに一括反映'}
              </button>
              {syncing && (
                <span className="text-sm text-gray-500">
                  ユーザー数によって数分かかる場合があります
                </span>
              )}
            </div>

            {syncResult && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-medium text-green-800 mb-2">一括反映完了</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>対象ユーザー数: {syncResult.total}</p>
                  <p>成功: {syncResult.success} / 失敗: {syncResult.failed}</p>
                  <p>デフォルトメニュー: {syncResult.defaultMenu}</p>
                  {syncResult.byLanguage && (
                    <div className="mt-2">
                      <p className="font-medium">言語別内訳:</p>
                      <ul className="ml-4 mt-1">
                        {Object.entries(syncResult.byLanguage).map(([lang, count]) => (
                          <li key={lang}>
                            {LANG_FLAGS[lang] || ''} {LANG_NAMES[lang] || lang}: {count as number}人
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
