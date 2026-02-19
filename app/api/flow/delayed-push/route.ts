// =====================================================
// 遅延メッセージ送信API
// webhook関数のタイムアウトを回避するため、
// 別リクエストで遅延 + pushMessage を実行する
// after() で即レスポンス → バックグラウンドで遅延送信
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { pushMessage } from '@/lib/line/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Pro plan: 最大60秒（Hobbyは10秒に制限）

export async function POST(req: NextRequest) {
  try {
    const { userId, messages, delaySec, secret } = await req.json();

    // 内部API認証: LINE Channel Secretの先頭16文字をトークンとして使用
    const expectedSecret = (process.env.LINE_CHANNEL_SECRET || '').slice(0, 16);
    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!userId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const delay = Math.min(Math.max(delaySec || 0, 0), 30);
    console.log(`⏱️  delayed-push: ${delay}秒後に${messages.length}件のメッセージを送信予約 (userId: ${userId.slice(0, 8)}...)`);

    // after() でバックグラウンド処理: 即座にレスポンスを返しつつ、
    // この関数のライフタイム内で遅延送信を実行
    after(async () => {
      try {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
        await pushMessage(userId, messages);
        console.log(`✅ delayed-push: 送信完了 (${delay}秒遅延)`);
      } catch (error) {
        console.error('❌ delayed-push after() エラー:', error);
      }
    });

    return NextResponse.json({ status: 'scheduled', delay });
  } catch (error) {
    console.error('❌ delayed-push エラー:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
