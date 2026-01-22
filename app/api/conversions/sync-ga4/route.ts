// =====================================================
// GA4からLINE Bot経由のCVを同期するAPI
// =====================================================
// utm_campaign = line_bot_{urlType}_{token} 形式のCVを検出し、
// トークンからユーザーを特定してapplication_logsに記録

import { NextRequest, NextResponse } from 'next/server';
import { getLineBotConversionsByToken, getLineBotConversionsWithKeyEvents } from '@/lib/ga4/queries';
import { supabase } from '@/lib/database/supabase';

/**
 * POST /api/conversions/sync-ga4
 * GA4からCVデータ（complete_work等のキーイベント）を取得し、application_logsに同期
 * eventCount分のレコードを作成（誰が・いつ・何回応募したかを記録）
 *
 * Body: { days?: number } (デフォルト: 7日間)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = body.days || 7;

    // 日付範囲を計算
    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    const startDate = startDateObj.toISOString().split('T')[0];

    console.log(`🔄 GA4 CV同期開始: ${startDate} ～ ${endDate}`);

    // GA4からline_bot_*形式でキーイベント（complete_work等）があるCVを取得
    const ga4Conversions = await getLineBotConversionsWithKeyEvents(startDate, endDate);

    if (ga4Conversions.length === 0) {
      console.log('📭 同期対象のCVなし');
      return NextResponse.json({
        success: true,
        message: 'No conversions to sync',
        synced: 0,
        skipped: 0,
      });
    }

    console.log(`📊 GA4から ${ga4Conversions.length} 件のCV検出`);

    // トークンごとにユーザーIDを取得
    const tokens = [...new Set(ga4Conversions.map((cv) => cv.token))];
    const { data: tokenData } = await supabase
      .from('tracking_tokens')
      .select('token, user_id, url_type')
      .in('token', tokens);

    const tokenMap = new Map(tokenData?.map((t) => [t.token, t]) || []);

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 各CVをapplication_logsに記録
    for (const cv of ga4Conversions) {
      const tokenInfo = tokenMap.get(cv.token);

      if (!tokenInfo) {
        console.log(`⚠️ トークン未登録: ${cv.token}`);
        skipped++;
        continue;
      }

      // 既存レコード数をカウント（同じトークン・同じ日付・同じイベント）
      const { count: existingCount } = await supabase
        .from('application_logs')
        .select('id', { count: 'exact', head: true })
        .eq('token', cv.token)
        .eq('url_type', cv.urlType)
        .gte('applied_at', `${cv.date}T00:00:00`)
        .lt('applied_at', `${cv.date}T23:59:59`);

      const alreadySynced = existingCount || 0;
      const toInsert = cv.eventCount - alreadySynced;

      if (toInsert <= 0) {
        console.log(`⏭️ 既に同期済み: token=${cv.token}, date=${cv.date}, event=${cv.eventName}, existing=${alreadySynced}`);
        skipped++;
        continue;
      }

      // eventCount分のレコードを挿入（不足分のみ）
      const utmCampaign = `line_bot_${cv.urlType}_${cv.token}`;
      const records = [];
      for (let i = 0; i < toInsert; i++) {
        records.push({
          user_id: tokenInfo.user_id,
          token: cv.token,
          url_type: cv.urlType,
          utm_campaign: utmCampaign,
          applied_at: `${cv.date}T12:00:00Z`,
        });
      }

      const { error: insertError } = await supabase.from('application_logs').insert(records);

      if (insertError) {
        console.error(`❌ 挿入エラー: token=${cv.token}`, insertError);
        errors.push(`${cv.token}: ${insertError.message}`);
        continue;
      }

      // tracking_tokensのconverted_atも更新
      await supabase
        .from('tracking_tokens')
        .update({ converted_at: `${cv.date}T12:00:00Z` })
        .eq('token', cv.token);

      console.log(`✅ CV同期: token=${cv.token}, user=${tokenInfo.user_id}, event=${cv.eventName}, count=${toInsert}`);
      synced += toInsert;
    }

    console.log(`🎉 GA4 CV同期完了: 同期=${synced}, スキップ=${skipped}`);

    return NextResponse.json({
      success: true,
      message: 'GA4 conversions synced',
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      dateRange: { startDate, endDate },
    });
  } catch (error) {
    console.error('❌ GA4 CV同期エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversions/sync-ga4
 * 現在のGA4 CVデータを確認（同期せずプレビュー）
 * ?debug=1 でline_bot_*のセッション数（CVフィルタなし）も確認
 * ?cv=1 でcomplete_workイベントのあるキャンペーンを取得
 */
export async function GET(request: NextRequest) {
  try {
    const days = Number(request.nextUrl.searchParams.get('days') || '7');
    const debug = request.nextUrl.searchParams.get('debug') === '1';
    const cvMode = request.nextUrl.searchParams.get('cv') === '1';

    const endDate = new Date().toISOString().split('T')[0];
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - days);
    const startDate = startDateObj.toISOString().split('T')[0];

    // cvモード: complete_workイベントのあるキャンペーンを取得
    if (cvMode) {
      const { getLineBotConversionsWithKeyEvents } = await import('@/lib/ga4/queries');
      const cvData = await getLineBotConversionsWithKeyEvents(startDate, endDate);

      // トークンからユーザー情報を取得
      const tokens = [...new Set(cvData.map((cv) => cv.token))];
      const { data: tokenData } = await supabase
        .from('tracking_tokens')
        .select('token, user_id, url_type')
        .in('token', tokens);

      const tokenMap = new Map(tokenData?.map((t) => [t.token, t]) || []);

      const enrichedCvData = cvData.map((cv) => {
        const tokenInfo = tokenMap.get(cv.token);
        return {
          ...cv,
          userId: tokenInfo?.user_id || null,
          registered: !!tokenInfo,
        };
      });

      return NextResponse.json({
        dateRange: { startDate, endDate },
        totalConversions: cvData.length,
        registeredTokens: enrichedCvData.filter((c) => c.registered).length,
        conversions: enrichedCvData,
      });
    }

    const ga4Conversions = await getLineBotConversionsByToken(startDate, endDate);

    // デバッグモード: line_bot_*のセッションをCVフィルタなしで確認
    let debugInfo = null;
    if (debug) {
      const { getLineBotSessionsDebug } = await import('@/lib/ga4/queries');
      debugInfo = await getLineBotSessionsDebug(startDate, endDate);
    }

    // トークンからユーザー情報を取得
    const tokens = [...new Set(ga4Conversions.map((cv) => cv.token))];
    const { data: tokenData } = await supabase
      .from('tracking_tokens')
      .select('token, user_id, url_type')
      .in('token', tokens);

    const tokenMap = new Map(tokenData?.map((t) => [t.token, t]) || []);

    const enrichedConversions = ga4Conversions.map((cv) => {
      const tokenInfo = tokenMap.get(cv.token);
      return {
        ...cv,
        userId: tokenInfo?.user_id || null,
        registered: !!tokenInfo,
      };
    });

    return NextResponse.json({
      dateRange: { startDate, endDate },
      totalConversions: ga4Conversions.length,
      registeredTokens: enrichedConversions.filter((c) => c.registered).length,
      unregisteredTokens: enrichedConversions.filter((c) => !c.registered).length,
      conversions: enrichedConversions,
      ...(debugInfo && { debug: debugInfo }),
    });
  } catch (error) {
    console.error('❌ GA4 CVプレビューエラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
