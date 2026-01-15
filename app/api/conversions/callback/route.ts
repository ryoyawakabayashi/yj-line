// =====================================================
// コンバージョンコールバックAPI
// =====================================================
// YOLO JAPAN側から応募完了時に呼び出される
// utm_content（トークン）からユーザーを特定してCV記録

import { NextRequest, NextResponse } from 'next/server';
import { recordConversion } from '@/lib/tracking/token';
import { supabase } from '@/lib/database/supabase';

/**
 * POST /api/conversions/callback
 * Body: { token: string, type?: string }
 *
 * YOLO JAPAN側で応募完了時に呼び出し:
 * fetch('https://line-bot.../api/conversions/callback', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ token: utm_content値 })
 * })
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      );
    }

    // トークンの存在確認
    const { data: existing } = await supabase
      .from('tracking_tokens')
      .select('id, user_id, converted_at')
      .eq('token', token)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 404 }
      );
    }

    // CV記録
    const success = await recordConversion(token);

    if (success) {
      console.log(`✅ CV記録成功: token=${token}, type=${type || 'unknown'}`);
      return NextResponse.json({
        success: true,
        message: 'Conversion recorded',
        userId: existing.user_id,
        firstConversion: !existing.converted_at,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to record conversion' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Conversion callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversions/callback?token=xxx
 * トークンの情報を取得（デバッグ用）
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'token parameter is required' },
      { status: 400 }
    );
  }

  const { data } = await supabase
    .from('tracking_tokens')
    .select('token, user_id, url_type, created_at, clicked_at, converted_at')
    .eq('token', token)
    .maybeSingle();

  if (!data) {
    return NextResponse.json(
      { error: 'Token not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    token: data.token,
    userId: data.user_id,
    urlType: data.url_type,
    createdAt: data.created_at,
    clickedAt: data.clicked_at,
    convertedAt: data.converted_at,
  });
}
