// =====================================================
// Narrowcast API - エリアセグメント配信
// LINE Narrowcast API を使って地域別にメッセージ配信
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { supabase } from '@/lib/database/supabase';
import crypto from 'crypto';

const IMAGE_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';
const NARROWCAST_API = 'https://api.line.me/v2/bot/message/narrowcast';
const PROGRESS_API = 'https://api.line.me/v2/bot/message/progress/narrowcast';
const INSIGHT_API = 'https://api.line.me/v2/bot/insight/message/event';

// LIFF設定
const LIFF_ID = '2006973060-cAgpaZ0y';
const LIFF_URL_BASE = `https://liff.line.me/${LIFF_ID}`;
const ENABLE_LIFF_REDIRECT = process.env.ENABLE_LIFF_REDIRECT !== 'false';

/**
 * 地域コードマッピング
 */
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

/**
 * キャンペーントークン生成（キャンペーンID → 8文字ハッシュ）
 */
function generateCampaignToken(campaignId: string): string {
  return crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 8);
}

/**
 * URLにトラッキング用リダイレクトを適用（キャンペーン単位）
 */
function buildCampaignTrackingUrl(url: string, campaignToken: string, campaignId: string): string {
  const redirectUrl = `${IMAGE_BASE_URL}/api/r/${campaignToken}?url=${encodeURIComponent(url)}&medium=push&campaign=${encodeURIComponent(campaignId)}`;

  if (ENABLE_LIFF_REDIRECT) {
    return `${LIFF_URL_BASE}#url=${encodeURIComponent(redirectUrl)}`;
  }

  return redirectUrl;
}

/**
 * POST /api/broadcast/narrowcast
 * Body: { textMessage, card, area, campaignId }
 *
 * area: プリセット名 ("kanto", "tokyo" etc) または地域コード配列 ["jp_13", ...]
 * campaignId: キャンペーン識別子（トラッキング用、例: "duskin_kanto_20260210"）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { textMessage, card, area, campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'campaignId は必須です' },
        { status: 400 }
      );
    }

    // エリアコードの解決
    let areaCodes: string[];
    if (typeof area === 'string') {
      areaCodes = AREA_PRESETS[area];
      if (!areaCodes) {
        return NextResponse.json(
          {
            success: false,
            error: `不明なエリアプリセット: ${area}`,
            available: Object.keys(AREA_PRESETS),
          },
          { status: 400 }
        );
      }
    } else if (Array.isArray(area)) {
      areaCodes = area;
    } else {
      return NextResponse.json(
        { success: false, error: 'area はプリセット名または地域コード配列で指定してください' },
        { status: 400 }
      );
    }

    // キャンペーントークン生成
    const campaignToken = generateCampaignToken(campaignId);

    // キャンペーントークンをDBに登録
    const { error: tokenError } = await supabase
      .from('tracking_tokens')
      .upsert(
        {
          token: campaignToken,
          user_id: `campaign:${campaignId}`,
          url_type: 'narrowcast',
          destination_url: card?.actionUrl || '',
        },
        { onConflict: 'token' }
      );

    if (tokenError) {
      console.error('❌ キャンペーントークン登録エラー:', tokenError);
    } else {
      console.log('✅ キャンペーントークン登録:', { campaignId, campaignToken });
    }

    // メッセージ配列を構築
    const messages: any[] = [];

    // テキストメッセージ
    if (textMessage) {
      messages.push({
        type: 'text',
        text: textMessage,
      });
    }

    // カードタイプ Flex Message
    if (card) {
      let actionUrl = card.actionUrl;
      if (actionUrl) {
        actionUrl = buildCampaignTrackingUrl(actionUrl, campaignToken, campaignId);
      }

      const flexMessage = buildJobCardFlex({
        altText: card.altText || 'Recommended job for you',
        imageUrl: card.imageUrl ? `${IMAGE_BASE_URL}${card.imageUrl}` : undefined,
        title: card.title,
        address: card.address,
        workHours: card.workHours,
        actionLabel: card.actionLabel || 'View Details',
        actionUrl,
      });

      messages.push(flexMessage);
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'メッセージが空です' },
        { status: 400 }
      );
    }

    // Narrowcast API呼び出し
    const narrowcastBody: any = {
      messages,
      filter: {
        demographic: {
          type: 'operator',
          and: [
            {
              type: 'area',
              oneOf: areaCodes,
            },
          ],
        },
      },
      limit: {
        upToRemainingQuota: true,
      },
    };

    console.log('📡 Narrowcast送信:', JSON.stringify(narrowcastBody, null, 2));

    const response = await fetch(NARROWCAST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(narrowcastBody),
    });

    const requestId = response.headers.get('x-line-request-id');

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Narrowcast Error: ${response.status} ${errorText}`);
      return NextResponse.json(
        {
          success: false,
          error: `Narrowcast失敗: ${response.status}`,
          details: errorText,
          requestId,
        },
        { status: response.status }
      );
    }

    console.log('✅ Narrowcast送信受付:', { requestId, areaCodes, campaignToken });

    return NextResponse.json({
      success: true,
      message: 'Narrowcast送信を受け付けました',
      requestId,
      campaignId,
      campaignToken,
      areaCodes,
      messageCount: messages.length,
      progressUrl: `/api/broadcast/narrowcast?requestId=${requestId}`,
    });
  } catch (error) {
    console.error('❌ Narrowcastエラー:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/broadcast/narrowcast?requestId=XXX
 * Narrowcast の配信進捗 + メッセージ統計を取得
 */
