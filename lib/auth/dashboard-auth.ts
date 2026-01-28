// =====================================================
// Dashboard API Authentication (NextAuth)
// =====================================================

import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

// 許可するメールアドレスのドメイン
const ALLOWED_DOMAINS = ['yolo-japan.com', 'yolo-japan.co.jp'];

// 個別に許可するメールアドレス
const ALLOWED_EMAILS = (process.env.ALLOWED_DASHBOARD_EMAILS || '').split(',').filter(Boolean);

/**
 * NextAuth認証をチェック
 */
export async function checkDashboardAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  error?: string;
  user?: {
    email: string;
    name?: string;
  };
}> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.email) {
      return { authenticated: false, error: 'Not authenticated' };
    }

    const email = token.email.toLowerCase();
    const domain = email.split('@')[1];

    // ドメインチェック
    if (ALLOWED_DOMAINS.includes(domain)) {
      return {
        authenticated: true,
        user: {
          email,
          name: token.name as string | undefined,
        },
      };
    }

    // 個別メールチェック
    if (ALLOWED_EMAILS.includes(email)) {
      return {
        authenticated: true,
        user: {
          email,
          name: token.name as string | undefined,
        },
      };
    }

    return { authenticated: false, error: 'Access denied' };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false, error: 'Authentication error' };
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
    },
  });
}
