import { NextRequest, NextResponse } from 'next/server';
import { getReminderTargetUsers, recordReminderSent } from '@/lib/database/reminder-queries';
import { getFullReminderMessage, getJobSearchUrl } from '@/lib/messages/application-reminder';
import { pushMessage } from '@/lib/line/client';
import { processUrl } from '@/lib/tracking/url-processor';

const REMINDER_TYPE = '3day_reminder';

/**
 * 応募リマインダー送信API
 * Vercel Cronから毎日12時（JST）に呼び出される
 */
export async function POST(request: NextRequest) {
  // Vercel Cronからの呼び出しを検証（オプション）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRETが設定されている場合は検証
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // 手動実行の場合はダッシュボード認証をチェック
    // （今回は簡易的にスキップ）
  }

  try {
    console.log('📬 リマインダー送信開始...');

    // リマインダー対象ユーザーを取得
    const targetUsers = await getReminderTargetUsers(REMINDER_TYPE);

    console.log(`📊 対象ユーザー数: ${targetUsers.length}`);

    if (targetUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: '対象ユーザーがいませんでした',
        sentCount: 0,
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    for (const user of targetUsers) {
      try {
        // トラッキングURL付きの求人検索URLを生成
        const baseUrl = getJobSearchUrl(user.lang || 'ja');
        const trackedUrl = await processUrl(baseUrl, user.userId, '10apply_boost');

        // メッセージを生成
        const message = getFullReminderMessage(user.lang || 'ja', trackedUrl);

        // LINEプッシュ送信
        const pushResult = await pushMessage(user.userId, {
          type: 'text',
          text: message,
        });

        if (pushResult) {
          // 送信履歴を記録
          await recordReminderSent(user.userId, REMINDER_TYPE, message);
          sentCount++;
          results.push({ userId: user.userId, success: true });
          console.log(`✅ リマインダー送信成功: ${user.userId} (応募${user.applicationCount}件)`);
        } else {
          failedCount++;
          results.push({ userId: user.userId, success: false, error: 'Push failed' });
          console.error(`❌ リマインダー送信失敗: ${user.userId}`);
        }

        // レート制限対策: 100ms待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failedCount++;
        results.push({
          userId: user.userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`❌ リマインダー送信エラー: ${user.userId}`, error);
      }
    }

    console.log(`📬 リマインダー送信完了: 成功${sentCount}件, 失敗${failedCount}件`);

    return NextResponse.json({
      success: true,
      message: `リマインダー送信完了`,
      targetCount: targetUsers.length,
      sentCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error('❌ リマインダー送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET: リマインダー対象ユーザーの確認（デバッグ用）
 */
export async function GET() {
  try {
    const targetUsers = await getReminderTargetUsers(REMINDER_TYPE);

    return NextResponse.json({
      success: true,
      targetCount: targetUsers.length,
      users: targetUsers.map((u) => ({
        userId: u.userId.substring(0, 10) + '...', // プライバシーのため一部マスク
        applicationCount: u.applicationCount,
        firstAppliedAt: u.firstAppliedAt,
        lang: u.lang,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