export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');

  if (!requestId) {
    return NextResponse.json(
      { success: false, error: 'requestId が必要です' },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${config.line.channelAccessToken}`,
  };

  // 配信進捗取得
  const [progressRes, insightRes] = await Promise.all([
    fetch(`${PROGRESS_API}?requestId=${requestId}`, { headers }).catch(() => null),
    fetch(`${INSIGHT_API}?requestId=${requestId}`, { headers }).catch(() => null),
  ]);

  const result: any = { requestId };

  // 配信進捗
  if (progressRes?.ok) {
    result.progress = await progressRes.json();
  } else {
    result.progress = { error: `取得失敗: ${progressRes?.status}` };
  }

  // メッセージ統計（翌日以降に利用可能）
  if (insightRes?.ok) {
    result.insight = await insightRes.json();
  } else {
    result.insight = {
      note: 'メッセージ統計は翌日以降に利用可能になります',
      status: insightRes?.status,
    };
  }

  return NextResponse.json({ success: true, ...result });
}

/**
 * 求人カードFlex Messageを構築
 */
function buildJobCardFlex(params: {
  altText: string;
  imageUrl?: string;
  title: string;
  address?: string;
  workHours?: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const bodyContents: any[] = [
    {
      type: 'text',
      text: params.title,
      weight: 'bold',
      size: 'xl',
      wrap: true,
    },
  ];

  if (params.address) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '📍', size: 'sm', flex: 0 },
        {
          type: 'text',
          text: params.address,
          size: 'sm',
          color: '#666666',
          wrap: true,
          flex: 1,
          margin: 'sm',
        },
      ],
      margin: 'lg',
    });
  }

  if (params.workHours) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '🕐', size: 'sm', flex: 0 },
        {
          type: 'text',
          text: params.workHours,
          size: 'sm',
          color: '#666666',
          wrap: true,
          flex: 1,
          margin: 'sm',
        },
      ],
      margin: 'md',
    });
  }

  const bubble: any = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: 'xl',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: params.actionLabel,
            uri: params.actionUrl,
          },
          style: 'link',
          height: 'md',
        },
      ],
    },
  };

  if (params.imageUrl) {
    bubble.hero = {
      type: 'image',
      url: params.imageUrl,
      size: 'full',
      aspectRatio: '20:13',
      aspectMode: 'cover',
    };
  }

  return {
    type: 'flex',
    altText: params.altText,
    contents: bubble,
  };
}
