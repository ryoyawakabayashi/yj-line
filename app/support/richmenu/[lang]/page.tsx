'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const LANG_FLAGS: Record<string, string> = {
  ja: '🇯🇵', en: '🇬🇧', ko: '🇰🇷', zh: '🇨🇳', vi: '🇻🇳',
};
const LANG_NAMES: Record<string, string> = {
  ja: '日本語', en: 'English', ko: '한국어', zh: '中文', vi: 'Tiếng Việt',
};

interface ButtonArea {
  position: number;
  bounds: { x: number; y: number; width: number; height: number };
  action_type: 'message' | 'uri';
  action_text: string;
  label: string;
}

export default function RichmenuEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lang = params.lang as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuName, setMenuName] = useState('');
  const [chatBarText, setChatBarText] = useState('');
  const [richMenuId, setRichMenuId] = useState('');
  const [lastAppliedAt, setLastAppliedAt] = useState('');
  const [areas, setAreas] = useState<ButtonArea[]>([]);
  const [selectedButton, setSelectedButton] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // 画像関連
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard/richmenu/${lang}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setMenuName(data.config.menu_name);
          setChatBarText(data.config.chat_bar_text);
          setRichMenuId(data.config.rich_menu_id || '');
          setLastAppliedAt(data.config.last_applied_at || '');
          setAreas(
            (data.config.areas || []).sort(
              (a: ButtonArea, b: ButtonArea) => a.position - b.position
            )
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [lang]);

  const updateArea = useCallback(
    (position: number, field: keyof ButtonArea, value: string) => {
      setAreas((prev) =>
        prev.map((a) =>
          a.position === position ? { ...a, [field]: value } : a
        )
      );
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/richmenu/${lang}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName, chatBarText, areas }),
      });
      const data = await res.json();
      if (data.success) {
        alert('保存しました');
      } else {
        alert('保存に失敗しました: ' + (data.error || ''));
      }
    } catch (error) {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const buildLineApiJson = () => {
    return {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: menuName,
      chatBarText: chatBarText,
      areas: areas.map((area) => ({
        bounds: area.bounds,
        action:
          area.action_type === 'message'
            ? { type: 'message', text: area.action_text, label: area.label }
            : { type: 'uri', uri: area.action_text, label: area.label },
      })),
    };
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(buildLineApiJson(), null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('PNG または JPEG のみ対応しています');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      alert('ファイルサイズは1MB以下にしてください');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleApplyToLine = async () => {
    if (!selectedImage) {
      alert('画像を選択してください');
      return;
    }

    if (!confirm('現在のリッチメニューを置き換えます。よろしいですか？')) {
      return;
    }

    setApplying(true);
    setApplyStatus('メニュー作成中...');

    try {
      // まず設定を保存
      setApplyStatus('設定を保存中...');
      const saveRes = await fetch(`/api/dashboard/richmenu/${lang}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName, chatBarText, areas }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) {
        throw new Error('設定の保存に失敗しました');
      }

      // LINEに適用
      setApplyStatus('LINEに適用中...');
      const formData = new FormData();
      formData.append('image', selectedImage);

      const res = await fetch(`/api/dashboard/richmenu/${lang}/apply`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setApplyStatus('完了');
        setRichMenuId(data.richMenuId);
        setLastAppliedAt(new Date().toISOString());
        setSelectedImage(null);
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(null);
        }
        alert('リッチメニューを適用しました: ' + data.richMenuId);
      } else {
        throw new Error(data.error || '適用に失敗しました');
      }
    } catch (error: any) {
      alert('エラー: ' + error.message);
      setApplyStatus('');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const selectedArea = selectedButton !== null
    ? areas.find((a) => a.position === selectedButton)
    : null;

  const currentImageUrl = richMenuId
    ? `/api/dashboard/richmenu/${lang}/image?t=${Date.now()}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/support/richmenu"
              className="text-blue-600 hover:underline text-sm"
            >
              ← リッチメニュー管理
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {LANG_FLAGS[lang]} {LANG_NAMES[lang] || lang} リッチメニュー
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>

        {/* ステータス */}
        <div className="mb-6">
          {richMenuId ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                適用済み
              </span>
              <span className="text-gray-500">
                ID: {richMenuId.substring(0, 20)}...
              </span>
              {lastAppliedAt && (
                <span className="text-gray-400">
                  ({new Date(lastAppliedAt).toLocaleString('ja-JP')})
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              未適用
            </span>
          )}
        </div>

        {/* セクション1: 基本設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            基本設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メニュー名
              </label>
              <input
                type="text"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャットバーテキスト
              </label>
              <input
                type="text"
                value={chatBarText}
                onChange={(e) => setChatBarText(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* セクション2: 画像 & LINE適用 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            メニュー画像 & LINE適用
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 現在の画像 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                現在の画像
              </h3>
              {currentImageUrl ? (
                <div
                  className="border-2 border-gray-200 rounded-lg overflow-hidden"
                  style={{ aspectRatio: '2500 / 1686' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentImageUrl}
                    alt="現在のリッチメニュー"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 text-sm"
                  style={{ aspectRatio: '2500 / 1686' }}
                >
                  画像なし（未適用）
                </div>
              )}
            </div>

            {/* アップロード */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                新しい画像
              </h3>
              {imagePreviewUrl ? (
                <div className="relative">
                  <div
                    className="border-2 border-blue-300 rounded-lg overflow-hidden"
                    style={{ aspectRatio: '2500 / 1686' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="アップロード画像プレビュー"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {selectedImage?.name} ({((selectedImage?.size || 0) / 1024).toFixed(0)}KB)
                    </span>
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                        setImagePreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
                  style={{ aspectRatio: '2500 / 1686' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-500">クリックして画像を選択</span>
                  <span className="text-xs text-gray-400 mt-1">PNG / JPEG, 1MB以下, 2500x1686px</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* LINEに適用ボタン */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-4">
              <button
                onClick={handleApplyToLine}
                disabled={!selectedImage || applying}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {applying ? applyStatus : 'LINEに適用'}
              </button>
              {!selectedImage && !applying && (
                <span className="text-xs text-gray-400">
                  画像を選択すると適用できます
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              現在の設定と画像でLINEリッチメニューを作成・適用します。既存のメニューは置き換えられます。
            </p>
          </div>
        </div>

        {/* セクション3: ボタングリッド */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">
            ボタン設定
          </h2>

          {/* 2x3 グリッドプレビュー（2500x1686比率） */}
          <div
            className="border-2 border-gray-300 rounded-lg overflow-hidden mb-4"
            style={{ aspectRatio: '2500 / 1686' }}
          >
            <div className="grid grid-cols-3 grid-rows-2 h-full">
              {areas.map((area) => (
                <button
                  key={area.position}
                  onClick={() =>
                    setSelectedButton(
                      selectedButton === area.position ? null : area.position
                    )
                  }
                  className={`border border-gray-200 flex flex-col items-center justify-center p-2 transition cursor-pointer ${
                    selectedButton === area.position
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : area.action_type === 'message'
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded mb-1 ${
                      area.action_type === 'message'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-blue-200 text-blue-800'
                    }`}
                  >
                    {area.action_type}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 text-center">
                    {area.label}
                  </span>
                  <span className="text-xs text-gray-400 mt-1 truncate max-w-full px-1">
                    {area.action_text.length > 25
                      ? area.action_text.substring(0, 25) + '...'
                      : area.action_text}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 選択されたボタンの編集フォーム */}
          {selectedArea && (
            <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">
                ボタン {selectedArea.position + 1} を編集
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ラベル
                  </label>
                  <input
                    type="text"
                    value={selectedArea.label}
                    onChange={(e) =>
                      updateArea(selectedArea.position, 'label', e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    アクションタイプ
                  </label>
                  <select
                    value={selectedArea.action_type}
                    onChange={(e) =>
                      updateArea(
                        selectedArea.position,
                        'action_type',
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="message">message（テキスト送信）</option>
                    <option value="uri">uri（URL遷移）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedArea.action_type === 'message'
                      ? '送信テキスト'
                      : 'URL'}
                  </label>
                  <input
                    type="text"
                    value={selectedArea.action_text}
                    onChange={(e) =>
                      updateArea(
                        selectedArea.position,
                        'action_text',
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                    placeholder={
                      selectedArea.action_type === 'message'
                        ? 'FIND_JOB'
                        : 'https://...'
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {!selectedArea && (
            <p className="text-sm text-gray-400 text-center">
              ボタンをクリックして編集
            </p>
          )}
        </div>

        {/* セクション4: LINE API JSON出力 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              LINE API JSON
            </h2>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            このJSONを <code className="bg-gray-100 px-1 rounded">POST https://api.line.me/v2/bot/richmenu</code> に送信してリッチメニューを作成できます。
          </p>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto text-xs">
            {JSON.stringify(buildLineApiJson(), null, 2)}
          </pre>

          <details className="mt-3">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              curl コマンド例
            </summary>
            <pre className="bg-gray-100 rounded-lg p-3 mt-2 overflow-x-auto text-xs text-gray-700">
{`curl -X POST https://api.line.me/v2/bot/richmenu \\
  -H "Authorization: Bearer $CHANNEL_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(buildLineApiJson())}'`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
