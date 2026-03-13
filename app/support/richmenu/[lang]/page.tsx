'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = params.lang as string;
  const variant = searchParams.get('variant') || 'default';
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

  // テストユーザー関連
  const [testUserIds, setTestUserIds] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkResults, setLinkResults] = useState<{ userId: string; success: boolean; error?: string }[] | null>(null);
  const [settingDefault, setSettingDefault] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/richmenu/${lang}?variant=${variant}`, { cache: 'no-store' })
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
  }, [lang, variant]);

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

  const reloadConfig = async () => {
    const res = await fetch(`/api/dashboard/richmenu/${lang}?variant=${variant}`, { cache: 'no-store' });
    const data = await res.json();
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
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/richmenu/${lang}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName, chatBarText, areas, variant }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadConfig();
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

  // 共通: 設定保存 + メニュー作成 + 画像アップロード
  // 画像なしの場合は既存画像を再利用（API側で処理）
  const createAndUploadMenu = async (): Promise<string | null> => {
    // 設定を保存
    setApplyStatus('設定を保存中...');
    const saveRes = await fetch(`/api/dashboard/richmenu/${lang}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuName, chatBarText, areas, variant }),
    });
    const saveData = await saveRes.json();
    if (!saveData.success) {
      throw new Error('設定の保存に失敗しました');
    }

    // LINEにメニュー作成 + 画像アップロード
    setApplyStatus(selectedImage
      ? 'メニュー作成 + 画像アップロード中...'
      : 'メニュー作成中（既存画像を再利用）...'
    );
    const formData = new FormData();
    formData.append('variant', variant);
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    const res = await fetch(`/api/dashboard/richmenu/${lang}/apply`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || '適用に失敗しました');
    }

    // 成功: UI更新
    setRichMenuId(data.richMenuId);
    setLastAppliedAt(new Date().toISOString());
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';

    return data.richMenuId;
  };

  // テストユーザーに適用（メニュー作成 → テストユーザーにリンク）
  const handleApplyToTestUsers = async () => {
    const ids = testUserIds.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      alert('テストユーザーのLINE IDを入力してください');
      return;
    }
    const msg = selectedImage
      ? '新しいリッチメニューを作成し、テストユーザーに適用します。よろしいですか？'
      : '現在の設定でリッチメニューを再作成し、テストユーザーに適用します（既存画像を再利用）。よろしいですか？';
    if (!confirm(msg)) {
      return;
    }

    setApplying(true);
    setLinkResults(null);
    try {
      const newMenuId = await createAndUploadMenu();
      if (!newMenuId) return;

      // テストユーザーにリンク
      setApplyStatus('テストユーザーにリンク中...');
      const linkRes = await fetch(`/api/dashboard/richmenu/${lang}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      });
      const linkData = await linkRes.json();

      if (linkData.success) {
        setLinkResults(linkData.results);
        setApplyStatus('完了');
        alert(`メニュー作成完了。${linkData.summary}`);
      } else {
        throw new Error(linkData.error || 'リンクに失敗しました');
      }
    } catch (error: any) {
      alert('エラー: ' + error.message);
      setApplyStatus('');
    } finally {
      setApplying(false);
    }
  };

  // 全ユーザーに適用（メニュー作成 → デフォルト設定）
  const handleApplyToAll = async () => {
    const msg = selectedImage
      ? '新しいリッチメニューを作成し、全ユーザーのデフォルトに設定します。よろしいですか？'
      : '現在の設定でリッチメニューを再作成し、全ユーザーのデフォルトに設定します（既存画像を再利用）。よろしいですか？';
    if (!confirm(msg)) {
      return;
    }

    setApplying(true);
    try {
      const newMenuId = await createAndUploadMenu();
      if (!newMenuId) return;

      // 全ユーザーにデフォルト設定
      setApplyStatus('全ユーザーに展開中...');
      const defaultRes = await fetch(`/api/dashboard/richmenu/${lang}/link`, {
        method: 'PUT',
      });
      const defaultData = await defaultRes.json();

      if (defaultData.success) {
        setApplyStatus('完了');
        alert('全ユーザーのデフォルトに設定しました');
      } else {
        throw new Error(defaultData.error || 'デフォルト設定に失敗しました');
      }
    } catch (error: any) {
      alert('エラー: ' + error.message);
      setApplyStatus('');
    } finally {
      setApplying(false);
    }
  };

  // 既存メニューを全ユーザーにデフォルト設定（画像アップロード不要）
  const handleSetExistingDefault = async () => {
    if (!richMenuId) {
      alert('先にリッチメニューを作成してください');
      return;
    }
    if (!confirm(`現在のリッチメニューを全ユーザーのデフォルトに設定します。よろしいですか？`)) {
      return;
    }

    setSettingDefault(true);
    try {
      const res = await fetch(`/api/dashboard/richmenu/${lang}/link`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert('エラー: ' + (data.error || ''));
      }
    } catch (error: any) {
      alert('エラー: ' + error.message);
    } finally {
      setSettingDefault(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  const selectedArea = selectedButton !== null
    ? areas.find((a) => a.position === selectedButton)
    : null;

  const currentImageUrl = richMenuId
    ? `/api/dashboard/richmenu/${lang}/image?variant=${variant}&t=${Date.now()}`
    : null;

  return (
    <div className="p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/support/richmenu"
              className="text-blue-600 hover:underline text-sm"
            >
              &larr; リッチメニュー管理
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {LANG_FLAGS[lang]} {LANG_NAMES[lang] || lang} リッチメニュー
              {variant !== 'default' && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                  {variant}
                </span>
              )}
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

          {/* テストユーザーID入力 */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              テストユーザー（任意）
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              LINE ユーザーIDを入力すると「テストユーザーに適用」で特定ユーザーだけに新メニューを適用できます。
            </p>
            <textarea
              value={testUserIds}
              onChange={(e) => setTestUserIds(e.target.value)}
              placeholder="LINE ユーザーID（1行に1つ、またはカンマ区切り）&#10;例: Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>

          {/* 適用ボタン */}
          <div className="mt-6 pt-4 border-t">
            {applying && (
              <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {applyStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {/* テストユーザーに適用 */}
              <button
                onClick={handleApplyToTestUsers}
                disabled={applying || !testUserIds.trim()}
                className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                テストユーザーに適用
              </button>

              {/* 全ユーザーに適用 */}
              <button
                onClick={handleApplyToAll}
                disabled={applying}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                全ユーザーに適用
              </button>

              {!selectedImage && !applying && (
                <span className="text-xs text-gray-400">
                  画像未選択の場合は既存画像を再利用します（画像変更時は新しい画像を選択）
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              設定変更のみの場合は既存画像を再利用してメニューを再作成します。画像を変更する場合は新しい画像を選択してください。
            </p>

            {/* リンク結果 */}
            {linkResults && (
              <div className="mt-3 space-y-1">
                {linkResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={r.success ? 'text-green-600' : 'text-red-600'}>
                      {r.success ? '✓' : '✗'}
                    </span>
                    <span className="font-mono text-gray-600">
                      {r.userId.substring(0, 16)}...
                    </span>
                    {r.error && (
                      <span className="text-red-500">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 既存メニューのデフォルト設定 */}
          {richMenuId && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSetExistingDefault}
                  disabled={settingDefault}
                  className="px-4 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50 text-xs font-medium"
                >
                  {settingDefault ? '設定中...' : '既存メニューを全ユーザーのデフォルトに設定'}
                </button>
                <span className="text-xs text-gray-400">
                  画像変更不要で既存メニューを展開する場合
                </span>
              </div>
            </div>
          )}
        </div>

        {/* セクション4: ボタングリッド */}
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
  );
}
