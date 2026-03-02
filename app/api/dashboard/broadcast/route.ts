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
          type: 'flex',
          altText: '画像メッセージ',
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

// =====================================================
// GET handler
// =====================================================

export async function GET(request: NextRequest) {
  const auth = await checkDashboardAuth(request);
  if (!auth.authenticated) return unauthorizedResponse(auth.error);

  const action = request.nextUrl.searchParams.get('action');

  try {
    switch (action) {
      case 'follower_count': {
        const stats = await getFollowerStatistics();
        return NextResponse.json({
          followers: stats?.followers || 0,
          targetedReaches: stats?.targetedReaches || 0,
          blocks: stats?.blocks || 0,
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
        const { name, messages, deliveryMethod, area, broadcastLang } = body;
        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 });
        }

        // キャンペーンレコード作成
        const { data: campaign, error: insertErr } = await supabase
          .from('broadcast_campaigns')
          .insert({
            name: name || `配信 ${new Date().toLocaleString('ja-JP')}`,
            status: 'sent',
            delivery_method: deliveryMethod || 'broadcast',
            messages,
            area: area || null,
            broadcast_lang: broadcastLang || 'ja',
            executed_at: new Date().toISOString(),
            admin_email: auth.user?.email,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;

        const campaignId = campaign.id;
        const aggUnit = generateAggregationUnit(campaignId);
        const lineMessages = buildLineMessages(messages, campaignId);

        let result: any = {};

        if (deliveryMethod === 'test') {
          // テストユーザーにpush
          const { data: testUsers } = await supabase
            .from('broadcast_test_users')
            .select('line_user_id');
          const userIds = (testUsers || []).map((u) => u.line_user_id);
          if (userIds.length === 0) {
            return NextResponse.json({ error: 'テストユーザーが登録されていません' }, { status: 400 });
          }
          let successCount = 0;
          for (const uid of userIds) {
            const ok = await pushMessage(uid, lineMessages as any);
            if (ok) successCount++;
          }
          result = { testUsers: userIds.length, successCount };

        } else if (deliveryMethod === 'narrowcast') {
          if (!area) return NextResponse.json({ error: 'Narrowcastにはエリア指定が必要です' }, { status: 400 });
          const areaCodes = AREA_PRESETS[area];
          if (!areaCodes) return NextResponse.json({ error: `不明なエリア: ${area}` }, { status: 400 });

          const narrowcastBody = {
            messages: lineMessages,
            filter: {
              demographic: {
                type: 'operator',
                and: [{ type: 'area', oneOf: areaCodes }],
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
          result = { requestId, areaCodes, aggUnit };

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
        const { id, name, messages, deliveryMethod, area, broadcastLang } = body;
        const payload = {
          name: name || '無題の配信',
          status: 'draft' as const,
          delivery_method: deliveryMethod || 'broadcast',
          messages: messages || [],
          area: area || null,
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
        const { id, name, messages, deliveryMethod, area, broadcastLang, scheduledAt } = body;
        if (!scheduledAt) return NextResponse.json({ error: '予約日時が必要です' }, { status: 400 });
        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 });
        }

        const payload = {
          name: name || '予約配信',
          status: 'scheduled' as const,
          delivery_method: deliveryMethod || 'broadcast',
          messages,
          area: area || null,
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
