// =====================================================
// 配信管理 統合API
// GET: follower_count / test_users / campaigns / broadcast_stats
// POST: send / save_draft / schedule / cancel_schedule / delete_draft / add_test_user / delete_test_user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkDashboardAuth, unauthorizedResponse } from '@/lib/auth/dashboard-auth';
import { config } from '@/lib/config';
import { supabase } from '@/lib/database/supabase';
import { getFollowerStatistics, getUserProfile, pushMessage } from '@/lib/line/client';
import crypto from 'crypto';

const LIFF_ID = '2006973060-cAgpaZ0y';
const BROADCAST_API = 'https://api.line.me/v2/bot/message/broadcast';
const NARROWCAST_API = 'https://api.line.me/v2/bot/message/narrowcast';
const INSIGHT_EVENT_API = 'https://api.line.me/v2/bot/insight/message/event/aggregation';
const INSIGHT_DEMOGRAPHIC_API = 'https://api.line.me/v2/bot/insight/demographic';
const NARROWCAST_PROGRESS_API = 'https://api.line.me/v2/bot/message/progress/narrowcast';

// LINE Demographic API のエリア名 → エリアプリセットキーへのマッピング
// LINE APIは「関東」「近畿」等のリージョン名で返す
const DEMOGRAPHIC_AREA_MAP: Record<string, string[]> = {
  '北海道': ['hokkaido'],
  '東北': ['tohoku'],
  '関東': ['kanto', 'tokyo'],
  '甲信越': ['chubu'],
  '北陸': ['chubu'],
  '東海': ['chubu'],
  '近畿': ['kansai', 'osaka'],
  '中国': ['chugoku'],
  '四国': ['shikoku'],
  '九州': ['kyushu'],
};

// エリアプリセット（既存narrowcast routeと同じ）
const AREA_PRESETS: Record<string, string[]> = {
  kanto: ['jp_08', 'jp_09', 'jp_10', 'jp_11', 'jp_12', 'jp_13', 'jp_14'],
  tokyo: ['jp_13'],
  osaka: ['jp_27'],
  kansai: ['jp_25', 'jp_26', 'jp_27', 'jp_28', 'jp_29', 'jp_30'],
  chubu: ['jp_15', 'jp_16', 'jp_17', 'jp_18', 'jp_19', 'jp_20', 'jp_21', 'jp_22', 'jp_23'],
  hokkaido: ['jp_01'],
  tohoku: ['jp_02', 'jp_03', 'jp_04', 'jp_05', 'jp_06', 'jp_07'],
  chugoku: ['jp_31', 'jp_32', 'jp_33', 'jp_34', 'jp_35'],
  shikoku: ['jp_36', 'jp_37', 'jp_38', 'jp_39'],
  kyushu: ['jp_40', 'jp_41', 'jp_42', 'jp_43', 'jp_44', 'jp_45', 'jp_46', 'jp_47'],
};

// =====================================================
// ヘルパー関数
// =====================================================

interface CarouselBubble {
  imageUrl?: string;
  title?: string;
  body?: string;
  buttons?: { label: string; url: string; campaign?: string; actionType?: 'uri' | 'message'; messageText?: string; color?: string }[];
}

interface MessageItem {
  type: 'text' | 'card' | 'image' | 'carousel';
  text?: string;
  imageUrl?: string;
  title?: string;
  body?: string;
  altText?: string;
  buttons?: { label: string; url: string; campaign?: string; actionType?: 'uri' | 'message'; messageText?: string; color?: string }[];
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
  imageFullWidth?: boolean;
  imageAspectRatio?: string;
  imageAspectMode?: 'cover' | 'fit';
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  bubbles?: CarouselBubble[];
}

function createLiffUrl(targetUrl: string, campaign?: string, broadcastId?: string): string {
  const type = campaign || 'other';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uid = broadcastId || Math.random().toString(36).slice(2, 8);
  const campaignValue = `line_push_${type}_${today}_${uid}`;
  const separator = targetUrl.includes('?') ? '&' : '?';
  const trackedUrl = targetUrl + `${separator}utm_source=line&utm_medium=push&utm_campaign=${encodeURIComponent(campaignValue)}`;
  return `https://liff.line.me/${LIFF_ID}#url=${encodeURIComponent(trackedUrl)}`;
}

