import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // /dashboard パスのみ保護
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !checkAuth(authHeader)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Dashboard"',
        },
      });
    }
  }

  return NextResponse.next();
}

function checkAuth(authHeader: string): boolean {
  try {
    const auth = authHeader.split(' ')[1];
    const [user, password] = Buffer.from(auth, 'base64').toString().split(':');

    // 環境変数から認証情報を取得
    const expectedUser = process.env.DASHBOARD_USER;
    const expectedPassword = process.env.DASHBOARD_PASSWORD;

    // 環境変数が設定されていない場合は認証をスキップ（開発用）
    if (!expectedUser || !expectedPassword) {
      console.warn('⚠️ DASHBOARD_USER and DASHBOARD_PASSWORD are not set. Authentication is disabled.');
      return true;
    }

    return user === expectedUser && password === expectedPassword;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

export const config = {
  matcher: '/dashboard/:path*',
};
