// =====================================================
// Dashboard Client Authentication Helper
// =====================================================
// クライアントサイドでAPI呼び出し時に使用
// ブラウザのBasic認証をそのまま利用（credentials: 'include'）

/**
 * 認証付きfetch関数
 * ダッシュボードページからAPI呼び出し時に使用
 * ブラウザのBasic認証情報を自動的に含める
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include', // ブラウザのBasic認証を含める
  });
}

/**
 * 認証ヘッダーを取得
 * ブラウザのBasic認証を使用するため、Content-Typeのみ設定
 */
export function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}
