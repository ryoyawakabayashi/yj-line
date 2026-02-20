import { config } from '../config';

const LINE_API_BASE = 'https://api.line.me/v2/bot';
const LINE_DATA_API_BASE = 'https://api-data.line.me/v2/bot';

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${config.line.channelAccessToken}`,
  };
}

/**
 * リッチメニューを作成
 * @returns richMenuId
 */
export async function createRichMenu(menuJson: object): Promise<string> {
  const res = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(menuJson),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`リッチメニュー作成失敗: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.richMenuId;
}

/**
 * リッチメニューに画像をアップロード
 * 注意: 画像APIは api-data.line.me を使用
 */
export async function uploadRichMenuImage(
  richMenuId: string,
  imageBuffer: ArrayBuffer,
  contentType: string
): Promise<void> {
  const res = await fetch(
    `${LINE_DATA_API_BASE}/richmenu/${richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': contentType,
      },
      body: imageBuffer,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`画像アップロード失敗: ${res.status} ${errorText}`);
  }
}

/**
 * リッチメニューを削除
 */
export async function deleteRichMenu(richMenuId: string): Promise<void> {
  const res = await fetch(`${LINE_API_BASE}/richmenu/${richMenuId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`リッチメニュー削除失敗: ${res.status} ${errorText}`);
  }
}

/**
 * デフォルトリッチメニューを設定（全ユーザー向け）
 */
export async function setDefaultRichMenu(richMenuId: string): Promise<void> {
  const res = await fetch(
    `${LINE_API_BASE}/user/all/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: authHeaders(),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`デフォルト設定失敗: ${res.status} ${errorText}`);
  }
}

/**
 * 現在のリッチメニュー画像を取得
 */
export async function getRichMenuImage(
  richMenuId: string
): Promise<ArrayBuffer | null> {
  const res = await fetch(
    `${LINE_DATA_API_BASE}/richmenu/${richMenuId}/content`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  if (!res.ok) {
    console.error(`画像取得失敗: ${res.status}`);
    return null;
  }

  return res.arrayBuffer();
}

/**
 * リッチメニュー一覧を取得
 */
export async function listRichMenus(): Promise<any[]> {
  const res = await fetch(`${LINE_API_BASE}/richmenu/list`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    console.error(`リッチメニュー一覧取得失敗: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.richmenus || [];
}
