// =====================================================
// Dashboard Client Authentication Helper
// =====================================================
// クライアントサイドでAPI呼び出し時に認証ヘッダーを追加

/**
 * 認証付きfetch関数
 * ダッシュボードページからAPI呼び出し時に使用
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 環境変数から認証情報を取得（NEXT_PUBLIC_プレフィックス付き）
  const user = process.env.NEXT_PUBLIC_DASHBOARD_USER || 'admin';
  const password = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'password';

  // Basic認証ヘッダーを生成
  const credentials = btoa(`${user}:${password}`);

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Basic ${credentials}`);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 認証ヘッダーを取得
 */
export function getAuthHeaders(): HeadersInit {
  const user = process.env.NEXT_PUBLIC_DASHBOARD_USER || 'admin';
  const password = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD || 'password';
  const credentials = btoa(`${user}:${password}`);

  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  };
}
