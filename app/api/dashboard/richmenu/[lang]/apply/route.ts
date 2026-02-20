import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import {
  createRichMenu,
  uploadRichMenuImage,
  deleteRichMenu,
} from '@/lib/line/richmenu-api';

function buildLineApiJson(config: any) {
  const areas = (config.areas || []).map((area: any) => ({
    bounds: area.bounds,
    action:
      area.action_type === 'message'
        ? { type: 'message', text: area.action_text, label: area.label }
        : { type: 'uri', uri: area.action_text, label: area.label },
  }));

  return {
    size: {
      width: config.size_width || 2500,
      height: config.size_height || 1686,
    },
    selected: true,
    name: config.menu_name,
    chatBarText: config.chat_bar_text,
    areas,
  };
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB (LINE API制限)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;

    // FormDataから画像を取得
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: '画像ファイルが必要です' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { success: false, error: 'PNG または JPEG のみ対応しています' },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'ファイルサイズは1MB以下にしてください' },
        { status: 400 }
      );
    }

    // DBから現在の設定を取得
    const { data: configData, error: dbError } = await supabase
      .from('richmenu_configs')
      .select('*')
      .eq('lang', lang)
      .single();

    if (dbError || !configData) {
      return NextResponse.json(
        { success: false, error: '設定が見つかりません' },
        { status: 404 }
      );
    }

    const oldRichMenuId = configData.rich_menu_id;

    // 1. LINE APIでリッチメニューを作成
    const menuJson = buildLineApiJson(configData);
    let newRichMenuId: string;

    try {
      newRichMenuId = await createRichMenu(menuJson);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `メニュー作成失敗: ${error.message}` },
        { status: 500 }
      );
    }

    // 2. 画像をアップロード
    try {
      const imageBuffer = await imageFile.arrayBuffer();
      await uploadRichMenuImage(newRichMenuId, imageBuffer, imageFile.type);
    } catch (error: any) {
      // ロールバック: 作成したメニューを削除
      await deleteRichMenu(newRichMenuId);
      return NextResponse.json(
        { success: false, error: `画像アップロード失敗: ${error.message}` },
        { status: 500 }
      );
    }

    // 3. 旧メニューを削除
    if (oldRichMenuId) {
      try {
        await deleteRichMenu(oldRichMenuId);
      } catch (error) {
        console.error('旧メニュー削除失敗（続行）:', error);
      }
    }

    // 4. DBを更新
    const { error: updateError } = await supabase
      .from('richmenu_configs')
      .update({
        rich_menu_id: newRichMenuId,
        last_applied_at: new Date().toISOString(),
      })
      .eq('lang', lang);

    if (updateError) {
      console.error('DB更新失敗:', updateError);
    }

    return NextResponse.json({
      success: true,
      richMenuId: newRichMenuId,
      message: 'リッチメニューを適用しました',
    });
  } catch (error: any) {
    console.error('❌ richmenu apply エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
