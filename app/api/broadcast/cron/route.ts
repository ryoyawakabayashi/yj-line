// =====================================================
// 予約配信 cron ジョブ
// Vercel Cronから定期的に呼び出される
// scheduled_at <= now のキャンペーンを実行
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { supabase } from '@/lib/database/supabase';
import { pushMessage } from '@/lib/line/client';
import crypto from 'crypto';

const LIFF_ID = '2006973060-cAgpaZ0y';
const BROADCAST_API = 'https://api.line.me/v2/bot/message/broadcast';
const NARROWCAST_API = 'https://api.line.me/v2/bot/message/narrowcast';

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

interface CarouselBubble {
  imageUrl?: string;
  title?: string;
  body?: string;
  buttons?: { label: string; url: string; campaign?: string; actionType?: 'uri' | 'message'; messageText?: string; color?: string }[];
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
  imageFullWidth?: boolean;
  imageAspectRatio?: string;
  imageAspectMode?: 'cover' | 'fit';
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
}

interface MessageItem {
  type: 'text' | 'card' | 'image';
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
  isCarousel?: boolean;
  bubbles?: CarouselBubble[];
}

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';

function createLiffUrl(targetUrl: string, campaign?: string, broadcastId?: string): string {
  const type = campaign || 'other';
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uid = broadcastId || Math.random().toString(36).slice(2, 8);
  const campaignValue = `line_push_${type}_${today}_${uid}`;
  // /api/r/ 経由でクリックトラッキング + UTMパラメータをサーバー側で付与
  const token = crypto.createHash('sha256').update(uid).digest('hex').slice(0, 8);
  const params = new URLSearchParams({
    url: targetUrl,
    medium: 'push',
    campaign: campaignValue,
  });
  if (broadcastId) params.set('bcid', broadcastId);
  const redirectUrl = `${APP_BASE_URL}/api/r/${token}?${params.toString()}`;
  return `https://liff.line.me/${LIFF_ID}#url=${encodeURIComponent(redirectUrl)}`;
}

function buildLineMessages(items: MessageItem[], broadcastId?: string, notificationText?: string): object[] {
  return items.map((item) => {
    if (item.type === 'text') {
      return { type: 'text', text: item.text || '' };
    }
    if (item.type === 'image') {
      // 画像カルーセル
      if (item.isCarousel && item.bubbles && item.bubbles.length > 0) {
        const buildImageBubble = (img: CarouselBubble) => {
          const url = img.originalUrl || '';
          const rawRatio = img.imageAspectRatio || 'original';
          let ar: string;
          if (rawRatio === 'original' && img.imageNaturalWidth && img.imageNaturalHeight) {
            const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
            const g = gcd(img.imageNaturalWidth, img.imageNaturalHeight);
            let w = img.imageNaturalWidth / g;
            let h = img.imageNaturalHeight / g;
            if (w / h > 3) h = Math.round(w / 3);
            if (h / w > 3) w = Math.round(h / 3);
            ar = `${w}:${h}`;
          } else if (rawRatio === 'original') {
            ar = '20:13';
          } else {
            ar = rawRatio;
          }
          const am = rawRatio === 'original' ? 'cover' : (img.imageAspectMode || 'cover');
          const hero: Record<string, unknown> = { type: 'image', url, size: 'full', aspectRatio: ar, aspectMode: am };
          if (img.linkUrl) {
            hero.action = { type: 'uri', label: 'open', uri: createLiffUrl(img.linkUrl, img.linkCampaign, broadcastId) };
          }
          return { type: 'bubble', size: 'mega', hero };
        };
        return {
          type: 'flex',
          altText: notificationText || item.altText || '画像メッセージ',
          contents: { type: 'carousel', contents: item.bubbles.map(buildImageBubble) },
        };
      }
      // 単体画像
      const url = item.originalUrl || '';
      const rawRatio = item.imageAspectRatio || 'original';
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
          type: 'flex', altText: notificationText || '画像メッセージ',
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
          type: 'flex', altText: notificationText || '画像メッセージ',
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
      const buildCardBubble = (card: { title?: string; body?: string; imageUrl?: string; buttons?: any[] }) => {
        const bodyContents: object[] = [];
        if (card.title) bodyContents.push({ type: 'text', text: card.title, weight: 'bold', size: 'lg', color: '#333333', wrap: true });
        if (card.body) bodyContents.push({ type: 'text', text: card.body, size: 'md', color: '#555555', wrap: true, margin: card.title ? 'md' : 'none' });
        const footerContents = (card.buttons || []).map((btn: any) => {
          const action = btn.actionType === 'message'
            ? { type: 'message', label: btn.label, text: btn.messageText || btn.label }
            : { type: 'uri', label: btn.label, uri: createLiffUrl(btn.url, btn.campaign, broadcastId) };
          return { type: 'button', action, style: 'primary', color: btn.color || '#f9c93e', margin: 'sm' };
        });
        const b: Record<string, unknown> = { type: 'bubble' };
        if (card.imageUrl) b.hero = { type: 'image', url: card.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' };
        if (bodyContents.length > 0) b.body = { type: 'box', layout: 'vertical', contents: bodyContents };
        if (footerContents.length > 0) b.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerContents };
        return b;
      };
      if (item.isCarousel && item.bubbles && item.bubbles.length > 0) {
        return {
          type: 'flex',
          altText: notificationText || item.altText || 'カルーセルメッセージ',
          contents: { type: 'carousel', contents: item.bubbles.map(buildCardBubble) },
        };
      }
      const bubble = buildCardBubble(item);
      return { type: 'flex', altText: notificationText || item.altText || item.title || item.body || 'カードメッセージ', contents: bubble };
    }
    return { type: 'text', text: '' };
  });
}

