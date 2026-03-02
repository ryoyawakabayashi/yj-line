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

interface MessageItem {
  type: 'text' | 'card' | 'image';
  text?: string;
  imageUrl?: string;
  title?: string;
  body?: string;
  altText?: string;
  buttons?: { label: string; url: string; campaign?: string }[];
  originalUrl?: string;
  linkUrl?: string;
  linkCampaign?: string;
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

function buildLineMessages(items: MessageItem[], broadcastId?: string): object[] {
  return items.map((item) => {
    if (item.type === 'text') {
      return { type: 'text', text: item.text || '' };
    }
    if (item.type === 'image') {
      const url = item.originalUrl || '';
      if (item.linkUrl) {
        const linkUri = createLiffUrl(item.linkUrl, item.linkCampaign, broadcastId);
        return {
          type: 'flex', altText: '画像メッセージ',
          contents: {
            type: 'bubble',
            hero: {
              type: 'image', url, size: 'full', aspectRatio: '20:13', aspectMode: 'cover',
              action: { type: 'uri', label: 'open', uri: linkUri },
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
      const footerContents = (item.buttons || []).map((btn) => ({
        type: 'button',
        action: { type: 'uri', label: btn.label, uri: createLiffUrl(btn.url, btn.campaign, broadcastId) },
        style: 'primary', color: '#f9c93e', margin: 'sm',
      }));
      const bubble: Record<string, unknown> = { type: 'bubble' };
      if (item.imageUrl) bubble.hero = { type: 'image', url: item.imageUrl, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' };
      if (bodyContents.length > 0) bubble.body = { type: 'box', layout: 'vertical', contents: bodyContents };
      if (footerContents.length > 0) bubble.footer = { type: 'box', layout: 'vertical', spacing: 'sm', contents: footerContents };
      return { type: 'flex', altText: item.altText || item.title || item.body || 'カードメッセージ', contents: bubble };
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
      const messages = buildLineMessages(campaign.messages as MessageItem[], campaignId);

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

        } else if (campaign.delivery_method === 'narrowcast') {
          const areaCodes = AREA_PRESETS[campaign.area || ''];
          if (!areaCodes) throw new Error(`Unknown area: ${campaign.area}`);

          const res = await fetch(NARROWCAST_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.line.channelAccessToken}`,
            },
            body: JSON.stringify({
              messages,
              filter: { demographic: { type: 'operator', and: [{ type: 'area', oneOf: areaCodes }] } },
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
