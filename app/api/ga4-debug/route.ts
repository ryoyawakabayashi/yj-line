// GA4デバッグAPI - line_bot_*のキーイベントを確認

import { NextRequest, NextResponse } from 'next/server';
import { getLineBotSessionsDebug, getLineBotConversionsWithKeyEvents } from '@/lib/ga4/queries';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate') || '2025-01-01';
  const endDate = searchParams.get('endDate') || '2026-01-31';

  try {
    // キーイベント付きのline_bot_*セッションを取得
    const conversions = await getLineBotConversionsWithKeyEvents(startDate, endDate);

    // デバッグ用: 生データも取得
    const debug = await getLineBotSessionsDebug(startDate, endDate);

    return NextResponse.json({
      startDate,
      endDate,
      conversions,
      conversionsCount: conversions.length,
      debug: {
        sessionCampaignNameCompleteWork: (debug as any).sessionCampaignNameCompleteWork || [],
        sessionCampaignNameSessions: (debug as any).sessionCampaignNameSessions || [],
        allCompleteWorkCampaigns: (debug as any).allCompleteWorkCampaigns || [],
      },
    });
  } catch (error) {
    console.error('GA4 debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
