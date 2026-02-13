// =====================================================
// クリックトラッキング用リダイレクトAPI
// /api/r/[token]?url=... → UTMパラメータ付与してリダイレクト
// メッセージ内にはパラメータを含めず、クリック時にサーバー側で付与
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/database/supabase';

/**
 * リダイレクト許可ドメイン（オープンリダイレクト防止）
 */
const ALLOWED_DOMAINS = [
  'wom.yolo-japan.com',
  'www.yolo-japan.co.jp',
  'www.yolo-japan.com',
  'home.yolo-japan.com',
];

const FALLBACK_URL = 'https://www.yolo-japan.com';

/**
 * ユーザーID → 固定8文字トークン（lib/tracking/token.ts と同じロジック）
 */
function generateUserToken(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 8);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // クエリパラメータからdestination URLを取得（優先）
    const destUrlParam = request.nextUrl.searchParams.get('url');
    let destinationUrl: string | null = null;

    if (destUrlParam) {
      // クエリパラメータのURLをドメイン検証
      try {
        const urlObj = new URL(destUrlParam);
        if (ALLOWED_DOMAINS.includes(urlObj.hostname)) {
          destinationUrl = destUrlParam;
        } else {
          console.warn('⚠️ 許可されていないドメイン:', urlObj.hostname);
        }
      } catch {
        console.warn('⚠️ 不正なURL:', destUrlParam);
      }
    }

    // クエリパラメータにない場合はDBからフォールバック
    if (!destinationUrl) {
      const { data, error } = await supabase
        .from('tracking_tokens')
        .select('destination_url')
        .eq('token', token)
        .maybeSingle();

      if (error) {
        console.error('❌ トークン検索エラー:', error);
        return NextResponse.redirect(new URL(FALLBACK_URL));
      }

      destinationUrl = data?.destination_url || null;
    }

    if (!destinationUrl) {
      console.warn('⚠️ リダイレクト先が見つかりません:', token);
      return NextResponse.redirect(new URL(FALLBACK_URL));
    }

    // uid パラメータからユーザー特定（LIFF経由で付与される）
    const uid = request.nextUrl.searchParams.get('uid');
    let utmContent = token; // デフォルト: キャンペーン/既存トークン

    if (uid) {
      // per-userトークンを生成
      const userToken = generateUserToken(uid);
      utmContent = userToken;

      // per-user tracking_tokensレコードをupsert
      const { error: upsertError } = await supabase
        .from('tracking_tokens')
        .upsert(
          {
            token: userToken,
            user_id: uid,
            url_type: 'narrowcast',
            destination_url: destinationUrl,
            clicked_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );

      if (upsertError) {
        console.error('❌ per-userトークンupsertエラー:', upsertError);
      } else {
        console.log('✅ per-userクリック記録:', { uid: uid.slice(0, 8) + '...', userToken });
      }
    } else {
      // uid がない場合: 既存のキャンペーントークンでクリック記録（初回のみ）
      const { error: updateError } = await supabase
        .from('tracking_tokens')
        .update({ clicked_at: new Date().toISOString() })
        .eq('token', token)
        .is('clicked_at', null);

      if (updateError) {
        console.error('❌ クリック記録エラー:', updateError);
      } else {
        console.log('✅ クリック記録:', { token });
      }
    }

    // UTMパラメータをリダイレクト時に付与
    const redirectUrl = new URL(destinationUrl);
    redirectUrl.searchParams.set('utm_source', 'line');
    redirectUrl.searchParams.set('utm_medium', 'inquiry');

    // utm_campaign（キャンペーン名_ユニークID）
    const campaign = request.nextUrl.searchParams.get('campaign');
    if (campaign) {
      redirectUrl.searchParams.set('utm_campaign', campaign);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('❌ リダイレクトAPI エラー:', error);
    return NextResponse.redirect(new URL(FALLBACK_URL));
  }
}
