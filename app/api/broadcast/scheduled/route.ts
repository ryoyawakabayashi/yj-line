// =====================================================
// スケジュール配信API
// Vercel Cron で指定時刻にnarrowcast送信
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { supabase } from '@/lib/database/supabase';
import crypto from 'crypto';

const NARROWCAST_API = 'https://api.line.me/v2/bot/message/narrowcast';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://line-bot-next-omega.vercel.app';
const LIFF_ID = '2006973060-cAgpaZ0y';

const AREA_PRESETS: Record<string, string[]> = {
  kansai: ['jp_25', 'jp_26', 'jp_27', 'jp_28', 'jp_29', 'jp_30'],
};

function generateCampaignToken(campaignId: string): string {
  return crypto.createHash('sha256').update(campaignId).digest('hex').slice(0, 8);
}

function buildLiffTrackingUrl(targetUrl: string, campaignId: string): string {
  const campaignToken = generateCampaignToken(campaignId);
  const redirectUrl = `${APP_BASE_URL}/api/r/${campaignToken}?url=${encodeURIComponent(targetUrl)}&medium=push&campaign=${encodeURIComponent(campaignId)}`;
  return `https://liff.line.me/${LIFF_ID}#url=${encodeURIComponent(redirectUrl)}`;
}

export async function GET(request: NextRequest) {
  // Vercel Cron認証（CRON_SECRETが設定されている場合のみ検証）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // --- キャンペーン設定 ---
    const campaignId = 'gaikokujinsyokudo_20260227';
    const targetUrl = 'https://www.yolo-japan.com/en/information/details/469';
    const area = 'kansai';
    const areaCodes = AREA_PRESETS[area];

    const liffUrl = buildLiffTrackingUrl(targetUrl, campaignId);

    const messageText = `Have you ever made onigiri
with someone you just met? 🍙

It's funny how cooking together
breaks the ice so quickly.

This Friday,
let's make onigiri & sushi
with people from all over the world 🍣

Foreigners' Kitchen
📅 Fri, Feb 27 — 18:30~
📍 YOLO BASE (Osaka)

Sign up here! 👇
${liffUrl}

——————————————

知らない誰かと一緒に
おにぎり作ったことある？🍙

不思議なもので、
一緒に料理すると、一気に距離が縮まる。

今週の金曜日、
いろんな国の人と
おにぎり＆お寿司を作りながら交流しよう 🍣

外国人食堂
📅 2/27（金）18:30〜
📍 YOLO BASE（大阪）

詳細はこちら！👇
${liffUrl}`;

    // キャンペーントークンをDBに登録
    const campaignToken = generateCampaignToken(campaignId);
    await supabase
      .from('tracking_tokens')
      .upsert(
        {
          token: campaignToken,
          user_id: `campaign:${campaignId}`,
          url_type: 'narrowcast',
          destination_url: targetUrl,
        },
        { onConflict: 'token' }
      );

    // Narrowcast送信
    const narrowcastBody = {
      messages: [{ type: 'text', text: messageText }],
      filter: {
        demographic: {
          type: 'operator',
          and: [{ type: 'area', oneOf: areaCodes }],
        },
      },
      limit: { upToRemainingQuota: true },
    };

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
      console.error(`❌ Scheduled narrowcast failed: ${response.status} ${errorText}`);
      return NextResponse.json({
        success: false,
        error: errorText,
        requestId,
      }, { status: response.status });
    }

    console.log('✅ Scheduled narrowcast sent:', { campaignId, requestId, areaCodes });

    return NextResponse.json({
      success: true,
      campaignId,
      campaignToken,
      requestId,
      area,
      areaCodes,
    });
  } catch (error) {
    console.error('❌ Scheduled broadcast error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