function buildLineMessages(items: MessageItem[], broadcastId?: string, notificationText?: string): object[] {
  return items.map((item) => {
    if (item.type === 'text') {
      return { type: 'text', text: item.text || '' };
    }
    if (item.type === 'image') {
      const url = item.originalUrl || '';
      const rawRatio = item.imageAspectRatio || 'original';
      const alt = notificationText || '画像メッセージ';
      // aspectRatio計算: LINEは1:3〜3:1の範囲のみ対応
      let ar: string;
      if (rawRatio === 'original' && item.imageNaturalWidth && item.imageNaturalHeight) {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const g = gcd(item.imageNaturalWidth, item.imageNaturalHeight);
        let w = item.imageNaturalWidth / g;
        let h = item.imageNaturalHeight / g;
        if (w / h > 3) h = Math.round(w / 3);
        if (h / w > 3) w = Math.round(h / 3);
        ar = `${w}:${h}`;
      } else if (rawRatio === 'original') {
        ar = '20:13';
      } else {
        ar = rawRatio;
      }
      const am = rawRatio === 'original' ? 'cover' : (item.imageAspectMode || 'cover');
      if (item.linkUrl) {
        const linkUri = createLiffUrl(item.linkUrl, item.linkCampaign, broadcastId);
        return {
          type: 'flex', altText: alt,
          contents: {
            type: 'bubble', size: 'mega',
            hero: {
              type: 'image', url, size: 'full', aspectRatio: ar, aspectMode: am,
              action: { type: 'uri', label: 'open', uri: linkUri },
            },
          },
        };
      }
      if (item.imageFullWidth) {
        return {
          type: 'flex', altText: alt,
          contents: {
            type: 'bubble', size: 'mega',
            hero: {
              type: 'image', url, size: 'full', aspectRatio: ar, aspectMode: am,
            },
          },
        };
      }
      return { type: 'image', originalContentUrl: url, previewImageUrl: url };
    }
    if (item.type === 'card') {
      const bodyContents: object[] = [];
      if (item.title) bodyContents.push({ type: 'text', text: item.title, weight: 'bold', size: 'lg', color: '#333333', wrap: true });
      if (item.body) bodyContents.push({ type: 'text', text: item.body, size: 'md', color: '#555555', wrap: true, margin: item.title ? 'md' : 'none' });
      const footerContents = (item.buttons || []).map((btn: any) => {
        const action = btn.actionType === 'message'
          ? { type: 'message', label: btn.label, text: btn.messageText || btn.label }
          : { type: 'uri', label: btn.label, uri: createLiffUrl(btn.url, btn.campaign, broadcastId) };
        return { type: 'button', action, style: 'primary', color: btn.color || '#f9c93e', margin: 'sm' };
      });
      const bubble: Record<string, unknown> = { type: 'bubble' };
      if (item.imageUrl) bubble.hero = { type: 'image', url: item.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' };
      if (bodyContents.length > 0) bubble.body = { type: 'box', layout: 'vertical', contents: bodyContents };
      if (footerContents.length > 0) bubble.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerContents };
      return { type: 'flex', altText: notificationText || item.altText || item.title || item.body || 'カードメッセージ', contents: bubble };
    }
    if (item.type === 'carousel') {
      const bubbleContents = (item.bubbles || []).map((bubble) => {
        const bodyContents: object[] = [];
        if (bubble.title) bodyContents.push({ type: 'text', text: bubble.title, weight: 'bold', size: 'lg', color: '#333333', wrap: true });
        if (bubble.body) bodyContents.push({ type: 'text', text: bubble.body, size: 'md', color: '#555555', wrap: true, margin: bubble.title ? 'md' : 'none' });
        const footerContents = (bubble.buttons || []).map((btn: any) => {
          const action = btn.actionType === 'message'
            ? { type: 'message', label: btn.label, text: btn.messageText || btn.label }
            : { type: 'uri', label: btn.label, uri: createLiffUrl(btn.url, btn.campaign, broadcastId) };
          return { type: 'button', action, style: 'primary', color: btn.color || '#f9c93e', margin: 'sm' };
        });
        const b: Record<string, unknown> = { type: 'bubble' };
        if (bubble.imageUrl) b.hero = { type: 'image', url: bubble.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' };
        if (bodyContents.length > 0) b.body = { type: 'box', layout: 'vertical', contents: bodyContents };
        if (footerContents.length > 0) b.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerContents };
        return b;
      });
      return {
        type: 'flex',
        altText: notificationText || item.altText || 'カルーセルメッセージ',
        contents: { type: 'carousel', contents: bubbleContents },
      };
    }
    return { type: 'text', text: '' };
  });
}

