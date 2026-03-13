/**
 * GA4のキーイベント（complete_work等）をapplication_logsに同期
 * キャリア診断ダッシュボード等から呼び出される
 */

import { getLineBotConversionsWithKeyEvents } from '@/lib/ga4/queries';
import { supabase } from '@/lib/database/supabase';

export async function syncGa4Conversions(days: number = 7): Promise<{ synced: number; skipped: number }> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDateObj = new Date();
  startDateObj.setDate(startDateObj.getDate() - days);
  const startDate = startDateObj.toISOString().split('T')[0];

  const ga4Conversions = await getLineBotConversionsWithKeyEvents(startDate, endDate);

  if (ga4Conversions.length === 0) {
    return { synced: 0, skipped: 0 };
  }

  // トークンからユーザー情報を取得
  const tokens = [...new Set(ga4Conversions.map((cv) => cv.token))];
  const { data: tokenData } = await supabase
    .from('tracking_tokens')
    .select('token, user_id, url_type')
    .in('token', tokens);

  const tokenMap = new Map(tokenData?.map((t) => [t.token, t]) || []);

  let synced = 0;
  let skipped = 0;

  for (const cv of ga4Conversions) {
    const tokenInfo = tokenMap.get(cv.token);
    if (!tokenInfo) {
      skipped++;
      continue;
    }

    // 既存レコード数をカウント（重複防止）
    const { count: existingCount } = await supabase
      .from('application_logs')
      .select('id', { count: 'exact', head: true })
      .eq('token', cv.token)
      .eq('url_type', cv.urlType)
      .gte('applied_at', `${cv.date}T00:00:00`)
      .lt('applied_at', `${cv.date}T23:59:59`);

    const toInsert = cv.eventCount - (existingCount || 0);
    if (toInsert <= 0) {
      skipped++;
      continue;
    }

    const utmCampaign = `line_bot_${cv.urlType}_${cv.token}`;
    const records = Array.from({ length: toInsert }, () => ({
      user_id: tokenInfo.user_id,
      token: cv.token,
      url_type: cv.urlType,
      utm_campaign: utmCampaign,
      applied_at: `${cv.date}T12:00:00Z`,
    }));

    const { error } = await supabase.from('application_logs').insert(records);
    if (error) {
      console.error(`❌ CV同期エラー: token=${cv.token}`, error);
      continue;
    }

    await supabase
      .from('tracking_tokens')
      .update({ converted_at: `${cv.date}T12:00:00Z` })
      .eq('token', cv.token);

    synced += toInsert;
  }

  if (synced > 0) {
    console.log(`✅ GA4 CV同期: ${synced}件同期, ${skipped}件スキップ`);
  }

  return { synced, skipped };
}
