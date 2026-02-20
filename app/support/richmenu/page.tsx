'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetch('/api/dashboard/richmenu')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setConfigs(data.configs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      </div>
    </div>
  );
}
