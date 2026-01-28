import { NextRequest, NextResponse } from 'next/server';
import { sendSlackNotification } from '@/lib/notifications/slack';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';

/**
 * テスト用Slack通知を送信
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await checkDashboardAuth(request);
  if (!auth.authenticated) {
    return unauthorizedResponse(auth.error);
  }

  try {
    const success = await sendSlackNotification({
      ticketId: 'test-' + Date.now(),
      userId: 'test-user-id',
      userDisplayName: 'テストユーザー',
      userLang: 'ja',
      service: 'YOLO_JAPAN',
      summary: 'これはテスト通知です。エスカレーション機能が正常に動作しています。',
      originalMessage: 'テストメッセージ：SEOさんと入力してサポートモードをテスト中',
      reason: 'テスト送信',
      priority: 'normal',
    });

    if (success) {
      return NextResponse.json({ success: true, message: 'Slack通知を送信しました' });
    } else {
      return NextResponse.json(
        { success: false, message: 'Slack通知の送信に失敗しました。SLACK_SUPPORT_WEBHOOK_URLが設定されているか確認してください。' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { success: false, message: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
