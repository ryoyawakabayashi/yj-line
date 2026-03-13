'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const LANG_FLAGS: Record<string, string> = {
  ja: '\u{1F1EF}\u{1F1F5}',
  en: '\u{1F1EC}\u{1F1E7}',
  ko: '\u{1F1F0}\u{1F1F7}',
  zh: '\u{1F1E8}\u{1F1F3}',
  vi: '\u{1F1FB}\u{1F1F3}',
};

const LANG_NAMES: Record<string, string> = {
  ja: '日本語',
  en: 'English',
  ko: '한국어',
  zh: '中文',
  vi: 'Tiếng Việt',
};

const VARIANT_LABELS: Record<string, string> = {
  default: 'Default',
  student: 'Student',
};

const VARIANT_COLORS: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  student: 'bg-purple-100 text-purple-700',
};

interface RichmenuConfig {
  id: string;
  lang: string;
  variant: string;
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
    const defaultConfigs = configs.filter((c) => (c.variant || 'default') === 'default');
    const allHaveId = defaultConfigs.every((c) => c.rich_menu_id);
    if (!allHaveId) {
      alert('全言語のデフォルトリッチメニューがLINEに適用されている必要があります。未適用の言語があります。');
      return;
    }
    if (!confirm('全ユーザーのリッチメニューを一括更新します。\n\n- 留学生 → Student メニュー（未適用ならDefault）\n- その他 → Default メニュー\n- 言語未設定 → English Default\n\n実行しますか？')) return;

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

  // variant でグループ化
  const groupedConfigs: Record<string, RichmenuConfig[]> = {};
  for (const cfg of configs) {
    const variant = cfg.variant || 'default';
    if (!groupedConfigs[variant]) groupedConfigs[variant] = [];
    groupedConfigs[variant].push(cfg);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">リッチメニュー管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            各言語・バリアントのリッチメニューボタン設定を管理します
          </p>
        </div>

        {Object.entries(groupedConfigs).map(([variant, variantConfigs]) => (
          <div key={variant} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANT_COLORS[variant] || 'bg-gray-100 text-gray-700'}`}>
                {VARIANT_LABELS[variant] || variant}
              </span>
              <span className="text-sm text-gray-400">{variantConfigs.length}言語</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variantConfigs.map((config) => (
                <Link
                  key={config.id}
                  href={`/support/richmenu/${config.lang}?variant=${config.variant || 'default'}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition p-5 block"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{LANG_FLAGS[config.lang] || ''}</span>
                    <div className="flex-1">
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
          </div>
        ))}

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
              各ユーザーの言語設定・在留資格に応じたリッチメニューを一括でリンクします。
              留学生にはStudentメニュー（未適用ならDefault）、それ以外はDefaultメニューが適用されます。
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
  );
}
