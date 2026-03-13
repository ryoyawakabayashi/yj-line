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
 * 1. richmenu_configs から全メニュー（default + student variant）のrich_menu_idを取得
 * 2. enデフォルトメニューをデフォルトに設定（未設定・新規ユーザー用）
 * 3. user_statusから全ユーザーを取得し、lang + visa_type でグループ化
 * 4. メニューIDごとにBulk Link API（500人/リクエスト）で一括リンク
 */
export async function POST() {
  try {
    // 1. 全メニューIDを取得（variant含む）
    const { data: menuConfigs, error: configErr } = await supabase
      .from('richmenu_configs')
      .select('lang, variant, rich_menu_id');

    if (configErr) throw configErr;

    // lang:variant → menuId のマップ
    const menuByKey: Record<string, string> = {};
    for (const cfg of menuConfigs || []) {
      if (cfg.rich_menu_id) {
        menuByKey[`${cfg.lang}:${cfg.variant}`] = cfg.rich_menu_id;
      }
    }

    // 全言語の default メニューがあるか確認
    const missingLangs = LANGS.filter((l) => !menuByKey[`${l}:default`]);
    if (missingLangs.length > 0) {
      return NextResponse.json(
        { error: `以下の言語にデフォルトメニューIDが未設定です: ${missingLangs.join(', ')}。先に各言語のリッチメニューをLINEに適用してください。` },
        { status: 400 }
      );
    }

    // 2. enメニューをデフォルトに設定（未設定・新規ユーザー用フォールバック）
    await setDefaultRichMenu(menuByKey['en:default']);

    // 3. 全ユーザーを取得し、lang + visa_type でグループ化
    const { data: users, error: userErr } = await supabase
      .from('user_status')
      .select('user_id, lang, visa_type');

    if (userErr) throw userErr;
    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, results: { total: 0, success: 0, failed: 0, defaultMenu: `en`, byLanguage: {} } });
    }

    // menuId ごとにユーザーをグループ化
    const usersByMenuId: Record<string, string[]> = {};
    const langCounts: Record<string, number> = {};

    for (const user of users) {
      const lang = user.lang || 'en';
      const variant = user.visa_type === 'student' ? 'student' : 'default';

      // student variant のメニューがなければ default にフォールバック
      const menuId = menuByKey[`${lang}:${variant}`] || menuByKey[`${lang}:default`] || menuByKey['en:default'];

      if (!usersByMenuId[menuId]) usersByMenuId[menuId] = [];
      usersByMenuId[menuId].push(user.user_id);

      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }

    // 4. メニューIDごとにBulk Link APIで一括リンク（500人ずつ）
    let successCount = 0;
    let failCount = 0;

    for (const [menuId, userIds] of Object.entries(usersByMenuId)) {
      for (let i = 0; i < userIds.length; i += BULK_LINK_LIMIT) {
        const chunk = userIds.slice(i, i + BULK_LINK_LIMIT);
        try {
          await bulkLinkRichMenu(menuId, chunk);
          successCount += chunk.length;
        } catch (err) {
          failCount += chunk.length;
          console.error(`[sync-all] bulk link failed for menu ${menuId} (${chunk.length} users):`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: users.length,
        success: successCount,
        failed: failCount,
        defaultMenu: `en (${menuByKey['en:default'].substring(0, 16)}...)`,
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