function generateAggregationUnit(campaignId: string): string {
  const hash = crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 8);
  return `bc_${hash}`;
}

export async function GET(request: NextRequest) {
  // CRON_SECRET認証
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 予約時刻が過ぎたキャンペーンを取得
    const { data: campaigns, error } = await supabase
      .from('broadcast_campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (error) throw error;
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ message: 'No scheduled campaigns to execute', executed: 0 });
    }

    const results: { id: string; status: string; error?: string }[] = [];

    for (const campaign of campaigns) {
      const campaignId = campaign.id;
      const aggUnit = generateAggregationUnit(campaignId);
      const messages = buildLineMessages(campaign.messages as MessageItem[], campaignId, (campaign as any).demographic?.notificationText);

      try {
        let result: any = {};

        if (campaign.delivery_method === 'test') {
          const { data: testUsers } = await supabase
            .from('broadcast_test_users')
            .select('line_user_id');
          let successCount = 0;
          for (const u of testUsers || []) {
            const ok = await pushMessage(u.line_user_id, messages as any);
            if (ok) successCount++;
          }
          result = { testUsers: (testUsers || []).length, successCount };

        } else if (campaign.delivery_method === 'db_users' || campaign.delivery_method === 'prefecture' || campaign.delivery_method === 'recent_followers') {
          // DB登録ユーザー配信: 複合フィルターで絞り込んで個別push
          const demo = campaign.demographic || {};
          const prefList: string[] = demo.prefectures || [];
          const jpLevel: string[] = demo.japaneseLevel || [];

          // フィルター構築
          let diagUserIds: Set<string> | null = null;
          let followUserIds: Set<string> | null = null;

          const hasDiagFilter = prefList.length > 0 || jpLevel.length > 0 || demo.urgency || demo.gender;
          if (hasDiagFilter) {
            let query = supabase.from('diagnosis_results').select('user_id');
            if (prefList.length > 0) query = query.in('q4_prefecture', prefList);
            if (jpLevel.length > 0) query = query.in('q5_japanese_level', jpLevel);
            if (demo.urgency) query = query.eq('q3_urgency', demo.urgency);
            if (demo.gender) query = query.eq('q2_gender', demo.gender);
            const { data } = await query;
            diagUserIds = new Set((data || []).map((d: any) => d.user_id));
          }

          if (demo.recentDays) {
            const days = Number(demo.recentDays);
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            const { data } = await supabase
              .from('follow_events')
              .select('user_id')
              .eq('event_type', 'follow')
              .gte('timestamp', since);
            followUserIds = new Set((data || []).map((d: any) => d.user_id));
          }

          let uniqueIds: string[];
          if (diagUserIds && followUserIds) {
            uniqueIds = [...diagUserIds].filter((id) => followUserIds!.has(id));
          } else if (diagUserIds) {
            uniqueIds = [...diagUserIds];
          } else if (followUserIds) {
            uniqueIds = [...followUserIds];
          } else {
            throw new Error('DB users: no filters specified');
          }

          if (uniqueIds.length === 0) throw new Error('DB users: no matching users');
          let successCount = 0;
          for (const uid of uniqueIds) {
            const ok = await pushMessage(uid, messages as any);
            if (ok) successCount++;
          }
          result = { targetUsers: uniqueIds.length, successCount };

        } else if (campaign.delivery_method === 'narrowcast') {
          // デモグラフィックフィルターを動的に構築
          const andConditions: object[] = [];
          if (campaign.area) {
            const areaCodes = AREA_PRESETS[campaign.area];
            if (areaCodes) andConditions.push({ type: 'area', oneOf: areaCodes });
          }
          if (campaign.demographic?.gender) {
            andConditions.push({ type: 'gender', oneOf: [campaign.demographic.gender] });
          }
          if (campaign.demographic?.age) {
            andConditions.push({ type: 'age', oneOf: [campaign.demographic.age] });
          }
          if (andConditions.length === 0) throw new Error('Narrowcast: no demographic filters');

          const res = await fetch(NARROWCAST_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.line.channelAccessToken}`,
            },
            body: JSON.stringify({
              messages,
              filter: { demographic: { type: 'operator', and: andConditions } },
              limit: { upToRemainingQuota: true },
              customAggregationUnits: [aggUnit],
            }),
          });
          if (!res.ok) throw new Error(`Narrowcast failed: ${await res.text()}`);
          result = { requestId: res.headers.get('x-line-request-id'), aggUnit };

        } else {
          const res = await fetch(BROADCAST_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.line.channelAccessToken}`,
            },
            body: JSON.stringify({ messages, customAggregationUnits: [aggUnit] }),
          });
          if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
          result = { requestId: res.headers.get('x-line-request-id'), aggUnit };
        }

        await supabase.from('broadcast_campaigns').update({
          status: 'sent',
          executed_at: new Date().toISOString(),
          result,
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);

        results.push({ id: campaignId, status: 'sent' });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        await supabase.from('broadcast_campaigns').update({
          status: 'failed',
          executed_at: new Date().toISOString(),
          result: { error: errMsg },
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId);
        results.push({ id: campaignId, status: 'failed', error: errMsg });
      }
    }

    console.log(`📡 Cron: ${results.length} campaigns processed`, results);
    return NextResponse.json({ executed: results.length, results });
  } catch (error) {
    console.error('Broadcast cron error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
