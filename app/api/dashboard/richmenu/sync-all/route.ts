import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { setDefaultRichMenu } from '@/lib/line/richmenu-api';
import { config } from '@/lib/config';

const LANGS = ['ja', 'en', 'ko', 'zh', 'vi'] as const;
const BULK_LINK_LIMIT = 500; // LINE API上限: 1リクエスト500人

/**
 * LINE Bulk Link API: 1リクエストで最大500人にリッチメニューをリンク
 */
async function bulkLinkRichMenu(richMenuId: string, userIds: string[]): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/richmenu/bulk/link', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.line.channelAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ richMenuId, userIds }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Bulk link failed: ${res.status} ${errorText}`);
  }
}

/**
 * POST /api/dashboard/richmenu/sync-all
 * 全ユーザーのリッチメニューを一括反映（Bulk Link API使用）
 *
 * 処理:
 * 1. richmenu_configs から5言語のrich_menu_idを取得
 * 2. enメニューをデフォルトに設定（未設定・新規ユーザー用）
 * 3. user_statusから全ユーザーを取得し、言語別にグループ化
 * 4. 言語ごとにBulk Link API（500人/リクエスト）で一括リンク
 */
export async function POST() {
  try {
    // 1. 全言語のメニューIDを取得
    const { data: menuConfigs, error: configErr } = await supabase
      .from('richmenu_configs')
      .select('lang, rich_menu_id')
      .in('lang', [...LANGS]);

    if (configErr) throw configErr;

    const menuByLang: Record<string, string> = {};
    for (const cfg of menuConfigs || []) {
      if (cfg.rich_menu_id) {
        menuByLang[cfg.lang] = cfg.rich_menu_id;
      }
    }

    // 全言語にメニューIDがあるか確認
    const missingLangs = LANGS.filter((l) => !menuByLang[l]);
    if (missingLangs.length > 0) {
      return NextResponse.json(
        { error: `以下の言語にメニューIDが未設定です: ${missingLangs.join(', ')}。先に各言語のリッチメニューをLINEに適用してください。` },
        { status: 400 }
      );
    }

    // 2. enメニューをデフォルトに設定（未設定・新規ユーザー用フォールバック）
    await setDefaultRichMenu(menuByLang.en);

    // 3. 全ユーザーを取得し、言語別にグループ化
    const { data: users, error: userErr } = await supabase
      .from('user_status')
      .select('user_id, lang');

    if (userErr) throw userErr;
    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, results: { total: 0, success: 0, failed: 0, defaultMenu: `en`, byLanguage: {} } });
    }

    const usersByLang: Record<string, string[]> = {};
    for (const user of users) {
      const lang = user.lang || 'en';
      if (!usersByLang[lang]) usersByLang[lang] = [];
      usersByLang[lang].push(user.user_id);
    }

    // 4. 言語ごとにBulk Link APIで一括リンク（500人ずつ）
    let successCount = 0;
    let failCount = 0;
    const langCounts: Record<string, number> = {};

    for (const [lang, userIds] of Object.entries(usersByLang)) {
      const menuId = menuByLang[lang] || menuByLang.en;
      langCounts[lang] = userIds.length;

      // 500人ずつチャンクに分割
      for (let i = 0; i < userIds.length; i += BULK_LINK_LIMIT) {
        const chunk = userIds.slice(i, i + BULK_LINK_LIMIT);
        try {
          await bulkLinkRichMenu(menuId, chunk);
          successCount += chunk.length;
        } catch (err) {
          failCount += chunk.length;
          console.error(`[sync-all] bulk link failed for ${lang} (${chunk.length} users):`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: users.length,
        success: successCount,
        failed: failCount,
        defaultMenu: `en (${menuByLang.en.substring(0, 16)}...)`,
        byLanguage: langCounts,
      },
    });
  } catch (error) {
    console.error('[sync-all] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'リッチメニュー一括反映に失敗しました' },
      { status: 500 }
    );
  }
}
