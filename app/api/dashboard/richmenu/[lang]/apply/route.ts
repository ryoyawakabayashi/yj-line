import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import crypto from 'crypto';
import {
  createRichMenu,
  uploadRichMenuImage,
  deleteRichMenu,
  getRichMenuImage,
} from '@/lib/line/richmenu-api';
import { config } from '@/lib/config';

const LIFF_ID = '2006973060-cAgpaZ0y';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';

const TRACKABLE_DOMAINS = [
  'wom.yolo-japan.com',
  'www.yolo-japan.co.jp',
  'www.yolo-japan.com',
  'home.yolo-japan.com',
];

/**
 * URI用キャンペーントークン生成（ラベルベースで固定）
 */
function generateMenuToken(label: string, lang: string): string {
  const seed = `richmenu_${lang}_${label}`;
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8);
}

/**
 * トラッキング対象ドメインかチェック
 */
function isTrackableUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRACKABLE_DOMAINS.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

/**
 * URIアクションをLIFFトラッキングURLに変換
 * トラッキング対象ドメインのみ変換、それ以外はそのまま返す
 */
async function convertUriToLiffTracking(
  uri: string,
  label: string,
  lang: string
): Promise<string> {
  if (!isTrackableUrl(uri)) return uri;

  const token = generateMenuToken(label, lang);
  const campaignId = `richmenu_${label}`;

  // tracking_tokensにupsert
  const { error } = await supabase
    .from('tracking_tokens')
    .upsert(
      {
        token,
        user_id: `richmenu:${lang}:${label}`,
        url_type: 'richmenu',
        destination_url: uri,
      },
      { onConflict: 'token' }
    );

  if (error) {
    console.error('❌ リッチメニュートークンupsertエラー:', error);
  }

  // /api/r/ リダイレクトURL（medium=menu）
  const redirectUrl = `${APP_BASE_URL}/api/r/${token}?url=${encodeURIComponent(uri)}&medium=menu&campaign=${encodeURIComponent(campaignId)}`;

  // LIFF URL（ハッシュ形式）
  return `https://liff.line.me/${LIFF_ID}#url=${encodeURIComponent(redirectUrl)}`;
}

async function buildLineApiJson(config: any, lang: string) {
  const areas = await Promise.all(
    (config.areas || []).map(async (area: any) => {
      if (area.action_type === 'message') {
        return {
          bounds: area.bounds,
          action: { type: 'message', text: area.action_text, label: area.label },
        };
      }

      // URIアクション: トラッキング対象ドメインならLIFF URLに自動変換
      const uri = await convertUriToLiffTracking(area.action_text, area.label, lang);
      return {
        bounds: area.bounds,
        action: { type: 'uri', uri, label: area.label },
      };
    })
  );

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

    // FormDataから画像とvariantを取得
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const variant = (formData.get('variant') as string) || 'default';

    if (imageFile) {
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
    }

    // DBから現在の設定を取得（variant対応）
    const { data: configData, error: dbError } = await supabase
      .from('richmenu_configs')
      .select('*')
      .eq('lang', lang)
      .eq('variant', variant)
      .single();

    if (dbError || !configData) {
      return NextResponse.json(
        { success: false, error: '設定が見つかりません' },
        { status: 404 }
      );
    }

    const oldRichMenuId = configData.rich_menu_id;

    // 画像なしの場合、既存メニューの画像を再利用するため事前に取得
    // DB → 環境変数の順でフォールバック
    let existingImageBuffer: ArrayBuffer | null = null;
    if (!imageFile) {
      const envMenuId = (config.richMenu as Record<string, string>)[lang] || '';
      const fallbackMenuId = oldRichMenuId || envMenuId;

      if (!fallbackMenuId) {
        return NextResponse.json(
          { success: false, error: '既存のリッチメニューがありません。初回は画像が必要です' },
          { status: 400 }
        );
      }

      existingImageBuffer = await getRichMenuImage(fallbackMenuId);
      if (!existingImageBuffer) {
        return NextResponse.json(
          { success: false, error: '既存メニューの画像取得に失敗しました。新しい画像をアップロードしてください' },
          { status: 400 }
        );
      }
    }

    // 1. LINE APIでリッチメニューを作成（URIアクションは自動でLIFFトラッキングURLに変換）
    const menuJson = await buildLineApiJson(configData, lang);
    let newRichMenuId: string;

    try {
      newRichMenuId = await createRichMenu(menuJson);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `メニュー作成失敗: ${error.message}` },
        { status: 500 }
      );
    }

    // 2. 画像をアップロード（新規画像 or 既存画像の再利用）
    try {
      if (imageFile) {
        const imageBuffer = await imageFile.arrayBuffer();
        await uploadRichMenuImage(newRichMenuId, imageBuffer, imageFile.type);
      } else {
        await uploadRichMenuImage(newRichMenuId, existingImageBuffer!, 'image/png');
      }
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

    // 4. DBを更新（variant対応）
    const { error: updateError } = await supabase
      .from('richmenu_configs')
      .update({
        rich_menu_id: newRichMenuId,
        last_applied_at: new Date().toISOString(),
      })
      .eq('lang', lang)
      .eq('variant', variant);

    if (updateError) {
      console.error('DB更新失敗:', updateError);
    }

    return NextResponse.json({
      success: true,
      richMenuId: newRichMenuId,
      reusedImage: !imageFile,
      message: imageFile ? 'リッチメニューを適用しました' : 'リッチメニューを適用しました（既存画像を再利用）',
    });
  } catch (error: any) {
    console.error('❌ richmenu apply エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
