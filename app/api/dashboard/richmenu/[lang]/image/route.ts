import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { getRichMenuImage } from '@/lib/line/richmenu-api';

export async function GET(
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
        { status: 404 }
      );
    }

    // LINE APIから画像を取得
    const imageBuffer = await getRichMenuImage(data.rich_menu_id);

    if (!imageBuffer) {
      return NextResponse.json(
        { success: false, error: '画像の取得に失敗しました' },
        { status: 500 }
      );
    }

    // バイナリをそのまま返す
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('❌ richmenu image エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
