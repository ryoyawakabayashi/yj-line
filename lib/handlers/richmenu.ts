// lib/handlers/richmenu.ts
import { config } from '../config';
import { LINE_API } from '../constants';
import { getUserLang } from '../database/queries';
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

// DB の lang に合わせて、そのユーザーのリッチメニューを同期
// DB（richmenu_configs）を優先し、env vars をフォールバックにする
export async function syncRichMenuToUserLang(userId: string) {
  const lang = await getUserLang(userId);

  // DB優先: richmenu_configs テーブルから取得
  let menuId = langToMenuId[lang] ?? config.richMenu.en;
  try {
    const { data } = await supabase
      .from('richmenu_configs')
      .select('rich_menu_id')
      .eq('lang', lang)
      .single();

    if (data?.rich_menu_id) {
      menuId = data.rich_menu_id;
    }
  } catch (error) {
    // DBエラー時はenv varsフォールバック
    console.warn('[syncRichMenuToUserLang] DB取得失敗、env varsを使用');
  }

  console.log('[syncRichMenuToUserLang]', { userId, lang, menuId });
  await linkRichMenu(userId, menuId);
}
