// lib/handlers/richmenu.ts
import { config } from '../config';
import { LINE_API } from '../constants';
import { getUserLang } from '../database/queries';

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
export async function syncRichMenuToUserLang(userId: string) {
  const lang = await getUserLang(userId); // user_status.lang を読んでる想定
  const menuId = langToMenuId[lang] ?? config.richMenu.en;

  console.log('[syncRichMenuToUserLang]', { userId, lang, menuId });
  await linkRichMenu(userId, menuId);
}