function generateAggregationUnit(campaignId: string): string {
  const hash = crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 8);
  return `bc_${hash}`;
}

// =====================================================
// GET handler
// =====================================================

export async function GET(request: NextRequest) {
  const auth = await checkDashboardAuth(request);
  if (!auth.authenticated) return unauthorizedResponse(auth.error);

  const action = request.nextUrl.searchParams.get('action');

  try {
    switch (action) {
      case 'bot_profile': {
        const botRes = await fetch('https://api.line.me/v2/bot/info', {
          headers: { Authorization: `Bearer ${config.line.channelAccessToken}` },
        });
        if (!botRes.ok) return NextResponse.json({ error: 'Bot info API error' }, { status: botRes.status });
        const botData = await botRes.json();
        return NextResponse.json({ displayName: botData.displayName, pictureUrl: botData.pictureUrl });
      }

      case 'follower_count': {
        const stats = await getFollowerStatistics();
        return NextResponse.json({
          followers: stats?.followers || 0,
          targetedReaches: stats?.targetedReaches || 0,
          blocks: stats?.blocks || 0,
        });
      }

      case 'demographic': {
        // LINE Demographic Insight APIからエリア分布を取得
        const demoRes = await fetch(INSIGHT_DEMOGRAPHIC_API, {
          headers: { Authorization: `Bearer ${config.line.channelAccessToken}` },
        });
        if (!demoRes.ok) {
          return NextResponse.json({ error: 'Demographic API error', available: false }, { status: demoRes.status });
        }
        const demoData = await demoRes.json();
        console.log('[Demographic API] available:', demoData.available, 'areas:', JSON.stringify(demoData.areas?.length ?? 0), 'genders:', JSON.stringify(demoData.genders?.length ?? 0));
        if (!demoData.available) {
          return NextResponse.json({ available: false, areas: [] });
        }

        // フォロワー数も取得してエリアごとの推定人数を計算
        const stats = await getFollowerStatistics();
        const targetedReaches = stats?.targetedReaches || 0;

        // エリア分布をプリセットごとにまとめる
        const areaPercentages: Record<string, number> = {};
        for (const areaItem of demoData.areas || []) {
          const areaName = areaItem.area as string;
          const pct = areaItem.percentage as number;
          // デモグラフィックのエリア名からプリセットキーを逆引き
          for (const [demoRegion, presetKeys] of Object.entries(DEMOGRAPHIC_AREA_MAP)) {
            if (areaName.includes(demoRegion)) {
              for (const key of presetKeys) {
                areaPercentages[key] = (areaPercentages[key] || 0) + pct;
              }
            }
          }
        }

        // 推定人数を計算
        const estimates: Record<string, number> = {};
        for (const [presetKey, pct] of Object.entries(areaPercentages)) {
          estimates[presetKey] = Math.round(targetedReaches * pct / 100);
        }
        console.log('[Demographic API] areaPercentages:', JSON.stringify(areaPercentages), 'estimates:', JSON.stringify(estimates), 'targetedReaches:', targetedReaches);

        // 性別の割合
        const genderPctMap: Record<string, number> = {};
        for (const item of demoData.genders || []) {
          if (item.gender === 'male' || item.gender === 'female') {
            genderPctMap[item.gender] = item.percentage;
          }
        }

        // 年齢の割合
        const agePctMap: Record<string, number> = {};
        for (const item of demoData.ages || []) {
          if (item.age && item.age !== 'unknown') {
            agePctMap[item.age] = item.percentage;
          }
        }

        return NextResponse.json({
          available: true,
          targetedReaches,
          estimates,
          genderPct: genderPctMap,
          agePct: agePctMap,
        });
      }

      case 'test_users': {
        const { data, error } = await supabase
          .from('broadcast_test_users')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;

        // LINE Profile情報を並列取得
        const users = await Promise.all(
          (data || []).map(async (u) => {
            const profile = await getUserProfile(u.line_user_id);
            return {
              id: u.id,
              lineUserId: u.line_user_id,
              label: u.label,
              displayName: profile?.displayName || null,
              pictureUrl: profile?.pictureUrl || null,
              createdAt: u.created_at,
            };
          })
        );
        return NextResponse.json({ users });
      }

      case 'campaigns': {
        const status = request.nextUrl.searchParams.get('status');
        let query = supabase
          .from('broadcast_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (status) query = query.eq('status', status);
        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ campaigns: data || [] });
      }

      case 'campaign_detail': {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
        const { data, error } = await supabase
          .from('broadcast_campaigns')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 404 });
        return NextResponse.json({ campaign: data });
      }

      case 'recent_campaigns': {
        const { data, error } = await supabase
          .from('broadcast_campaigns')
          .select('*')
          .in('status', ['sent', 'failed'])
          .order('executed_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return NextResponse.json({ campaigns: data || [] });
      }

      case 'prefecture_users': {
        // AI診断で都道府県を登録したユーザー数を都道府県別に取得
        const prefParam = request.nextUrl.searchParams.get('prefecture');
        if (prefParam) {
          // 特定の都道府県のユーザーIDリストを取得（最新の診断結果を使用）
          const { data, error } = await supabase
            .from('diagnosis_results')
            .select('user_id')
            .eq('q4_prefecture', prefParam);
          if (error) throw error;
          // ユニークなユーザーIDのみ
          const uniqueIds = [...new Set((data || []).map((d) => d.user_id))];
          return NextResponse.json({ prefecture: prefParam, userIds: uniqueIds, count: uniqueIds.length });
        }
        // 全都道府県のユーザー数サマリー
        const { data, error } = await supabase
          .from('diagnosis_results')
          .select('q4_prefecture, user_id');
        if (error) throw error;
        // 都道府県ごとのユニークユーザー数を集計
        const prefMap: Record<string, Set<string>> = {};
        for (const row of data || []) {
          if (!row.q4_prefecture) continue;
          if (!prefMap[row.q4_prefecture]) prefMap[row.q4_prefecture] = new Set();
          prefMap[row.q4_prefecture].add(row.user_id);
        }
        const counts: Record<string, number> = {};
        for (const [pref, users] of Object.entries(prefMap)) {
          counts[pref] = users.size;
        }
        return NextResponse.json({ counts });
      }

      case 'narrowcast_progress': {
        // Narrowcast Progress API: 配信後の正確な送信数を取得
        const requestId = request.nextUrl.searchParams.get('requestId');
        if (!requestId) return NextResponse.json({ error: 'requestId parameter required' }, { status: 400 });

        const progressRes = await fetch(`${NARROWCAST_PROGRESS_API}?requestId=${requestId}`, {
          headers: { Authorization: `Bearer ${config.line.channelAccessToken}` },
        });
        if (!progressRes.ok) {
          const errText = await progressRes.text();
          return NextResponse.json({ error: errText, status: progressRes.status }, { status: progressRes.status });
        }
        const progress = await progressRes.json();
        // phase: "waiting" | "sending" | "succeeded" | "failed"
        // successCount, failureCount, targetCount, errorCode, acceptedTime, completedTime
        return NextResponse.json(progress);
      }

      case 'broadcast_stats': {
        const unit = request.nextUrl.searchParams.get('unit');
        if (!unit) return NextResponse.json({ error: 'unit parameter required' }, { status: 400 });

        const res = await fetch(`${INSIGHT_EVENT_API}?customAggregationUnit=${unit}`, {
          headers: { Authorization: `Bearer ${config.line.channelAccessToken}` },
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({ error: errText, status: res.status }, { status: res.status });
        }
        const stats = await res.json();
        return NextResponse.json(stats);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Broadcast GET error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

// =====================================================
// POST handler
// =====================================================

export async function POST(request: NextRequest) {
  const auth = await checkDashboardAuth(request);
  if (!auth.authenticated) return unauthorizedResponse(auth.error);

  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      // ─── 配信実行 ──────────────────────────
      case 'send': {
        const { name, notificationText, messages, deliveryMethod, area, gender: genderFilter, ageRange, broadcastLang, prefectures, testUserIds } = body;
        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 });
        }

        // キャンペーンレコード作成
        const prefList: string[] | null = Array.isArray(prefectures) && prefectures.length > 0 ? prefectures : null;
        const { data: campaign, error: insertErr } = await supabase
          .from('broadcast_campaigns')
          .insert({
            name: name || `配信 ${new Date().toLocaleString('ja-JP')}`,
            status: 'sent',
            delivery_method: deliveryMethod || 'broadcast',
            messages,
            area: area || null,
            demographic: (genderFilter || ageRange || prefList || notificationText)
              ? { gender: genderFilter || null, age: ageRange || null, prefectures: prefList, notificationText: notificationText || null }
              : null,
            broadcast_lang: broadcastLang || 'ja',
            executed_at: new Date().toISOString(),
            admin_email: auth.user?.email,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;

        const campaignId = campaign.id;
        const aggUnit = generateAggregationUnit(campaignId);
        const lineMessages = buildLineMessages(messages, campaignId, notificationText);

        let result: any = {};

        if (deliveryMethod === 'test') {
          // テスト配信: 選択されたテストユーザーにpush（未指定なら全員）
          let userIds: string[];
          if (Array.isArray(testUserIds) && testUserIds.length > 0) {
            userIds = testUserIds;
          } else {
            const { data: testUsers } = await supabase
              .from('broadcast_test_users')
              .select('line_user_id');
            userIds = (testUsers || []).map((u) => u.line_user_id);
          }
          if (userIds.length === 0) {
            return NextResponse.json({ error: 'テストユーザーが登録されていません' }, { status: 400 });
          }
          let successCount = 0;
          for (const uid of userIds) {
            const ok = await pushMessage(uid, lineMessages as any);
            if (ok) successCount++;
          }
          result = { testUsers: userIds.length, successCount };

        } else if (deliveryMethod === 'prefecture') {
          // 都道府県別配信: AI診断で都道府県を登録したユーザーにpush
          if (!prefList || prefList.length === 0) {
            return NextResponse.json({ error: '都道府県が指定されていません' }, { status: 400 });
          }
          const { data: diagUsers, error: diagErr } = await supabase
            .from('diagnosis_results')
            .select('user_id')
            .in('q4_prefecture', prefList);
          if (diagErr) throw diagErr;
          const uniqueIds = [...new Set((diagUsers || []).map((d) => d.user_id))];
          if (uniqueIds.length === 0) {
            return NextResponse.json({ error: '選択した都道府県の登録ユーザーがいません' }, { status: 400 });
          }
          let successCount = 0;
          for (const uid of uniqueIds) {
            const ok = await pushMessage(uid, lineMessages as any);
            if (ok) successCount++;
          }
          result = { prefectures: prefList, targetUsers: uniqueIds.length, successCount };

        } else if (deliveryMethod === 'narrowcast') {
          // デモグラフィックフィルターを動的に構築
          const andConditions: object[] = [];
          if (area) {
            const areaCodes = AREA_PRESETS[area];
            if (!areaCodes) return NextResponse.json({ error: `不明なエリア: ${area}` }, { status: 400 });
            andConditions.push({ type: 'area', oneOf: areaCodes });
          }
          if (genderFilter) {
            andConditions.push({ type: 'gender', oneOf: [genderFilter] });
          }
          if (ageRange) {
            andConditions.push({ type: 'age', oneOf: [ageRange] });
          }

          if (andConditions.length === 0) {
            return NextResponse.json({ error: 'Narrowcastには少なくとも1つのフィルターが必要です' }, { status: 400 });
          }

          const narrowcastBody: Record<string, unknown> = {
            messages: lineMessages,
            filter: {
              demographic: {
                type: 'operator',
                and: andConditions,
              },
            },
            limit: { upToRemainingQuota: true },
            customAggregationUnits: [aggUnit],
          };
          const res = await fetch(NARROWCAST_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.line.channelAccessToken}`,
            },
            body: JSON.stringify(narrowcastBody),
          });
          const requestId = res.headers.get('x-line-request-id');
          if (!res.ok) {
            const errText = await res.text();
            result = { error: errText, requestId };
            await supabase.from('broadcast_campaigns').update({ status: 'failed', result }).eq('id', campaignId);
            return NextResponse.json({ error: `Narrowcast失敗: ${errText}`, requestId }, { status: 500 });
          }
          result = { requestId, area: area || null, gender: genderFilter || null, age: ageRange || null, aggUnit };

        } else {
          // broadcast (全友達)
          const broadcastBody = {
            messages: lineMessages,
            customAggregationUnits: [aggUnit],
          };
          const res = await fetch(BROADCAST_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.line.channelAccessToken}`,
            },
            body: JSON.stringify(broadcastBody),
          });
          const requestId = res.headers.get('x-line-request-id');
          if (!res.ok) {
            const errText = await res.text();
            result = { error: errText, requestId };
            await supabase.from('broadcast_campaigns').update({ status: 'failed', result }).eq('id', campaignId);
            return NextResponse.json({ error: `Broadcast失敗: ${errText}`, requestId }, { status: 500 });
          }
          result = { requestId, aggUnit };
        }

        // 結果を保存
        await supabase.from('broadcast_campaigns').update({ result }).eq('id', campaignId);
        return NextResponse.json({ success: true, campaignId, ...result });
      }

      // ─── 下書き保存 ──────────────────────────
      case 'save_draft': {
        const { id, name, notificationText: draftNotifText, messages, deliveryMethod, area, demographic, broadcastLang } = body;
        const demo = demographic ? { ...demographic, notificationText: draftNotifText || null } : (draftNotifText ? { notificationText: draftNotifText } : null);
        const payload = {
          name: name || '無題の配信',
          status: 'draft' as const,
          delivery_method: deliveryMethod || 'broadcast',
          messages: messages || [],
          area: area || null,
          demographic: demo,
          broadcast_lang: broadcastLang || 'ja',
          admin_email: auth.user?.email,
          updated_at: new Date().toISOString(),
        };

        if (id) {
          const { error } = await supabase.from('broadcast_campaigns').update(payload).eq('id', id);
          if (error) throw error;
          return NextResponse.json({ success: true, id });
        } else {
          const { data, error } = await supabase.from('broadcast_campaigns').insert(payload).select().single();
          if (error) throw error;
          return NextResponse.json({ success: true, id: data.id });
        }
      }

      // ─── 予約配信 ──────────────────────────
      case 'schedule': {
        const { id, name, notificationText: schedNotifText, messages, deliveryMethod, area, gender: schedGender, ageRange: schedAge, prefectures: schedPrefs, broadcastLang, scheduledAt } = body;
        if (!scheduledAt) return NextResponse.json({ error: '予約日時が必要です' }, { status: 400 });
        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 });
        }
        const schedPrefList: string[] | null = Array.isArray(schedPrefs) && schedPrefs.length > 0 ? schedPrefs : null;

        const payload = {
          name: name || '予約配信',
          status: 'scheduled' as const,
          delivery_method: deliveryMethod || 'broadcast',
          messages,
          area: area || null,
          demographic: (schedGender || schedAge || schedPrefList || schedNotifText)
            ? { gender: schedGender || null, age: schedAge || null, prefectures: schedPrefList, notificationText: schedNotifText || null }
            : null,
          broadcast_lang: broadcastLang || 'ja',
          scheduled_at: scheduledAt,
          admin_email: auth.user?.email,
          updated_at: new Date().toISOString(),
        };

        if (id) {
          const { error } = await supabase.from('broadcast_campaigns').update(payload).eq('id', id);
          if (error) throw error;
          return NextResponse.json({ success: true, id });
        } else {
          const { data, error } = await supabase.from('broadcast_campaigns').insert(payload).select().single();
          if (error) throw error;
          return NextResponse.json({ success: true, id: data.id });
        }
      }

      // ─── 予約キャンセル ──────────────────────────
      case 'cancel_schedule': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
        const { error } = await supabase
          .from('broadcast_campaigns')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('status', 'scheduled');
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // ─── 下書き削除 ──────────────────────────
      case 'delete_draft': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
        const { error } = await supabase
          .from('broadcast_campaigns')
          .delete()
          .eq('id', id)
          .eq('status', 'draft');
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      // ─── テストユーザー追加 ──────────────────────────
      case 'add_test_user': {
        const { lineUserId, label } = body;
        if (!lineUserId) return NextResponse.json({ error: 'lineUserId が必要です' }, { status: 400 });
        const { data, error } = await supabase
          .from('broadcast_test_users')
          .upsert({ line_user_id: lineUserId, label: label || null }, { onConflict: 'line_user_id' })
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ success: true, user: data });
      }

      // ─── テストユーザー削除 ──────────────────────────
      case 'delete_test_user': {
        const { id } = body;
        if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 });
        const { error } = await supabase.from('broadcast_test_users').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Broadcast POST error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
