import { NextRequest, NextResponse } from 'next/server';
import { getFullReminderMessage, getJobSearchUrl } from '@/lib/messages/application-reminder';
import { pushMessage } from '@/lib/line/client';
import { processUrl } from '@/lib/tracking/url-processor';

/**
 * テスト送信API
 * 指定したユーザーIDにリマインダーメッセージを送信
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lang = 'ja' } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`📬 テスト送信: userId=${userId}, lang=${lang}`);

    // トラッキングURL付きの求人検索URLを生成
    const baseUrl = getJobSearchUrl(lang);
    const trackedUrl = await processUrl(baseUrl, userId, '10apply_boost');

    // メッセージを生成
    const message = getFullReminderMessage(lang, trackedUrl);

    // LINEプッシュ送信
    const pushResult = await pushMessage(userId, {
      type: 'text',
      text: message,
    });

    if (pushResult) {
      console.log(`✅ テスト送信成功: ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'メッセージを送信しました',
        sentMessage: message,
      });
    } else {
      console.error(`❌ テスト送信失敗: ${userId}`);
      return NextResponse.json(
        { success: false, error: 'Push failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ テスト送信エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
