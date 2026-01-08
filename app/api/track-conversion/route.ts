// =====================================================
// コンバージョン記録API
// YOLO JAPANサイトからcomplete_work発火時にコール
// =====================================================

import { NextResponse } from 'next/server';
import { recordConversion, recordClick } from '@/lib/tracking/token';

export async function POST(request: Request) {
  try {
    const { token, event } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // イベント種別に応じて記録
    if (event === 'click') {
      const success = await recordClick(token);
      return NextResponse.json({ success, event: 'click' });
    } else if (event === 'conversion' || !event) {
      // デフォルトはコンバージョン
      const success = await recordConversion(token);
      return NextResponse.json({ success, event: 'conversion' });
    }

    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// CORSヘッダー（YOLO JAPANサイトからのリクエスト許可）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
