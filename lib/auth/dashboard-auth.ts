// =====================================================
// Dashboard API Authentication
// =====================================================

import { NextRequest } from 'next/server';

const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'password';

/**
 * Basic認証をチェック
 */
export function checkDashboardAuth(request: NextRequest): {
  authenticated: boolean;
  error?: string;
} {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { authenticated: false, error: 'Authorization header missing' };
  }

  try {
    const base64Credentials = authHeader.slice('Basic '.length);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (username === DASHBOARD_USER && password === DASHBOARD_PASSWORD) {
      return { authenticated: true };
    }

    return { authenticated: false, error: 'Invalid credentials' };
  } catch {
    return { authenticated: false, error: 'Invalid authorization header' };
  }
}

/**
 * 認証エラーレスポンスを生成
 */
export function unauthorizedResponse(error: string = 'Unauthorized') {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="Dashboard"',
    },
  });
}
