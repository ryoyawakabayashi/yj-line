import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { config } from '@/lib/config';

/**
 * POST: 特定ユーザーにリッチメニューをリンク（テスト用）
 * PUT: 全ユーザーにデフォルトリッチメニューを設定（本番展開）
 */

async function linkRichMenuToUser(
  userId: string,
  richMenuId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    return { success: false, error: `${res.status}: ${errorText}` };
  }

  return { success: true };
}

// テストユーザーにリンク
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;
    const body = await request.json();
    const { userIds } = body as { userIds: string[] };

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'userIds が必要です' },
        { status: 400 }
      );
    }

    // DBからrich_menu_idを取得
    const { data, error } = await supabase
      .from('richmenu_configs')
      .select('rich_menu_id')
      .eq('lang', lang)
      .single();

    if (error || !data?.rich_menu_id) {
      return NextResponse.json(
        { success: false, error: 'リッチメニューが未適用です。先に「LINEに適用」してください。' },
        { status: 400 }
      );
    }

    const richMenuId = data.rich_menu_id;
    const results: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of userIds) {
      const trimmed = userId.trim();
      if (!trimmed) continue;
      const result = await linkRichMenuToUser(trimmed, richMenuId);
      results.push({ userId: trimmed, ...result });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      richMenuId,
      results,
      summary: `${successCount}件成功、${failCount}件失敗`,
    });
  } catch (error: any) {
    console.error('❌ richmenu link エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 全ユーザーにデフォルト設定
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;

    // DBからrich_menu_idを取得
    const { data, error } = await supabase
      .from('richmenu_configs')
      .select('rich_menu_id')
      .eq('lang', lang)
      .single();

    if (error || !data?.rich_menu_id) {
      return NextResponse.json(
        { success: false, error: 'リッチメニューが未適用です' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${data.rich_menu_id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.line.channelAccessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { success: false, error: `デフォルト設定失敗: ${res.status} ${errorText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${lang} のリッチメニューを全ユーザーのデフォルトに設定しました`,
    });
  } catch (error: any) {
    console.error('❌ richmenu default エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
