import { NextRequest, NextResponse } from 'next/server';
import { LineWebhookBody } from '@/types/line';
import { handleEvent } from '@/lib/handlers/event';
import { validateSignature } from '@/lib/line/signature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log('📩 Webhook受信 - サイズ:', body.length, 'bytes');

    if (!body || body.trim() === '') {
      console.log('⚠️ 空のリクエスト');
      return NextResponse.json({ status: 'ok' });
    }

    const signature = req.headers.get('x-line-signature');
    
    if (!signature) {
      console.error('❌ 署名ヘッダーが存在しません');
      return NextResponse.json(
        { error: 'No signature' },
        { status: 401 }
      );
    }

    if (!validateSignature(body, signature)) {
      console.error('❌ 署名検証失敗');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ 署名検証成功');

    const webhookData: LineWebhookBody = JSON.parse(body);
    console.log('📩 イベント数:', webhookData.events?.length || 0);

    const events = webhookData.events ?? [];

    if (events.length === 0) {
      console.log('⚠️ イベントが空');
      return NextResponse.json({ status: 'ok' });
    }

    const results = await Promise.allSettled(
      events.map((event) => handleEvent(event))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`❌ イベント${index + 1}処理失敗:`, result.reason);
      }
    });

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('❌ Webhook処理エラー:', error);
    
    if (error instanceof Error) {
      console.error('エラー名:', error.name);
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);
    }
    
    return NextResponse.json(
      { status: 'error', message: 'Internal error' },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'YOLO JAPAN LINE Bot',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
