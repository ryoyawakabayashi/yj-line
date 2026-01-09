// =====================================================
// クリックトラッキング用リダイレクトAPI
// /api/r/[token] → destination_url へリダイレクト
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // トークンからdestination_urlを取得
    const { data, error } = await supabase
      .from('tracking_tokens')
      .select('destination_url, url_type')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('❌ トークン検索エラー:', error);
      return NextResponse.redirect(new URL('https://yolo-japan.com'));
    }

    if (!data || !data.destination_url) {
      console.warn('⚠️ トークン未発見:', token);
      return NextResponse.redirect(new URL('https://yolo-japan.com'));
    }

    // クリック記録（初回のみ）
    const { error: updateError } = await supabase
      .from('tracking_tokens')
      .update({ clicked_at: new Date().toISOString() })
      .eq('token', token)
      .is('clicked_at', null);

    if (updateError) {
      console.error('❌ クリック記録エラー:', updateError);
    } else {
      console.log('✅ クリック記録:', { token, urlType: data.url_type });
    }

    // destination_urlにUTMパラメータを付与してリダイレクト
    const redirectUrl = new URL(data.destination_url);
    redirectUrl.searchParams.set('ref', token);
    redirectUrl.searchParams.set('utm_source', 'line');
    redirectUrl.searchParams.set('utm_medium', 'bot');
    if (data.url_type) {
      redirectUrl.searchParams.set('utm_campaign', data.url_type);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('❌ リダイレクトAPI エラー:', error);
    return NextResponse.redirect(new URL('https://yolo-japan.com'));
  }
}
