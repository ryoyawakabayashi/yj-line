// lib/handlers/richmenu.ts
import { config } from '../config';
import { LINE_API } from '../constants';
import { getUserLang, getUserVisaType } from '../database/queries';
import { supabase } from '../database/supabase';

// env vars フォールバック用
const langToMenuId: Record<string, string> = {
  ja: config.richMenu.ja,
  en: config.richMenu.en,
  ko: config.richMenu.ko,
  zh: config.richMenu.zh,
  vi: config.richMenu.vi,
};

// 実際に LINE に対して richmenu をリンクする低レベル関数
export async function linkRichMenu(userId: string, richMenuId: string) {
  if (!richMenuId) {
    console.error('[linkRichMenu] richMenuId is empty', { userId });
    return;
  }

  const url = LINE_API.RICHMENU_LINK
    .replace('{userId}', userId)
    .replace('{richMenuId}', richMenuId);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.line.channelAccessToken}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('[linkRichMenu] failed', {
      status: res.status,
      body: text,
    });
  } else {
    console.log('[linkRichMenu] success', { userId, richMenuId });
  }
}

/**
 * visa_type に基づいてバリアントを決定
 */
function getVariantFromVisaType(visaType: string | null): string {
  return visaType === 'student' ? 'student' : 'default';
}

/**
 * DB（richmenu_configs）からバリアント対応のメニューIDを取得
 * student バリアントが未作成なら default にフォールバック
 */
async function getMenuIdFromDb(lang: string, variant: string): Promise<string | null> {
  // まずvariant指定で検索
  const { data } = await supabase
    .from('richmenu_configs')
    .select('rich_menu_id')
    .eq('lang', lang)
    .eq('variant', variant)
    .single();

  if (data?.rich_menu_id) return data.rich_menu_id;

  // student バリアントが未適用なら default にフォールバック
  if (variant !== 'default') {
    const { data: fallback } = await supabase
      .from('richmenu_configs')
      .select('rich_menu_id')
      .eq('lang', lang)
      .eq('variant', 'default')
      .single();

    if (fallback?.rich_menu_id) {
      console.log(`[syncRichMenuToUser] ${variant} variant未適用、defaultにフォールバック`, { lang });
      return fallback.rich_menu_id;
    }
  }

  return null;
}

/**
 * ユーザーの lang + visa_type に合わせてリッチメニューを同期
 * DB（richmenu_configs）を優先し、env vars をフォールバックにする
 */
export async function syncRichMenuToUser(userId: string) {
  const lang = await getUserLang(userId);
  const visaType = await getUserVisaType(userId);
  const variant = getVariantFromVisaType(visaType);

  // DB優先: richmenu_configs テーブルから取得
  let menuId = langToMenuId[lang] ?? config.richMenu.en;

  try {
    const dbMenuId = await getMenuIdFromDb(lang, variant);
    if (dbMenuId) {
      menuId = dbMenuId;
    }
  } catch (error) {
    // DBエラー時はenv varsフォールバック
    console.warn('[syncRichMenuToUser] DB取得失敗、env varsを使用');
  }

  console.log('[syncRichMenuToUser]', { userId, lang, variant, menuId });
  await linkRichMenu(userId, menuId);
}

// 後方互換性のためエイリアスとして残す
export const syncRichMenuToUserLang = syncRichMenuToUser;
